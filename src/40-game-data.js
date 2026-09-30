
// *** Begin TTQ "get" Functions  Block ***
function getSiteId() {
	_log(3,"Begin getSiteId()");
	//Check if the page is showing the village instead
	var xpathVillage = xpath("//div[@class='village2'] | //div[@class='village1'] ");
	var href = window.location.href;
	if ( xpathVillage.snapshotLength > 0 || href.indexOf("messages") > -1 || href.indexOf("berichte") > -1 || href.indexOf("hero") > -1 || href.indexOf("details") > -1 || href.indexOf("karte") > -1 || href.indexOf("statistiken") > -1 || href.indexOf("profile") > -1 || href.indexOf("report") > -1 ) {
		_log(2, "getSiteId>This is not a screen that has a building. End getSiteId()");
		return -6;
	}
	_log(3,"getSiteId> Trying from URL...");
	var re = /.*build\.php\?([a-z=0-9&]*&)?g?id=([0-9]{1,2})/i;
	var tSiteId = window.location.href.match(re);
	if(tSiteId != null) {
		tSiteId = parseInt(tSiteId[2]);
		_log(3, "getSiteId> Building site ID is " + tSiteId + ". End getSiteId().");
		return tSiteId;
	}
	_log(2, "getSiteId> Building site ID not found.... anywhere. End getSiteId();");
	return -6;
}

/**************************************************************************
 * @return name of one of your one villages.
 ***************************************************************************/
function getVillageName(iVillageDid) {
	iVillageDid = parseInt(iVillageDid);
	if ( isNaN(iVillageDid) ) return aLangStrings[2];
	if ( typeof(myPlaceNames[iVillageDid]) != "undefined" ) return myPlaceNames[iVillageDid];
	if ( iVillageDid > 0 ) return "(" + iVillageDid + ")";
	return aLangStrings[2];
}

function getVillageNameZ(iVillageZid) {
	var xy = coordZToXY(iVillageZid);
	return getVillageNameXY(xy[0],xy[1]);
}

function getVillageNameXY(iVillageX, iVillageY){
	iVillageX = parseInt(iVillageX);
	iVillageY = parseInt(iVillageY);
	if ( isNaN(iVillageX) || Math.abs(iVillageX) > mapRadius || isNaN(iVillageY) ||  Math.abs(iVillageY) > mapRadius ) return aLangStrings[2];
	if ( typeof(myPlaceNames[iVillageX+" "+iVillageY]) != "undefined" ) return myPlaceNames[iVillageX+" "+iVillageY];
	var nV, tStr1 = '<span class ="ttq_village_name" title="'+aLangStrings[81]+'" onclick="window.location = \'' + window.location.origin + '/position_details.php?x='+iVillageX+'&y='+iVillageY+'\';return false;">';
	var tStr2 = "("+iVillageX+"|"+iVillageY+")</span>";
	for ( var i = 0, k = otherPlaceNames.length ; i < k ; ++i ) {
		nV = otherPlaceNames[i].split("|");
		if ( parseInt(nV[0]) == iVillageX && parseInt(nV[1]) == iVillageY ) {
			nV.splice(0,2);//Just in case some village names have | in thier name
			return tStr1+nV.join("|")+" "+tStr2;
		}
	}
	return tStr1+tStr2;
}

function getTroopsInfo(aTroops) {
	var sTroopsInfo = "";
	var isEmpty = true;
	var k = -1;
	for(var i = 1; i < aTroops.length && i < 13; ++i) {
		if ( aTroops[i] > 0 && ((isEmpty && i > 11) || (i < 12)) ) {
			isEmpty = false;
			sTroopsInfo += aLangTroops[i-1] + ": " +aTroops[i]+ ", ";
		}
	}
	//trim last two characters
	sTroopsInfo = sTroopsInfo.substring(0, sTroopsInfo.length - 2);
	return sTroopsInfo;
}

function getMerchantInfo(aMerchants, isLong){
	var	sMerchantInfo = "";
	if ( typeof(aMerchants) == 'string'	) aMerchants = aMerchants.split("_");
	if ( isLong ) { sMerchantInfo = aLangResources[0] + ":" + aMerchants[2] + ", " + aLangResources[1] + ":" + aMerchants[3] + ", " + aLangResources[2] + ":" + aMerchants[4] + ", " + aLangResources[3] + ":" + aMerchants[5];
	} else {
		sMerchantInfo = "" + ((aMerchants[2]>0)?(aLangResources[0]+": "+aMerchants[2]+", "):"") + ((aMerchants[3]>0)?(aLangResources[1]+": "+aMerchants[3]+", "):"") + ((aMerchants[4]>0)?(aLangResources[2]+": "+aMerchants[4]+", "):"") + ((aMerchants[5]>0)?(aLangResources[3]+": "+aMerchants[5]+", "):"");
		sMerchantInfo = sMerchantInfo.slice(0,-2);
	}
	return sMerchantInfo;
}

function getTaskDetails(aTask) {
	_log(2,"Begin getTaskDetails("+aTask+")");
	switch(aTask[0]) {
		case "0": //build new building
			return getVillageName(aTask[5]) + " : " + aLangTasks[0] + " " + aTask[3].split("_")[1] + "<br>(" + aLangStrings[35] + " " + aTask[2] + ")";
		case "1": //upgrade building
			return getVillageName(aTask[5]) + " : " + aLangTasks[1] + " " + aTask[3].split("_")[1] + "<br>(" + aLangStrings[35] + " " + aTask[2] + ")";
		case "2": //send attack
			var aTroops = aTask[3].split("_");
			var iIndex = parseInt(aTroops[0]);
			var langStringNo = iIndex == 5 ? 20 : iIndex == 3 ? 21 : 22;
			if ( (iIndex == 3 || iIndex == 4) && onlySpies(aTroops) ) var sTask = aLangStrings[47]+" "+aTroops[14]+" ";
			else var sTask = aLangStrings[langStringNo];
			return getVillageName(aTask[5]) + " : " + sTask + " >> " + getVillageNameZ(aTask[2]) + "<br>(" + getTroopsInfo(aTroops) + ")";
		case "3": //research
			var aOptions = aTask[3].split("_");
			return getVillageName(aTask[5])+" : "+aLangTasks[aOptions[1]]+" - "+aOptions[2];
		case "4": //train troops
			var aTroops = aTask[3].split("_");
			return getVillageName(aTask[5]) + " : " + aLangTasks[4] + "<br>(" + getTroopsInfo(aTroops) + ")";
		case "5": //throw party
			return getVillageName(aTask[5]) + " : " + aLangTasks[5] + " " + aLangStrings[53];
		case "6": //demolish building
			var tmp = "A Building";
			var tmp2 = aTask[3].split("_");
			var siteId = parseInt(aTask[2]);
			for ( var i = 0, k = tmp2.length ; i < k ; ++i ) {
				if ( parseInt(tmp2[i].replace(/\[/g,"")) == siteId ) {
					tmp = tmp2[i];
					break;
				}
			}
			return getVillageName(aTask[5]) + " : " + aLangTasks[6] + " " + tmp + "<br>(" + aLangStrings[35] + " " + siteId + ")";
		case "7": //Send Merchants
			var tM = aTask[3].split("_");
			return getVillageName(aTask[5]) + " : " + aLangTasks[7] + " >> " + getVillageNameXY(tM[0],tM[1]) + "<br>(" + getMerchantInfo(tM) + ")";
		case "8": //Send Back/Withdraw
			return getVillageName(aTask[5]) + " : " + aLangTasks[8] + " >> " + aTask[2] + "<br>(" + getTroopsInfo(aTask[3].split("_")) + ")";
		case "9": // Send troops through Gold-Club
			return getVillageName(aTask[5]) + " : " + getOption('FARMLIST','') + " >> " + aTask[2] + " ";
		default: //do nothing
			_log(3, "Unknown task, cant find details.");
			return "Unknown Task";
	}
	_log(3, "End getTaskDetails("+aTask+")");
}

function getTroopNames() {
	var httpRequest = new XMLHttpRequest();
	var httpRequestString = fullName+"build.php?id=39&gid=16&tt=1";
	httpRequest.open("GET", httpRequestString, true);
	httpRequest.onreadystatechange = function() {
		if (httpRequest.readyState == 4) { //complete
			var tTroops = new Array();
			if (httpRequest.status == 200 && httpRequest.responseText) { // ok
				var holder = document.createElement('div');
				holder.innerHTML = httpRequest.responseText;
				if ( holder.getElementsByClassName("gid16").length == 1 ) {
					var tUnits = holder.getElementsByClassName("troop_details");
					if ( tUnits.length > 0 ) {
						var i;
						tUnits = tUnits[tUnits.length-1].getElementsByClassName("unit");
						if ( tUnits.length > 10 ) for ( i = 0 ; i < 11 ; ++i ) tTroops.push("["+tUnits[i].alt+"]");
					} else {
						return; //no Rally Point
					}
				}
			}
			tTroops.push(aLangStrings[7]);
			if ( tTroops.length > 10 ) {
				aLangTroops = tTroops;
				setVariable("TROOP_NAMES",tTroops.join("|"));
				isTroopsLoaded = true;
				ttqUpdatePanel();
			}
		}
	};
	httpRequest.send(null);
}

function detectTribe() {
	iMyRace = parseInt(tOpts["RACE"]);  // 0-Romans, 1-Teutons, 2-Gauls, 5-Egyptians, 6-Huns, 7-Spartans, 8-Vikings. Set via dialogue. (or -1 for autodetect)
	if ( isNaN(iMyRace) || iMyRace < 0 ) {
		setVariable("TROOP_NAMES", "");
		var httpRequest = new XMLHttpRequest();
		var httpRequestString = fullName+"build.php?id=39&gid=16&tt=2";
		httpRequest.open("GET", httpRequestString, true);
		httpRequest.onreadystatechange = function() {
			if (httpRequest.readyState == 4) { //complete
				if (httpRequest.status == 200 && httpRequest.responseText) { // ok
					var parser = new DOMParser();
					var holder = parser.parseFromString(httpRequest.responseText, "text/html");
					var troopImg = xpath('.//img[contains(@class,"unit u")]',holder,true,holder);
					if( troopImg ) {
						iMyRace = Math.floor(parseInt(troopImg.getAttribute('class').match(/\d+/)[0])/10);
						if ( isNaN(iMyRace) || iMyRace < 0 || iMyRace > 8 ) iMyRace = 0;
						else setOption("RACE", iMyRace);
					}
				}
			}
		};
		httpRequest.send(null);
	}
}

// *** End TTQ "get" Functions ***
