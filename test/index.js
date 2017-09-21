const tests = [
  './login.js',
  './basic.js',
];

tests.forEach(test => {
  require(test);
});
