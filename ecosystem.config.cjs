// Run on Linux: pm2 start ecosystem.config.cjs
// Frontend: http://localhost:3001  |  Backend API: http://localhost:3002
module.exports = {
  apps: [
    {
      name: 'frontend',
      cwd: './frontend',
      script: 'node_modules/.bin/vite',
      args: '--port 3001',
      interpreter: 'node',
      env: {
        VITE_API_URL: 'http://localhost:3002',
      },
    },
    {
      name: 'backend',
      cwd: './backend',
      script: 'node_modules/.bin/ts-node-dev',
      args: '--respawn --transpile-only src/index.ts',
      interpreter: 'node',
      env: {
        PORT: 3002,
      },
    },
  ],
};
