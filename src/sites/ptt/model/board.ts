import {SelectQueryBuilder} from '../../../utils/query-builder/SelectQueryBuilder';
import {keymap as key} from '../../../utils';
import {substrWidth} from '../../../utils/char';

export class Board {
  name = '';
  id = 0;
  unread = false;
  category = '';
  flag = '';
  title = '';
  users = '';
  admin = '';
  folder = false;
  divider = false;

  /**
   * @deprecated
   */
  get bn(): number {
    return this.id;
  }

  /**
   * @deprecated
   */
  get boardname(): string {
    return this.name;
  }

  /**
   * @deprecated
   */
  get read(): boolean {
    return !this.unread;
  }

  constructor(name: string = '') {
    this.name = name;
  }

  static fromLine(line: string): Board {
    const board = new Board();
    board.id        = +substrWidth('dbcs', line,  3,  4).trim();
    board.unread    = substrWidth('dbcs', line,  8,  2).trim() === 'ˇ';
    board.name      = substrWidth('dbcs', line, 10, 12).trim();
    board.category  = substrWidth('dbcs', line, 23,  4).trim();
    board.flag      = substrWidth('dbcs', line, 28,  2).trim();
    switch (board.flag) {
      case '□':
        board.title  = substrWidth('dbcs', line, 30).replace(/\s+$/, '');
        board.folder = true;
        break;
      case '--':
        board.divider = true;
        break;
      case 'Σ':
        board.title  = substrWidth('dbcs', line, 30, 31).replace(/\s+$/, '');
        board.users  = substrWidth('dbcs', line, 62,  5).trim();
        board.admin  = substrWidth('dbcs', line, 67    ).trim();
        board.folder = true;
        break;
      case '◎':
        board.title = substrWidth('dbcs', line, 30, 31).replace(/\s+$/, '');
        board.users = substrWidth('dbcs', line, 62,  5).trim();
        board.admin = substrWidth('dbcs', line, 67    ).trim();
        break;
      default:
        console.warn(`Unknown board flag. line: "${line}"`);
    }
    return board;
  }

  static fromClassLine(line: string): Board {
    const board = new Board();
    board.id     = +substrWidth('dbcs', line, 15,  2);
    board.title  = substrWidth('dbcs', line, 20, 29).replace(/\s+$/, '');
    board.admin  = substrWidth('dbcs', line, 61).trim();
    board.folder = true;
    return board;
  }

  static select(bot): SelectQueryBuilder<Board> {
    return new BoardSelectQueryBuilder(bot);
  }
}

export enum WhereType {
  Entry = 'entry',
  Prefix = 'prefix',
  Offset = 'offset',
  Offsets = 'offsets',
}

export enum Entry {
  Class = 'class',
  Favorite = 'favorite',
  Hot = 'hot'
}

export class BoardSelectQueryBuilder extends SelectQueryBuilder<Board> {
  private bot;
  private entry: Entry = Entry.Class;
  private prefix: string = '';
  private offsets: number[] = [];

  constructor(bot) {
    super();
    this.bot = bot;
  }

  where(type: WhereType, condition: any): this {
    switch (type.toLowerCase()) {
      case WhereType.Entry:
        this.entry = condition.toLowerCase();
        break;
      case WhereType.Prefix:
        this.prefix = condition;
        break;
      case WhereType.Offset:
        this.offsets.push(condition);
        break;
      case WhereType.Offsets:
        this.offsets = condition.slice();
        break;
      default:
        throw new Error(`Invalid type: ${type}`);
        break;
    }
    return this;
  }

  async get(): Promise<Board[]> {
    if (this.prefix !== '') {
      return await this.getByPrefix(this.prefix);
    }
    let found;
    switch (this.entry) {
      case Entry.Class:
        found = await this.bot.enterBoardByOffset(this.offsets);
        break;
      case Entry.Favorite:
        found = await this.bot.enterFavorite(this.offsets);
        break;
      case Entry.Hot:
        found = await this.bot.enterBoardByOffset([-1, ...this.offsets]);
        break;
    }

    const boards: Board[] = [];
    if (found) {
      if (this.entry === Entry.Class && this.offsets.length === 0) {
        for (let i = 7; i < 23; i++) {
          const line = this.bot.getLine(i).str;
          if (line.trim() === '') {
            break;
          }
          const board = Board.fromClassLine(line);
          boards.push(board);
        }
      } else {
        while (true) {
          let stopLoop = false;
          for (let i = 3; i < 23; i++) {
            const line = this.bot.getLine(i).str;
            if (line.trim() === '') {
              stopLoop = true;
              break;
            }
            const board = Board.fromLine(line);
            if (board.id !== boards.length + 1) {
              stopLoop = true;
              break;
            }
            boards.push(board);
          }
          if (stopLoop) {
            break;
          }
          await this.bot.send(key.PgDown);
        }
      }
    }

    await this.bot.enterIndex();
    return boards;
  }

  async getOne(): Promise<Board|undefined> {
    const res = await this.get();
    return res.length ? res[0] : void 0;
  }

  private async getByPrefix(prefix: string): Promise<Board[]> {
    await this.bot.send(`s${prefix} `);
    const boards: Board[] = [];
    const resultLine0 = this.bot.getLine(3).str;
    if (resultLine0.toLowerCase().indexOf(prefix.toLowerCase()) === 0) {
      let col = 0, row = 0;
      /* TODO: Use other way instead of the constant 15. */
      let width = 15;
      while (width < resultLine0.length && resultLine0[width] !== ' ') {
          width += 1;
      }
      while (width < resultLine0.length && resultLine0[width] === ' ') {
          width += 1;
      }
      while (true) {
        const line = this.bot.getLine(row + 3).str;
        const boardname = substrWidth('dbcs', line, col * width, width).trim();
        if (boardname !== '') {
          boards.push(new Board(boardname));
        } else {
          break;
        }
        row += 1;
        if (row == 20) {
          col += 1;
          row = 0;
          /* TODO: Use other way instead of the constant 80. */
          if ((col + 1) * width > 80) {
            if (this.bot.getLine(23).str.includes('按任意鍵繼續')) {
              col = row = 0;
              await this.bot.send(' ');
            } else {
              break;
            }
          }
        }
      }
    } else {
      const searchLine = this.bot.getLine(1).str;
      const searchInput = substrWidth('dbcs', searchLine, 34, 15).trim();
      if (searchInput.toLowerCase().indexOf(prefix.toLowerCase()) === 0) {
        boards.push(new Board(searchInput));
      }
    }
    await this.bot.send(key.CtrlC);
    return boards;
  }
}

export default Board;
