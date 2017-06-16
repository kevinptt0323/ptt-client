export const config = {
  name: 'PTT',
  url: 'wss://ws.ptt.cc/bbs',
  charset: 'big5',
  parser: require('./parser'),
};
export bot from './bot';

