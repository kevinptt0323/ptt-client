const config = {
  name: 'PTT',
  url: 'wss://ws.ptt.cc/bbs',
  charset: 'big5',
  origin: 'https://robertabcd.github.io',
  protocol: 'websocket',
  timeout: 200,
  blobSize: 1024,
  terminal: {
    columns: 80,
    rows: 24,
  },
  parser: require('./parser'),
};

export default config;
