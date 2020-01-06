import {ObjectLiteral} from '../../../common/ObjectLiteral';
import {SelectQueryBuilder} from '../../../utils/query-builder/SelectQueryBuilder';
import {keymap as key} from '../../../utils';
import {substrWidth} from '../../../utils/char';

export class Mail {
  id: number;
  date: string;
  timestamp: string;
  author: string;
  status: string;
  title: string;
  private _data: string[] = [];

  get data(): ReadonlyArray<string> {
    return this._data;
  }
  set data(data: ReadonlyArray<string>) {
    this._data = data.slice();
  }
  /**
   * @deprecated
   */
  get lines(): ReadonlyArray<string> {
    return this.data;
  }
  /**
   * @deprecated
   */
  set lines(data: ReadonlyArray<string>) {
    this.data = data;
  }
  /**
   * @deprecated
   */
  get sn(): number {
    return this.id;
  }

  constructor() {
  }

  static fromLine(line: string): Mail {
    const mail = new Mail();
    mail.id     = +substrWidth('dbcs', line, 1,  5).trim();
    mail.date   = substrWidth('dbcs', line,  9,  5).trim();
    mail.author = substrWidth('dbcs', line, 15, 12).trim();
    mail.status = substrWidth('dbcs', line, 30,  2).trim();
    mail.title  = substrWidth('dbcs', line, 33    ).trim();
    return mail;
  }

  static select(bot): SelectQueryBuilder<Mail> {
    return new MailSelectQueryBuilder(bot);
  }

  hasHeader(): boolean {
    if (this.data.length === 0) {
      return false;
    }
    const authorArea = substrWidth('dbcs', this.data[0], 0, 6).trim();
    return authorArea === '作者';
  }
}

export enum WhereType {
  Id = 'id',
  Author = 'author',
  Title = 'title',
}

export class MailSelectQueryBuilder extends SelectQueryBuilder<Mail> {
  private bot;
  private wheres: ObjectLiteral[] = [];
  private id = 0;

  constructor(bot) {
    super();
    this.bot = bot;
  }

  where(type: WhereType, condition: any): this {
    switch (type) {
      case WhereType.Id:
        this.id = +condition;
        break;
      case WhereType.Author:
        this.wheres.push({ type: 'a', condition });
        break;
      case WhereType.Title:
        this.wheres.push({ type: '/', condition });
        break;
      default:
        throw new Error(`Invalid type: ${type}`);
    }
    return this;
  }

  getQuery(): string {
    return this.wheres.map(({ type, condition }) => `${type}${condition}${key.Enter}`).join();
  }

  async get(): Promise<Mail[]> {
    await this.bot.enterMail();
    const found = await this.bot.send(this.getQuery());
    if (!found) {
      return [];
    }
    if (this.id > 0) {
      const id = Math.max(this.id - 9, 1);
      await this.bot.send(`${key.End}${key.End}${id}${key.Enter}`);
    }

    const mails: Mail[] = [];
    for (let i = 3; i <= 22; i++) {
      const line = this.bot.getLine(i).str;
      if (line.trim() === '') {
        break;
      }
      const mail = Mail.fromLine(line);
      mails.push(mail);
    }

    await this.bot.enterIndex();
    return mails.reverse();
  }

  async getOne(): Promise<Mail|undefined> {
    await this.bot.enterMail();
    const found = await this.bot.send(this.getQuery());
    if (!found) {
      return void 0;
    }
    await this.bot.send(`${this.id}${key.Enter}${key.Enter}`);

    const mail = new Mail();
    mail.id = this.id;
    mail.data = await this.bot.getLines();

    if (mail.hasHeader()) {
      mail.author    = substrWidth('dbcs', this.bot.getLine(0).str, 7, 50).trim();
      mail.title     = substrWidth('dbcs', this.bot.getLine(1).str, 7    ).trim();
      mail.timestamp = substrWidth('dbcs', this.bot.getLine(2).str, 7    ).trim();
    }

    await this.bot.enterIndex();
    return mail;
  }
}

export default Mail;
