var animationFrames = 36;
var animationSpeed = 10; // ms
var rotation = 0;
var unreadCount = -1;
var canvasContext;

var loggedInImage;
var loggedNoImage;
var loggedOutImage;

var urlPrefix = 'https://wave.google.com/';
var wavesArray = null;
var timer = null;
var version = "3";
var show_options_page = true;

function getWaves(){
	return wavesArray;
}

var settings = {
	get pollInterval() {
    if(localStorage['poll'] == 'NaN') return 1000 * 60 * 30;
		return localStorage['poll'] || 1000 * 60 * 30;
	},
	set pollInterval(val) {
		localStorage['poll'] = val;
	},
	get timeout() {
		//return localStorage['timeout'] || 1000 * 15;
    return 1000*15;
	},
	set timeout(val) {
		localStorage['timeout'] = val;
	},
	get appsDomain() {
		return localStorage['appsDomain'] || '';
	},
	set appsDomain(val) {
		localStorage['appsDomain'] = val;
	},
  get popupNotification() {
		return localStorage['popupNotification'] == 'true' ? true : false;
	},
	set popupNotification(val) {
    localStorage['popupNotification'] = val;
	},
  get soundNotification() {
    return localStorage['soundNotification'] == 'true' ? true : false;
	},
	set soundNotification(val) {
    localStorage['soundNotification'] = val;
	},
	get hideNavBox() {
		return localStorage['hideNavBox'] == 'true' ? true : false;
	},
	set hideNavBox(val) {
		localStorage['hideNavBox'] = val;
	},
	get hideContactsBox() {
		return localStorage['hideContactsBox'] == 'true' ? true : false;
	},
	set hideContactsBox(val) {
		localStorage['hideContactsBox'] = val;
	},
	get hideSearchBox() {
		return localStorage['hideSearchBox'] == 'true' ? true : false;
	},
	set hideSearchBox(val) {
		localStorage['hideSearchBox'] = val;
	},
	get hidePreviewBox() {
		return localStorage['hidePreviewBox'] == 'true' ? true : false;
	},
	set hidePreviewBox(val) {
		localStorage['hidePreviewBox'] = val;
	},
	get iconsSet() {
		return localStorage['iconsSet'] || 'set1';
	},
	set iconsSet(val) {
		localStorage['iconsSet'] = val;
	},
}

function getBaseUrl() {
	var url = urlPrefix;
	if (settings.appsDomain && settings.appsDomain.length > 0) {
		url += 'a/' + settings.appsDomain;
	} else {
		url += 'wave';
	}
	return url;
}

function getHomeUrl() {
	if (getWaveWindowOptions() == '') return getBaseUrl()
	else return getBaseUrl() + '#' + getWaveWindowOptions();
}

function getWaveWindowOptions() {
	var opt = '';
	if (settings.hideNavBox)
		opt += 'minimized:nav,';
	if (settings.hideContactsBox)
		opt += 'minimized:contact,';
	if (settings.hideSearchBox)
		opt += 'minimized:search,';
	return opt;
}

function getFeedUrl() {
	var url = getBaseUrl();
	url += '/notification';
	return url;
}

function getWaveUrl(wid) {
	var url = getHomeUrl();
	if (getWaveWindowOptions() == '') url += '#';
	url += 'restored:wave:' + wid.replace(/\+/g, '%252B');
	return url;
}

function pluginInit() {
    if(show_options_page && (localStorage["version"] == null || localStorage["version"] != version)) {
        localStorage["version"] = version;
        chrome.tabs.create({url : "options.html"});        
    } else if(show_options_page == false && (localStorage["version"] == null || localStorage["version"] != version)) {
		localStorage["version"] = version;
	}
	loggedInImage = $('#'+settings.iconsSet+'_logged_in')[0];
	loggedOutImage = $('#'+settings.iconsSet+'_logged_out')[0];
	loggedNoImage = $('#'+settings.iconsSet+'_logged_no')[0];
	canvasContext = $('#canvas')[0].getContext('2d');
	chrome.browserAction.setBadgeBackgroundColor({color:[190, 190, 190, 230]});
	chrome.browserAction.setBadgeText({text:"?"});
	
	startRequest();
}

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo) {
	if (changeInfo.url && (changeInfo.url.indexOf(urlPrefix) == 0 || changeInfo.url.indexOf(urlPrefix.replace('https://', 'http://')) == 0)) {
		console.log("saw wave! updating...");
		updateWaves();
	}
});

function goOptions() {
	chrome.tabs.create({url : "options.html"}); 
}

function goHome() {
	chrome.tabs.getAllInWindow(null, function (tabs) {
		for(var i in tabs) {
			var tab = tabs[i];
			if(tab.url.indexOf(getBaseUrl()) == 0 || tab.url.indexOf(getBaseUrl().replace('https://', 'http://')) == 0) {
				chrome.tabs.update(tab.id, {selected:true});
				return;
			}
		}
		chrome.tabs.create({url: getHomeUrl()});
	});
}

function goToMessage(url) {
	chrome.tabs.getAllInWindow(null, function (tabs) {
		for(var i in tabs) {
			var tab = tabs[i];
			if(tab.url.indexOf(urlPrefix) == 0 || tab.url.indexOf(urlPrefix.replace('https://', 'http://')) == 0) {
				chrome.tabs.update(tab.id, {selected:true, url:url});
				return;
			}
		}
		chrome.tabs.create({url: url});
	});
}

function scheduleRequest() {
    timer = window.setTimeout(startRequest, settings.pollInterval);
}

function startRequest() {
	updateWaves();
	scheduleRequest();
}

function resetTimer() {
  if(timer != null) {
    clearTimeout(timer);
  }
}

function refresh() {
  showLoggedOut();
  resetTimer();
  pluginInit();
}

function updateWaves(callback) {
	if (callback && typeof(callback) === 'function')
		getInboxCount(function(count) { callback(count); updateUnreadCount(count); }, showLoggedOut);
	else
		getInboxCount(updateUnreadCount, showLoggedOut);
}

function getInboxCount(onSuccess, onError) {
	wavesArray = new Array();
	$.ajax({
		type: 'GET',
		url: getFeedUrl(),
		cache: false,
		dataType: 'json',
		timeout: settings.Timeout,
		success: function(result) {
			try
			{
				if (result) {
          var waves = result;
          if(waves) {
						$(waves).each(function() {
                if(this['unreadBlips'] != 0) {
                  wavesArray.push({
                    id: this['waveId'],
                    subject: this['title'],
                    snippet: this['snippet'],
                    total: this['totalBlips']+'',
                    unread: this['unreadBlips']+''
                  });
                }
							});
						console.log('Waves: ' + waves.length + ', Unread: ' + wavesArray.length);
						if (onSuccess)
						  onSuccess(wavesArray.length);
					} else{
						console.log("Not logged in?");
						console.error("Error: Not logged in?");
						if (onError)
						  onError();
					}
				} else {
					console.log("No responseText!");
				}
			} catch(e) {
				console.log("ex: " + e);
				console.error("exception: " + e);
				if (onError)
					onError();
			}
		},
		error: function() {
			if (onError)
				onError();
		}
	});
}

function updateUnreadCount(count) {
  if (unreadCount != count) {
    unreadCount = count;
    animateFlip();
    chrome.tabs.getSelected(null, function(tab) {
      if(tab.url.indexOf(getBaseUrl()) == 0 || tab.url.indexOf(getBaseUrl().replace('https://', 'http://')) == 0) {
        //nothing
      } else {
        if(unreadCount != 0) {
          var perm = webkitNotifications.checkPermission();
          if(settings.soundNotification) {
            document.getElementById('notification').play();
          }
          if(settings.popupNotification && perm == 0) {
            notify(unreadCount);
          }
        }
      }
    });
  }
}

function ease(x) {
  return (1-Math.sin(Math.PI/2+x*Math.PI))/2;
}

function showLoggedOut() {
	canvasContext.save();
	canvasContext.clearRect(0, 0, 19, 19);
	canvasContext.translate(19/2, 19/2);
	canvasContext.drawImage(loggedOutImage, -loggedOutImage.width/2 - 1, -loggedOutImage.height/2);
	canvasContext.restore();

	chrome.browserAction.setIcon({imageData:canvasContext.getImageData(0, 0, 19, 19)});
	chrome.browserAction.setBadgeBackgroundColor({color:[190, 190, 190, 230]});
	chrome.browserAction.setBadgeText({text:"?"});
	chrome.browserAction.setTitle({title:"Click to login."});
	unreadCount = -1;
}

function animateFlip() {
	rotation += 1/animationFrames;
	drawIconAtRotation();

	if (rotation <= 1) {
		setTimeout("animateFlip()", animationSpeed);
	} else {
		rotation = 0;
		drawIconAtRotation();
	}
}

function drawIconAtRotation() {
	canvasContext.save();
	canvasContext.clearRect(0, 0, 19, 19);
	canvasContext.translate(19/2, 19/2);
	canvasContext.rotate(2*Math.PI*ease(rotation));
  
	var img = loggedInImage;
  switch(unreadCount)
	{
      case 0:
          img = loggedNoImage;
		      chrome.browserAction.setTitle({title:"No unread waves"});
		      chrome.browserAction.setBadgeText({text:""});
          break;
      case 1:
		      if(settings.iconsSet == "set1") chrome.browserAction.setBadgeBackgroundColor({color:[125, 194, 93, 255]});
	        else chrome.browserAction.setBadgeBackgroundColor({color:[170, 80, 80, 255]});
          img = loggedInImage;
		      chrome.browserAction.setTitle({title:"1 unread wave"});
		      chrome.browserAction.setBadgeText({text:unreadCount+""});
		      break;
      default:
          if(settings.iconsSet == "set1") chrome.browserAction.setBadgeBackgroundColor({color:[125, 194, 93, 255]});
	        else chrome.browserAction.setBadgeBackgroundColor({color:[170, 80, 80, 255]});
		      img = loggedInImage;        
          chrome.browserAction.setTitle({title:unreadCount + " unread waves"});
		      chrome.browserAction.setBadgeText({text:unreadCount+""});
		      break;
	}
	canvasContext.drawImage(img, -img.width/2, -img.height/2 );
	canvasContext.restore();

	chrome.browserAction.setIcon({imageData:canvasContext.getImageData(0, 0, 19, 19)});
}

var notif = null;
function notify(unreadCount) {
  if(notif != null) { notif.cancel();  notif = null;}
  if (notif == null) {
    var text = "";
    var desc = "";
    if(unreadCount == 1) {
      text = "1 unread wave";
      desc = getWaves()[0].subject.substr( 0, 50 )+": "+getWaves()[0].snippet.substr( 0, 80 );
    } else {
      text = unreadCount + " unread waves";
      $(getWaves()).each(function(i) {
        if (i+1 < 5 ) {
          if (desc == "") {
            desc = getWaves()[i].subject.substr( 0, 40 );
          } else {
					  desc = desc + ", " + getWaves()[i].subject.substr( 0, 40 );
          }
				}
      });
    }
    notif = webkitNotifications.createNotification('icon_70.png', text, desc);
    notif.show();
    setTimeout("hide_notif();", 5000);
  }
}

function hide_notif() {
  notif.cancel();
  notif = null;
}