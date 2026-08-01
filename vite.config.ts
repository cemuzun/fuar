import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      rollupOptions: {
        output: {
          entryFileNames: 'assets/index.js',
          chunkFileNames: 'assets/[name].js',
          assetFileNames: 'assets/index.[ext]'
        }
      }
    },
    server: {
      // Ignore database and log file writes to prevent continuous HMR page reloads
      watch: {
        ignored: ['**/fuar_db.json*', '**/logs/**'],
      },
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
