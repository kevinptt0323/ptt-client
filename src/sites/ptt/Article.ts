import {substrWidth} from '../../utils/char';

export class Article {
  boardname: string;
  sn: number;
  push: string;
  date: string;
  timestamp: string;
  author: string;
  status: string;
  title: string;
  fixed: boolean;
  private _content: string[] = [];

  constructor() {
  }

  static fromLine(line: string): Article {
    let article = new Article();
    article.sn     =+substrWidth('dbcs', line, 1,   7).trim();
    article.push   = substrWidth('dbcs', line, 9,   2).trim();
    article.date   = substrWidth('dbcs', line, 11,  5).trim();
    article.author = substrWidth('dbcs', line, 17, 12).trim();
    article.status = substrWidth('dbcs', line, 30,  2).trim();
    article.title  = substrWidth('dbcs', line, 32    ).trim();
    article.fixed  = substrWidth('dbcs', line, 1,   7).trim().includes('★');
    return article;
  }

  get content(): ReadonlyArray<string> { 
    return this._content;
  }
  set content(data: ReadonlyArray<string>) {
    this._content = data.slice();
  }
  /**
   * @deprecated
   */
  get lines(): ReadonlyArray<string> {
    return this.content;
  }
  set lines(data: ReadonlyArray<string>) {
    this.content = data;
  }
};

export default Article;
