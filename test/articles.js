import assert from 'assert';
import pttbot from '../src';
import { username, password } from './config';

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

describe('Articles', () => {
  let ptt;
  before('login', async () => {
    ptt = await newbot();
  });
  after('logout', async () => {
    await ptt.logout();
  });

  describe('getArticles', () => {
    let articles;
    const boardname = 'C_Chat';
    it('should get correct article list from board', async () => {
      articles = await ptt.getArticles(boardname);
      assert(articles.length > 0);

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
    it('should get correct article list with offset argument', async () => {
      let articles2 = await ptt.getArticles(boardname, articles[articles.length-1].sn-1);

      let article1Info = `${articles[articles.length-1].sn} ${articles[articles.length-1].author} ${articles[articles.length-1].title}`;
      let article2Info = `${articles2[0].sn} ${articles2[0].author} ${articles2[0].title}`;
      assert.equal(articles2[0].sn, articles[articles.length-1].sn-1, `${article1Info}\n${article2Info}`);
    });
  });

  describe('getArticle', () => {
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

  describe('getSearchArticles by push', () => {
    after('resetSearchCondition', () => {
      ptt.resetSearchCondition();
    });
    let board = 'C_Chat';
    let push = '50';

    it('should get correct articles with specified push number from board', async () => {
      ptt.setSearchCondition('push', push);
      let articles = await ptt.getArticles(board);
      assert(articles.length > 0);
      
      articles.forEach(article => {
        let pushCheck = false;
        let articleInfo = `${article.sn} ${article.push} ${article.title}`;
        let pushNumber = (article.push === '爆') ? '100' : article.push;
        assert(Number(pushNumber) >= Number(push), articleInfo);
      });
    });
  })

  describe('getSearchArticles by author', () => {
    after('resetSearchCondition', () => {
      ptt.resetSearchCondition();
    });
    let board = 'Gossiping'
    let author = 'Gaiaesque';
    
    it('should get correct articles with specified author name from board', async () => {
      ptt.setSearchCondition('author', author);
      let articles = await ptt.getArticles(board);
      assert(articles.length > 0);

      articles.forEach(article => {
        let articleInfo = `${article.sn} ${article.author} ${article.title}`;
        assert.equal(article.author.toLowerCase(), author.toLowerCase(), articleInfo);
      });
    });
  })

  describe('getSearchArticles by title', () => {
    after('resetSearchCondition', () => {
      ptt.resetSearchCondition();
    });
    let board = 'C_Chat';
    let title = '閒聊';

    it('should get correct articles contain specified title word from board', async () => {
      ptt.setSearchCondition('title', title);
      let articles = await ptt.getArticles(board);
      assert(articles.length > 0);

      articles.forEach(article => {
        let articleInfo = `${article.sn} ${article.push} ${article.title}`;
        assert(article.title.toLowerCase().includes(title), articleInfo);
      });
    });
  })

  describe('getSearchArticles by title and push', () => {
    after('resetSearchCondition', () => {
      ptt.resetSearchCondition();
    });
    let board = 'C_Chat';
    let title = '閒聊';
    let push = '50';
    
    it('should get correct articles contain specified title word AND push number from board', async () => {
      ptt.setSearchCondition('title', title);
      ptt.setSearchCondition('push', push);
      let articles = await ptt.getArticles(board);
      assert(articles.length > 0);
      
      articles.forEach(article => {
        let articleInfo = `${article.sn} ${article.push} ${article.title}`;
        let pushNumber = (article.push === '爆') ? '100' : article.push;
        assert(article.title.toLowerCase().includes(title), articleInfo);
        assert(Number(pushNumber) >= Number(push), articleInfo);
      });
    });
  })
});
