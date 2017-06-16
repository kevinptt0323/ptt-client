import EventEmitter from 'eventemitter3';
import Socket from './socket';
import { keyboard as key } from './utils';

class pttio extends EventEmitter {
  constructor(config) {
    super();
    const socket = new Socket(config);
    socket.onconnect = this.emit.bind(this, 'connect');
    socket.onmessage = this.emit.bind(this, 'message');
    socket.connect();
    this.on('message', (msg) => {
      this.lastmessage = msg;
    });
    this._socket = socket;
  }

  async login(username, password) {
    return new Promise(resolve => {
      this._socket.send(`${username}${key.Enter}${password}${key.Enter}`);
      setTimeout(() => {
        resolve(this.lastmessage);
      }, 2000);
    });
  }
}

export default pttio;
