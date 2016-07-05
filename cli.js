#!/usr/bin/env node

var fs = require('fs')
var file = process.argv[2]
var ed = require('./hipedit.js')(file)

var airedit = require('./index.js')

var db = require('memdb')()
var edit = airedit(db, file)

edit.on('update', function (val) {
  console.error('updated: "%s"', val)
  ed.update(val)
})

var currentFile = fs.readFileSync(file)

fs.watch(file, function () {
  fs.readFile(file, function (err, buf) {
    if (err) throw err
    if (!currentFile) currentFile = buf
    if (!currentFile.equals(buf)) {
      console.error('updating new version')
      edit.update(buf.toString())
      currentFile = buf
    }
  })
})
//
// process.stdin.on('data', function (data) {
//   edit.update(data.toString().trim())
// })
