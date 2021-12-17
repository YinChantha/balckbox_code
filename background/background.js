
// chrome.storage.sync.clear()

chrome.storage.sync.get((config) => {
  if (!config.method) {
    chrome.storage.sync.set({method: 'crop'})
  }
  if (!config.format) {
    chrome.storage.sync.set({format: 'jpeg'})
  }
  if (!config.save) {
    chrome.storage.sync.set({save: 'file'})
  }
  if (config.dpr === undefined) {
    chrome.storage.sync.set({dpr: true})
  }
  // v1.9 -> v2.0
  if (config.save === 'clipboard') {
    config.save = 'url'
    chrome.storage.sync.set({save: 'url'})
  }
})

function inject (tab) {
  chrome.tabs.sendMessage(tab.id, {message: 'init'}, (res) => {
    if (res) {
      clearTimeout(timeout)
    }
  })

  var timeout = setTimeout(() => {
    chrome.tabs.insertCSS(tab.id, {file: 'vendor/jquery.Jcrop.min.css', runAt: 'document_start'})
    chrome.tabs.insertCSS(tab.id, {file: 'css/content.css', runAt: 'document_start'})

    chrome.tabs.executeScript(tab.id, {file: 'vendor/jquery.min.js', runAt: 'document_start'})
    chrome.tabs.executeScript(tab.id, {file: 'vendor/jquery.Jcrop.min.js', runAt: 'document_start'})
    chrome.tabs.executeScript(tab.id, {file: 'content/content.js', runAt: 'document_start'})

    setTimeout(() => {
      chrome.tabs.sendMessage(tab.id, {message: 'init'})
    }, 100)
  }, 100)
}

function injectPlay (tab, time) {
  chrome.tabs.sendMessage(tab.id, {message: 'play', time: time}, (res) => {
    if (res) {
      clearTimeout(timeout)
    }
  })

  var timeout = setTimeout(() => {
    chrome.tabs.insertCSS(tab.id, {file: 'vendor/jquery.Jcrop.min.css', runAt: 'document_start'})
    chrome.tabs.insertCSS(tab.id, {file: 'css/content.css', runAt: 'document_start'})

    chrome.tabs.executeScript(tab.id, {file: 'vendor/jquery.min.js', runAt: 'document_start'})
    chrome.tabs.executeScript(tab.id, {file: 'vendor/jquery.Jcrop.min.js', runAt: 'document_start'})
    chrome.tabs.executeScript(tab.id, {file: 'content/content.js', runAt: 'document_start'})

    setTimeout(() => {
      chrome.tabs.sendMessage(tab.id, {message: 'play', time: time})
    }, 100)
  }, 100)
}


//Login
let site = 'https://useblackbox.io/';
var userId='';

//Install Redirect
function redirectToLogin() { chrome.tabs.create({ url: site + "signin" }); }
chrome.runtime.onInstalled.addListener((details) => {
  fetch(site + "isLoggedIn").then(function (response) {
    response.json().then(function (data) {
        if (data.code == 50){
          if(userId==''){//Except on update
            chrome.tabs.create({ url: site + "signup" });
          }
        }
        else {
          userId = data.userId;
          chrome.storage.sync.set({ userId: userId })
        }
    })
  })
})

function loginUser() {
  chrome.storage.sync.get(["userId"], function (items) {
      if (Object.keys(items).length === 0){
        fetch(site + "isLoggedIn").then(function (response) {
          response.json().then(function (data) {
              if (data.code == 50){ redirectToLogin(); }
              else {
                userId = data.userId;
                chrome.storage.sync.set({ userId: userId })
              }
          })
        })
      }
      else {
        userId=items.userId;
      }
  })
}

chrome.browserAction.onClicked.addListener((tab) => {
  if (userId == ''){ loginUser() }
  inject(tab)
})

chrome.commands.onCommand.addListener((command) => {
  if (command === 'take-screenshot') {
    chrome.tabs.getSelected(null, (tab) => {
      inject(tab)
    })
  }
})

const copyToClipboard = str => {
  const el = document.createElement('textarea');
  el.value = str;
  document.body.appendChild(el);
  el.select();
  document.execCommand('copy');
  document.body.removeChild(el);
};

async function getData(url){
  var res = await fetch(url)
  var buff = await res.arrayBuffer()
  // clone so we can rename, and put into array for easy proccessing
  var file = [
    new File([buff], `${userId}.jpg`, {
      type: 'image/jpeg',
    }),
  ]
  f = file;

  //=============================================Start Sending To Request
  var formdata = new FormData();
  formdata.append("photo", file[0], `${userId}.jpg`);
  var requestOptions = {
    method: 'POST',
    body: formdata,
    redirect: 'follow'
  };
  fetch("https://blackboxapp.co/getsingleimage", requestOptions)
    .then(response => response.text())
    .then((result) => {
      if (result.length == 7 && samesend<10) {
        samesend+=1;
        getData(url)
      }
      else {
        if (JSON.parse(result).userId == userId){
          resultArr = JSON.parse(result).text;
          var cleanText = resultArr.split('\n').slice(0, resultArr.split('\n').length).join('\n');
          cleanText = cleanText.split('%3D').join('')
          copyToClipboard(cleanText);
        }
      }
    })
    .catch(error => console.log('error', error));
}

var currentTab='';
chrome.omnibox.onInputStarted.addListener(function(text) {
  chrome.tabs.query({currentWindow: true, active: true}, function(tabs){
    currentTab =tabs[0].url; 
    processingvideo(currentTab.split('?v=')[1].split('&t')[0], text);
  });
})
var tabsave;
chrome.omnibox.onInputEntered.addListener(function(text) {
  if (text) {
    chrome.tabs.query({currentWindow: true, active: true}, function(tabs){
        currentTab =tabs[0].url; 
        processvideo(currentTab.split('?v=')[1].split('&t')[0], text);
        tabsave = tabs[0];
    });
  }
});

async function processingvideo(videoId){
  var formdata = new FormData();
  formdata.append("passBackVideoId", videoId);
  var requestOptions = {
    method: 'POST',
    body: formdata,
    redirect: 'follow'
  };
  fetch("https://blackboxapp.co/processingvideo", requestOptions)
    .then(response => response.text())
    .then((result) => {})
    .catch(error => console.log('error', error));
}

var resultArr;
async function processvideo(videoId, search){
  var formdata = new FormData();
  formdata.append("passBackVideoIdGlobal", videoId);
  formdata.append("passBackTextBoxSearch", search);
  var requestOptions = {
    method: 'POST',
    body: formdata,
    redirect: 'follow'
  };
  fetch("https://blackboxapp.co/videoquery", requestOptions)
    .then(response => response.text())
    .then((result) => {
      resultArr = JSON.parse(result);
      injectPlay(tabsave, resultArr[0].join(';'));
    })
    .catch(error => console.log('error', error));
}

var samesend=0;
chrome.runtime.onMessage.addListener((req, sender, res) => {
  if (req.message === 'capture') {
    chrome.storage.sync.get((config) => {

      chrome.tabs.getSelected(null, (tab) => {

        chrome.tabs.captureVisibleTab(tab.windowId, {format: config.format}, (image) => {
          // image is base64

          if (config.method === 'view') {
            if (req.dpr !== 1 && !config.dpr) {
              crop(image, req.area, req.dpr, config.dpr, config.format, (cropped) => {
                res({message: 'image', image: cropped})
              })
            }
            else {
              res({message: 'image', image: image})
            }
          }
          else {
            crop(image, req.area, req.dpr, config.dpr, config.format, (cropped) => {
              samesend = 0;
              getData(cropped);
              res({message: 'image', image: cropped})
            })
          }
        })
      })
    })
  }
  else if (req.message === 'active') {
    if (req.active) {
      chrome.storage.sync.get((config) => {
        if (config.method === 'view') {
          chrome.browserAction.setTitle({tabId: sender.tab.id, title: 'Capture Viewport'})
          chrome.browserAction.setBadgeText({tabId: sender.tab.id, text: '⬒'})
        }
        // else if (config.method === 'full') {
        //   chrome.browserAction.setTitle({tabId: sender.tab.id, title: 'Capture Document'})
        //   chrome.browserAction.setBadgeText({tabId: sender.tab.id, text: '⬛'})
        // }
        else if (config.method === 'crop') {
          chrome.browserAction.setTitle({tabId: sender.tab.id, title: 'Crop and Save'})
          chrome.browserAction.setBadgeText({tabId: sender.tab.id, text: '◩'})
        }
        else if (config.method === 'wait') {
          chrome.browserAction.setTitle({tabId: sender.tab.id, title: 'Crop and Wait'})
          chrome.browserAction.setBadgeText({tabId: sender.tab.id, text: '◪'})
        }
      })
    }
    else {
      chrome.browserAction.setTitle({tabId: sender.tab.id, title: 'Copy Text from Videos'})
      chrome.browserAction.setBadgeText({tabId: sender.tab.id, text: ''})
    }
  }
  return true
})

function crop (image, area, dpr, preserve, format, done) {
  var top = area.y * dpr
  var left = area.x * dpr
  var width = area.w * dpr
  var height = area.h * dpr
  var w = (dpr !== 1 && preserve) ? width : area.w
  var h = (dpr !== 1 && preserve) ? height : area.h

  var canvas = null
  if (!canvas) {
    canvas = document.createElement('canvas')
    document.body.appendChild(canvas)
  }
  canvas.width = w
  canvas.height = h

  var img = new Image()
  img.onload = () => {
    var context = canvas.getContext('2d')
    context.drawImage(img,
      left, top,
      width, height,
      0, 0,
      w, h
    )

    var cropped = canvas.toDataURL(`image/${format}`)
    done(cropped)
  }
  img.src = image
}