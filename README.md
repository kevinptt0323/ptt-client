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
import pttbot from 'ptt-client';

(async function() {
  const ptt = new pttbot();

  if (!await ptt.login('guest', 'guest'))
    return;

  // get last 20 articles from specific board
  let articles = await ptt.getArticles('C_Chat');

  // get the content of specific article
  let article = await ptt.getArticle('C_Chat', articles[articles.length-1].sn);

  // get your favorite list
  let favorites = await ptt.getFavorite();
})();
```

## Development
```
npm run test
npm run build
```
