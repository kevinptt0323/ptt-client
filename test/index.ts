import './global';

global.WebSocket = require('ws');

const tests = [
  './connection.ts',
  './article.ts',
  './board.ts',
  './mail.ts',
];

tests.forEach(test => {
  require(test);
});
