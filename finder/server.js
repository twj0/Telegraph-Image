// Telegraph Finder 后端服务器
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const cors = require('cors');
const session = require('express-session');

// 导入认证相关模块
const dbManager = require('./utils/database');
const authMiddleware = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// 初始化数据库
async function initializeDatabase() {
    try {
        await dbManager.initialize();
    } catch (error) {
        console.error('❌ 数据库初始化失败，服务器无法启动:', error);
        process.exit(1);
    }
}

// 会话配置
const sessionConfig = {
    secret: process.env.SESSION_SECRET || 'telegraph-finder-secret-key-' + Math.random().toString(36),
    resave: false,
    saveUninitialized: false,
    name: 'finder.sid',
    cookie: {
        secure: process.env.NODE_ENV === 'production', // 生产环境启用HTTPS
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24小时
        sameSite: 'lax'
    }
};

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session(sessionConfig));

// ==================== 认证路由 ====================

// 登录页面 (GET)
app.get('/finder/login', authMiddleware.redirectIfAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

// 登录处理 (POST)
app.post('/finder/login',
    authMiddleware.validateLoginInput,
    authMiddleware.handleLogin
);

// 登出处理
app.get('/finder/logout', authMiddleware.handleLogout);

// 获取当前用户信息
app.get('/finder/api/user', authMiddleware.getCurrentUser);

// 健康检查端点（无需认证）
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: require('./package.json').version
    });
});

// 受保护的主页面
app.get('/finder', authMiddleware.requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ==================== 静态文件服务 ====================

// 静态文件服务（排除受保护的路径）
app.use('/finder/assets', express.static(path.join(__dirname)));
app.use(express.static(path.join(__dirname), {
    index: false // 禁用自动index.html
}));

// 文件存储配置
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const uploadDir = path.join(__dirname, 'uploads');
        try {
            await fs.mkdir(uploadDir, { recursive: true });
            cb(null, uploadDir);
        } catch (error) {
            cb(error);
        }
    },
    filename: (req, file, cb) => {
        // 生成唯一文件名
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        const name = path.basename(file.originalname, ext);
        cb(null, `${name}-${uniqueSuffix}${ext}`);
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB 限制
    },
    fileFilter: (req, file, cb) => {
        // 允许的文件类型
        const allowedTypes = /jpeg|jpg|png|gif|webp|svg|pdf|doc|docx|txt|mp4|avi|mov/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('不支持的文件类型'));
        }
    }
});

// 文件元数据存储（实际项目中应使用数据库）
let fileMetadata = new Map();

// ==================== 受保护的API路由 ====================

// 获取文件列表 (需要认证)
app.get('/api/manage/list', authMiddleware.requireAuth, async (req, res) => {
    try {
        const uploadsDir = path.join(__dirname, 'uploads');
        
        // 确保上传目录存在
        try {
            await fs.access(uploadsDir);
        } catch {
            await fs.mkdir(uploadsDir, { recursive: true });
            return res.json([]);
        }

        const files = await fs.readdir(uploadsDir);
        const fileList = [];

        for (const filename of files) {
            const filePath = path.join(uploadsDir, filename);
            const stats = await fs.stat(filePath);
            
            if (stats.isFile()) {
                const metadata = fileMetadata.get(filename) || {};
                
                fileList.push({
                    name: filename,
                    metadata: {
                        fileName: metadata.originalName || filename,
                        fileSize: stats.size,
                        TimeStamp: stats.mtime.getTime(),
                        parentFolder: metadata.parentFolder || '/',
                        liked: metadata.liked || false,
                        ...metadata
                    }
                });
            }
        }

        // 按修改时间排序（最新的在前）
        fileList.sort((a, b) => b.metadata.TimeStamp - a.metadata.TimeStamp);
        
        res.json(fileList);
    } catch (error) {
        console.error('获取文件列表失败:', error);
        res.status(500).json({ error: '获取文件列表失败' });
    }
});

// 上传文件 (需要认证)
app.post('/api/upload', authMiddleware.requireAuth, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: '没有上传文件' });
        }

        const { originalname, filename, size, mimetype } = req.file;
        const parentFolder = req.body.parentFolder || '/';

        // 保存文件元数据
        fileMetadata.set(filename, {
            originalName: originalname,
            fileSize: size,
            mimeType: mimetype,
            parentFolder: parentFolder,
            uploadTime: Date.now(),
            liked: false
        });

        res.json({
            success: true,
            message: '文件上传成功',
            file: {
                name: filename,
                originalName: originalname,
                size: size,
                url: `/file/${filename}`
            }
        });
    } catch (error) {
        console.error('文件上传失败:', error);
        res.status(500).json({ error: '文件上传失败: ' + error.message });
    }
});

// 获取文件 (需要认证)
app.get('/file/:filename', authMiddleware.requireAuth, async (req, res) => {
    try {
        const filename = req.params.filename;
        const filePath = path.join(__dirname, 'uploads', filename);
        
        // 检查文件是否存在
        try {
            await fs.access(filePath);
        } catch {
            return res.status(404).json({ error: '文件不存在' });
        }

        // 获取文件元数据
        const metadata = fileMetadata.get(filename) || {};
        const originalName = metadata.originalName || filename;

        // 设置响应头
        res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(originalName)}"`);
        
        // 发送文件
        res.sendFile(filePath);
    } catch (error) {
        console.error('获取文件失败:', error);
        res.status(500).json({ error: '获取文件失败' });
    }
});

// 删除文件 (需要认证)
app.delete('/api/file/:filename', authMiddleware.requireAuth, async (req, res) => {
    try {
        const filename = req.params.filename;
        const filePath = path.join(__dirname, 'uploads', filename);
        
        // 删除文件
        await fs.unlink(filePath);
        
        // 删除元数据
        fileMetadata.delete(filename);
        
        res.json({ success: true, message: '文件删除成功' });
    } catch (error) {
        console.error('删除文件失败:', error);
        res.status(500).json({ error: '删除文件失败' });
    }
});

// 重命名文件 (需要认证)
app.put('/api/file/:filename/rename', authMiddleware.requireAuth, async (req, res) => {
    try {
        const filename = req.params.filename;
        const { newName } = req.body;
        
        if (!newName) {
            return res.status(400).json({ error: '新文件名不能为空' });
        }

        // 更新元数据中的原始文件名
        const metadata = fileMetadata.get(filename) || {};
        metadata.originalName = newName;
        fileMetadata.set(filename, metadata);
        
        res.json({ success: true, message: '文件重命名成功' });
    } catch (error) {
        console.error('重命名文件失败:', error);
        res.status(500).json({ error: '重命名文件失败' });
    }
});

// 移动文件到文件夹 (需要认证)
app.put('/api/file/:filename/move', authMiddleware.requireAuth, async (req, res) => {
    try {
        const filename = req.params.filename;
        const { parentFolder } = req.body;
        
        // 更新元数据中的父文件夹
        const metadata = fileMetadata.get(filename) || {};
        metadata.parentFolder = parentFolder || '/';
        fileMetadata.set(filename, metadata);
        
        res.json({ success: true, message: '文件移动成功' });
    } catch (error) {
        console.error('移动文件失败:', error);
        res.status(500).json({ error: '移动文件失败' });
    }
});

// 切换文件收藏状态 (需要认证)
app.put('/api/file/:filename/favorite', authMiddleware.requireAuth, async (req, res) => {
    try {
        const filename = req.params.filename;
        const { liked } = req.body;
        
        // 更新元数据中的收藏状态
        const metadata = fileMetadata.get(filename) || {};
        metadata.liked = Boolean(liked);
        fileMetadata.set(filename, metadata);
        
        res.json({ success: true, message: '收藏状态更新成功' });
    } catch (error) {
        console.error('更新收藏状态失败:', error);
        res.status(500).json({ error: '更新收藏状态失败' });
    }
});

// 获取文件夹列表 (需要认证)
app.get('/api/folders', authMiddleware.requireAuth, (req, res) => {
    const folders = new Set();
    
    // 从文件元数据中提取所有文件夹
    for (const metadata of fileMetadata.values()) {
        if (metadata.parentFolder && metadata.parentFolder !== '/') {
            folders.add(metadata.parentFolder);
        }
    }
    
    res.json(Array.from(folders));
});

// 创建文件夹 (需要认证)（虚拟文件夹，不在文件系统中创建实际目录）
app.post('/api/folders', authMiddleware.requireAuth, (req, res) => {
    const { name, parentFolder = '/' } = req.body;
    
    if (!name) {
        return res.status(400).json({ error: '文件夹名称不能为空' });
    }
    
    const folderPath = parentFolder === '/' ? `/${name}` : `${parentFolder}/${name}`;
    
    res.json({
        success: true,
        message: '文件夹创建成功',
        folder: {
            name: name,
            path: folderPath,
            parentFolder: parentFolder
        }
    });
});

// 错误处理中间件
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: '文件大小超过限制（最大50MB）' });
        }
    }
    
    console.error('服务器错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
});

// 404 处理
app.use((req, res) => {
    res.status(404).json({ error: '接口不存在' });
});

// 启动服务器
async function startServer() {
    await initializeDatabase();

    app.listen(PORT, () => {
        console.log(`Telegraph Finder 服务器运行在 http://localhost:${PORT}`);
        console.log('🔐 登录页面: http://localhost:' + PORT + '/finder/login');
        console.log('📁 文件管理: http://localhost:' + PORT + '/finder');
        console.log('API 文档: http://localhost:' + PORT + '/api');
    });
}

startServer().catch(error => {
    console.error('❌ 服务器启动失败:', error);
    process.exit(1);
});

// 优雅关闭
process.on('SIGTERM', () => {
    console.log('收到 SIGTERM 信号，正在关闭服务器...');
    dbManager.close();
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('收到 SIGINT 信号，正在关闭服务器...');
    dbManager.close();
    process.exit(0);
});
