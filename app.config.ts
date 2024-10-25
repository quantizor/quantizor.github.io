import { defineConfig } from '@solidjs/start/config';
import tsConfigPaths from 'vite-tsconfig-paths';

export default defineConfig({ vite: { plugins: [tsConfigPaths()] }, server: { preset: 'github-pages' }, ssr: false });
