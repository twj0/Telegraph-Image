#!/bin/bash

# Telegraph Finder 部署脚本
# 使用方法: ./deploy.sh [production|staging]

set -e

# 配置
APP_NAME="telegraph-finder"
APP_DIR="/opt/telegraph-finder"
BACKUP_DIR="/opt/backups/telegraph-finder"
LOG_FILE="/var/log/telegraph-finder-deploy.log"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 日志函数
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}" | tee -a $LOG_FILE
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}" | tee -a $LOG_FILE
    exit 1
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}" | tee -a $LOG_FILE
}

# 检查参数
ENVIRONMENT=${1:-production}
if [[ "$ENVIRONMENT" != "production" && "$ENVIRONMENT" != "staging" ]]; then
    error "Invalid environment. Use 'production' or 'staging'"
fi

log "开始部署 Telegraph Finder ($ENVIRONMENT 环境)"

# 检查必要的命令
command -v node >/dev/null 2>&1 || error "Node.js 未安装"
command -v npm >/dev/null 2>&1 || error "npm 未安装"
command -v pm2 >/dev/null 2>&1 || warn "PM2 未安装，建议安装以便进程管理"

# 创建必要的目录
log "创建目录结构..."
sudo mkdir -p $APP_DIR
sudo mkdir -p $BACKUP_DIR
sudo mkdir -p $(dirname $LOG_FILE)
sudo mkdir -p $APP_DIR/logs
sudo mkdir -p $APP_DIR/uploads

# 备份现有数据（如果存在）
if [ -f "$APP_DIR/auth.db" ]; then
    log "备份现有数据库..."
    sudo cp $APP_DIR/auth.db $BACKUP_DIR/auth.db.$(date +%Y%m%d_%H%M%S)
fi

if [ -d "$APP_DIR/uploads" ]; then
    log "备份上传文件..."
    sudo tar -czf $BACKUP_DIR/uploads.$(date +%Y%m%d_%H%M%S).tar.gz -C $APP_DIR uploads/
fi

# 复制文件
log "复制应用文件..."
sudo cp -r ./* $APP_DIR/
sudo chown -R $USER:$USER $APP_DIR

# 安装依赖
log "安装 Node.js 依赖..."
cd $APP_DIR
npm install --production

# 设置环境变量
if [ ! -f "$APP_DIR/.env" ]; then
    log "创建环境配置文件..."
    cp .env.example .env
    warn "请编辑 $APP_DIR/.env 文件设置正确的配置"
fi

# 设置权限
log "设置文件权限..."
chmod +x $APP_DIR/deploy.sh
chmod 600 $APP_DIR/.env

# 启动或重启服务
if command -v pm2 >/dev/null 2>&1; then
    log "使用 PM2 管理进程..."
    pm2 delete $APP_NAME 2>/dev/null || true
    pm2 start ecosystem.config.js --env $ENVIRONMENT
    pm2 save
else
    log "直接启动服务..."
    warn "建议安装 PM2 以获得更好的进程管理"
    NODE_ENV=$ENVIRONMENT nohup node server.js > logs/app.log 2>&1 &
fi

log "部署完成！"
log "应用目录: $APP_DIR"
log "日志文件: $LOG_FILE"
log "请确保防火墙允许端口 3000 的访问"

# 显示状态
if command -v pm2 >/dev/null 2>&1; then
    pm2 status $APP_NAME
fi
