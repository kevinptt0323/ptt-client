import { encode, decode } from 'iconv-lite';

const CHARSET = 'big5';

class pttio {
  constructor(config) {
    this.config = config;
    this.initWS();
  }
  initWS() {
    const socket = new WebSocket(this.config.url);
    socket.onopen = () => {
      this._onopen();
    };

    socket.onmessage = (msg) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const msg = decode(new Uint8Array(e.target.result), this.config.charset);
        this._onmessage(msg);
      }
      reader.readAsArrayBuffer(msg.data);
    };

    this.socket = socket;
  }

  send(str) {
    const socket = this.socket;
    socket.send(encode(str, this.config.charset));
  }

  _onopen() {
    if (typeof this.onmessage === 'function') {
      this.onopen();
    }
  }

  _onmessage(msg) {
    if (typeof this.onmessage === 'function') {
      this.onmessage(msg);
    }
  }
}

export default pttio;
