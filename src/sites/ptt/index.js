export const config = {
  name: 'PTT',
  url: 'wss://ws.ptt.cc/bbs',
  charset: 'big5',
  origin: 'https://robertabcd.github.io',
  terminal: {
    columns: 80,
    rows: 24,
  },
  parser: require('./parser'),
};
export bot from './bot';

