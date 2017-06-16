import EventEmitter from 'eventemitter3';
import { keyboard as key } from '../../utils';
import Terminal2 from 'terminal.js';

class bot extends EventEmitter {
  constructor(Socket, config) {
    super();
    this._parser = config.parser;
    this._term2 = new Terminal2({columns: 80, rows: 24});

    const socket = new Socket(config);
    socket.onconnect = this.emit.bind(this, 'connect');
    socket.onmessage = this.emit.bind(this, 'message');
    socket.connect();

    this.on('message', (msg) => {
      this._term2.write(msg);
      this.emit('redraw', this._term2.toString());
    });
    this._socket = socket;
  }

  async login(username, password) {
    return new Promise(resolve => {
      this._socket.send(`${username}${key.Enter}${password}${key.Enter}`);
      setTimeout(() => {
        resolve(this._term2.toString());
      }, 2000);
    });
  }
}

export default bot;
