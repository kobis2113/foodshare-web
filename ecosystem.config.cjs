// Build frontend first, then: pm2 start ecosystem.config.cjs
//   cd frontend && VITE_API_URL=http://localhost:3002 npm run build && cd ..
// Frontend: http://localhost:3001 | Backend: http://localhost:3002
module.exports = {
  apps: [
    {
      name: 'frontend',
      cwd: './frontend',
      script: 'node_modules/.bin/serve',
      args: '-s dist -l 3001',
      interpreter: 'node',
    },
    {
      name: 'backend',
      cwd: './backend',
      script: 'node_modules/.bin/ts-node-dev',
      args: '--respawn --transpile-only src/index.ts',
      interpreter: 'node',
      env: {
        PORT: 3000,
      },
    },
  ],
};
