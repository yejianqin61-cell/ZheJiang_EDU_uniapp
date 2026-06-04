// PM2 Cluster Mode — production process manager
// Usage: pm2-runtime start ecosystem.config.js
module.exports = {
  apps: [{
    name: 'ai-paper-backend',
    script: './dist/main.js',
    instances: 'max',          // one per CPU core
    exec_mode: 'cluster',
    max_memory_restart: '512M',
    env: {
      NODE_ENV: 'production',
    },
    // Graceful shutdown
    kill_timeout: 5000,
    listen_timeout: 3000,
  }],
};
