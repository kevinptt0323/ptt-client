import { encode, decode } from 'iconv-lite';
import ws from 'ws';

class Socket {
  constructor(config) {
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
      socket = new ws(this._config.url, options);
    }
    socket.addEventListener('open', () => {
      this._onconnect();
    });

    let buffer = "";
    let timeoutHandler;
    socket.binaryType = "arraybuffer";
    socket.addEventListener('message', (event) => {
      clearTimeout(timeoutHandler);
      buffer += decode(new Uint8Array(event.data), this._config.charset);
      if (event.data.byteLength < this._config.blobSize) {
        this._onmessage(buffer);
        buffer = "";
      } else if (event.data.byteLength === this._config.blobSize) {
        timeoutHandler = setTimeout(() => {
          this._onmessage(buffer);
          buffer = "";
        }, this._config.timeout);
      } else if (event.data.byteLength > this._config.blobSize) {
        throw `Receive message length(${event.data.byteLength}) greater than buffer size(${this._config.blobSize})`;
      }
    });

    this._socket = socket;
  }

  send(str) {
    const socket = this._socket;
    socket.send(encode(str, this._config.charset));
  }

  _onconnect() {
    if (typeof this.onconnect === 'function') {
      this.onconnect();
    }
  }

  _onmessage(msg) {
    if (typeof this.onmessage === 'function') {
      this.onmessage(msg);
    }
  }
}

export default Socket;
