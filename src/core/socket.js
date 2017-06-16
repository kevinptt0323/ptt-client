import { encode, decode } from 'iconv-lite';

const CHARSET = 'big5';

class socket {
  constructor(config) {
    this.config = config;
  }

  connect() {
    const socket = new WebSocket(this.config.url);
    socket.addEventListener('open', () => {
      this._onconnect();
    });

    socket.addEventListener('message', (msg) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const msg = decode(new Uint8Array(e.target.result), this.config.charset);
        this._onmessage(msg);
      }
      reader.readAsArrayBuffer(msg.data);
    });

    this._socket = socket;
  }

  send(str) {
    const socket = this._socket;
    socket.send(encode(str, this.config.charset));
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

export default socket;
