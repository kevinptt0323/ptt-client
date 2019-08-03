import EventEmitter from 'eventemitter3';
import sleep from 'sleep-promise';
import Terminal from 'terminal.js';

import key from '../../utils/keyboard';
import {
  getWidth,
  indexOfWidth,
  substrWidth,
} from '../../utils/char';

import defaultConfig from './config';

class Bot extends EventEmitter {
  static initialState = {
    connect: false,
    login: false,
  };
  static forwardEvents = [
    'message',
    'error',
  ];
  searchCondition = {
    searchType: "",
    condition: ""
  };
  
  constructor(config) {
    super();
    config = {...defaultConfig, ...config};

    this._term = new Terminal(config.terminal);
    this._state = { ...Bot.initialState };
    this._term.state.setMode('stringWidth', 'dbcs');

    let Socket;
    switch (config.protocol.toLowerCase()) {
      case 'websocket':
      case 'ws':
      case 'wss':
        Socket = require("../../core/socket").default;
        break;
      case 'telnet':
      case 'ssh':
      default:
        Socket = null;
    }

    if (Socket === null) {
      throw `Invalid protocol: ${config.protocol}`;
    }

    const socket = new Socket(config);
    socket.connect();

    Bot.forwardEvents.forEach(e => {
      socket.on(e, this.emit.bind(this, e));
    });
    socket
      .on('connect', (...args) => {
        this._state.connect = true;
        this.emit('connect', ...args);
        this.emit('stateChange', this.state);
      })
      .on('disconnect', (closeEvent, ...args) => {
        this._state.connect = false;
        this.emit('disconnect', closeEvent, ...args);
        this.emit('stateChange', this.state);
      })
      .on('message', (msg) => {
        this._term.write(msg);
        this.emit('redraw', this._term.toString());
      })
      .on('error', (err) => {
      });
    this.socket = socket;
    this.config = config;
  }

  get state() {
    return {...this._state};
  }

  getLine = (n) => {
    return this._term.state.getLine(n);
  };

  async getLines() {
    const { getLine } = this;
    const lines = [];

    lines.push(getLine(0).str);

    while (!getLine(23).str.includes("100%")) {
      for(let i=1; i<23; i++) {
        lines.push(getLine(i).str);
      }
      await this.send(key.PgDown);
    }

    const lastLine = lines[lines.length-1];
    for(let i=0; i<23; i++) {
      if (getLine(i).str == lastLine) {
        for(let j=i+1; j<23; j++) {
          lines.push(getLine(j).str);
        }
        break;
      }
    }

    while (lines.length > 0 && lines[lines.length-1].length == 0) {
      lines.pop();
    }

    return lines;
  }

  async send(msg) {
    this.config.preventIdle && this.preventIdle();
    return new Promise(resolve => {
      if (this.state.connect) {
        this.socket.send(msg);
        this.once('message', msg => {
          resolve(msg);
        });
      }
    });
  }

  preventIdle(timeout = 60) {
    clearTimeout(this.preventIdleHandler);
    if (this.state.login) {
      this.preventIdleHandler = setTimeout(() => {
        this.send(`${key.CtrlU}${key.ArrowLeft}`);
      }, timeout * 1000);
    }
  }

  async login(username, password, kick=true) {
    if (this.state.login) return;
    username = username.replace(/,/g, '');
    await this.send(`${username},${key.Enter}${password}${key.Enter}`);
    let ret;
    while ((ret = await this._checkLogin(kick)) === null) {
      await sleep(400);
    }
    if (ret) {
      const { _state: state } = this;
      state.login = true;
      state.position = {
        boardname: "",
      };
      this.emit('stateChange', this.state);
    }
    return ret;
  }

  async logout() {
    if (!this.state.login) return;
    await this.send(`G${key.Enter}Y${key.Enter.repeat(2)}`);
    this._state.login = false;
    this.emit('stateChange', this.state);
    return true;
  }

  async _checkLogin(kick) {
    const { getLine } = this;

    if (getLine(21).str.includes("密碼不對或無此帳號")) {
      this.emit('login.failed');
      return false;
    } else if (getLine(22).str.includes("您想刪除其他重複登入的連線嗎")) {
      await this.send(`${key.Backspace}${kick?'y':'n'}${key.Enter}`);
    } else if (getLine(23).str.includes("請勿頻繁登入以免造成系統過度負荷")) {
      await this.send(`${key.Enter}`);
    } else if (getLine(23).str.includes("按任意鍵繼續")) {
      await this.send(`${key.Enter}`);
    } else if (getLine(23).str.includes("您要刪除以上錯誤嘗試的記錄嗎")) {
      await this.send(`${key.Backspace}y${key.Enter}`);
    } else if ((getLine(22).str+getLine(23).str).toLowerCase().includes("y/n")) {
      await this.send(`${key.Backspace}y${key.Enter}`);
    } else if (getLine(23).str.includes("我是")) {
      this.emit('login.success');
      return true;
    } else {
      await this.send(`q`);
    }
    return null;
  }

  _checkArticleWithHeader() {
    const authorArea = substrWidth('dbcs', this.getLine(0).str, 0, 6).trim();
    return authorArea === "作者";
  }

  searchConditionIsSet() {
    if (this.searchCondition.searchType) {
      return true;
    }
    return false;
  }

  async getArticles(boardname, offset=0) {
    await this.enterBoard(boardname);
    if (this.searchConditionIsSet()){
      await this.send(`${this.searchCondition.searchType}${this.searchCondition.condition}${key.Enter}`);
    }

    offset |= 0;
    if (offset > 0) {
      offset = Math.max(offset-9, 1);
      await this.send(`${key.End}${key.End}${offset}${key.Enter}`);
    }
    const { getLine } = this;
    let articles = [];
    for(let i=3; i<=22; i++) {
      const line = getLine(i).str;
      const article = {
        sn:     substrWidth('dbcs', line, 1,   7).trim() | 0,
        push:   substrWidth('dbcs', line, 9,   2).trim(),
        date:   substrWidth('dbcs', line, 11,  5).trim(),
        author: substrWidth('dbcs', line, 17, 12).trim(),
        status: substrWidth('dbcs', line, 30,  2).trim(),
        title:  substrWidth('dbcs', line, 32    ).trim(),
        fixed:  substrWidth('dbcs', line, 1,   7).trim().includes('★'),
      };
      articles.push(article);
    }
    // fix sn
    if (articles.length >= 2 && articles[0].sn === 0) {
      for(let i=1; i<articles.length; i++) {
        if (articles[i].sn !== 0) {
          articles[0].sn = articles[i].sn - i;
          break;
        }
      }
    }
    for(let i=1; i<articles.length; i++) {
      articles[i].sn = articles[i-1].sn+1;
    }
    await this.enterIndex();
    return articles.reverse();
  }

  async getArticle(boardname, sn) {
    await this.enterBoard(boardname);
    const { getLine } = this;

    await this.send(`${sn}${key.Enter}${key.Enter}`);

    const hasHeader = this._checkArticleWithHeader();

    let article = {
      sn,
      author: "",
      title: "",
      timestamp: "",
      lines: [],
    };

    if (this._checkArticleWithHeader()) {
      article.author    = substrWidth('dbcs', getLine(0).str, 7, 50).trim();
      article.title     = substrWidth('dbcs', getLine(1).str, 7    ).trim();
      article.timestamp = substrWidth('dbcs', getLine(2).str, 7    ).trim();
    }

    article.lines = await this.getLines();

    await this.enterIndex();
    return article;
  }

  async getFavorite(offsets=[]) {
    if (typeof offsets === "string") {
      offsets |= 0;
    }
    if (typeof offsets === "number") {
      offsets = [offsets];
    }
    await this.enterFavorite(offsets);
    const { getLine } = this;

    const favorites = [];

    for(let i=3; i<23; i++) {
      let line = getLine(i).str;
      if (line.trim() === '') break;
      let favorite = {
        bn:        substrWidth('dbcs', line,  3,  4).trim() | 0,
        read:      substrWidth('dbcs', line,  8,  2).trim() === '',
        boardname: substrWidth('dbcs', line, 10, 12).trim(),
        category:  substrWidth('dbcs', line, 23,  4).trim(),
        title:     substrWidth('dbcs', line, 30, 31),
        users:     substrWidth('dbcs', line, 62,  5).trim(),
        admin:     substrWidth('dbcs', line, 67    ).trim(),
        folder:    false,
        divider:   false,
      };
      switch (favorite.boardname) {
        case 'MyFavFolder':
          favorite = {
            ...favorite,
            title:  substrWidth('dbcs', line, 30),
            users: '',
            admin: '',
            folder: true,
          };
          break;
        case '------------':
          favorite = {
            ...favorite,
            title:  substrWidth('dbcs', line, 30),
            users: '',
            admin: '',
            divider: true,
          };
          break;
        default:
          break;
      }
      favorites.push(favorite);
    }

    await this.enterIndex();
    return favorites;
  }

  async getMails(offset=0) {
    await this.enterMail();
    offset |= 0;
    if (offset > 0) {
      offset = Math.max(offset-9, 1);
      await this.send(`${key.End}${key.End}${offset}${key.Enter}`);
    }

    const { getLine } = this;

    let mails = [];
    for(let i=3; i<=22; i++) {
      const line = getLine(i).str;
      const mail = {
        sn:     substrWidth('dbcs', line, 1,   5).trim() | 0,
        date:   substrWidth('dbcs', line, 9,   5).trim(),
        author: substrWidth('dbcs', line, 15, 12).trim(),
        status: substrWidth('dbcs', line, 30,  2).trim(),
        title:  substrWidth('dbcs', line, 33    ).trim(),
      };
      mails.push(mail);
    }

    await this.enterIndex();
    return mails.reverse();
  }

  async getMail(sn) {
    await this.enterMail();
    const { getLine } = this;

    await this.send(`${sn}${key.Enter}${key.Enter}`);

    const hasHeader = this._checkArticleWithHeader();

    let mail = {
      sn,
      author: "",
      title: "",
      timestamp: "",
      lines: [],
    };

    if (this._checkArticleWithHeader()) {
      mail.author    = substrWidth('dbcs', getLine(0).str, 7, 50).trim();
      mail.title     = substrWidth('dbcs', getLine(1).str, 7    ).trim();
      mail.timestamp = substrWidth('dbcs', getLine(2).str, 7    ).trim();
    }

    mail.lines = await this.getLines();

    await this.enterIndex();
    return mail;
  }

  async enterIndex() {
    await this.send(`${key.ArrowLeft.repeat(10)}`);
    return true;
  }

  async enterBoard(boardname) {
    await this.send(`s${boardname}${key.Enter} ${key.Home}${key.End}`);
    boardname = boardname.toLowerCase();
    const { getLine } = this;
    
    if (getLine(23).str.includes("按任意鍵繼續")) {
      await this.send(` `);
    }
    if (getLine(0).str.toLowerCase().includes(`${boardname}`)) {
      this._state.position.boardname = boardname;
      this.emit('stateChange', this.state);
      return true;
    }
    return false;
  }

  async enterFavorite(offsets=[]) {
    const enterOffsetMessage =
      offsets.map(offset => `${offset}${key.Enter.repeat(2)}`).join();
    await this.send(`F${key.Enter}${enterOffsetMessage}`);
    return true;
  }

  async enterMail() {
    await this.send(`M${key.Enter}R${key.Enter}${key.Home}${key.End}`);
    return true;
  }
}

Bot.prototype.setSearchCondition = function (searchType, condition) {
  switch (searchType) {
    case 'push':
      this.searchCondition.searchType = 'Z';
      break;
    case 'author':
      this.searchCondition.searchType = 'a';
      break;
    case 'title':
      this.searchCondition.searchType = '/';
      break;
    default:
      throw `Invalid condition: ${searchType}`;
  }
  this.searchCondition.condition = condition;
}

Bot.prototype.resetSearchCondition = function() {
  this.searchCondition.searchType = "";
  this.searchCondition.condition = "";
}

export default Bot;
