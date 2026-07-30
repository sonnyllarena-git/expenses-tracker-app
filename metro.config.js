const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Drizzle's generated migrations.js imports raw .sql files directly;
// Metro needs to treat them as source (for babel-plugin-inline-import)
// rather than as opaque binary assets.
config.resolver.sourceExts.push('sql');

module.exports = config;
