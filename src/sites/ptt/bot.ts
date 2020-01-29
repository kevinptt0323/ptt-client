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
import {Article, Board} from './model';

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
        throw new Error(`Invalid condition: ${type}`);
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

  get screen(): string {
    const lines = [];

    for(let i = 0; i <= 23; i++) {
      lines.push(this.getLine(i).str);
    }
    return lines.join('\n');
  }

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
        throw new Error(`Invalid protocol: ${config.protocol}`);
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
        if (this.currentCharset !== this.config.charset && !this.state.login &&
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
  }

  async getLines() {
    const { getLine } = this;
    const lines = [];

    lines.push(getLine(0).str);

    let sentPgDown = false;
    while (!getLine(23).str.includes('100%')
        && !getLine(23).str.includes('此文章無內容')) {
      for (let i = 1; i < 23; i++) {
        lines.push(getLine(i).str);
      }
      await this.send(key.PgDown);
      sentPgDown = true;
    }

    const lastLine = lines[lines.length - 1];
    for (let i = 0; i < 23; i++) {
      if (getLine(i).str === lastLine) {
        for (let j = i + 1; j < 23; j++) {
          lines.push(getLine(j).str);
        }
        break;
      }
    }

    while (lines.length > 0 && lines[lines.length - 1] === '') {
      lines.pop();
    }

    if (sentPgDown) {
      await this.send(key.Home);
    }
    return lines;
  }

  send(msg: string): Promise<boolean> {
    if (this.config.preventIdleTimeout) {
        this.preventIdle(this.config.preventIdleTimeout);
    }
    return new Promise((resolve, reject) => {
      let autoResolveHandler;
      const cb = message => {
        clearTimeout(autoResolveHandler);
        resolve(true);
      };
      if (this.state.connect) {
        if (msg.length > 0) {
          this.socket.send(encode(msg, this.currentCharset));
          this.once('message', cb);
          autoResolveHandler = setTimeout(() => {
            this.removeListener('message', cb);
            resolve(false);
          }, this.config.timeout * 10);
        } else {
          console.info(`Sending message with 0-length. Skipped.`);
          resolve(true);
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

  async login(username: string, password: string, kick: boolean= true): Promise<any> {
    if (this.state.login) { return; }
    username = username.replace(/,/g, '');
    if (this.config.charset === 'utf8') {
      username += ',';
    }
    await this.send(`${username}${key.Enter}${password}${key.Enter}`);
    let ret = await this.checkLogin(kick);
    if (ret) {
      const { _state: state } = this;
      state.login = true;
      state.position = {
        boardname: '',
      };
      this.searchCondition.init();
      this.emit('stateChange', this.state);
    }
    return ret;
  }

  async logout(): Promise<boolean> {
    if (!this.state.login) { return; }
    await this.send(`G${key.Enter}Y${key.Enter}`);
    this._state.login = false;
    this.emit('stateChange', this.state);
    this.send(key.Enter);
    return true;
  }

  private async checkLogin(kick: boolean): Promise<boolean> {
    const { getLine } = this;

    if (getLine(21).str.includes('密碼不對或無此帳號')) {
      this.emit('login.failed');
      return false;
    } else if (getLine(23).str.includes('請稍後再試')) {
      this.emit('login.failed');
      return false;
    } else {
      let state = 0;
      while (true) {
        await sleep(400);
        if (getLine(22).str.includes('登入中，請稍候...')) {
          /* no-op */
        } else if (getLine(22).str.includes('您想刪除其他重複登入的連線嗎')) {
          if (state === 1) continue;
          await this.send(`${kick ? 'y' : 'n'}${key.Enter}`);
          state = 1;
          continue;
        } else if (getLine(23).str.includes('請勿頻繁登入以免造成系統過度負荷')) {
          if (state === 2) continue;
          await this.send(`${key.Enter}`);
          state = 2;
        } else if (getLine(23).str.includes('您要刪除以上錯誤嘗試的記錄嗎')) {
          if (state === 3) continue;
          await this.send(`y${key.Enter}`);
          state = 3;
        } else if (getLine(23).str.includes('按任意鍵繼續')) {
          await this.send(`${key.Enter}`);
        } else if ((getLine(22).str + getLine(23).str).toLowerCase().includes('y/n')) {
          console.info(`Unknown login state: \n${this.screen}`);
          await this.send(`y${key.Enter}`);
        } else if (getLine(23).str.includes('我是')) {
          break;
        } else {
          console.info(`Unknown login state: \n${this.screen}`);
        }
      }
      this.emit('login.success');
      return true;
    }
  }

  /**
   * @deprecated
   */
  private checkArticleWithHeader(): boolean {
    const authorArea = substrWidth('dbcs', this.getLine(0).str, 0, 6).trim();
    return authorArea === '作者';
  }

  select(model) {
    return model.select(this);
  }

  /**
   * @deprecated
   */
  setSearchCondition(type: string, criteria: string): void {
    this.searchCondition.add(type, criteria);
  }

  /**
   * @deprecated
   */
  resetSearchCondition(): void {
    this.searchCondition.init();
  }

  /**
   * @deprecated
   */
  isSearchConditionSet(): boolean {
    return (this.searchCondition.conditions.length !== 0);
  }

  /**
   * @deprecated
   */
  async getArticles(boardname: string, offset: number= 0): Promise<Article[]> {
    await this.enterBoard(boardname);
    if (this.isSearchConditionSet()) {
      const searchString = this.searchCondition.conditions.map(condition => condition.toSearchString()).join(key.Enter);
      await this.send(`${searchString}${key.Enter}`);
    }

    if (offset > 0) {
      offset = Math.max(offset - 9, 1);
      await this.send(`${key.End}${key.End}${offset}${key.Enter}`);
    }
    const { getLine } = this;
    const articles: Article[] = [];
    for (let i = 3; i <= 22; i++) {
      const line = getLine(i).str;
      const article = Article.fromLine(line);
      article.boardname = boardname;
      articles.push(article);
    }
    // fix id
    if (articles.length >= 2 && articles[0].id === 0) {
      for (let i = 1; i < articles.length; i++) {
        if (articles[i].id !== 0) {
          articles[0].id = articles[i].id - i;
          break;
        }
      }
    }
    for (let i = 1; i < articles.length; i++) {
      articles[i].id = articles[i - 1].id + 1;
    }
    await this.enterIndex();
    return articles.reverse();
  }

  /**
   * @deprecated
   */
  async getArticle(boardname: string, id: number, article: Article = new Article()): Promise<Article> {
    await this.enterBoard(boardname);
    if (this.isSearchConditionSet()) {
      const searchString = this.searchCondition.conditions.map(condition => condition.toSearchString()).join(key.Enter);
      await this.send(`${searchString}${key.Enter}`);
    }
    const { getLine } = this;

    await this.send(`${id}${key.Enter}${key.Enter}`);

    const hasHeader = this.checkArticleWithHeader();

    article.id = id;
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

  /**
   * @deprecated
   */
  async getFavorite(offsets: number|number[]= []) {
    if (typeof offsets === 'number') {
      offsets = [offsets];
    }
    await this.enterFavorite(offsets);
    const { getLine } = this;

    const favorites: Board[] = [];

    while (true) {
      let stopLoop = false;
      for (let i = 3; i < 23; i++) {
        const line = getLine(i).str;
        if (line.trim() === '') {
          stopLoop = true;
          break;
        }
        const favorite = Board.fromLine(line);
        if (favorite.id !== favorites.length + 1) {
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

  /**
   * @deprecated
   */
  async getMails(offset: number= 0) {
    await this.enterMail();
    if (offset > 0) {
      offset = Math.max(offset - 9, 1);
      await this.send(`${key.End}${key.End}${offset}${key.Enter}`);
    }

    const { getLine } = this;

    const mails = [];
    for (let i = 3; i <= 22; i++) {
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

  /**
   * @deprecated
   */
  async getMail(sn: number) {
    await this.enterMail();
    const { getLine } = this;

    await this.send(`${sn}${key.Enter}${key.Enter}`);

    const hasHeader = this.checkArticleWithHeader();

    const mail = {
      sn,
      author: '',
      title: '',
      timestamp: '',
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

  get currentBoardname(): string|undefined {
    const boardRe = /【(?!看板列表).*】.*《(?<boardname>.*)》/;
    const match = boardRe.exec(this.getLine(0).str);
    if (match) {
      return match.groups.boardname;
    } else {
      return void 0;
    }
  }

  /**
   * @deprecated
   */
  enterBoard(boardname: string): Promise<boolean> {
    return this.enterBoardByName(boardname);
  }

  async enterBoardByName(boardname: string): Promise<boolean> {
    await this.send(`s${boardname}${key.Enter} ${key.Home}${key.End}`);

    if (this.currentBoardname.toLowerCase() === boardname.toLowerCase()) {
      this._state.position.boardname = this.currentBoardname;
      this.emit('stateChange', this.state);
      return true;
    } else {
      await this.enterIndex();
      return false;
    }
  }

  async enterByOffset(offsets: number[]= []): Promise<boolean> {
    const { getLine } = this;
    let result = true;
    offsets.forEach(async offset => {
      if (offset === 0) {
        result = false;
      }
      if (offset < 0) {
        for (let i = 22; i >= 3; i--) {
          let lastOffset = substrWidth('dbcs', getLine(i).str, 3, 4).trim();
          if (lastOffset.length > 0) {
            offset += +lastOffset + 1;
            break;
          }
          lastOffset = substrWidth('dbcs', getLine(i).str, 15, 2).trim();
          if (lastOffset.length > 0) {
            offset += +lastOffset + 1;
            break;
          }
        }
      }
      if (offset < 0) {
        result = false;
      }
      if (!result) {
        return;
      }
      await this.send(`${offset}${key.Enter.repeat(2)} ${key.Home}${key.End}`);
    });

    if (result) {
      this._state.position.boardname = this.currentBoardname;
      this.emit('stateChange', this.state);
      await this.send(key.Home);
      return true;
    } else {
      await this.enterIndex();
      return false;
    }
  }

  async enterBoardByOffset(offsets: number[]= []): Promise<boolean> {
    await this.send(`C${key.Enter}`);
    return await this.enterByOffset(offsets);
  }

  async enterFavorite(offsets: number[]= []): Promise<boolean> {
    await this.send(`F${key.Enter}`);
    return await this.enterByOffset(offsets);
  }

  async enterMail(): Promise<boolean> {
    await this.send(`M${key.Enter}R${key.Enter}${key.Home}${key.End}`);
    return true;
  }
}

export default Bot;
