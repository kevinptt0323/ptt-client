import assert from 'assert';
import { Board } from '../src/sites/ptt/model';

import { newbot } from './common';
import { username, password } from './config';

describe('Board', () => {
  let ptt;

  describe('get', () => {
    before('login', async () => {
      ptt = await newbot(username, password);
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
