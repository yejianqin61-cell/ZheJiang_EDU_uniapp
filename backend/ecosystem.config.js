// PM2 Cluster Mode — production process manager
// Usage: pm2-runtime start ecosystem.config.js
module.exports = {
  apps: [{
    name: 'ai-paper-backend',
    script: './dist/main.js',
    instances: 1,               // single instance for SQLite (no shared memory)
    exec_mode: 'fork',
    max_memory_restart: '512M',
    env: {
      NODE_ENV: 'production',
    },
    // Graceful shutdown
    kill_timeout: 5000,
    listen_timeout: 3000,
  }],
};
