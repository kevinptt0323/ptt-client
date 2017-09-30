import { decodeSync } from 'uao-js';

const decode = (buffer, config) => {
  let msg;
  if (config.charset) {
    try {
      msg = decodeURIComponent(buffer.reduce((str, c) => `${str}%${c<16 ?'0':''}${c.toString(16)}`, ''));
      config.charset = '';
    } catch (e) {
      if (e instanceof URIError) {
        msg = decodeSync(String.fromCharCode(...buffer));
      } else {
        throw e;
      }
    }
  } else {
    msg = decodeURIComponent(buffer.reduce((str, c) => `${str}%${c<16 ?'0':''}${c.toString(16)}`, ''));
  }
  return msg;
};

export default decode;
