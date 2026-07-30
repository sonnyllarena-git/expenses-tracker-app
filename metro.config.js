const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Drizzle's generated migrations.js imports raw .sql files directly;
// Metro needs to treat them as source (for babel-plugin-inline-import)
// rather than as opaque binary assets.
config.resolver.sourceExts.push('sql');

// expo-sqlite's web implementation loads a wa-sqlite .wasm binary as an asset.
config.resolver.assetExts.push('wasm');

// expo-sqlite's web backend (wa-sqlite) needs SharedArrayBuffer, which browsers
// only expose on cross-origin-isolated pages. Dev-server only: a static/hosted
// web build would need these same two headers set by whatever serves it.
config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => (req, res, next) => {
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    return middleware(req, res, next);
  },
};

module.exports = config;
