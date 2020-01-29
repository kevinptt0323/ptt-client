import {Line} from '../../../common/Line';
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
  private _content: Line[] = [];

  get content(): ReadonlyArray<Line> {
    return this._content;
  }

  set content(content: ReadonlyArray<Line>) {
    this._content = content.slice();
  }

  get data(): ReadonlyArray<string> {
    return this._content.map(content => content.str);
  }

  /**
   * @deprecated
   */
  set data(data: ReadonlyArray<string>) {
    console.warn("Should not set Mail.data/Mail.lines directly. " +
                 "Use Mail.content instead");
  }

  constructor() {
  }

  static fromLine(line: Line): Mail {
    const mail = new Mail();
    const {str} = line;
    mail.id     = +substrWidth('dbcs', str, 1,  5).trim();
    mail.date   = substrWidth('dbcs', str,  9,  5).trim();
    mail.author = substrWidth('dbcs', str, 15, 12).trim();
    mail.status = substrWidth('dbcs', str, 30,  2).trim();
    mail.title  = substrWidth('dbcs', str, 33    ).trim();
    return mail;
  }

  static select(bot): SelectQueryBuilder<Mail> {
    return new MailSelectQueryBuilder(bot);
  }

  hasHeader(): boolean {
    if (this.content.length === 0) {
      return false;
    }
    const authorArea = substrWidth('dbcs', this.content[0].str, 0, 6).trim();
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
      const line = this.bot.line[i];
      if (line.str.trim() === '') {
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
    mail.content = await this.bot.getContent();

    if (mail.hasHeader()) {
      mail.author    = substrWidth('dbcs', this.bot.line[0].str, 7, 50).trim();
      mail.title     = substrWidth('dbcs', this.bot.line[1].str, 7    ).trim();
      mail.timestamp = substrWidth('dbcs', this.bot.line[2].str, 7    ).trim();
    }

    await this.bot.enterIndex();
    return mail;
  }
}

export default Mail;
