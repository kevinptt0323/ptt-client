import { encodeSync } from 'uao-js';

const encode = (str, config) => {
  return Buffer.from(encodeSync(str));
};

export default encode;
