import { defineConfig, Plugin } from 'vite';
import babel from 'vite-plugin-babel';
import { readFileSync, readdirSync, statSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

function swPlugin(): Plugin {
  return {
    name: 'sw-inject-manifest',
    apply: 'build',
    closeBundle() {
      const distDir = join(process.cwd(), 'dist');
      const assetsDir = join(distDir, 'assets');

      const rootFiles = [
        '/',
        ...readdirSync(distDir)
          .filter((f) => statSync(join(distDir, f)).isFile() && f !== 'sw.js')
          .map((f) => `/${f}`),
      ];

      const assetFiles = existsSync(assetsDir)
        ? readdirSync(assetsDir).map((f) => `/assets/${f}`)
        : [];

      const manifest = [...rootFiles, ...assetFiles];
      const version = createHash('md5').update(manifest.join(',')).digest('hex').slice(0, 8);

      const swPath = join(distDir, 'sw.js');
      let sw = readFileSync(swPath, 'utf-8');
      sw = sw
        .replace('__CACHE_VERSION__', version)
        .replace('__PRECACHE_MANIFEST__', JSON.stringify(manifest, null, 2));
      writeFileSync(swPath, sw);
    },
  };
}

export default defineConfig({
  server: {
    port: 3000,
    open: true,
  },
  build: {
    target: 'esnext',
    outDir: 'dist',
  },
  plugins: [
    babel(),
    swPlugin(),
  ]
});
