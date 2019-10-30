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
    it('should get class list', async () => {
      let boards: Board[] =
        await ptt.select(Board)
          .where('entry', 'all')
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
});
