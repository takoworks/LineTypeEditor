import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // GitHub Pages で配信するサブパスを指定
  // 'LineTypeEditor' はリポジトリ名と一致させる
  base: '/LineTypeEditor/',
});