
// *** Begin Party Functions ***
function createPartyLinks(/*sBuildingId*/) {
	_log(3,"Begin createPartyLinks()");

	//var xpathBuildingNames = xpath("//h1");
	//var re = new RegExp("(.*)\\s(?:<([a-zA-Z][a-zA-Z0-9]*)\\b[^>]*>)?" + aLangStrings[7] + "\\s[0-9]{1,3}(?:<\/\\2>)?$", "i");
	//var re2 = new RegExp("[0-9]{1,3}\\.\\s(.*)$", "i");
	//var xpathResult = xpath("id('content')/div[@class='gid24']");

	//if(xpathResult.snapshotLength > 0) {
//		var xpathStart = document.getElementsByClassName("act");
		var xpathStart = document.getElementsByClassName("information");
		_log(3, "Time to party. Found " + xpathStart.length + " type of parties.");
		var linkTxt = aLangStrings[53];
		for(var i = 0; i < xpathStart.length ; ++i ) {
			if ( i == 2 ) continue;
//			var sBuildingName = xpathBuildingNames.snapshotItem(0).innerHTML;
//			var aMatches = sBuildingName.match(re);
//			sBuildingName = aMatches[1];
//			sBuildingName = rtrim(sBuildingName);
//			var sBuildingId = aLangBuildings.indexOf(sBuildingName);
			var thisStart = xpathStart[i];
			var pLink = document.createElement("a");
			pLink.id = "ttq_research_later" + i;
			pLink.className = "ttq_research_later";
			pLink.innerHTML = " " + linkTxt;
			pLink.title = linkTxt;
			pLink.href = "#";
			pLink.setAttribute("itask", 5);
			pLink.setAttribute("starget", iSiteId);
			pLink.setAttribute("soptions", /*sBuildingId*/i+1);
			ttqAddEventListener(pLink, 'click', displayTimerForm, false);
			thisStart.appendChild(pLink);
		}
	//}
	_log(3,"End createPartyLinks()");
}

function party(aTask) {
	_log(1,"Begin party("+aTask+")");
	printMsg(aLangStrings[6] + " > 1<br><br>" + getTaskDetails(aTask));
	if(aTask[5] != 'null') var sNewDid = "&newdid=" +aTask[5];
	else var sNewDid = "";
	var sUrl = "build.php?id=" + aTask[2] + "&gid=24&action=celebration&do=" + aTask[3] + "&t=1" + sNewDid;
	var myOptions = [aTask, currentActiveVillage];
	get(fullName+sUrl, handleRequestParty, myOptions);
	_log(1, "End party("+aTask+")");
}

function handleRequestParty(httpRequest, options) {
	_log(3,"Begin handleRequestParty("+httpRequest+", "+options+")");
	var aTask = options[0];
	var activateVillageDid = parseInt(options[1]);
	if (httpRequest.readyState == 4) {
		switchActiveVillage(activateVillageDid);
		if (httpRequest.status == 200) {
			var sResponse = httpRequest.responseText;
			if( getActiveVillage($ee('DIV',sResponse)) != currentActiveVillage ) switchActiveVillage(currentActiveVillage);
			if(!sResponse) { // error retrieving the response
				printMsg( aLangTasks[aTask[0]] + ' ' + aTask[3] + ' ' + aLangStrings[5], true );
				addToHistory(aTask, false);
				return;
			}
			var re = new RegExp('under_progress', 'i');
			if(sResponse.match(re)) {
				printMsg(getVillageName(aTask[5])+ "<br>" + aLangStrings[55] + aLangStrings[53]);
				addToHistory(aTask, true);
			} else {
				printMsg(getVillageName(aTask[5])+ "<br>" + aLangStrings[53] +''+ aLangStrings[54], true);
				addToHistory(aTask, false);
			}
			return;
		}
		printMsg(getVillageName(aTask[5])+ "<br>" + aLangStrings[53] +''+ aLangStrings[54], true);
		addToHistory(aTask, false);
	}
	_log(3, "End handleRequestParty("+httpRequest+", "+options+")");
}
// *** End Party Functions ***
