
// ****** BEGIN TTQ TASK FUNCTIONS ******
// *** Begin Build/Upgrade Functions ***
function createBuildLinks() {
	_log(3,"Begin createBuildLinks()");
	var iTask = 0;  //the default action is build new building on empty site
	var xpContract = xpath("//div[contains(@id,'contract')]");
	if ( xpContract.snapshotLength < 1 ) { //Unknown site
		_log(1, "createBuildLinks> Unknown Building site or the building is at its maximum level. Not creating build link. End createBuildLinks()");
		return false;
	}
	iTask = 1; //Upgrade existing building

	var xpBuildDesc = xpath("//div[contains(@class,'buildingWrapper') or contains(@class,'stickyImage') or contains(@class,'upgradeHeader')]");
	for ( var i = 0, j = xpBuildDesc.snapshotLength ; i < j ; ++i ) {
		var bBuildDesc = xpBuildDesc.snapshotItem(i);
		var bIMG = bBuildDesc.getElementsByTagName("img");
		if(bIMG.length<1) continue;
		var bName = "["+bIMG[0].alt+"]";
		var bID = parseInt(bIMG[0].className.split(" g")[1]);
		var oLink = document.createElement("a");
		oLink.id = "buildLater" + i;
		oLink.innerHTML = "&ndash; " + aLangStrings[iTask] + " &ndash;";
		oLink.title = aLangStrings[4];
		oLink.href = "#";
		oLink.setAttribute("itask", iTask);
		oLink.setAttribute("starget", iSiteId);
		oLink.style.display = "block";
		//oLink.style.textAlign = ltr ? "right" : "left";
		var eParam = window.location.search.replace(/[&?](newdid|gid|id|z|d|x|y)=\d+/g,'').replace("?","&");
		oLink.setAttribute("soptions", bID + "_" + bName + (eParam.length > 1 ? "_" + eParam: "") );
		ttqAddEventListener(oLink, 'click', displayTimerForm, false);
		bBuildDesc.after(oLink);
	}
	_log(3, "End createBuildLinks()");
}

function upgradebuild(aTask) {
	// UpgradeBuild> Begin. aTask = (1,1303246876,36,5_Sawmill,151972)
	_log(3,"UpgradeBuild> Begin. aTask = ("+JSON.stringify(aTask)+")");
	printMsg(aLangStrings[6] + " > 1<br><br>" + getTaskDetails(aTask));

	var buildingID = parseInt(aTask[3]);
	var buildingName = aTask[3].split("_")[1];
	var eParam = aTask[3].split("_")[2];
	var oldVID = parseInt(aTask[5]);
	if ( isNaN(oldVID) ) oldVID = -2;

	var Tab = "";
	if (buildingID==16) { Tab = "&tt=0" } //Rally point
	if (buildingID==17) { Tab = "&t=0" } //Market
	if (buildingID==25 || buildingID==26 || buildingID==44) { Tab = "&s=0" } //Residence, Palace or Command Center

	var httpRequest = new XMLHttpRequest();
		_log(3,"UpgradeBuild> Posting Build/Upgrade request... "+"build.php?" + ((oldVID != 'null')?("newdid=" + oldVID):("")) + Tab + "&id=" + aTask[2] + (eParam ? eParam: ""));
		httpRequest.open("GET", fullName+"build.php?" + ((oldVID != 'null')?("newdid=" + oldVID):("")) + Tab + "&id=" + aTask[2] + (eParam ? eParam: ""), true);
		httpRequest.onreadystatechange = function() {
			if (httpRequest.readyState == 4) { //complete
				printMsg(aLangStrings[6] + " > 1 > 2<br><br>" + getTaskDetails(aTask));
				if (httpRequest.status == 200 && httpRequest.responseText) { // ok
					var holder = document.createElement('div');
					holder.innerHTML = httpRequest.responseText;
					var myContracts = holder.getElementsByClassName("buildingWrapper");
					if ( myContracts.length <= 0 ) {
						myContracts = holder.getElementsByClassName("showBuildCosts normal");
						if ( myContracts.length <= 0 ) {
							myContracts = holder.getElementsByClassName("upgradeButtonsContainer");
							if ( myContracts.length <= 0 ) return;
						}
					}
					var myBuilds = holder.getElementsByClassName("roundedCornersBox");
					if (myBuilds.length <=0 ) myBuilds = holder.getElementsByClassName("upgradeHeader");
					if (myBuilds.length <=0 ) myBuilds = holder.getElementsByClassName("buildingWrapper");

					var reqVID = getActiveVillage(holder);

					if ( myBuilds.length > 0 && myContracts.length > 0 && oldVID == reqVID ) {
						var ii,j,tmp;
						for ( ii = 0 , j = myBuilds.length; ii < j ; ++ii ) {
							tmp = myBuilds[ii].getElementsByTagName('img');
							if ( tmp.length < 1 ) continue;
							tmp = parseInt(tmp[0].className.split(" g")[1]);
							if ( isNaN(tmp) || tmp != buildingID ) continue;
							tmp = myContracts[ii].getElementsByTagName("button");
							if ( tmp.length > 0 ) {
								if (tmp[0].getAttribute('class')) if (tmp[0].getAttribute('class').indexOf("gold builder") > -1)
								{
									_log(1, "UpgradeBuild> Found the button but it would use gold (Master Builder).");
									printMsg(getVillageName(oldVID)+ "<br>" + buildingName + " Found the button but it would use gold (Master Builder).", true);
									addToHistory(aTask, false, "Master Builder");
									return;
								}
								if (tmp[0].getAttribute('class')) if (tmp[0].getAttribute('class').indexOf("disabled") > -1)
								{
									_log(1, "UpgradeBuild> Found the button but its disabled because there are not enough resources.");
									printMsg(getVillageName(oldVID)+ "<br>" + buildingName + " Found the button but its disabled because there are not enough resources", true);
									addToHistory(aTask, false, "Not enough resources");
									return;
								}
								if (tmp[0].getAttribute('class')) if (tmp[0].getAttribute('class').indexOf("gold") > -1)
								{
									_log(1, "UpgradeBuild> Found the button but its disabled because there are not enough resources.");
									printMsg(getVillageName(oldVID)+ "<br>" + buildingName + " Found the button but its disabled because there are not enough resources", true);
									addToHistory(aTask, false, "Not enough resources");
									return;
								}
								tmp = tmp[0].getAttribute("onclick").split("'")[1];
								if ( tmp ) {
									if ( tmp.startsWith("/") ) { tmp = tmp.substring(1); }
									_log(2, "UpgradeBuild> Posting Build/Upgrade request...\nhref> " + tmp + "\nmyOptions> " + aTask);
									get(fullName+tmp, handleRequestBuild, aTask);
									return;
								}
								if ( reqVID != currentActiveVillage ) switchActiveVillage(currentActiveVillage);
								_log(1, "UpgradeBuild> Found the button but could not find the link for Build/Upgrade! (No Link 1)");
								printMsg(getVillageName(oldVID)+ "<br>" + buildingName + " " + aLangStrings[68]+" ("+aLangStrings[70]+" 1)", true); // Your building can't be built. because we cant find the link
								addToHistory(aTask, false, aLangStrings[70] + " 1");
								return;
							}
							if ( reqVID != currentActiveVillage ) switchActiveVillage(currentActiveVillage);
							tmp = myContracts[ii].getElementsByClassName("contractLink");
							if ( tmp.length > 0 ) tmp = tmp[0].innerHTML;
							else tmp = myContracts[ii].innerHTML;
							tmp = "["+tmp+"]";
							_log(1, "UpgradeBuild> Did not find the button. Reason: " + tmp);
							printMsg(getVillageName(oldVID)+ "<br>" + buildingName + " " + aLangStrings[68] + " (" + aLangStrings[70] + " 2: " + tmp +")", true); // Your building can't be built. Because there was no button and a reason provided.
							addToHistory(aTask, false, aLangStrings[70] + " 2: " +tmp);
							return;
						}
						if ( reqVID != currentActiveVillage ) switchActiveVillage(currentActiveVillage);
						_log(1, "UpgradeBuild> Could not find the building (gid="+buildingID+") in the list of building descriptions.");
						printMsg(getVillageName(oldVID)+ "<br>" + buildingName + " "+aLangStrings[71] +" (" + aLangStrings[72]+")", true); // Your building can't be built. Because there was no building description. Building not found.
						addToHistory(aTask, false, aLangStrings[72]);
						return;
					}
					if ( reqVID != currentActiveVillage ) switchActiveVillage(currentActiveVillage);
					_log(1, "UpgradeBuild> Could not find the building (gid="+buildingID+") it appears we got redirected. (Server: Redirect 1)");
					printMsg(getVillageName(oldVID)+ "<br>" + buildingName + ' (' + aLangStrings[74] +" "+aLangStrings[11]+" 1)", true); // Your building can't be built. Because there was no building description. Building not found.
					addToHistory(aTask, false, aLangStrings[74]+" "+aLangStrings[11]+" 1");
					return;
				}
				switchActiveVillage(currentActiveVillage);
				_log(1, "UpgradeBuild> Could not build the building (gid="+buildingID+"). The server returned a non-200 code (or the request was empty) upon trying to load the send troops page.  ("+aLangStrings[74] +" "+ aLangStrings[46]+" 1)");
				printMsg(getVillageName(oldVID)+ "<br>" + buildingName + ' ' + aLangStrings[73] + " ("+aLangStrings[74] +" "+ aLangStrings[46]+" 1)", true); // Your building can't be built. Because there was a bad response from the server.
				addToHistory(aTask, false, aLangStrings[74] +" "+ aLangStrings[46]+" 1");
			}
		}
		httpRequest.send(null);
	_log(3, "UpgradeBuild> End. aTask = ("+aTask+")");
}

function handleRequestBuild(httpRequest, aTask) {
//	_log(1,"Begin handleRequestBuild("+httpRequest+", "+aTask+")");
	if (httpRequest.readyState == 4) {
		var buildingName = aTask[3].split("_")[1];
		var oldVID = parseInt(aTask[5]);
		if ( isNaN(oldVID) ) oldVID = -2;

		if (httpRequest.status == 200 && httpRequest.responseText) { // ok
			var holder = document.createElement('div');
			holder.innerHTML = httpRequest.responseText;
			var thisNewdid = getActiveVillage(holder);
			if ( thisNewdid != currentActiveVillage ) switchActiveVillage(currentActiveVillage);
			var re = new RegExp(buildingName, 'i');
			var bL = $gc('buildingList',holder);

			if( bL.length < 1 ) {
				printMsg(getVillageName(oldVID)+ "<br>" + buildingName + ' ' + aLangStrings[8] + " ("+aLangStrings[75]+")", true); // Your building can't be built.
				addToHistory(aTask, false, aLangStrings[75]);
				return;
			}

			if ( thisNewdid == oldVID ) {
				if ( bL[0].innerHTML.match(re) ) {
					printMsg(getVillageName(oldVID)+ "<br>" + aLangStrings[5] +' '+ buildingName);  //Your building is being built.
					addToHistory(aTask, true);
				} else {
					printMsg(getVillageName(oldVID)+ "<br>" + buildingName + ' ' + aLangStrings[8] + " ("+aLangStrings[75]+")", true); // Your building can't be built.
					addToHistory(aTask, false, aLangStrings[75]);
				}
			} else {
				if ( bL[0].innerHTML.match(re) ) {
					printMsg(getVillageName(oldVID)+ "<br>" + buildingName + ' ' + aLangStrings[76] +" ("+aLangStrings[77]+" "+getVillageName(thisNewdid)+")", true); // Your building was probably misbuilt
					addToHistory(aTask, false, aLangStrings[77]+" "+getVillageName(thisNewdid));
				} else {
					_log(1, "handleRequestBuild> Could not find the building (gid="+buildingID+") it appears we got redirected. (Server: Redirect 2)");
					printMsg(getVillageName(oldVID)+ "<br>" + buildingName + ' (' + aLangStrings[74] +" "+aLangStrings[11]+" 2)", true); // Your building can't be built. Because there was no building description. Building not found.
					addToHistory(aTask, false, aLangStrings[74]+" "+aLangStrings[11]+" 2");
				}
			}
			return;
		}
		switchActiveVillage(currentActiveVillage);
		_log(1, "handleRequestBuild> Request to build was sent, however, I could not confirm the building (gid="+buildingID+") was built. The server returned a non-200 code (or the request was empty) while loading the page to confirm on.  ("+aLangStrings[74] +" "+ aLangStrings[46]+" 2)");
		printMsg(getVillageName(oldVID)+ "<br>" + buildingName + ' ' + aLangStrings[73] + " ("+aLangStrings[74] +" "+ aLangStrings[46]+" 2)", true); // Your building can't be built. Because there was a bad response from the server.
		addToHistory(aTask, false, aLangStrings[74] +" "+ aLangStrings[46]+" 2");
	}
	_log(3, "End handleRequestBuild("+httpRequest+", "+aTask+")");
}
// *** End Build/Upgrade Functions ***
