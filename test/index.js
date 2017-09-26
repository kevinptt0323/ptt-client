const tests = [
  './login.js',
  './articles.js',
  './favorite.js',
];

tests.forEach(test => {
  require(test);
});
