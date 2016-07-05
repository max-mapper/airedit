var hypercore = require('hypercore')
var mdns = require('multicast-dns')
var crypto = require('crypto')
var txt = require('dns-txt')()
var discovery = require('discovery-swarm')
var events = require('events')

module.exports = airedit

function airedit (db, filename) {
  var edit = new events.EventEmitter()

  var socket = mdns()
  var discoveryName = crypto.createHash('sha256').update(filename).digest('hex').slice(0, 40) + '.airedit.local'
  var core = hypercore(db)

  var feed = core.createFeed()
  var joined = {}
  var heads = []
  var latest = {}

  join(feed)

  edit.update = function (buf) {
    feed.flush(function () {
      feed.append(JSON.stringify({
        seq: feed.blocks,
        heads: heads,
        time: Date.now(),
        value: buf.toString()
      }))
    })
  }

  socket.on('query', function (query) {
    var q = query.questions[0]
    if (q && q.name === discoveryName && q.type === 'TXT') {
      socket.respond({
        questions: q,
        answers: [{
          type: 'TXT',
          name: discoveryName,
          data: txt.encode({
            feed: feed.key.toString('hex')
          })
        }]
      })

      var k = Object.keys(latest)

      for (var i = 0; i < k.length; i++) {
        socket.respond({
          questions: q,
          answers: [{
            type: 'TXT',
            name: discoveryName,
            data: txt.encode({
              feed: k[i].toString('hex')
            })
          }]
        })
      }
    }
  })

  socket.on('response', function (response) {
    var a = response.answers[0]
    if (a && a.name === discoveryName && a.type === 'TXT') {
      var data = txt.decode(a.data)
      if (!joined[data.feed]) {
        join(core.createFeed(data.feed))
      }
    }
  })

  socket.query({
    questions: [{
      type: 'TXT',
      name: discoveryName
    }]
  })

  return edit

  function tail (feed) {
    edit.emit('tail', feed)

    var key = feed.key.toString('hex')
    var block = 0

    feed.createReadStream({live: true})
      .on('data', function (data) {
        var pos = -1
        var blk = block++

        for (var i = 0; i < heads.length; i++) {
          if (heads[i].feed === key) {
            pos = i
            break
          }
        }

        data = JSON.parse(data)

        if (pos === -1) heads.push({feed: key, seq: blk})
        else heads[pos] = {feed: key, seq: blk}

        update(feed, data)
      })
  }

  function update (feed, data) {
    latest[feed.key.toString('hex')] = data
    reduce()
  }

  function reduce () {
    var vals = Object.keys(latest)
      .map(function (k) {
        var v = latest[k]
        return valid(k, v.seq) && v
      })
      .filter(function (v) {
        return v
      })

    if (!vals.length) return

    var l = vals.reduce(function (a, b) {
      return a.time > b.time ? a : b
    })

    edit.emit('update', l.value, l)
  }

  function valid (key, seq) {
    var invalid = Object.keys(latest).some(function (k) {
      var v = latest[k]
      return v.heads.some(function (head) {
        return head.feed === key && head.seq >= seq
      })
    })

    return !invalid
  }

  function join (feed) {
    if (joined[feed.key.toString('hex')]) return
    joined[feed.key.toString('hex')] = true

    var sw = discovery({
      dht: false,
      hash: false,
      utp: false,
      stream: function () {
        return feed.replicate()
      }
    })

    sw.join(feed.discoveryKey)
    tail(feed)
  }
}
