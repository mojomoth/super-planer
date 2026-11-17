// This app's basePath (next.config.ts). Next prefixes it only for next/link, the router and redirect():
// raw fetch('/api/…'), <img src> and <a href> to this app's own paths, and image URLs stored in the DB, go through BASE.
export const BASE = '/plan';
