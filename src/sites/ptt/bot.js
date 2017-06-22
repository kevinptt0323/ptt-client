import EventEmitter from 'eventemitter3';
import sleep from 'sleep-promise';
import { keyboard as key } from '../../utils';
import Terminal2 from 'terminal.js';

const setIntevalUntil = (async (_func, _validate, _inteval) => {
  await sleep(_inteval);
  let ret = await _func();
  if (_validate(ret)) return ret;
  else return setIntevalUntil(_func, _validate, _inteval);
});

class bot extends EventEmitter {
  constructor(Socket, config) {
    super();
    this._parser = config.parser;
    this._term2 = new Terminal2(config.terminal);
    this._state = bot.initialState;

    const socket = new Socket(config);
    socket.onconnect = this.emit.bind(this, 'connect');
    socket.onmessage = this.emit.bind(this, 'message');
    socket.connect();

    this.on('message', (msg) => {
      this._state.waiting = false;
      this._term2.write(msg);
      this.emit('redraw', this._term2.toString());
    });
    this._socket = socket;
  }

  get state() {
    return {...this._state};
  }

  send(msg, resend=false) {
    if (resend || !this._state.waiting) {
      this._state.waiting = true;
      this._socket.send(msg);
    }
  }

  async login(username, password) {
    if (this._state.login) return;
    this.send(`${username}${key.Enter}${password}${key.Enter}`);
    let ret = await setIntevalUntil(this._checkLogin.bind(this), ret => ret !== null, 400);
    if (ret) this._state.login = true;
    return ret;
  }

  _checkLogin() {
    const getLine = this._term2.state.getLine.bind(this._term2.state);
    if (getLine(21).str.includes("密碼不對或無此帳號")) {
      this.emit('login.failed');
      return false;
    } else if (getLine(22).str.includes("您想刪除其他重複登入的連線嗎")) {
      this.send(`y${key.Enter}`);
    } else if (getLine(23).str.includes("按任意鍵繼續")) {
      this.send(` `);
    } else if (getLine(23).str.includes("您要刪除以上錯誤嘗試的記錄嗎")) {
      this.send(`y${key.Enter}`);
    } else if (getLine(0).str.includes("主功能表")) {
      this.emit('login.success');
      return true;
    }
    return null;
  }

  async getArticles(boardname, offset=0) {
    await this.enterBoard(boardname);
    const getLine = this._term2.state.getLine.bind(this._term2.state);
    let articles = [];
    for(let i=3; i<=22; i++) {
      let line = getLine(i).str;
      articles.push({
        id: line.slice(0, 7).trim(),
        push: line.slice(9, 11).trim(),
        date: line.slice(11, 16).trim(),
        author: line.slice(17, 29).trim(),
        status: line.slice(30, 32).trim(),
        title: line.slice(32).trim()
      });
    }
    return articles;
  }

  async enterBoard(boardname) {
    this.send(`s${boardname}${key.Enter}`);
    boardname = boardname.toLowerCase();
    return await setIntevalUntil(() => {
      const getLine = this._term2.state.getLine.bind(this._term2.state);
      if (0) {
        // check board exist
        return false;
      } else if (getLine(23).str.includes("按任意鍵繼續")) {
        this.send(` `);
      } else if (getLine(0).str.toLowerCase().includes(`《${boardname}》`)) {
        return true;
      }
      return null;
    }, ret => {console.log(ret); return (ret !== null);}, 400);
  }
}

bot.initialState = {
  waiting: false,
  login: false,
};

export default bot;
