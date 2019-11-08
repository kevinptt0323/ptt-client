import { ObjectLiteral } from '../../../common/ObjectLiteral';
import { SelectQueryBuilder } from '../../../utils/query-builder/SelectQueryBuilder';
import { keymap as key } from '../../../utils';
import { substrWidth } from '../../../utils/char';

export class Article {
  boardname: string;

  id: number;

  push: string;

  date: string;

  timestamp: string;

  author: string;

  status: string;

  title: string;

  fixed: boolean;

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

  static fromLine(line: string): Article {
    const article = new Article();
    article.id = +substrWidth('dbcs', line, 1, 7).trim();
    article.push = substrWidth('dbcs', line, 9, 2).trim();
    article.date = substrWidth('dbcs', line, 11, 5).trim();
    article.author = substrWidth('dbcs', line, 17, 12).trim();
    article.status = substrWidth('dbcs', line, 30, 2).trim();
    article.title = substrWidth('dbcs', line, 32).trim();
    article.fixed = substrWidth('dbcs', line, 1, 7).trim().includes('★');
    return article;
  }

  static select(bot): SelectQueryBuilder<Article> {
    return new ArticleSelectQueryBuilder(bot);
  }

  hasHeader(): boolean {
    const authorArea = substrWidth('dbcs', this.data[0], 0, 6).trim();
    return authorArea === '作者';
  }
}

export enum WhereType {
  Boardname = 'boardname',
  Id = 'id',
  Push = 'push',
  Author = 'author',
  Title = 'title',
}

export class ArticleSelectQueryBuilder extends SelectQueryBuilder<Article> {
  private bot;

  private boardname = '';

  private wheres: ObjectLiteral[] = [];

  private id = 0;

  constructor(bot) {
    super();
    this.bot = bot;
  }

  where(type: WhereType, condition: any): this {
    switch (type) {
      case WhereType.Boardname:
        if (this.boardname !== '') {
          console.warn(`Cannot call where with type "${type}" multiple times`);
        } else {
          this.boardname = condition;
        }
        break;
      case WhereType.Id:
        this.id = +condition;
        break;
      case WhereType.Push:
        this.wheres.push({ type: 'Z', condition });
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

  async get(): Promise<Article[]> {
    await this.bot.enterBoardByName(this.boardname);
    const found = await this.bot.send(this.getQuery());
    if (!found) {
      return [];
    }
    if (this.id > 0) {
      const id = Math.max(this.id - 9, 1);
      await this.bot.send(`${key.End}${key.End}${id}${key.Enter}`);
    }

    const articles: Article[] = [];
    for (let i = 3; i <= 22; i++) {
      const line = this.bot.getLine(i).str;
      if (line.trim() === '') {
        break;
      }
      const article = Article.fromLine(line);
      article.boardname = this.boardname;
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

    await this.bot.enterIndex();
    return articles.reverse();
  }

  async getOne(): Promise<Article|undefined> {
    await this.bot.enterBoardByName(this.boardname);
    const found = await this.bot.send(this.getQuery());
    if (!found) {
      return void 0;
    }
    /* TODO: validate id */
    await this.bot.send(`${this.id}${key.Enter}${key.Enter}`);

    const article = new Article();
    article.id = this.id;
    article.boardname = this.boardname;
    article.data = await this.bot.getLines();

    if (article.hasHeader()) {
      article.author = substrWidth('dbcs', this.bot.getLine(0).str, 7, 50).trim();
      article.title = substrWidth('dbcs', this.bot.getLine(1).str, 7).trim();
      article.timestamp = substrWidth('dbcs', this.bot.getLine(2).str, 7).trim();
    }

    await this.bot.enterIndex();
    return article;
  }
}

export default Article;
