import Config from '../../config';

const config: Config = {
  name: 'PTT',
  url: 'wss://ws.ptt.cc/bbs',
  charset: 'utf8',
  origin: 'https://www.ptt.cc',
  protocol: 'websocket',
  timeout: 200,
  blobSize: 1024,
  preventIdleTimeout: 30,
  terminal: {
    columns: 80,
    rows: 24,
  },
};

export default config;
