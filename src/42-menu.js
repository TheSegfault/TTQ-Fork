
// *** Begin GreaseMonkey Menu Block ***
function promptRace() {
	iMyRace = 'x';
	while ( isNaN(iMyRace) ) {
		iMyRace = prompt(aLangMenuOptions[0] + aLangMenuOptions[7] + getOption("RACE", -1, "integer"));
		if ( iMyRace == null || iMyRace == '' ) break;
		iMyRace = parseInt(iMyRace);
		if ( !isNaN(iMyRace) ) {
			if ( iMyRace < 7 ) {
				if ( iMyRace < -1 || iMyRace == 3 || iMyRace == 4 || iMyRace > 8 ) iMyRace = -1;
				setOption("RACE", iMyRace);
				window.location.reload();
				break;
			} else iMyRace = 'x';
		}
	}
}

function promptHistory() {
	var tHistLen = 'x';
	while ( isNaN(tHistLen) ) {
		tHistLen = prompt(aLangMenuOptions[0] + aLangMenuOptions[6] + iHistoryLength);
		if ( tHistLen == null || tHistLen == '' ) break;
		tHistLen = parseInt(tHistLen);
		if( !isNaN(tHistLen) ) {
			if(tHistLen > -1) {
				setOption("HISTORY_LENGTH", tHistLen);
				window.location.reload();
				break;
			} else tHistLen = 'x';
		}
	}
}

function promptReset() {
	if ( confirm(aLangMenuOptions[0] + "\n" + aLangMenuOptions[8]) ) {
		// rewritten by Serj_LV
		unLoad();
		var allkey = ['OTHER_PLACE_NAMES','TROOP_NAMES','TTQ_HISTORY','TTQ_OPTIONS','TTQ_TABID','TTQ_TASKS','vlist'];
		for (var i=0; i<allkey.length; i++) allkey[i] = CURRENT_SERVER + myPlayerID + "_" + allkey[i];
		allkey.push(CURRENT_SERVER+'login',CURRENT_SERVER+'lang',CURRENT_SERVER+'TTQ-UID');
		for (i=0; i<allkey.length; i++) TTQ_deleteValue(allkey[i]);
		var ttqPanel = $id("ttqPanel");
		if( ttqPanel ) {
			ttqPanel.style.backgroundColor ="#C0C0FF";
			ttqPanel.innerHTML = 'TTQ - goodbye';
		}
		allkey = ["ttq_message","timerform_wrapper","ttq_history","ttq_tasklist"];
		for (i=0; i<allkey.length; i++) {
			tA = $id(allkey[i]);
			if( tA ) tA.parentNode.removeChild(tA);
		}
	}
}

function promptLang() {
// writed by Serj_LV
	var aLangPrompt = "0 - auto, or one of these: ";
	var t=1;
	allLangs.sort();
	for( var i=0; i<allLangs.length; i++ ) {
		if(aLangPrompt.length > t*50 ) {
			aLangPrompt += '\n';
			t++;
		}
		aLangPrompt += allLangs[i] + ", ";
	}
	while( true ) {
		var aLang = prompt(aLangPrompt, TTQ_getValue(CURRENT_SERVER+"lang","0"));
		if( !aLang ) return;
		if( aLang == 0 ) {
			TTQ_deleteValue(CURRENT_SERVER+"lang");
			break;
		} else {
			if( (","+allLangs.join(',')+",").indexOf(","+aLang+",") != -1 ) {
				TTQ_setValue(CURRENT_SERVER+"lang",aLang);
				break;
			}
		}
	}
	window.location.reload();
}

function promptDebug() {
	var aDebugVal = prompt(aLangMenuOptions[10], getOption("DEBUG", 0, "integer"));
	switch ( aDebugVal ) {
		case "0": case "1":	case "2":	case "3":
			setOption("DEBUG", parseInt(aDebugVal));
			window.location.reload();
			break;
	}
}

// *** End GreaseMonkey Menu Block ***
