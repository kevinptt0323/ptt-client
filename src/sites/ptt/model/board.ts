import {SelectQueryBuilder} from '../../../utils/query-builder/SelectQueryBuilder';
import {keymap as key} from '../../../utils';
import {substrWidth} from '../../../utils/char';

export class Board {
  boardname = '';
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
  get read(): boolean {
    return !this.unread;
  }

  constructor() {
  }

  static fromLine(line: string): Board {
    const board = new Board();
    board.id        = +substrWidth('dbcs', line,  3,  4).trim();
    board.unread    = substrWidth('dbcs', line,  8,  2).trim() === 'ˇ';
    board.boardname = substrWidth('dbcs', line, 10, 12).trim();
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
    let found;
    switch (this.entry) {
      case Entry.Class:
        found = await this.bot.enterBoardByOffset(this.offsets);
        break;
      case Entry.Favorite:
        found = await this.bot.enterFavorite(this.offsets);
        break;
      case Entry.Hot:
        /* TODO: More robust offsets, like -1. */
        found = await this.bot.enterBoardByOffset([12, ...this.offsets]);
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
}

export default Board;
