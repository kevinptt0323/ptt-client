import { encode, decode } from 'iconv-lite';

class pttio {
  constructor(url = 'wss://ws.ptt.cc/bbs') {
    this.initWS(url);
  }
  initWS(url) {
    const socket = new WebSocket(url);
    socket.onopen = () => {
      this._onopen();
    };

    socket.onmessage = (msg) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        this._onmessage(decode(new Uint8Array(e.target.result), 'big5'));
      }
      reader.readAsArrayBuffer(msg.data);
    };

    this.socket = socket;
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
