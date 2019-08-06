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
  if (!ret) {
    throw 'login failed';
  }
  return ptt;
};

describe('Articles', () => {
  let ptt;

  describe('getSearchArticles by push', () => {
    before('login', async () => {
      ptt = await newbot();
    });
    after('logout', async () => {
      await ptt.logout();
      ptt.resetSearchCondition();
    });
    let articles;
    let board = 'C_Chat';
    let push = '50';

    it('should get correct articles with specified push number from board', async () => {
      ptt.setSearchCondition('push', push);
      articles = await ptt.getArticles(board);
      assert(articles.length > 0);
      
      let pushCheck = false;
      articles.forEach(article => {
        let articleInfo = article.sn + ' ' + article.push + ' ' + article.title;
        // console.log(articleInfo);
        let pushNumber = (article.push === '爆') ? '100' : article.push;
        if (Number(pushNumber) >= Number(push) ) {
          pushCheck = true;
        }
        assert.equal(pushCheck, true, articleInfo);
      });
    });

    it('should get correct article list with offset argument', async () => {
      let articles2 = await ptt.getArticles(board, articles[articles.length-1].sn-1);

      let article1Info = articles[articles.length-1].sn + ' ' + articles[articles.length-1].push + ' ' + articles[articles.length-1].title;
      let article2Info = articles2[0].sn + ' ' + articles2[0].push + ' ' + articles2[0].title;
      console.log(article1Info + '\n' + article2Info);
      assert.equal(articles2[0].sn, articles[articles.length-1].sn-1, article1Info + '\n' + article2Info);
    });
  })

  describe('getSearchArticles by author', () => {
    before('login', async () => {
      ptt = await newbot();
    });
    after('logout', async () => {
      await ptt.logout();
      ptt.resetSearchCondition();
    });
    let articles;
    let board = 'Gossiping'
    let author = 'Gaiaesque';
    
    it('should get correct articles with specified author name from board', async () => {
      ptt.setSearchCondition('author', author);
      articles = await ptt.getArticles(board);
      assert(articles.length > 0);

      let authorCheck = false;
      articles.forEach(article => {
        let articleInfo = article.sn + ' ' + article.author + ' ' + article.title;
        // console.log(articleInfo);
        if (article.author.toLowerCase() === author.toLowerCase() ) {
          authorCheck = true;
        }
        assert.equal(authorCheck, true, articleInfo);
      });
    });

    it('should get correct article list with offset argument', async () => {
      let articles2 = await ptt.getArticles(board, articles[articles.length-1].sn-1);
      
      let article1Info = articles[articles.length-1].sn + ' ' + articles[articles.length-1].author + ' ' + articles[articles.length-1].title;
      let article2Info = articles2[0].sn + ' ' + articles2[0].author + ' ' + articles2[0].title;
      console.log(article1Info + '\n' + article2Info);
      assert.equal(articles2[0].sn, articles[articles.length-1].sn-1, article1Info + '\n' + article2Info);
    });
  })

  describe('getSearchArticles by title', () => {
    before('login', async () => {
      ptt = await newbot();
    });
    after('logout', async () => {
      await ptt.logout();
      ptt.resetSearchCondition();
    });
    let articles;
    let board = 'C_Chat';
    let title = 'jojo';

    it('should get correct articles contain specified title word from board. English search', async () => {
      ptt.setSearchCondition('title', title);
      articles = await ptt.getArticles(board);
      assert(articles.length > 0);

      let titleCheck = false;
      articles.forEach(article => {
        let articleInfo = article.sn + ' ' + article.push + ' ' + article.title;
        // console.log(articleInfo);
        if (article.title.toLowerCase().includes(title)) {
          titleCheck = true;
        }
        assert.equal(titleCheck, true, articleInfo);
      });
    });

    it('should get correct article list with offset argument. English search', async () => {
      let articles2 = await ptt.getArticles(board, articles[articles.length-1].sn-1);

      let article1Info = articles[articles.length-1].sn + ' ' + articles[articles.length-1].author + ' ' + articles[articles.length-1].title;
      let article2Info = articles2[0].sn + ' ' + articles2[0].author + ' ' + articles2[0].title;
      console.log(article1Info + '\n' + article2Info);
      assert.equal(articles2[0].sn, articles[articles.length-1].sn-1, article1Info + '\n' + article2Info);
    });

    xit('should get correct articles contain specified title word from board. Chinese search', async () => {
      title = '京阿尼';
      
      ptt.setSearchCondition('title', title);
      articles = await ptt.getArticles(board);
      assert(articles.length > 0);

      let titleCheck = false;
      articles.forEach(article => {
        let articleInfo = article.sn + ' ' + article.push + ' ' + article.title;
        console.log(articleInfo);
        if (article.title.includes(title)) {
          titleCheck = true;
        }
        // assert.equal(titleCheck, true, articleInfo);
      });
    });
      
    xit('should get correct article list with offset argument. Chinese search', async () => {
      let articles2 = await ptt.getArticles(board, articles[articles.length-1].sn-1);

      let article1Info = articles[articles.length-1].sn + ' ' + articles[articles.length-1].author + ' ' + articles[articles.length-1].title;
      let article2Info = articles2[0].sn + ' ' + articles2[0].author + ' ' + articles2[0].title;
      console.log(article1Info + '\n' + article2Info);
      assert.equal(articles2[0].sn, articles[articles.length-1].sn-1, article1Info + '\n' + article2Info);
    });

  })

  describe('getArticles', () => {
    before('login', async () => {
      ptt = await newbot();
    });
    after('logout', async () => {
      await ptt.logout();
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
    it('should get correct article list with offset argument', async () => {
      let articles2 = await ptt.getArticles('C_Chat', articles[articles.length-1].sn-1);

      let article1Info = articles[articles.length-1].sn + ' ' + articles[articles.length-1].push + ' ' + articles[articles.length-1].title;
      let article2Info = articles2[0].sn + ' ' + articles2[0].push + ' ' + articles2[0].title;
      console.log(article1Info + '\n' + article2Info);
      assert.equal(articles2[0].sn, articles[articles.length-1].sn-1);
    });
  });

  describe('getArticle', () => {
    before('login', async () => {
      ptt = await newbot();
    });
    after('logout', async () => {
      await ptt.logout();
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
