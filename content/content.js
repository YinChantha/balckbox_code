
var jcrop, selection

var overlay = ((active) => (state) => {
  active = typeof state === 'boolean' ? state : state === null ? active : !active
  $('.jcrop-holder')[active ? 'show' : 'hide']()
  chrome.runtime.sendMessage({message: 'active', active})
})(false)

var image = (done) => {
  var image = new Image()
  image.id = 'fake-image'
  image.src = chrome.runtime.getURL('/images/pixel.png')
  image.onload = () => {
    $('body').append(image)
    done()
  }
}

var init = (done) => {
  $('#fake-image').Jcrop({
    bgColor: 'none',
    onSelect: (e) => {
      selection = e
      capture()
    },
    onChange: (e) => {
      selection = e
    },
    onRelease: (e) => {
      setTimeout(() => {
        selection = null
      }, 100)
    }
  }, function ready () {
    jcrop = this

    $('.jcrop-hline, .jcrop-vline').css({
      backgroundImage: `url(${chrome.runtime.getURL('/images/Jcrop.gif')})`
    })

    if (selection) {
      jcrop.setSelect([
        selection.x, selection.y,
        selection.x2, selection.y2
      ])
    }

    done && done()
  })
}

var capture = (force) => {
  chrome.storage.sync.get((config) => {
    if (selection && (config.method === 'crop' || (config.method === 'wait' && force))) {
      jcrop.release()
      setTimeout(() => {
        chrome.runtime.sendMessage({
          message: 'capture', area: selection, dpr: devicePixelRatio
        }, (res) => {
          overlay(false)
          selection = null
          save(res.image, config.format, config.save)
        })
      }, 50)
    }
    else if (config.method === 'view') {
      chrome.runtime.sendMessage({
        message: 'capture',
        area: {x: 0, y: 0, w: innerWidth, h: innerHeight}, dpr: devicePixelRatio
      }, (res) => {
        overlay(false)
        save(res.image, config.format, config.save)
      })
    }
  })
}

var filename = (format) => {
  var pad = (n) => (n = n + '', n.length >= 2 ? n : `0${n}`)
  var ext = (format) => format === 'jpeg' ? 'jpg' : format === 'png' ? 'png' : 'png'
  var timestamp = (now) =>
    [pad(now.getFullYear()), pad(now.getMonth() + 1), pad(now.getDate())].join('-')
    + ' - ' +
    [pad(now.getHours()), pad(now.getMinutes()), pad(now.getSeconds())].join('-')
  return `Copy Text from Videos - ${timestamp(new Date())}.${ext(format)}`
}

var save = (image, format, save) => {
  if (save === 'file') {
    var link = document.createElement('a')
    link.download = filename(format)
    link.href = image
    // link.click()//remove the download
  }
  else if (save === 'url') {
    navigator.clipboard.writeText(image).then(() => {
      alert([
        'Copy Text from Videos:',
        'Data URL String',
        'Saved to Clipboard!'
      ].join('\n'))
    })
  }
  else if (save === 'binary') {
    var [header, base64] = image.split(',')
    var [_, type] = /data:(.*);base64/.exec(header)
    var binary = atob(base64)
    var array = Array.from({length: binary.length})
      .map((_, index) => binary.charCodeAt(index))
    navigator.clipboard.write([
      new ClipboardItem({
        // jpeg is not supported on write, though the encoding is preserved
        'image/png': new Blob([new Uint8Array(array)], {type: 'image/png'})
      })
    ]).then(() => {
      alert([
        'Copy Text from Videos:',
        'Binary Image',
        'Saved to Clipboard!'
      ].join('\n'))
    })
  }
}

window.addEventListener('resize', ((timeout) => () => {
  clearTimeout(timeout)
  timeout = setTimeout(() => {
    jcrop.destroy()
    init(() => overlay(null))
  }, 100)
})())


chrome.runtime.onMessage.addListener((req, sender, res) => {
  if (req.message === 'init') {
    res({}) // prevent re-injecting

    if (!jcrop) {
      image(() => init(() => {
        overlay()
        capture()
      }))
    }
    else {
      overlay()
      capture(true)
    }
  }
  if (req.message === 'play') {
    var video = document.getElementsByClassName('video-stream')[0];
    var timeResults = req.time.split(';');
    var indexResult = 0;
    video.currentTime = parseInt(timeResults[0]);
    video.play()

    document.addEventListener('keydown', function (event) {
      if (event.keyCode == 190 ) {
        indexResult+=1;
        if (timeResults[indexResult]==undefined){indexResult=0;}
        video.currentTime = parseInt(timeResults[indexResult]);
      }
      else if (event.keyCode == 188 ) {
        indexResult-=1;
        if (timeResults[indexResult]==undefined){indexResult=0;}
        video.currentTime = parseInt(timeResults[indexResult]);
      }
    })
  }
  return true
})