import EventEmitter from 'eventemitter3';
import sleep from 'sleep-promise';
import { keyboard as key } from '../../utils';
import Terminal2 from 'terminal.js';

class bot extends EventEmitter {
  constructor(Socket, config) {
    super();
    this._parser = config.parser;
    this._term2 = new Terminal2({columns: 80, rows: 24});
    this.state = {waiting: false};

    const socket = new Socket(config);
    socket.onconnect = this.emit.bind(this, 'connect');
    socket.onmessage = this.emit.bind(this, 'message');
    socket.connect();

    this.on('message', (msg) => {
      this.state.waiting = false;
      this._term2.write(msg);
      this.emit('redraw', this._term2.toString());
    });
    this._socket = socket;
  }

  send(msg, resend=false) {
    if (resend || !this.state.waiting) {
      this.state.waiting = true;
      this._socket.send(msg);
    }
  }

  async login(username, password) {
    this.send(`${username}${key.Enter}${password}${key.Enter}`);
    await this._checkLogin();
    return this._term2.toString();
  }

  async _checkLogin() {
    await sleep(1000);
    const getLine = this._term2.state.getLine.bind(this._term2.state);
    if (getLine(21).str.includes("密碼不對或無此帳號。請檢查大小寫及有無輸入錯誤。")) {
      this.emit('login.failed');
    } else if (getLine(22).str.includes("您想刪除其他重複登入的連線嗎")) {
      this.send(`y${key.Enter}`);
    } else if (getLine(23).str.includes("請按任意鍵繼續")) {
      this.send(` `);
    } else if (getLine(23).str.includes("您要刪除以上錯誤嘗試的記錄嗎")) {
      this.send(`y${key.Enter}`);
    } else if (getLine(0).str.includes("主功能表")) {
      this.emit('login.success');
      return;
    }
    await this._checkLogin();
  }

  async getPosts(boardname, offset=0) {
    return new Promise(resolve => {
      this.send(`s${boardname}${key.Enter}`);
    });
  }
}

export default bot;
