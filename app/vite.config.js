import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

const logPlugin = () => ({
  name: 'log-plugin',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      if (req.url === '/__log' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', () => {
          console.log('\n[CLIENT ERROR]', body);
          res.statusCode = 200;
          res.end('ok');
        });
      } else {
        next();
      }
    });
  }
});

export default defineConfig({
  plugins: [react(), logPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
