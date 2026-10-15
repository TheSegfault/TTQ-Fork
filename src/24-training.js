
// *** Begin Troop/Trap Training Functions ***
function createTrainLinks(buildingID) {
	_log(3,"Begin createTrainLinks()");
	switch(buildingID) {
		case 19: //Barracks
		case 20: //Stable
		case 21: //Workshop
		case 29: //Great barracks
		case 30: //Great stables
		case 36: //Trapper
		case 46: //Hospital
		case 48: //Asclepeion
		case 49: //Harbor
			break;
		case 25: //Residence
		case 26: //Palace
		case 44: //Command center
			break;
		default:
			_log(2, "No train links needed.");
			return;
	}
	var linkTxt = aLangStrings[48];
	_log(2, "Adding train later links for barracks/stables/workshop/trapper...");
	var trainBtn = xpath("//form/button[@id='s1']");
	if(trainBtn.snapshotLength < 1) {
		_log(1, "The Train button was not found. Exiting function...");
		return false;
	}
	var oBtn = generateButton(linkTxt, scheduleTraining);
	trainBtn.snapshotItem(0).parentNode.appendChild(oBtn);
	_log(3, "End createTrainLinks()");
}

function scheduleTraining(e) {
	var Inputs = xpath("id('content')//input[@type='text']");
	if(Inputs.snapshotLength < 1 ) {
		_log(3, "ScheduleTraining> No textboxes with troop numbers found.");
		return false;
	}//            0		1	2	3	4	5	6	7	8	9	10		11		12		13		14		15		16
			//     type, 	t1,	t2,	t3,	t4,	t5,	t6,	t7,	t8,	t9,	t10,	t11(h),	traps,	gid,	spy,	kata1,	kata2
	var aTroops = [0,		0,	0,	0,	0,	0,	0,	0,	0,	0,	0,		0,		0,		-1,		-1,		-1,		-1,];
	var bNoTroops = true;
	var tmp;
	for(var i = 0; i < Inputs.snapshotLength; ++i) {
		tmp = Inputs.snapshotItem(i);
		var thisTroopType = parseInt(tmp.name.substring(1));
		if (thisTroopType == 99) thisTroopType = 12;
		aTroops[thisTroopType] = tmp.value == '' ? 0 : parseInt(tmp.value);
		if(aTroops[thisTroopType] > 0) bNoTroops = false;
	}

	if(bNoTroops) {
		_log(2, "ScheduleTraining> No troops were selected. Unable to schedule training.");
		printMsg(aLangStrings[17] , true);
		return false;
	}

	//get the checksum
	var iCode = xpath("//form//input[@name='checksum']");
	if(iCode.snapshotLength > 0) { aTroops[0] = iCode.snapshotItem(0).value; }
	else {
		_log(3, "ScheduleTraining> No code available. Exiting.");
		return false;
	}

	//currently, only 1 kind of troop can be trained at once - null all elements except for the oth one (code) and the first non-zero value
	var somethingFound = -1;
	for ( var i = 1 ; i < 13 ; ++i ) {
		if ( somethingFound > -1 ) aTroops[i] = 0;
		else if ( aTroops[i] > 0 ) somethingFound = i;
	}
	// Good, we have at least 1 troop. We can display the form
	// Grab this building's ID and Troop name for further use
	aTroops[13] = parseInt($id("build").className.replace("gid",""));
	_log(2,"ScheduleTraining> aTroops = " + aTroops);
	buildingID = parseInt($id('build').getAttribute('class').match(/\d+/)[0]);
	displayTimerForm(4, iSiteId, aTroops, undefined, undefined, undefined, buildingID);
}

function train(aTask) {
	var oldVID = parseInt(aTask[5]);
	if ( isNaN(oldVID) ) oldVID = -2;
	_log(3, "Train> Switching to village:" +oldVID);
	printMsg(aLangStrings[6] + " > 1<br><br>" + getTaskDetails(aTask));
	var aTroops = aTask[3].split("_");
	var residenceTab = "";
	if (aTroops[10]==1 || aTroops[9]==1) { residenceTab = "&s=1"; } //settler or general
	var troopsInfo = getTroopsInfo(aTroops);
	var oldGid = parseInt(aTroops[13]);
	var httpRequest = new XMLHttpRequest();
	httpRequest.open("GET", fullName+"build.php" + (oldVID>0 ? "?newdid=" + oldVID : "") + (oldVID>0 ? "&id=" + aTask[2] : "?id=" + aTask[2]) + "&gid=" + aTask[4] + residenceTab , true);
	httpRequest.onreadystatechange = function() {
		if (httpRequest.readyState == 4) { //complete
			printMsg(aLangStrings[6] + " > 1 > 2<br><br>" + getTaskDetails(aTask));
			if (httpRequest.status == 200 && httpRequest.responseText ) { // ok
				var holder = document.createElement('div');
				holder.innerHTML = httpRequest.responseText;
				var theZ = holder.getElementsByTagName("input");
				var k = theZ.length;
				var reqVID = getActiveVillage(holder);
				if ( reqVID == oldVID && holder.getElementsByClassName("gid"+oldGid).length == 1 ) {
					if ( k > (oldGid==36?2:3) ) {
						var i = (oldGid==36 ? 2 : 3);
						var tmp;
						var tI;
						var theMaxs = [0,0,0,0,0,0,0,0,0,0,0,0,0];
						for (  ; i < k ; ++i ) {
							tmp = theZ[i].parentNode.getElementsByTagName("a");
							tI = parseInt(theZ[i].name.replace("t",""));
							if ( tI == 99 ) tI = 12;
							if ( tmp.length == 1 ) {
								tmp = parseInt(tmp[0].textContent);
								if ( isNaN(tmp) || tmp < 0 ) tmp = 0;
								theMaxs[tI] = tmp;
							}
						}
						var sParams = "&s1=ok";
						for ( i=0; i<k; i++) {
							if (theZ[i].type == "hidden") { sParams += "&" + theZ[i].name + "=" + theZ[i].value; }
						}
						if(aTroops.length > 1) {
							for( var j = 1; j < 13; ++j) if ( j != 11 && aTroops[j] > 0) {
								if ( aTroops[j] > theMaxs[j] ) aTroops[j] = theMaxs[j];
								sParams += "&t" + ((j==12)?99:j) + "=" + aTroops[j];
							}
							aTask.splice(3,1,aTroops.join("_"));
						} else {
							if ( reqVID != currentActiveVillage ) switchActiveVillage(currentActiveVillage);
							_log(2, "Train> Improbability Error Number 1. Please report of its existance. (No troops specified. Exiting function.)");
							printMsg("Train> Improbability Error Number 1. Please report of its existance. (No troops specified. Exiting function.)");
							addToHistory(aTask, false, "Improbability Error Number 1. Please report of its existance. (No troops specified. Exiting function.)");
							return;
						}
						_log(2, "Train>posting>sParams>" + sParams + "<");
						post(fullName+"build.php"+"?id=" +aTask[2] + "&gid=" + aTask[4], sParams, handleRequestTrain, aTask);
						return;
					}
					if ( reqVID != currentActiveVillage ) switchActiveVillage(currentActiveVillage);
					_log(1, "Train Troops request was not sent. It seems there are no troops to train. (No Link)");
					printMsg(getVillageName(oldVID)+"<br>"+troopsInfo+" "+aLangStrings[52]+" "+aLangStrings[68]+ " ("+aLangStrings[70]+")", true);
					addToHistory(aTask, false, aLangStrings[70]);
					return;
				}
				if ( reqVID != currentActiveVillage ) switchActiveVillage(currentActiveVillage);
				_log(1, "Train Troops request was not sent. It seems I was redirected before I could post the training. (Server: Redirected 1)");
				printMsg(getVillageName(oldVID)+"<br>"+troopsInfo+" "+aLangStrings[52]+" "+aLangStrings[9]+ " ("+aLangStrings[74] + " " + aLangStrings[11]+" 1)", true);
				addToHistory(aTask, false, aLangStrings[74] + " " + aLangStrings[11]+" 1");
				return;
			}
			switchActiveVillage(currentActiveVillage);
			_log(1, "Train Troops request was not sent. Bad response from server when trying to switch village/building. (Server: Page Failed 1)");
			printMsg(getVillageName(oldVID)+"<br>"+troopsInfo+" "+aLangStrings[52]+" "+aLangStrings[73]+ " ("+aLangStrings[74] + " " + aLangStrings[46]+" 1)", true);
			addToHistory(aTask, false, aLangStrings[74] + " " + aLangStrings[46]+" 1");
		}
	};
	httpRequest.send(null);
	_log(1, "Train> ** End ** aTask = ("+aTask+")");
}

function handleRequestTrain(httpRequest, aTask) {
	if (httpRequest.readyState == 4) {
		var options = aTask[3].split("_");
		var troopsInfo = getTroopsInfo(options);
		var oldGid = parseInt(options[13]);
		var oldVID = parseInt(aTask[5]);

		if (httpRequest.status == 200 && httpRequest.responseText) {
			var holder = document.createElement('div');
			holder.innerHTML = httpRequest.responseText;
			var ti = holder.getElementsByClassName("unit");
			var k = ti.length;
			var reqVID = getActiveVillage(holder);
			if ( reqVID != currentActiveVillage ) switchActiveVillage(currentActiveVillage);
			if ( reqVID == oldVID && holder.getElementsByClassName("gid"+oldGid).length == 1 && k > 0) {
				var tie = ti[k-1];
				if ( tie.nextSibling ) {
					var buildAmount = parseInt(tie.nextSibling.nodeValue);
					for ( k = 1 ; k < 13 && ( (troopsInfoN = parseInt(options[k])) < 1 ) ; ++k ) ;
					if ( k == 12 ) k = 99;
					else k += iMyRace*10;
					if ( k == parseInt(tie.className.replace("unit u","")) && tie.parentNode.className == "desc" && buildAmount == troopsInfoN ) {
						printMsg(getVillageName(oldVID)+ "<br>" + aLangStrings[51] + troopsInfo);
						addToHistory(aTask, true);
					} else {
						printMsg(getVillageName(oldVID)+ "<br>" + troopsInfo + ' ' + aLangStrings[52] + " ("+aLangStrings[75]+" 1)", true);
						addToHistory(aTask, false,aLangStrings[75]+" 1");
					}
				} else {
					printMsg(getVillageName(oldVID)+ "<br>" + troopsInfo + ' ' + aLangStrings[52] + " ("+aLangStrings[75]+" 2)", true);
					addToHistory(aTask, false,aLangStrings[75]+" 2");
				}
				return;
			}
			_log(1, "Train Troops request was sent, however I could not confirm it. It seems I was redirected when trying to confirm it. (Confirmation Failed, Server: Redirected 2)");
			printMsg(getVillageName(oldVID)+"<br>"+troopsInfo+" "+aLangStrings[52]+" "+aLangStrings[50]+" "+aLangStrings[9]+ " ("+aLangStrings[75] + ", " + aLangStrings[74] + " " + aLangStrings[11]+" 2)", true);
			addToHistory(aTask, false, aLangStrings[75]+", "+aLangStrings[74]+" "+aLangStrings[11]+" 2");
			return;
		}
		switchActiveVillage(currentActiveVillage);
		_log(1, "Train Troops request was sent, however I could not confirm it. Bad response from server when recieving the page to confirm on. (Confirmation Failed, Server: Page Failed 2)");
		printMsg(getVillageName(oldVID)+"<br>"+troopsInfo+" "+aLangStrings[52]+" "+aLangStrings[50]+" "+aLangStrings[73]+ " ("+aLangStrings[75] + ", " + aLangStrings[74] + " " + aLangStrings[46]+" 2)", true);
		addToHistory(aTask, false, aLangStrings[75] + ", " +aLangStrings[74] + " " + aLangStrings[46]+" 2");
	}
	_log(1, "handleRequestTrain> End.httpRequest = ("+httpRequest+"), aTask = ("+aTask+")");
}
// *** End Troop/Trap Training Functions ***
