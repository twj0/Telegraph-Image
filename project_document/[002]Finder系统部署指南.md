# 📦 Telegraph Finder 系统部署指南

## 📋 部署前准备清单

### 🔧 环境要求
- Node.js 16+ 
- npm 或 yarn
- SQLite3 支持
- 足够的磁盘空间（用于文件存储和数据库）

### 🔐 安全配置
- [ ] 更改默认管理员密码
- [ ] 配置强随机SESSION_SECRET
- [ ] 设置防火墙规则
- [ ] 配置HTTPS（推荐）

### 📁 文件结构
```
finder/
├── server.js
├── package.json
├── middleware/
│   └── auth.js
├── utils/
│   └── database.js
├── views/
│   └── login.html
├── uploads/          # 文件存储目录
└── auth.db          # SQLite数据库文件
```

## 🌐 部署方案选择

### 方案A：VPS/云服务器直接部署
**适用场景**：有独立服务器，需要完全控制
**优点**：配置灵活，性能可控
**缺点**：需要手动维护

### 方案B：Docker容器化部署
**适用场景**：希望环境隔离，便于迁移
**优点**：环境一致，易于扩展
**缺点**：需要Docker知识

### 方案C：PM2进程管理
**适用场景**：需要进程监控和自动重启
**优点**：稳定性高，便于管理
**缺点**：需要额外配置

## 🔧 生产环境配置

### 环境变量设置
```bash
# 创建 .env 文件
NODE_ENV=production
PORT=3000
SESSION_SECRET=your-super-secret-key-here
ADMIN_PASSWORD=your-secure-password
```

### 安全配置优化
- 启用HTTPS
- 配置防火墙
- 设置反向代理
- 配置日志记录

## 📊 监控和维护

### 日志管理
- 应用日志
- 错误日志
- 访问日志

### 数据备份
- 定期备份SQLite数据库
- 备份上传文件
- 配置自动备份脚本

### 性能监控
- 内存使用监控
- CPU使用监控
- 磁盘空间监控

## 🚀 快速部署步骤

### 方法1：传统VPS部署

```bash
# 1. 上传文件到服务器
scp -r finder/ user@your-server:/opt/

# 2. 连接服务器
ssh user@your-server

# 3. 进入应用目录
cd /opt/finder

# 4. 安装依赖
npm install --production

# 5. 配置环境变量
cp .env.example .env
nano .env  # 编辑配置

# 6. 启动服务
npm start
```

### 方法2：PM2部署

```bash
# 1. 安装PM2
npm install -g pm2

# 2. 使用部署脚本
chmod +x deploy.sh
./deploy.sh production

# 3. 查看状态
pm2 status
pm2 logs telegraph-finder
```

### 方法3：Docker部署

```bash
# 1. 构建镜像
docker build -t telegraph-finder .

# 2. 运行容器
docker run -d \
  --name telegraph-finder \
  -p 3000:3000 \
  -v $(pwd)/uploads:/app/uploads \
  -v $(pwd)/auth.db:/app/auth.db \
  telegraph-finder

# 或使用 docker-compose
docker-compose up -d
```

## 🔧 部署后配置

### 1. 更改默认密码
- 访问 `http://your-server:3000/finder/login`
- 使用默认账户登录
- 建议立即更改密码

### 2. 配置反向代理（推荐）
```bash
# 安装Nginx
sudo apt install nginx

# 复制配置文件
sudo cp nginx.conf.example /etc/nginx/sites-available/telegraph-finder
sudo ln -s /etc/nginx/sites-available/telegraph-finder /etc/nginx/sites-enabled/

# 重启Nginx
sudo systemctl restart nginx
```

### 3. 设置防火墙
```bash
# 允许HTTP和HTTPS
sudo ufw allow 80
sudo ufw allow 443

# 如果不使用反向代理，允许应用端口
sudo ufw allow 3000
```

---

**注意**：请根据您的具体环境调整配置参数。
