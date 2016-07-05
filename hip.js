var fs = require('fs')
var file = process.argv[2]
var ed = require('./index.js')(file)

setInterval(function () {
  ed.update('waffles')
}, 1000)

