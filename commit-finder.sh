#!/bin/bash

# Telegraph Finder 提交脚本
# 用于将 Finder 功能提交到 Git 仓库

echo "🚀 Telegraph Finder 部署脚本"
echo "================================"

# 检查是否在正确的目录
if [ ! -d "finder" ]; then
    echo "❌ 错误: 未找到 finder 文件夹"
    echo "请确保在项目根目录运行此脚本"
    exit 1
fi

# 检查 Git 状态
if [ ! -d ".git" ]; then
    echo "❌ 错误: 当前目录不是 Git 仓库"
    echo "请先初始化 Git 仓库或在正确的目录运行"
    exit 1
fi

echo "📁 检查 Finder 文件..."
FINDER_FILES=(
    "finder/index.html"
    "finder/styles.css"
    "finder/app.js"
    "finder/server.js"
    "finder/package.json"
    "finder/README.md"
    "finder/demo.html"
    "finder/deploy.md"
)

for file in "${FINDER_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file"
    else
        echo "❌ 缺少文件: $file"
        exit 1
    fi
done

echo ""
echo "📊 当前 Git 状态:"
git status --porcelain

echo ""
echo "📝 准备提交 Finder 功能..."

# 添加 finder 文件夹
echo "添加 finder 文件夹到 Git..."
git add finder/

# 添加提交脚本本身
git add commit-finder.sh

# 检查是否有更改
if git diff --cached --quiet; then
    echo "⚠️  没有检测到更改，可能文件已经提交过了"
    echo "当前分支: $(git branch --show-current)"
    echo "最近的提交:"
    git log --oneline -5
    exit 0
fi

echo ""
echo "📋 将要提交的文件:"
git diff --cached --name-only

echo ""
read -p "🤔 确认提交这些更改吗? (y/N): " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
    # 提交更改
    COMMIT_MESSAGE="feat: 添加 Telegraph Finder 文件管理器

- 🎨 现代化的 macOS Finder 风格界面
- 📤 支持拖拽上传和批量上传
- 📂 文件夹管理和多层级结构
- 🔍 网格视图和列表视图切换
- 📱 响应式设计，适配移动设备
- 🚀 支持静态部署到 GitHub Pages/Cloudflare Pages
- 🎭 演示模式，无后端时自动切换

功能特点:
- 独立运行，不影响原项目
- 完整的文件管理功能
- 现代化用户界面
- 跨平台兼容性"

    git commit -m "$COMMIT_MESSAGE"
    
    echo ""
    echo "✅ 提交成功!"
    echo ""
    echo "🌐 下一步操作:"
    echo "1. 推送到远程仓库:"
    echo "   git push origin $(git branch --show-current)"
    echo ""
    echo "2. 部署到 GitHub Pages:"
    echo "   - 进入仓库设置 > Pages"
    echo "   - 选择 main 分支"
    echo "   - 访问: https://你的用户名.github.io/仓库名/finder/"
    echo ""
    echo "3. 部署到 Cloudflare Pages:"
    echo "   - 连接 GitHub 仓库"
    echo "   - 自动部署"
    echo "   - 访问: https://项目名.pages.dev/finder/"
    echo ""
    
    read -p "🚀 现在推送到远程仓库吗? (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "推送中..."
        if git push origin $(git branch --show-current); then
            echo "✅ 推送成功!"
            echo ""
            echo "🎉 Telegraph Finder 已成功部署!"
            echo "📖 查看部署指南: finder/deploy.md"
            echo "🎭 演示页面: finder/demo.html"
        else
            echo "❌ 推送失败，请检查网络连接和权限"
        fi
    else
        echo "⏸️  跳过推送，你可以稍后手动推送:"
        echo "   git push origin $(git branch --show-current)"
    fi
    
else
    echo "❌ 取消提交"
    echo "如需重新提交，请再次运行此脚本"
fi

echo ""
echo "📚 更多信息:"
echo "- README: finder/README.md"
echo "- 部署指南: finder/deploy.md"
echo "- 演示页面: finder/demo.html"
echo ""
echo "🙏 感谢使用 Telegraph Finder!"
