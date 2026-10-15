
// *** Begin Research Functions ***
function createResearchLinks(buildingID) {
	_log(3,"Begin createResearchLinks()");
	//is this Academy or Smithy?
	switch ( buildingID ) {
		case 13: // Smithy
					var linkTxt = aLangStrings[1];
					var type = 1;
					break;
		case 22: // Academy
					var linkTxt = aLangStrings[3];
					var type = 3;
					break;
		default:	_log(1,"createResearchLinks> This is not the Academy or Smithy. End createResearchLinks()");
					return;
	}
	_log(2, "Adding research later links...");

	var tContract = document.getElementsByClassName("build_details");
	if ( tContract.length < 1 ) return;
	tContract = tContract[0];
	if ( buildingID == 13 ) var tLevels = tContract.getElementsByClassName("level");
	var tImg = tContract.getElementsByClassName("unit");
	tContract = tContract.getElementsByClassName("research");

	var iTroopId, oLink, oLvl, sTroopLvlText, sTroopLvl;
	for ( var i = 0, j = tContract.length ; i < j ; ++i ) {
		if ( buildingID == 13 ) {
			sTroopLvlText = tLevels[i].textContent;
			if ((oLvl = sTroopLvlText.match(/\d+/g)) != null) {
				sTroopLvl = parseInt(oLvl[0]) + (oLvl.length > 1 ? parseInt(oLvl[1]) : 0);
				if ( sTroopLvl > 19 ) continue; // Skip if level is maxed out
			}
		}
		iTroopId = parseInt(tImg[i].className.split(" u")[1])%10;
		if ( iTroopId == 0 ) iTroopId = 10;
		oLink = document.createElement("a");
		oLink.id = "ttq_research_later" + i;
		oLink.className = "ttq_research_later";
		oLink.innerHTML = " &ndash; " + linkTxt + " &ndash; ";
		oLink.title = linkTxt;
		oLink.href = "#";
		oLink.setAttribute("itask", 3);
		oLink.setAttribute("starget", iSiteId);
		oLink.setAttribute("soptions", iTroopId + "_" + type + "_["+tImg[i].alt+"]");
		oLink.setAttribute("style","float:right;");
		ttqAddEventListener(oLink, 'click',	displayTimerForm, false);
		tContract[i].appendChild(oLink);
	}
	_log(3, "End createResearchLinks()");
}

function research(aTask) {
	_log(1,"Begin research("+aTask+")");
	printMsg(aLangStrings[6] + " > 1<br><br>" + getTaskDetails(aTask));
	if(aTask[5] != 'null') var sNewDid = "&newdid=" +aTask[5];
	else var sNewDid = "";
	var sUrl = "build.php?id=" + aTask[2] + sNewDid;
	get(fullName+sUrl, handleRequestResearch, aTask);
	_log(1, "End research("+aTask+")");
}

function handleRequestResearch(httpRequest, aTask) {
//	_log(1,"Begin handleRequestResearch("+httpRequest+", "+aTask+")");
	if (httpRequest.readyState == 4 ) {
		printMsg(aLangStrings[6] + " > 1 > 2<br><br>" + getTaskDetails(aTask));
		var oldVID = parseInt(aTask[5]);
		if ( isNaN(oldVID) ) oldVID = -2;
		var iTroop = parseInt(aTask[3].split("_")[0]);

		if (httpRequest.status == 200 && httpRequest.responseText) {
			var holder = document.createElement('div');
			holder.innerHTML = httpRequest.responseText;
			var tConract = holder.getElementsByClassName("contracting");
			var divResearch = holder.getElementsByClassName("research");

			var reqVID = getActiveVillage(holder);

			if ( reqVID == oldVID && (holder.getElementsByClassName("gid22").length == 1 || holder.getElementsByClassName("gid13").length == 1) ) {
				var oReason, tReason, iTroopClassNr;
				if ( divResearch.length > 0 ) {
					for ( var i = 0; i < divResearch.length ; ++i ) {
						iTroopClassNr = iMyRace*10+iTroop;
						var tImg = divResearch[i].getElementsByClassName("u"+iTroopClassNr);
						if ( tImg.length > 0 ) {
							oReason = divResearch[i].getElementsByClassName("none");
							if (oReason.length > 0) {
								tReason = oReason[0].textContent;
							} else {
								tReason = "Unknown error.";
							}
							break;
						}
					}
				}
				if ( tConract.length > 0) {
					var sURL, i, j;
					for ( i = 0, j = tConract.length; i < j ; ++i ) {
						sURL = tConract[i].getAttribute("onclick").split("'")[1];
						if ( sURL.startsWith("/") ) { sURL = sURL.substring(1); }
						if ( sURL.indexOf("t=t" + iTroop) != -1 ) {
							get(fullName+sURL,handleRequestResearchConfirmation, aTask);
							return;
						}
					}
				}
				else {
					if ( reqVID != currentActiveVillage ) switchActiveVillage(currentActiveVillage);
					//var tReason = "["+holder.getElementsByClassName("none")[0].innerHTML+"]";
					_log(1, "handleRequestResearch> Request to research was not sent. It appears we are already researching something (No Link 1)");
					printMsg(getVillageName(oldVID)+ "<br> ["+aTask[3].split("_")[2]+"] " + aLangStrings[69] +" ("+aLangStrings[70]+" 1: "+tReason+")", true);
					addToHistory(aTask, false, aLangStrings[70]+" 1: "+tReason);
					return;
				}
				if ( reqVID != currentActiveVillage ) switchActiveVillage(currentActiveVillage);
				_log(1, "handleRequestResearch> Request to research was not sent. I do not see the research links. (No Link 2)");
				printMsg(getVillageName(oldVID)+ "<br> ["+aTask[3].split("_")[2]+"] " + aLangStrings[68] +" ("+aLangStrings[70]+" 2)", true);
				addToHistory(aTask, false, aLangStrings[70]+" 2");
				return;
			}
			if ( reqVID != currentActiveVillage ) switchActiveVillage(currentActiveVillage);
			_log(1, "handleRequestResearch> Request to research was not sent. It appears we got redirected. (Server: Redirect 1)");
			printMsg(getVillageName(oldVID)+ "<br> ["+aTask[3].split("_")[2]+"] " + aLangStrings[73] +" ("+aLangStrings[74]+" "+aLangStrings[11]+" 1)", true);
			addToHistory(aTask, false, aLangStrings[74]+" "+aLangStrings[11]+" 1");
			return;
		}
		switchActiveVillage(currentActiveVillage);
		_log(1, "handleRequestResearch> Request to research was not sent. The server returned a non-200 code (or the request was empty) while loading the final page to build the last request from.  ("+aLangStrings[74] +" "+ aLangStrings[46]+" 1)");
		printMsg(getVillageName(oldVID)+ "<br> ["+aTask[3].split("_")[2]+"] " + aLangStrings[73] + " ("+aLangStrings[74] +" "+ aLangStrings[46]+" 1)", true); // Your research did not confirm.
		addToHistory(aTask, false, aLangStrings[74] +" "+ aLangStrings[46]+" 1");
	}
}

function handleRequestResearchConfirmation(httpRequest, aTask) {
	_log(1,"Begin handleRequestResearchConfirmation("+httpRequest+", "+aTask+")");
	if (httpRequest.readyState == 4) {
		var oldVID = parseInt(aTask[5]);
		if ( isNaN(oldVID) ) oldVID = -2;
		var iTroop = parseInt(aTask[3].split("_")[0]);
		if (httpRequest.status == 200 && httpRequest.responseText) {
			var iTroopClassNr;
			var holder = document.createElement('div');
			holder.innerHTML = httpRequest.responseText;

			var reqVID = getActiveVillage(holder);
			if ( reqVID != currentActiveVillage ) switchActiveVillage(currentActiveVillage);
			if ( reqVID == oldVID && (holder.getElementsByClassName("gid22").length == 1 || holder.getElementsByClassName("gid13").length == 1) ) {
				var ti = holder.getElementsByClassName("under_progress");
				if ( ti.length > 0 ) {
					iTroopClassNr = iMyRace*10+iTroop;
					ti = ti[0].getElementsByClassName("u"+iTroopClassNr);
					if (ti.length > 0) {
						printMsg(getVillageName(oldVID)+ "<br>" + aLangStrings[44] + " "+aTask[3].split("_")[2]);
						addToHistory(aTask, true);
						return;
					}
				}
				printMsg(getVillageName(oldVID)+ '<br> [' + aTask[3].split("_")[2]+"] " + aLangStrings[45] + " (" + aLangStrings[75] + ")", true);
				addToHistory(aTask, false, aLangStrings[75]);
				return;
			}
			_log(1, "handleRequestResearch> Request to research was sent. It appears we got redirected. (Confirmation Failed, Server: Redirect 2)");
			printMsg(getVillageName(oldVID)+ '<br> [' + aTask[3].split("_")[2]+"] " + aLangStrings[73]+" "+aLangStrings[50]+" ("+aLangStrings[75] +", "+aLangStrings[74]+" "+aLangStrings[11]+" 2)", true); // Your building can't be built. Because there was no building description. Building not found.
			addToHistory(aTask, false, aLangStrings[75] +", "+aLangStrings[74]+" "+aLangStrings[11]+" 2");
			return;
		}
		switchActiveVillage(currentActiveVillage);
		_log(1, "HTTP request status: " + httpRequest.status); // failed
		printMsg(getVillageName(oldVID)+ '<br> [' + aTask[3].split("_")[2]+"] " + aLangStrings[73]+" "+aLangStrings[50] + " (" + aLangStrings[75] +", "+ aLangStrings[74] +" "+ aLangStrings[46] +" 2)", true);
		addToHistory(aTask, false, aLangStrings[75] +", "+ aLangStrings[74] +" "+ aLangStrings[46] +" 2");
	}
	_log(2, "End handleRequestResearchConfirmation("+httpRequest+", "+aTask+")");
}
// *** End Research Functions ***
