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
import PTT from 'ptt-client';

// if you are using this module in node.js, 'ws' is required as WebSocket polyfill.
// you don't need this in modern browsers
global.WebSocket = require('ws');

(async function() {
  const ptt = new PTT();

  ptt.once('connect', () => {

    const kickOther = true;
    if (!await ptt.login('guest', 'guest', kickOther))
      return;
  
    // get last 20 articles from specific board. the first one is the latest
    let articles = await ptt.getArticles('C_Chat');

    // get articles with offset 
    let offset = articles[article.length-1].sn - 1;
    let articles2 = await ptt.getArticles('C_Chat', offset);

    // get articles with search filter (type: 'push', 'author', 'title')
    ptt.setSearchCondition('title', '閒聊');
    articles2 = await ptt.getArticles('C_Chat');
  
    // get the content of specific article
    let article = await ptt.getArticle('C_Chat', articles[articles.length-1].sn);
  
    // get your favorite list
    let favorites = await ptt.getFavorite();
  
    // get favorite list in a folder
    if (favorites[0].folder)
      await ptt.getFavorite(favorites[0].bn);

    let mails = await ptt.getMails();

    let mail = await ptt.getMail(mails[0].sn);

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
