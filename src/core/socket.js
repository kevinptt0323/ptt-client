import EventEmitter from 'eventemitter3';
import { encode, decode } from 'iconv-lite';

class Socket extends EventEmitter {
  constructor(config) {
    super();
    this._config = config;
  }

  connect() {
    let socket;
    if (typeof WebSocket !== "undefined") {
      socket = new WebSocket(this._config.url);
    } else {
      const options = {};
      if (this._config.origin)
        options.origin = this._config.origin;
      const ws = require('ws');
      socket = new ws(this._config.url, options);
    }
    socket.addEventListener('open',  this.emit.bind(this, 'connect'));
    socket.addEventListener('close', this.emit.bind(this, 'disconnect'));
    socket.addEventListener('error', this.emit.bind(this, 'error'));

    let buffer = "";
    let timeoutHandler;
    socket.binaryType = "arraybuffer";
    socket.addEventListener('message', ({ data }) => {
      clearTimeout(timeoutHandler);
      buffer += decode(new Uint8Array(data), this._config.charset);
      if (data.byteLength < this._config.blobSize) {
        this.emit('message', buffer);
        buffer = "";
      } else if (data.byteLength === this._config.blobSize) {
        timeoutHandler = setTimeout(() => {
          this.emit('message', buffer);
          buffer = "";
        }, this._config.timeout);
      } else if (data.byteLength > this._config.blobSize) {
        throw new Error(`Receive message length(${data.byteLength}) greater than buffer size(${this._config.blobSize})`);
      }
    });

    this._socket = socket;
  }

  send(str) {
    const socket = this._socket;
    socket.send(encode(str, this._config.charset));
  }
}

export default Socket;
