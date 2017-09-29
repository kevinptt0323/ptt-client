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

describe('Articles', () => {
  let ptt;

  describe('getArticles', () => {
    before('login', async () => {
      ptt = await newbot();
    });
    after('logout', async () => {
      await logout(ptt);
    });
    let articles;
    it('should get correct article list from board', async () => {
      articles = await ptt.getArticles('C_Chat');
      assert(articles.length>0);

      articles.forEach(article => {
        assert('sn' in article);
        assert('push' in article);
        assert('date' in article);
        assert('author' in article);
        assert('status' in article);
        assert('title' in article);
        assert((new RegExp(/^\d{1,2}\/\d{1,2}$/)).test(article.date));
      });
    });
    it('should get correct article list with offset argument', async() => {
      let articles2 = await ptt.getArticles('C_Chat', articles[articles.length-1].sn-1);
      assert.equal(articles2[0].sn, articles[articles.length-1].sn-1);
    });
  });

  describe('getArticle', () => {
    before('login', async () => {
      ptt = await newbot();
    });
    after('logout', async () => {
      await logout(ptt);
    });
    it('should get correct article from board', async () => {
      const article = await ptt.getArticle('Gossiping', 100000);
      assert('sn' in article);
      assert('author' in article);
      assert('title' in article);
      assert('timestamp' in article);
      assert('lines' in article);
      assert.strictEqual(article.sn, 100000);
    });
  });
});
