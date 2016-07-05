var diff = require('./diff')

module.exports = function (filename) {  
  var differ = new diff()
  var config = require('hipster/lib/config')
  config.file = filename
  config.debug = 'debug.log'
  var Hipster = require('hipster')
  
  var ed = Hipster(config)
    .use(require('hipster/plugins/basics'))
    .use(require('hipster/plugins/entry'))
    .use(require('./controls.js'))
    .use(require('hipster/plugins/movement'))
    .init()
  
  function update (newFile) {
    var txt = ed.doc.lines.join('\n')
    if (txt === newFile) return
    var patches = differ.patch_make(txt, newFile)
    var updated = differ.patch_apply(patches, txt)
    var newLines = updated[0].split('\n')
    var curLines = ed.doc.lines.length
    console.error('updated', updated, curLines, newLines.length)
    
    if (newLines.length < curLines.length) { 
      for (var i = 0; i < curLines.length - newLines.length; i++) {
        ed.doc.newline()
        console.error('newline', i)
      }
    }
    
    for (var i = 0; i < ed.doc.lines.length; i++) {
      var val = newLines[i]
      ed.doc.updateLine(i, val ? val + ' ' : '  ')
      console.error('update line', i, val ? val + ' ' : ' ')
    }
    ed.doc.move()
  }
  
  ed.update = update

  return ed
}

