import assert from 'assert';
import { Mail } from '../src/sites/ptt/model';

import { newbot } from './common';
import { username, password } from './config';

const getMailInfo = (mail: Mail) => {
  return `${mail.id} ${mail.author} ${mail.title}`;
};

describe('Mail', () => {
  let ptt;
  before('login', async () => {
    ptt = await newbot(username, password);
  });
  after('logout', async () => {
    await ptt.logout();
  });

  describe('get', () => {
    let mails: Mail[];
    it('should get correct mail list from mailbox', async () => {
      mails = await ptt.select(Mail).get();
      assert(mails.length > 0);
    });
    it('should get correct mail list with "id" argument', async function () {
      let searchId = mails[mails.length-1].id - 1;
      if (searchId <= 0) {
        this.skip();
        return;
      }
      let mails2: Mail[] =
        await ptt.select(Mail)
          .where('id', searchId)
          .get();

      const mail1Info = getMailInfo(mails[mails.length-1]);
      const mail2Info = getMailInfo(mails2[0]);
      assert.strictEqual(mails2[0].id, mails[mails.length-1].id-1, `${mail1Info}\n${mail2Info}`);
    });
  });

  describe('getOne', () => {
    it('should get correct mail', async () => {
      const mail: Mail =
        await ptt.select(Mail)
          .where('id', 1)
          .getOne();

      assert.strictEqual(mail.id, 1);
      assert(mail.data.length > 0);
    });
  });

  describe('where', () => {
    let title = '問卦';
    let author = '[備.忘.錄]';

    it('should get correct mails with specified author name', async () => {
      const mails: Mail[] =
        await ptt.select(Mail)
          .where('author', author)
          .get();

      assert(mails.length > 0);

      mails.forEach(mail => {
        let mailInfo = getMailInfo(mail);
        assert(mail.author.toLowerCase().includes(author.toLowerCase()), mailInfo);
      });
    });
  });
});
