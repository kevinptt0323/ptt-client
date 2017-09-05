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

    socket.binaryType = "arraybuffer";
    socket.addEventListener('message', (event) => {
      const msg = decode(new Uint8Array(event.data), this._config.charset);
      this._onmessage(msg);
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
