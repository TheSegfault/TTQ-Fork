
// *** Begin document listener Block ***
function onLoad() {
	var starttime2 = Date.now();

	_log(1,"Begin onLoad()");

	TTQ_registerMenuCommand(aLangMenuOptions[3], promptRace);
	TTQ_registerMenuCommand(aLangMenuOptions[4], promptHistory);
	TTQ_registerMenuCommand("Language", promptLang);
	TTQ_registerMenuCommand(aLangMenuOptions[5], promptReset);
	TTQ_registerMenuCommand(aLangMenuOptions[9], promptDebug);

	LOG_LEVEL = getOption("DEBUG", 0, "integer");

    tA = /.*build\.php.*/i;

	if (iSiteId > -1 && tA.test(window.location.href)) {
		createBuildLinks();

		var build = $id('build');
		if( !(build) ) {
//		tX = xpath("//div[@class='build_desc']/a/img");
//		if (xpath("//div[@id='build'][@class='gid0']").snapshotLength > 0 || tX.snapshotLength != 1 ) {
			_log(2, "This is an empty building site or I can not find build description image. More more links to create.");
		} else {
			tY = parseInt(build.getAttribute('class').match(/\d+/)[0]);
			_log(3, "This building (gid="+tY+").");
//			tY = parseInt(tX.snapshotItem(0).className.split(" g")[1]);  //Building ID
			switch ( tY ) {
				case 13:
				case 22:	createResearchLinks(tY);
							break;
				case 19:	case 20:	case 21:	case 36:
				case 25:	case 26:	case 29:	case 30:
				case 44:	case 46:	case 48:	case 49:
							createTrainLinks(tY);
							break;
				case 24:	createPartyLinks();
							break;
				case 15:	createDemolishBtn();
							break;
				case 17:	setTimeout(createMarketLinks,700);
							break;
				case 16:	if( $gc('a2b').length > 0 && ($id('troops') || $gc('troop_details').length > 0) ) createAttackLinks();
							if( $id('rallyPointFarmList') ) {
								setTimeout(createGoldClubBtn,700);
								setTimeout(createGoldClubBtnAll,700);
							}
							break;
				default:	_log(2, "This building (gid="+tY+") has no more links to create.");
			}
		}
	}

	vName = getVariable("TTQ_TASKS");
	if(vName != '') refreshTaskList(vName.split("|"));

	tA = getVariable("TTQ_HISTORY");
	if(iHistoryLength > 0 && tA != '') refreshHistory(ttqTrimData(tA, iHistoryLength, false));

	tA = $id("ttqLoad");
	tX = Date.now();
	if ( tA ) tA.innerHTML = (inittime + (tX - starttime2));

	isTTQLoaded = true;
	ttqUpdatePanel(vName,Math.floor(tX/1000));
	_log(1, "End onLoad()");
}

function unLoad () {
	setVariable("TTQ_TABID", 0);
	for ( tX = 0, tY = theListeners.length ; tX < tY ; ++tX ) {
		tA = theListeners[tX];
		if  ( tA && tA[0] ) tA[0].removeEventListener(tA[1],tA[2],tA[3]);
	}
	window.clearInterval(oAnimateTimerIR);
	window.clearInterval(oIntervalReference);
	oIntervalReference = null;
	oAnimateTimerIR = null;
}

function doMinimize(evt) {
	var isMin, tD = evt.target.parentNode;
	if ( tD != null ) {
		switch ( tD.id ) {
			case "ttq_tasklist":		isMinimized = !isMinimized;
										isMin = isMinimized;
										setOption ("LIST_MINIMIZED", isMinimized);
										break;
			case "ttq_history":			isHistoryMinimized = !isHistoryMinimized;
										isMin = isHistoryMinimized;
										setOption ("LIST_HISTORY_MINIMIZED", isHistoryMinimized);
										break;
			default:					return false;
		}

		if (tD.id === "ttq_tasklist") tD.classList.toggle("ttq_minimized", isMin);
		if ( isMin ) {
			tD.style.height = "16px";
			tD.style.width = "150px";
			tD.style.overflow = "hidden";
		} else {
			tD.style.height = "";
			tD.style.width = "";
            tD.style.overflow = "auto";
            if (tD.id === "ttq_tasklist") ttqRestoreQueueSize(tD);
		}
	}
}

// *** End document listener Block ***
/**************************************************************************
 * --- Main Code Block ---
 ***************************************************************************/
if (init) {
	ttqAddEventListener ( document, "mousemove", mouseMove, false );
	ttqAddEventListener ( document, "mousedown", mouseDown, false );
	ttqAddEventListener ( document, "mouseup",   mouseUp,   false );
//	ttqAddEventListener ( window,   "load",      onLoad,    false );
	ttqAddEventListener ( window,   "pagehide",    unLoad,    false );
	var inittime = Date.now();
	_log(1, "TTQ starting...");
	var tmp = Math.round(ttqRandomNumber()*60000);
	setOption('RELOAD_AT', Math.floor((tmp + inittime)/1000));
	inittime -= starttime;
	_log(1, "CheckSetTasks> Begin. (tab ID = " + myID + " / "+getVariable("TTQ_TABID",0)+")");
//	checkSetTasks();
	if(!oIntervalReference) {
		_log(3, "setInterval()");
		oIntervalReference = window.setInterval(checkSetTasks, CHECK_TASKS_EVERY*1000);
	}
	onLoad();
} else {
    var oLogout = xpath("//div[@class='logout']");
	var oError = $gc('error');
	var errorFL = false;
	for( var i=0; i<oError.length; i++ ) {
		if( oError[i].innerHTML.replace(/\s/g,'').length > 0 ) {
			errorFL = true;
			break;
		}
	}
	if( oLogout.snapshotLength > 0 || errorFL ) TTQ_setValue(CURRENT_SERVER+'login','0');
    var oSysMsg = xpath("//div[@id='sysmsg']");
	var oLoginBtn = xpath("//div[@id='loginScene']//button[@type='submit']");
    if ( oLoginBtn.snapshotLength < 1 && (oLogout.snapshotLength > 0 || oSysMsg.snapshotLength > 0) ) {
        _log(1, "Error screen or something. Game is not loaded. Did not start TTQ.");
    } else if ( oLoginBtn.snapshotLength == 1 ) {  //Auto-Login, this assumes that FF has saved your username and password
		var loginFL = false;
		var oLogin = xpath("//input[@name='name'][@type='text']").snapshotItem(0);
		var oPassword = xpath("//input[@name='password'][@type='password']").snapshotItem(0);
		// writed by Serj_LV
		var logPas = TTQ_getValue(CURRENT_SERVER+'login','0');
		if( logPas != '0' ) {
			logPas = logPas.split('/');
			oLogin.value = logPas[0];
			oPassword.value = logPas[1];
			loginFL = true;
		} else {
			oLoginBtn.snapshotItem(0).addEventListener('click',function() {
				if ( oLogin.value.length > 0 && oPassword.value.length > 0 )
					TTQ_setValue(CURRENT_SERVER+'login',oLogin.value+'/'+oPassword.value);
			}, false);
		}
		if( loginFL ) setTimeout("document.getElementById('loginScene').getElementsByTagName('button')[0].click();",Math.round(ttqRandomNumber()*111)); // 333 - roughly 1.6 to 3.3 with default random min/max settings
		else _log(1,"Auto-Login failed. You must have Firefox/Chrome store the username and password. TTQ does not.");
	} else {
		_log(1, "Initialization failed, Auto-login failed. Travian Task Queue is not running");
	}
}

}

function backupStart () {
	if(notRunYet) {
		var l4 = document.getElementById('l4');
		if( l4 ) allInOneTTQ();
		else setTimeout(backupStart, 500);
	}
}

var notRunYet = true;
if( /Gecko/.test(navigator.userAgent) ) allInOneTTQ();
else if (window.addEventListener) window.addEventListener("load",function () { if(notRunYet) allInOneTTQ(); },false);
setTimeout(backupStart, 500);

})();

