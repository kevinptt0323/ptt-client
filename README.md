# ptt-client
**ptt-client** is an unofficial client to fetch data from PTT ([ptt.cc]), the
famous BBS in Taiwan, over WebSocket. This module works in browser and Node.js.

PTT supports connection with WebSocket by [official].

[ptt.cc]: https://www.ptt.cc
[official]: https://www.ptt.cc/bbs/SYSOP/M.1496571808.A.608.html

## Installation
```
npm install ptt-client
```

## Example
```js
import Ptt from 'ptt-client';
import {Article, Board, Mail} from 'ptt-client/sites/ptt/model';

// if you are using this module in node.js, 'ws' is required as WebSocket polyfill.
// you don't need this in modern browsers
global.WebSocket = require('ws');

(async function() {
  const ptt = new Ptt();

  ptt.once('connect', () => {

    const kickOther = true;
    if (!await ptt.login('username', 'password', kickOther))
      return;
  
    // get last 20 articles from specific board. the first one is the latest
    let query = ptt.select(Article).where('boardname', 'C_Chat');
    let article = await query.get();

    // get articles with offset 
    let offset = articles[article.length-1].id - 1;
    query.where('id', offset);
    let articles2 = await query.get();

    // get articles with search filter (type: 'push', 'author', 'title')
    query = ptt.select(Article)
      .where('boardname', 'C_Chat')
      .where('title', '閒聊')
      .where('title', '京阿尼')
      .where('push', '20');
    articles = await query.get();
  
    // get the content of specific article
    query.where('id', articles[articles.length-1].id);
    let article = await query.getOne();

    // get board list
    query = ptt.select(Board).where('entry', 'class');
    let classBoards = await query.get();

    // get hot board list
    query = ptt.select(Board).where('entry', 'hot');
    let hotBoards = await query.get();
  
    // get your favorite list
    query = ptt.select(Board).where('entry', 'favorite');
    let favorites = await query.get();

    // search board by prefix
    query = ptt.select(Board).where('prefix', 'c_cha');
    let boards = await query.get();
  
    // get favorite list in a folder
    if (favorites[0].folder) {
      query.where('offsets', [favorites[0].id]);
      let favorites2 = await query.get();
    }

    // get mails
    query = ptt.select(Mail);
    let mails = await query.get();

    // get mail
    query.where('id', mails[0].sn);
    let mail = await query.getOne();

    await ptt.logout();

  });
})();
```

## Development
```
npm run test
npm run build
```

## License
MIT
