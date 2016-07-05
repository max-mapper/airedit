//Ctrl-$X keys for controling hipster itself.
var fs = require('fs')

module.exports = function (doc, keys, render) {

  var saved = false
  var rc = this.config

  keys.on('keypress', function (ch, key) {
    if(key.ctrl) {
      if(key.name == 's' && !rc.noSave) {
        saved = true
        fs.writeFileSync(rc.file, doc.lines.join(''), 'utf-8')
        return
      }
      if(key.name == 'r')
        return render.redraw(), doc.move()
      //delete current line
      if(key.name == 'd')
        return doc.start().deleteLines(doc.row, 1).move()
      //select current line
      if(key.name == 'l')
        return doc.start().mark().down().mark().move()
      if(key.name == 'c') {
        process.stdin.pause()
        //exit error if not saved, so you can cancel editing
        //git commit messages
        process.exit(saved ? 0 : 1)
      }
    }

  })
}

