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

  get content(): ReadonlyArray<string> { 
    return this._content;
  }
  set content(data: ReadonlyArray<string>) {
    this._content = data.slice();
  }
  // DEPRECATED
  get lines(): ReadonlyArray<string> {
    return this.content;
  }
  set lines(data: ReadonlyArray<string>) {
    this.content = data;
  }
};

export default Article;
