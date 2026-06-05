import * as esbuild from 'esbuild';
import { copyFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function build() {
  console.log('Building main process...');
  await esbuild.build({
    entryPoints: [join(__dirname, 'src/main.ts')],
    outfile: join(__dirname, 'dist/main.js'),
    bundle: true,
    platform: 'node',
    target: 'node22',
    format: 'cjs',
    external: ['electron', 'node-pty'],
    sourcemap: true,
  });

  console.log('Building preload...');
  await esbuild.build({
    entryPoints: [join(__dirname, 'src/preload.ts')],
    outfile: join(__dirname, 'dist/preload.js'),
    bundle: true,
    platform: 'node',
    target: 'node22',
    format: 'cjs',
    external: ['electron'],
    sourcemap: true,
  });

  console.log('Building renderer...');
  await esbuild.build({
    entryPoints: [join(__dirname, 'src/renderer/index.tsx')],
    outfile: join(__dirname, 'dist/renderer/index.js'),
    bundle: true,
    platform: 'browser',
    target: 'es2022',
    format: 'esm',
    sourcemap: true,
    define: {
      'process.env.NODE_ENV': JSON.stringify('production'),
    },
  });

  mkdirSync(join(__dirname, 'dist/renderer/styles'), { recursive: true });
  copyFileSync(
    join(__dirname, 'src/renderer/index.html'),
    join(__dirname, 'dist/renderer/index.html')
  );
  copyFileSync(
    join(__dirname, 'src/renderer/styles/app.css'),
    join(__dirname, 'dist/renderer/styles/app.css')
  );

  // Copy xterm CSS
  const xtermCssSrc = join(__dirname, 'node_modules/@xterm/xterm/css/xterm.css');
  if (existsSync(xtermCssSrc)) {
    copyFileSync(xtermCssSrc, join(__dirname, 'dist/renderer/styles/xterm.css'));
  }

  console.log('Build complete!\n');
  console.log('Run with: npm start');
}

build().catch((e) => {
  console.error('Build failed:', e);
  process.exit(1);
});
