import assert from 'assert';
import pttbot from '../src';
import { username, password } from './config';
import { Board } from '../src/sites/ptt/model';

const newbot = async () => {
  const ptt = new pttbot();
  await (() => new Promise(resolve => {
    ptt.once('connect', resolve);
  }))();
  const ret = await ptt.login(username, password)
  if (!ret) {
    throw 'login failed';
  }
  return ptt;
};

describe('Board', () => {
  let ptt;

  describe('get', () => {
    before('login', async () => {
      ptt = await newbot();
    });
    after('logout', async () => {
      await ptt.logout();
    });
    describe('get by entry', () => {
      it('should get class list', async () => {
        let boards: Board[] =
          await ptt.select(Board)
            .where('entry', 'class')
            .get();
        assert(boards.length > 0);
      });
      it('should get hot list', async () => {
        let boards: Board[] =
          await ptt.select(Board)
            .where('entry', 'hot')
            .get();
        assert(boards.length > 0);
      });
      it('should get favorite list', async () => {
        let boards: Board[] =
          await ptt.select(Board)
            .where('entry', 'favorite')
            .get();
        assert(boards.length > 0);
      });
    });
    describe('get by prefix', () => {
      it('should get a board list (c_cha)', async () => {
        const prefix = 'c_cha';
        let boards: Board[] =
          await ptt.select(Board)
            .where('prefix', prefix)
            .get();
        assert(boards.length > 0);
        boards.forEach(board => {
          const index = board.name.toLowerCase().indexOf(prefix.toLowerCase());
          assert.strictEqual(index, 0);
        });
      });
      it('should get a board list with single item (gossipi)', async () => {
        const prefix = 'gossipi';
        let boards: Board[] =
          await ptt.select(Board)
            .where('prefix', prefix)
            .get();
        assert.strictEqual(boards.length, 1);
        assert.strictEqual(boards[0].name, 'Gossiping');
      });
      it('should get an empty list (c_chaa)', async () => {
        const prefix = 'c_chaa';
        let boards: Board[] =
          await ptt.select(Board)
            .where('prefix', prefix)
            .get();
        assert.strictEqual(boards.length, 0);
      });
    });
  });
});
