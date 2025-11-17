import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import svgr from 'vite-plugin-svgr';
import monacoEditorPlugin from 'vite-plugin-monaco-editor-esm';

const env = loadEnv('production', process.cwd());
export default defineConfig({
  plugins: [react(), svgr({ svgrOptions: { icon: true } }), monacoEditorPlugin({
    customDistPath: (root: string, buildOutDir: string, base: string) => {
      console.log(`root: ${root}`);
      console.log(`buildOutDir: ${buildOutDir}`);
      console.log(`base: ${base}`);
      return `${env.VITE_OUT_DIR}/${env.VITE_PUBLIC_URL}/monacoeditorwork`
    },
    languageWorkers: ['editorWorkerService', 'typescript', 'json'],
  }),],
  base: `${env.VITE_PUBLIC_URL}/`,
  build: {
    outDir: `${env.VITE_OUT_DIR}/${env.VITE_PUBLIC_URL}`,
    emptyOutDir: true
  }
})

console.log(`VITE_OUT_DIR: ${env.VITE_OUT_DIR}`);
console.log(`VITE_PUBLIC_URL: ${env.VITE_PUBLIC_URL}`);