import type { NextConfig } from 'next';
import path from 'node:path';
// devIndicators off: the dev badge sits on the bottom-left controls (canvas zoom, sticky primary action)
const nextConfig: NextConfig = { turbopack: { root: path.join(__dirname, '..') }, devIndicators: false };
export default nextConfig;
