import { defineConfig } from '@vben/vite-config';

import ElementPlus from 'unplugin-element-plus/vite';
import { loadEnv } from 'vite';

export default defineConfig(async ({ mode }) => {
  const env = loadEnv(mode, process.cwd());
  const apiUrl = env.VITE_GLOB_API_URL || 'http://localhost:8000/api';

  return {
    application: {},
    vite: {
      plugins: [
        ElementPlus({
          format: 'esm',
        }),
      ],
      server: {
        proxy: {
          '/api': {
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api/, ''),
            // 从 VITE_GLOB_API_URL 读取后端代理目标地址
            target: apiUrl,
            ws: true,
          },
        },
      },
    },
  };
});
