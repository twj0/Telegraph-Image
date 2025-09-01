// Telegraph Finder 配置文件
export const CONFIG = {
    // 上传设置
    UPLOAD: {
        MAX_FILE_SIZE: 50 * 1024 * 1024, // 提升到50MB支持高清壁纸
        ALLOWED_TYPES: [
            // 常见格式
            'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico',
            // 现代格式
            'avif', 'heic', 'heif',
            // 专业格式
            'tiff', 'tif', 'raw', 'dng'
        ],
        ENDPOINTS: ['/upload', '../upload'],
        TIMEOUT: 120000, // 提升到2分钟超时
        MAX_CONCURRENT: 5, // 增加并发数
        CHUNK_SIZE: 1024 * 1024 // 1MB分块上传
    },
    
    // API设置
    API: {
        BASE_URL: '/api',
        TIMEOUT: 30000, // 提升API超时
        RETRY_COUNT: 3,
        CACHE_TTL: 30000
    },
    
    // UI设置
    UI: {
        NOTIFICATION_DURATION: 4000,
        ANIMATION_DURATION: 300,
        GRID_MIN_WIDTH: 200,
        LIST_PAGE_SIZE: 50,
        BACKGROUND_UPLOAD: true, // 启用后台上传
        SOFT_PROGRESS: true // 启用软进度条
    },
    
    // 调试设置
    DEBUG: {
        ENABLED: false,
        LOG_LEVEL: 'info',
        PERFORMANCE_MONITORING: true
    },
    
    // 缓存设置
    CACHE: {
        IMAGE_LIST_KEY: 'telegraph_image_list',
        FOLDER_STRUCTURE_KEY: 'finder_folder_structure',
        SETTINGS_KEY: 'finder_settings',
        MAX_AGE: 24 * 60 * 60 * 1000
    },
    
    // 右键菜单配置
    CONTEXT_MENU: {
        ITEMS: [
            { id: 'preview', icon: 'fas fa-eye', label: '预览', action: 'preview' },
            { id: 'copy-link', icon: 'fas fa-link', label: '复制链接', action: 'copyLink' },
            { id: 'copy-markdown', icon: 'fab fa-markdown', label: '复制Markdown', action: 'copyMarkdown' },
            { id: 'copy-html', icon: 'fas fa-code', label: '复制HTML', action: 'copyHtml' },
            { id: 'separator1', type: 'separator' },
            { id: 'download', icon: 'fas fa-download', label: '下载原图', action: 'download' },
            { id: 'favorite', icon: 'fas fa-star', label: '收藏/取消收藏', action: 'toggleFavorite' },
            { id: 'separator2', type: 'separator' },
            { id: 'rename', icon: 'fas fa-edit', label: '重命名', action: 'rename' },
            { id: 'move', icon: 'fas fa-folder-open', label: '移动到文件夹', action: 'move' },
            { id: 'separator3', type: 'separator' },
            { id: 'delete', icon: 'fas fa-trash', label: '删除', action: 'delete', danger: true }
        ]
    }
};

// 日志工具
export const Logger = {
    debug: (...args) => CONFIG.DEBUG.ENABLED && console.log('[DEBUG]', ...args),
    info: (...args) => CONFIG.DEBUG.ENABLED && console.info('[INFO]', ...args),
    warn: (...args) => console.warn('[WARN]', ...args),
    error: (...args) => console.error('[ERROR]', ...args)
};

// 工具函数
export const Utils = {
    // 格式化文件大小
    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    },
    
    // 格式化日期
    formatDate(date) {
        return new Intl.DateTimeFormat('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    },
    
    // 防抖函数
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },
    
    // 节流函数
    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },
    
    // 生成唯一ID
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },
    
    // 检查文件类型
    isValidImageFile(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        return CONFIG.UPLOAD.ALLOWED_TYPES.includes(ext);
    },
    
    // 检查文件大小
    isValidFileSize(size) {
        return size <= CONFIG.UPLOAD.MAX_FILE_SIZE;
    },
    
    // 复制到剪贴板
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (err) {
            // 降级方案
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            const success = document.execCommand('copy');
            document.body.removeChild(textArea);
            return success;
        }
    },
    
    // 获取图片格式描述
    getImageFormatDescription(ext) {
        const descriptions = {
            'jpg': 'JPEG图片',
            'jpeg': 'JPEG图片',
            'png': 'PNG图片',
            'gif': 'GIF动图',
            'webp': 'WebP图片',
            'avif': 'AVIF图片',
            'heic': 'HEIC图片',
            'heif': 'HEIF图片',
            'svg': 'SVG矢量图',
            'bmp': 'BMP位图',
            'tiff': 'TIFF图片',
            'tif': 'TIFF图片',
            'ico': '图标文件'
        };
        return descriptions[ext.toLowerCase()] || '图片文件';
    }
};
