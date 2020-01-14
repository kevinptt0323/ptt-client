import assert from 'assert';
import { Article } from '../src/sites/ptt/model';

import { newbot } from './common';
import { username, password } from './config';

const getArticleInfo = (article: Article) => {
  return `${article.id} ${article.author} ${article.title}`;
};

describe('Article', () => {
  let ptt;
  before('login', async () => {
    ptt = await newbot(username, password);
  });
  after('logout', async () => {
    await ptt.logout();
  });

  describe('get', () => {
    let articles: Article[];
    const boardname = 'Gossiping';
    it('should get correct article list from board', async () => {
      articles =
        await ptt.select(Article)
          .where('boardname', boardname)
          .get();
      assert(articles.length > 0);
    });
    it('should get correct article list with "id" argument', async () => {
      let articles2: Article[] =
        await ptt.select(Article)
          .where('boardname', boardname)
          .where('id', articles[articles.length-1].id-1)
          .get();

      const article1Info = getArticleInfo(articles[articles.length-1]);
      const article2Info = getArticleInfo(articles2[0]);
      assert.strictEqual(articles2[0].id, articles[articles.length-1].id-1, `${article1Info}\n${article2Info}`);
    });
  });

  describe('getOne', () => {
    const boardname = 'Gossiping';
    it('should get correct article from board', async () => {
      const article: Article =
        await ptt.select(Article)
          .where('boardname', boardname)
          .where('id', 100000)
          .getOne();

      assert.strictEqual(article.boardname, boardname);
      assert.strictEqual(article.id, 100000);
    });
  });

  describe('where', () => {
    let board = 'Gossiping';
    let push = '50';
    let title = '問卦';
    let author = 'kevin';

    it('should get correct articles with specified push number from board', async () => {
      const articles: Article[] =
        await ptt.select(Article)
          .where('boardname', board)
          .where('push', push)
          .get();
      assert(articles.length > 0);

      articles.forEach(article => {
        let pushCheck = false;
        let articleInfo = getArticleInfo(article);
        let pushNumber = (article.push === '爆') ? '100' : article.push;
        assert(Number(pushNumber) >= Number(push), articleInfo);
      });
    });

    it('should get correct articles with specified author name from board', async () => {
      const articles: Article[] =
        await ptt.select(Article)
          .where('boardname', board)
          .where('author', author)
          .get();
      assert(articles.length > 0);

      articles.forEach(article => {
        let articleInfo = getArticleInfo(article);
        assert(article.author.toLowerCase().includes(author.toLowerCase()), articleInfo);
      });
    });

    it('should get correct articles contain specified title word from board', async () => {
      const articles: Article[] =
        await ptt.select(Article)
          .where('boardname', board)
          .where('title', title)
          .get();
      assert(articles.length > 0);

      articles.forEach(article => {
        let articleInfo = getArticleInfo(article);
        assert(article.title.toLowerCase().includes(title), articleInfo);
      });
    });

    it('should get correct articles contain specified title word AND push number from board', async () => {
      const articles: Article[] =
        await ptt.select(Article)
          .where('boardname', board)
          .where('title', title)
          .where('push', push)
          .get();
      assert(articles.length > 0);

      articles.forEach(article => {
        let articleInfo = getArticleInfo(article);
        let pushNumber = (article.push === '爆') ? '100' : article.push;
        assert(article.title.toLowerCase().includes(title), articleInfo);
        assert(Number(pushNumber) >= Number(push), articleInfo);
      });
    });
  })
});
