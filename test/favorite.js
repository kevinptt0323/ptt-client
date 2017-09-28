import assert from 'assert';
import pttbot from '../src';
import key from '../src/utils/keyboard';
import { username, password } from './config';

const newbot = async () => {
  const ptt = new pttbot();
  await (() => new Promise(resolve => {
    ptt.once('connect', resolve);
  }))();
  const ret = await ptt.login(username, password)
  assert.strictEqual(ret, true);
  return ptt;
};

const logout = async (ptt) => {
  await ptt.send(`${key.ArrowLeft.repeat(10)}${key.ArrowRight}y${key.Enter}`);
};

describe('Favorite', () => {
  let ptt;

  describe('getFavorite', () => {
    before('login', async () => {
      ptt = await newbot();
    });
    after('logout', async () => {
      await logout(ptt);
    });
    it('should get favorite list', async () => {
      let favorites = await ptt.getFavorite();
      assert(favorites.length>0);

      favorites.forEach(favorite => {
        assert('bn' in favorite && typeof favorite.bn === 'number');
        assert('read' in favorite && typeof favorite.read === 'boolean');
        assert('boardname' in favorite);
        assert('category' in favorite);
        assert('title' in favorite);
        assert('folder' in favorite && typeof favorite.folder === 'boolean');
        assert('divider' in favorite && typeof favorite.divider === 'boolean');
      });
    });
  });
});
