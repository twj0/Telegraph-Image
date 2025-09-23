// PM2 配置文件
module.exports = {
  apps: [{
    name: 'telegraph-finder',
    script: 'server.js',
    cwd: '/path/to/your/finder',
    
    // 实例配置
    instances: 1,
    exec_mode: 'fork',
    
    // 环境变量
    env: {
      NODE_ENV: 'development',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    
    // 日志配置
    log_file: './logs/combined.log',
    out_file: './logs/out.log',
    error_file: './logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    
    // 自动重启配置
    watch: false,
    ignore_watch: ['node_modules', 'logs', 'uploads', '*.db'],
    max_restarts: 10,
    min_uptime: '10s',
    
    // 内存限制
    max_memory_restart: '500M',
    
    // 其他配置
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 10000
  }]
};
