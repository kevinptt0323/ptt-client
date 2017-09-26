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
      return new Promise(resolve => {
        ptt.once('connect', () => {
          ptt.login(username, password)
            .then(ret => assert.strictEqual(ret, true))
            .then(resolve);
        });
      });
    });
    it('should login failed with wrong username and password', () => {
      const ptt = new pttbot();
      return new Promise(resolve => {
        ptt.once('connect', () => {
          ptt.login('wronguser', 'wrongpass')
            .then(ret => assert.strictEqual(ret, false))
            .then(resolve);
        });
      });
    });
  });
});
