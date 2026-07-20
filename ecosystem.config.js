module.exports = {
  apps: [
    {
      name: 'rex-md',
      script: 'index.js',
      watch: false,
      ignore_watch: ['temp', 'session', 'node_modules', '*.log'],
      max_memory_restart: '400M',
      restart_delay: 5000,
      max_restarts: 20,
      autorestart: true,
      env: {
        NODE_ENV: 'production',
      },
      // Structured JSON logs in production for easy parsing
      error_file: './logs/rex-err.log',
      out_file: './logs/rex-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
    },
  ],
};
