# ptt-client
ptt-client is a Node client for fetching data from the famous BBS,
[ptt.cc](https://www.ptt.cc), in Taiwan. This client is based on WebSocket,
which was supported by [official].

[official]: https://www.ptt.cc/bbs/Gossiping/M.1496578018.A.650.html

## Installation

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
  let article = await ptt.getArticle('C_Chat', articles[0].sn);
})();
```

## Development
