import EventEmitter from 'eventemitter3';
import sleep from 'sleep-promise';
import Terminal from 'terminal.js';

import Socket from '../../socket';
import {
  decode,
  encode,
  keymap as key,
} from '../../utils';
import {
  getWidth,
  indexOfWidth,
  substrWidth,
} from '../../utils/char';
import Config from '../../config';

import defaultConfig from './config';
import {Article} from './Article';
import {Board} from './Board';

class Condition {
  private typeWord: string;
  private criteria: string;

  constructor(type: 'push'|'author'|'title', criteria: string) {
    switch (type) {
      case 'push':
        this.typeWord = 'Z';
        break;
      case 'author':
        this.typeWord = 'a';
        break;
      case 'title':
        this.typeWord = '/';
        break;
      default:
        throw `Invalid condition: ${type}`;
    }
    this.criteria = criteria;
  }
  
  toSearchString(): string {
    return `${this.typeWord}${this.criteria}`;
  }
}

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
    conditions: null,
    init: function() {
      this.conditions = [];
    },
    add: function(type, criteria) {
      this.conditions.push(new Condition(type, criteria));
    }
  };

  private config: Config;
  private term: Terminal;
  private _state: any;
  private currentCharset: string;
  private socket: Socket;
  private preventIdleHandler: ReturnType<typeof setTimeout>;
  
  constructor(config?: Config) {
    super();
    this.config = {...defaultConfig, ...config};
    this.init();
  }

  async init(): Promise<void> {
    const { config } = this;
    this.term = new Terminal(config.terminal);
    this._state = { ...Bot.initialState };
    this.term.state.setMode('stringWidth', 'dbcs');
    this.currentCharset = 'big5';

    switch (config.protocol.toLowerCase()) {
      case 'websocket':
      case 'ws':
      case 'wss':
        break;
      case 'telnet':
      case 'ssh':
      default:
        throw `Invalid protocol: ${config.protocol}`;
        break;
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
      .on('message', (data) => {
        if (this.currentCharset != this.config.charset && !this.state.login &&
            decode(data, 'utf8').includes('登入中，請稍候...')) {
          this.currentCharset = this.config.charset;
        }
        const msg = decode(data, this.currentCharset);
        this.term.write(msg);
        this.emit('redraw', this.term.toString());
      })
      .on('error', (err) => {
      });
    this.socket = socket;
  }

  get state(): any {
    return {...this._state};
  }

  getLine = (n) => {
    return this.term.state.getLine(n);
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

  send(msg: string): Promise<void> {
    this.config.preventIdleTimeout && this.preventIdle(this.config.preventIdleTimeout);
    return new Promise((resolve, reject) => {
      if (this.state.connect) {
        if (msg.length > 0) {
          this.socket.send(encode(msg, this.currentCharset));
          this.once('message', msg => {
            resolve(msg);
          });
        } else {
          console.warn(`Sending message with 0-length`);
          resolve();
        }
      } else {
        reject();
      }
    });
  }

  preventIdle(timeout: number): void {
    clearTimeout(this.preventIdleHandler);
    if (this.state.login) {
      this.preventIdleHandler = setTimeout(async () => {
        await this.send(key.CtrlU);
        await this.send(key.ArrowLeft);
      }, timeout * 1000);
    }
  }

  async login(username: string, password: string, kick: boolean=true): Promise<any> {
    if (this.state.login) return;
    username = username.replace(/,/g, '');
    if (this.config.charset === 'utf8') {
      username += ',';
    }
    await this.send(`${username}${key.Enter}${password}${key.Enter}`);
    let ret;
    while ((ret = await this.checkLogin(kick)) === null) {
      await sleep(400);
    }
    if (ret) {
      const { _state: state } = this;
      state.login = true;
      state.position = {
        boardname: "",
      };
      this.searchCondition.init();
      this.emit('stateChange', this.state);
    }
    return ret;
  }

  async logout(): Promise<boolean> {
    if (!this.state.login) return;
    await this.send(`G${key.Enter}Y${key.Enter.repeat(2)}`);
    this._state.login = false;
    this.emit('stateChange', this.state);
    return true;
  }

  private async checkLogin(kick: boolean): Promise<any> {
    const { getLine } = this;

    if (getLine(21).str.includes("密碼不對或無此帳號")) {
      this.emit('login.failed');
      return false;
    } else if (getLine(23).str.includes("請稍後再試")) {
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

  private checkArticleWithHeader(): boolean {
    const authorArea = substrWidth('dbcs', this.getLine(0).str, 0, 6).trim();
    return authorArea === "作者";
  }

  setSearchCondition(type: string, criteria: string): void {
    this.searchCondition.add(type, criteria);
  }
  
  resetSearchCondition(): void {
    this.searchCondition.init();
  }

  isSearchConditionSet(): boolean {
    return (this.searchCondition.conditions.length !== 0);
  }

  async getArticles(boardname: string, offset: number=0): Promise<Article[]> {
    await this.enterBoard(boardname);
    if (this.isSearchConditionSet()){
      let searchString = this.searchCondition.conditions.map(condition => condition.toSearchString()).join(key.Enter);
      await this.send(`${searchString}${key.Enter}`);
    }

    if (offset > 0) {
      offset = Math.max(offset-9, 1);
      await this.send(`${key.End}${key.End}${offset}${key.Enter}`);
    }
    const { getLine } = this;
    let articles: Article[] = [];
    for(let i=3; i<=22; i++) {
      const line = getLine(i).str;
      const article = Article.fromLine(line);
      article.boardname = boardname;
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

  async getArticle(boardname: string, sn: number, article: Article = new Article()): Promise<Article> {
    await this.enterBoard(boardname);
    if (this.isSearchConditionSet()){
      let searchString = this.searchCondition.conditions.map(condition => condition.toSearchString()).join(key.Enter);
      await this.send(`${searchString}${key.Enter}`);
    }
    const { getLine } = this;

    await this.send(`${sn}${key.Enter}${key.Enter}`);

    const hasHeader = this.checkArticleWithHeader();

    article.sn = sn;
    article.boardname = boardname;

    if (hasHeader) {
      article.author    = substrWidth('dbcs', getLine(0).str, 7, 50).trim();
      article.title     = substrWidth('dbcs', getLine(1).str, 7    ).trim();
      article.timestamp = substrWidth('dbcs', getLine(2).str, 7    ).trim();
    }

    article.lines = await this.getLines();

    await this.enterIndex();
    return article;
  }

  async getFavorite(offsets: number|number[]=[]) {
    if (typeof offsets === "number") {
      offsets = [offsets];
    }
    await this.enterFavorite(offsets);
    const { getLine } = this;

    const favorites: Board[] = [];

    while (true) {
      let stopLoop = false;
      for(let i=3; i<23; i++) {
        let line = getLine(i).str;
        if (line.trim() === '') {
          stopLoop = true;
          break;
        }
        let favorite = Board.fromLine(line);
        if (favorite.bn !== favorites.length + 1) {
          stopLoop = true;
          break;
        }
        favorites.push(favorite);
      }
      if (stopLoop) {
        break;
      }
      await this.send(key.PgDown);
    }

    await this.enterIndex();
    return favorites;
  }

  async getMails(offset: number=0) {
    await this.enterMail();
    if (offset > 0) {
      offset = Math.max(offset-9, 1);
      await this.send(`${key.End}${key.End}${offset}${key.Enter}`);
    }

    const { getLine } = this;

    let mails = [];
    for(let i=3; i<=22; i++) {
      const line = getLine(i).str;
      const mail = {
        sn:    +substrWidth('dbcs', line, 1,   5).trim(),
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

  async getMail(sn: number) {
    await this.enterMail();
    const { getLine } = this;

    await this.send(`${sn}${key.Enter}${key.Enter}`);

    const hasHeader = this.checkArticleWithHeader();

    let mail = {
      sn,
      author: "",
      title: "",
      timestamp: "",
      lines: [],
    };

    if (this.checkArticleWithHeader()) {
      mail.author    = substrWidth('dbcs', getLine(0).str, 7, 50).trim();
      mail.title     = substrWidth('dbcs', getLine(1).str, 7    ).trim();
      mail.timestamp = substrWidth('dbcs', getLine(2).str, 7    ).trim();
    }

    mail.lines = await this.getLines();

    await this.enterIndex();
    return mail;
  }

  async enterIndex(): Promise<boolean> {
    await this.send(`${key.ArrowLeft.repeat(10)}`);
    return true;
  }

  async enterBoard(boardname: string): Promise<boolean> {
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

  async enterFavorite(offsets: number[]=[]): Promise<boolean> {
    const enterOffsetMessage =
      offsets.map(offset => `${offset}${key.Enter.repeat(2)}`).join();
    await this.send(`F${key.Enter}${key.Home}${enterOffsetMessage}`);
    return true;
  }

  async enterMail(): Promise<boolean> {
    await this.send(`M${key.Enter}R${key.Enter}${key.Home}${key.End}`);
    return true;
  }
}

export default Bot;
