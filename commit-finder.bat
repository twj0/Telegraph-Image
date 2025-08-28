@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo 🚀 Telegraph Finder 部署脚本
echo ================================

REM 检查是否在正确的目录
if not exist "finder" (
    echo ❌ 错误: 未找到 finder 文件夹
    echo 请确保在项目根目录运行此脚本
    pause
    exit /b 1
)

REM 检查 Git 状态
if not exist ".git" (
    echo ❌ 错误: 当前目录不是 Git 仓库
    echo 请先初始化 Git 仓库或在正确的目录运行
    pause
    exit /b 1
)

echo 📁 检查 Finder 文件...

set "files=finder/index.html finder/styles.css finder/app.js finder/server.js finder/package.json finder/README.md finder/demo.html finder/deploy.md"

for %%f in (%files%) do (
    if exist "%%f" (
        echo ✅ %%f
    ) else (
        echo ❌ 缺少文件: %%f
        pause
        exit /b 1
    )
)

echo.
echo 📊 当前 Git 状态:
git status --porcelain

echo.
echo 📝 准备提交 Finder 功能...

REM 添加 finder 文件夹
echo 添加 finder 文件夹到 Git...
git add finder/

REM 添加提交脚本
git add commit-finder.sh commit-finder.bat

REM 检查是否有更改
git diff --cached --quiet
if %errorlevel% equ 0 (
    echo ⚠️  没有检测到更改，可能文件已经提交过了
    for /f "tokens=*" %%i in ('git branch --show-current') do set current_branch=%%i
    echo 当前分支: !current_branch!
    echo 最近的提交:
    git log --oneline -5
    pause
    exit /b 0
)

echo.
echo 📋 将要提交的文件:
git diff --cached --name-only

echo.
set /p confirm="🤔 确认提交这些更改吗? (y/N): "

if /i "!confirm!"=="y" (
    REM 提交更改
    set "commit_msg=feat: 添加 Telegraph Finder 文件管理器

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

    git commit -m "!commit_msg!"
    
    echo.
    echo ✅ 提交成功!
    echo.
    echo 🌐 下一步操作:
    for /f "tokens=*" %%i in ('git branch --show-current') do set current_branch=%%i
    echo 1. 推送到远程仓库:
    echo    git push origin !current_branch!
    echo.
    echo 2. 部署到 GitHub Pages:
    echo    - 进入仓库设置 ^> Pages
    echo    - 选择 main 分支
    echo    - 访问: https://你的用户名.github.io/仓库名/finder/
    echo.
    echo 3. 部署到 Cloudflare Pages:
    echo    - 连接 GitHub 仓库
    echo    - 自动部署
    echo    - 访问: https://项目名.pages.dev/finder/
    echo.
    
    set /p push_confirm="🚀 现在推送到远程仓库吗? (y/N): "
    
    if /i "!push_confirm!"=="y" (
        echo 推送中...
        git push origin !current_branch!
        if !errorlevel! equ 0 (
            echo ✅ 推送成功!
            echo.
            echo 🎉 Telegraph Finder 已成功部署!
            echo 📖 查看部署指南: finder/deploy.md
            echo 🎭 演示页面: finder/demo.html
        ) else (
            echo ❌ 推送失败，请检查网络连接和权限
        )
    ) else (
        echo ⏸️  跳过推送，你可以稍后手动推送:
        echo    git push origin !current_branch!
    )
    
) else (
    echo ❌ 取消提交
    echo 如需重新提交，请再次运行此脚本
)

echo.
echo 📚 更多信息:
echo - README: finder/README.md
echo - 部署指南: finder/deploy.md
echo - 演示页面: finder/demo.html
echo.
echo 🙏 感谢使用 Telegraph Finder!
echo.
pause
