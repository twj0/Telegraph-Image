# Telegraph Finder 部署指南

## 部署到 GitHub Pages

### 1. 准备工作

1. **Fork 原项目**
   - 访问原项目仓库
   - 点击 Fork 按钮创建你的副本

2. **克隆到本地**
   ```bash
   git clone https://github.com/你的用户名/Telegraph-Image.git
   cd Telegraph-Image
   ```

### 2. 添加 Finder 功能

1. **复制 finder 文件夹**
   ```bash
   # 确保 finder 文件夹在项目根目录
   ls finder/
   # 应该看到: index.html, styles.css, app.js, server.js, package.json, README.md
   ```

2. **提交更改**
   ```bash
   git add finder/
   git commit -m "添加 Telegraph Finder 文件管理器"
   git push origin main
   ```

### 3. 配置 GitHub Pages

1. **启用 GitHub Pages**
   - 进入你的仓库设置 (Settings)
   - 滚动到 "Pages" 部分
   - 在 "Source" 下选择 "Deploy from a branch"
   - 选择 "main" 分支和 "/ (root)" 文件夹
   - 点击 "Save"

2. **访问地址**
   - 原项目: `https://你的用户名.github.io/Telegraph-Image/`
   - Finder: `https://你的用户名.github.io/Telegraph-Image/finder/`

## 部署到 Cloudflare Pages

### 1. 连接 GitHub

1. **登录 Cloudflare**
   - 访问 [Cloudflare Pages](https://pages.cloudflare.com/)
   - 登录你的 Cloudflare 账户

2. **创建新项目**
   - 点击 "Create a project"
   - 选择 "Connect to Git"
   - 授权 GitHub 访问
   - 选择你的 Telegraph-Image 仓库

### 2. 配置构建设置

1. **项目设置**
   - Project name: `telegraph-image`
   - Production branch: `main`
   - Build command: (留空)
   - Build output directory: `/`

2. **环境变量** (如果需要)
   ```
   NODE_VERSION=18
   ```

### 3. 部署

1. **自动部署**
   - 点击 "Save and Deploy"
   - Cloudflare 会自动构建和部署

2. **访问地址**
   - 原项目: `https://你的项目名.pages.dev/`
   - Finder: `https://你的项目名.pages.dev/finder/`

## 自定义域名 (可选)

### 1. 在 Cloudflare Pages 中

1. **添加自定义域名**
   - 进入项目设置
   - 点击 "Custom domains"
   - 添加你的域名

2. **DNS 设置**
   - 添加 CNAME 记录指向 `你的项目名.pages.dev`

### 2. 在 GitHub Pages 中

1. **添加 CNAME 文件**
   ```bash
   echo "你的域名.com" > CNAME
   git add CNAME
   git commit -m "添加自定义域名"
   git push
   ```

## 功能说明

### Telegraph Finder 特点

1. **独立运行** - 可以作为静态网站独立部署
2. **演示模式** - 当后端API不可用时自动切换到演示模式
3. **现代界面** - 仿 macOS Finder 的美观界面
4. **完整功能** - 文件上传、管理、预览、下载

### 访问路径

- **原项目首页**: `/`
- **原项目管理**: `/admin.html`
- **Finder 界面**: `/finder/`

## 注意事项

1. **保持原项目完整性**
   - finder 文件夹是独立的，不会影响原项目功能
   - 原项目的所有功能保持不变

2. **演示模式**
   - 当没有后端服务时，Finder 会自动进入演示模式
   - 演示模式下可以体验所有界面功能

3. **生产使用**
   - 如需完整功能，需要部署 Node.js 后端服务
   - 可以使用 Vercel、Railway 等平台部署后端

## 故障排除

### 常见问题

1. **页面无法访问**
   - 检查 GitHub Pages 是否正确配置
   - 确认文件路径正确

2. **样式不显示**
   - 检查 CSS 文件路径
   - 确认 CDN 资源可访问

3. **功能异常**
   - 打开浏览器开发者工具查看错误
   - 检查控制台日志

### 联系支持

如有问题，请：
1. 查看项目 README
2. 提交 GitHub Issue
3. 查看部署日志
