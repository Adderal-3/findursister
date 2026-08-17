/**
 * 回归专用：把 scene.ts + items.ts + tasks.ts + itemGeometry.ts 打成独立 ESM 包，
 * 供 Node 侧以与浏览器相同的代码路径确定性复刻关卡场景（种子化 Math.random）。
 *
 * items.ts 里的 import.meta.glob 是 Vite 专属语法，这里用插件替换为占位实现
 * （场景生成只用 id/tags/geometry，不触碰图片 URL）。
 *
 * 产物：tools/regression/.gen/scene-bundle.mjs（每次运行重新生成）
 */
import { build } from 'esbuild';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const outDir = join(root, 'tools', 'regression', '.gen');
mkdirSync(outDir, { recursive: true });

const entrySource = [
  `export { generateScene, SCENE_SCALE, itemMatchesTask } from '${join(root, 'src', 'game', 'scene.ts').replaceAll('\\', '/')}';`,
  `export { ITEMS, CATEGORIES, COLLECTIBLE_ITEMS } from '${join(root, 'src', 'game', 'items.ts').replaceAll('\\', '/')}';`,
  `export { getTaskRule, categoryTaskRule, TASK_RULES } from '${join(root, 'src', 'game', 'tasks.ts').replaceAll('\\', '/')}';`,
  `export { ITEM_GEOMETRY } from '${join(root, 'src', 'game', 'itemGeometry.ts').replaceAll('\\', '/')}';`,
].join('\n');

await build({
  stdin: { contents: entrySource, resolveDir: root, loader: 'ts' },
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  outfile: join(outDir, 'scene-bundle.mjs'),
  logLevel: 'silent',
  plugins: [{
    name: 'shim-vite-glob',
    setup(build) {
      build.onLoad({ filter: /[\\/]src[\\/]game[\\/]items\.ts$/ }, async (args) => {
        const fs = await import('node:fs');
        let code = await fs.promises.readFile(args.path, 'utf8');
        code = code.replace(
          /const ITEM_ASSETS = import\.meta\.glob[\s\S]*?\);/,
          'const ITEM_ASSETS: Record<string, string> = {};',
        );
        code = code.replace(
          /function itemAssetUrl\(id: string\): string \{[\s\S]*?\n\}/,
          'function itemAssetUrl(id: string): string { return id; }',
        );
        return { contents: code, loader: 'ts' };
      });
    },
  }],
});

console.log('scene-bundle built -> tools/regression/.gen/scene-bundle.mjs');
