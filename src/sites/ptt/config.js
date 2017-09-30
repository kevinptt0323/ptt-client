const config = {
  name: 'PTT',
  url: 'wss://ws.ptt.cc/bbs',
  charset: 'big5',
  origin: 'https://www.ptt.cc',
  protocol: 'websocket',
  timeout: 200,
  blobSize: 1024,
  preventIdle: true,
  terminal: {
    columns: 80,
    rows: 24,
  },
};

export default config;
