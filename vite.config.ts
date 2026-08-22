import fs from 'fs';
import path from 'path';
import {defineConfig, Plugin} from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

function spaFallbackPlugin(): Plugin {
  return {
    name: 'spa-fallback-plugin',
    closeBundle() {
      const distDir = path.resolve(__dirname, 'dist');
      const indexHtml = path.join(distDir, 'index.html');
      if (fs.existsSync(indexHtml)) {
        fs.copyFileSync(indexHtml, path.join(distDir, '404.html'));
        const titrationDir = path.join(distDir, 'titration');
        if (!fs.existsSync(titrationDir)) {
          fs.mkdirSync(titrationDir, { recursive: true });
        }
        fs.copyFileSync(indexHtml, path.join(titrationDir, 'index.html'));
      }
    },
  };
}

export default defineConfig(() => {
  return {
    // Served from the custom domain trscienceclub.org (configured in the repo's
    // GitHub Pages settings, not a checked-in CNAME file) at the domain root, not
    // a /Turtle-Rock-Science-Club/ subpath, so built asset URLs must be root-relative.
    base: '/',
    plugins: [react(), tailwindcss(), spaFallbackPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
