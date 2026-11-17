import type { NextConfig } from 'next';
import path from 'node:path';
import { BASE } from './lib/base';
// devIndicators off: the dev badge sits on the bottom-left controls (canvas zoom, sticky primary action)
const nextConfig: NextConfig = { basePath: BASE, turbopack: { root: path.join(__dirname, '..') }, devIndicators: false };
export default nextConfig;
