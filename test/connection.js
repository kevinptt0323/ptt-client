import assert from 'assert';
import pttbot from '../src';
import { username, password } from './config';

describe('Connection', () => {
  describe('connect', () => {
    it('should connect to server', () => {
      const ptt = new pttbot();
      return new Promise(resolve => {
        ptt.once('connect', resolve);
      });
    });
  });
  describe('login', () => {
    it('should login success with correct username and password', () => {
      const ptt = new pttbot();
      return new Promise((resolve, reject) => {
        ptt.once('connect', () => {
          ptt.login(username, password)
            .then(ret => {
              assert.strictEqual(ret, true);
              assert.strictEqual(ptt.state.login, true);
            })
            .then(resolve)
            .catch(reject);
        });
      });
    });
    it('should login failed with wrong username and password', () => {
      const ptt = new pttbot();
      return new Promise((resolve, reject) => {
        ptt.once('connect', () => {
          ptt.login('wronguser', 'wrongpass')
            .then(ret => {
              assert.strictEqual(ret, false);
              assert.strictEqual(ptt.state.login, false);
            })
            .then(resolve)
            .catch(reject);
        });
      });
    });
    it('should login success with correct username (w/ trailing comma) and password', () => {
      const ptt = new pttbot();
      return new Promise((resolve, reject) => {
        ptt.once('connect', () => {
          ptt.login(username + ',', password)
            .then(ret => assert.strictEqual(ret, true))
            .then(resolve)
            .catch(reject);
        });
      });
    });
  });
  describe('logout', () => {
    it('should logout successfully if user is login', () => {
      const ptt = new pttbot();
      return new Promise((resolve, reject) => {
        ptt.once('connect', async () => {
          if (!await ptt.login(username, password)) {
            reject();
          }
          const ret = await ptt.logout();
          assert.strictEqual(ret, true);
          assert.strictEqual(ptt.state.login, false);
          resolve();
        });
      });
    })
  });
});
