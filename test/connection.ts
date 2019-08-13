import assert from 'assert';
import pttbot from '../src';
import { username, password } from './config';

describe('Connection', () => {
  describe('connect', () => {
    it('should connect to server', () => {
      const ptt = new pttbot();
      return new Promise((resolve, reject) => {
        ptt.once('connect', resolve);
      });
    });
  });
  describe('login', () => {
    it('should login success with correct username and password', () => {
      const ptt = new pttbot();
      return new Promise((resolve, reject) => {
        ptt.once('connect', async () => {
          try {
            const ret = await ptt.login(username, password);
            assert.strictEqual(ret, true);
            assert.strictEqual(ptt.state.login, true);
          } catch (e) {
            reject(e);
          }
          resolve();
        });
      });
    });
    it('should login failed with wrong username and password', () => {
      const ptt = new pttbot();
      return new Promise((resolve, reject) => {
        ptt.once('connect', async () => {
          try {
            const ret = await ptt.login('wronguser', 'wrongpass');
            assert.strictEqual(ret, false);
            assert.strictEqual(ptt.state.login, false);
          } catch (e) {
            reject(e);
          }
          resolve();
        });
      });
    });
    it('should login success with correct username (w/ trailing comma) and password', () => {
      const ptt = new pttbot();
      return new Promise((resolve, reject) => {
        ptt.once('connect', async () => {
          try {
            const ret = await ptt.login(username + ',', password);
            assert.strictEqual(ret, true);
            assert.strictEqual(ptt.state.login, true);
          } catch (e) {
            reject(e);
          }
          resolve();
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
          try {
            const ret = await ptt.logout();
            assert.strictEqual(ret, true);
            assert.strictEqual(ptt.state.login, false);
          } catch (e) {
            reject(e);
          }
          resolve();
        });
      });
    })
  });
});
