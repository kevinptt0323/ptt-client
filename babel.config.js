"use strict";

module.exports = function(api) {
  api.cache(true);
  const config = {
    presets: [
      "@babel/env",
      "@babel/preset-typescript"
    ],
    plugins: [
      "@babel/plugin-proposal-export-default-from",
      ["@babel/plugin-proposal-class-properties", { loose: false }],
      "@babel/plugin-proposal-object-rest-spread",
      ["@babel/plugin-transform-runtime", { regenerator: true }],
    ]
  }
  return config;
}
