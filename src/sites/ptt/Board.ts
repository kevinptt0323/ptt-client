import {substrWidth} from '../../utils/char';

export class Board {
  boardname: string;
  bn: number;
  read: boolean;
  category: string;
  title: string;
  users: string;
  admin: string;
  folder: boolean = false;
  divider: boolean = false;

  constructor() {
  }

  static fromLine(line: string): Board {
    let board = new Board();
    board.bn        =+substrWidth('dbcs', line,  3,  4).trim();
    board.read      = substrWidth('dbcs', line,  8,  2).trim() === '';
    board.boardname = substrWidth('dbcs', line, 10, 12).trim();
    board.category  = substrWidth('dbcs', line, 23,  4).trim();
    switch (board.boardname) {
      case 'MyFavFolder':
        board.title  = substrWidth('dbcs', line, 30);
        board.users  = '';
        board.admin  = '';
        board.folder = true;
        break;
      case '------------':
        board.title   = substrWidth('dbcs', line, 30);
        board.users   = '';
        board.admin   = '';
        board.divider = true;
        break;
      default:
        board.title = substrWidth('dbcs', line, 30, 31);
        board.users = substrWidth('dbcs', line, 62,  5).trim();
        board.admin = substrWidth('dbcs', line, 67    ).trim();
        break;
    }
    return board;
  }

};
