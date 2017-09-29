global.WebSocket = require('ws');

const tests = [
  './connection.js',
  './articles.js',
  './favorite.js',
];

tests.forEach(test => {
  require(test);
});
