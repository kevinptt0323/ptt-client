import './global';

global.WebSocket = require('ws');

const tests = [
  './connection.ts',
  './articles.ts',
  './favorite.ts',
];

tests.forEach(test => {
  require(test);
});
