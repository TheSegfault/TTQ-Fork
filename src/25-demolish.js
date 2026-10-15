
// *** Begin Demolish Functions
function createDemolishBtn() {
	_log(3,"Begin createDemolishBtn()");
	var xpathRes = xpath("//form[contains(@action,'build.php')]/select[@name='abriss']");
	if(xpathRes.snapshotLength > 0) {
		var oBtnWrapper = generateButton(aLangStrings[62],scheduleDemolish);
		xpathRes = xpathRes.snapshotItem(0).parentNode;
		xpathRes.insertBefore(oBtnWrapper,xpathRes.getElementsByClassName("clear")[0]);
	} else {
		xpathRes = $id("demolish");
		if ( xpathRes ) {
			var oBtnWrapper = generateButton(aLangStrings[62],scheduleDemolish);
			xpathRes.appendChild(oBtnWrapper);
			return;
		}
		_log(1, "The form cannot be found. Unable to add button. End createDemolishBtn().");
		return false;
	}
	_log(3,"End createDemolishBtn()");
}

function scheduleDemolish(e) {
	_log(3, "Start scheduleDemolish()");
	var BuildingId = xpath("//form//select[@name='abriss']"); //get the code
	if(BuildingId.snapshotLength > 0) {
		BuildingId = BuildingId.snapshotItem(0);
		var target = BuildingId.value;
		var w = BuildingId.selectedIndex;
		var data = document.getElementsByTagName("option");
		var BuildingName = "";
		for ( var i = 0,j = data.length ; i < j ; ++i ) BuildingName += "["+data[i].innerHTML + "]_";
	} else {
		var target = 19;
		var BuildingName = "";
		for ( var i = 19,j = 41 ; i < j ; ++i ) BuildingName += i+". "+aLangStrings[35]+" "+i+"_";
	}
	BuildingName = BuildingName.slice(0,-1);
	displayTimerForm(6,target,BuildingName);
	_log(3, "End scheduleDemolish()");
}

function demolish(aTask) {
	_log(3,"Begin demolish("+aTask+")");
	var aTaskDetails = getTaskDetails(aTask);
	printMsg(aLangStrings[6] + " > 1<br><br>" + aTaskDetails);

	//If need to change village, the link should like: build.php?newdid=144307&gid=15&id=26
	var oldVID = parseInt(aTask[5]);
	if (isNaN(oldVID)) oldVID = -2;
	if(oldVID > 0) var sNewDid = "newdid=" +oldVID+"&";
	else var sNewDid = "";
	//Loading the page once first, changing the active village at the same time
	var httpRequest = new XMLHttpRequest();
	var httpRequestString = fullName+"build.php?" + sNewDid + "gid=15";
	httpRequest.open("GET", httpRequestString, true);
	httpRequest.onreadystatechange = function() {
		if (httpRequest.readyState == 4) { //complete
			printMsg(aLangStrings[6] + " > 1 > 2<br><br>" + aTaskDetails);
			if (httpRequest.status == 200 && httpRequest.responseText) { // ok
				var parser = new DOMParser();
				var holder = parser.parseFromString(httpRequest.responseText, "text/html");
				var reqVID = getActiveVillage(holder,holder);
				if ( reqVID == oldVID && holder.getElementsByClassName("gid15").length == 1 ) {
					var tmp = holder.getElementById("demolish");
					var tmp2;
					if ( tmp && (tmp.tagName=='TABLE') ) {
						if(reqVID != currentActiveVillage) switchActiveVillage(currentActiveVillage);
						tmp2 = "["+trim(tmp.getElementsByTagName("td")[1].innerHTML)+"]";
						_log(1, "Demolish Building request was not sent. It appears we were already busy destroying a building. (No Link 1: "+tmp2+")");
						printMsg(aTaskDetails+" "+aLangStrings[68]+" "+aLangStrings[64]+" ("+aLangStrings[70]+" 1: It appears we were already busy destroying a building: "+tmp2+")", true); // Your building can't be demolished. No Link - Something is already being destroyed
						addToHistory(aTask, false, aLangStrings[70]+" 1: Already busy demolishing "+tmp2);
						return;
					}
					var sParams = {};
					sParams["villageId"] = reqVID;
					sParams["slotId"] = parseInt(aTask[2]);
					sParams["action"] = "demolishBuilding";
					post(fullName+"api/v1/building/demolish", JSON.stringify(sParams), handleRequestDemolish, aTask);
					return;
				}
				if ( reqVID != currentActiveVillage ) switchActiveVillage ( currentActiveVillage );
				_log(1, "Demolish Building request was not sent. It appears we were redirected when trying to load the Main Building page (Server: Redirected 1)");
				printMsg(aTaskDetails + ' ' + aLangStrings[9]+" "+aLangStrings[64]+" ("+aLangStrings[74]+" "+aLangStrings[11]+" 1)", true); // Your building can't be demolished.
				addToHistory(aTask, false, aLangStrings[74]+" "+aLangStrings[11]+" 1");
				return;
			}
			switchActiveVillage ( currentActiveVillage );
			_log(1, "Demolish Building request was not sent. Bad response from server when attempting to load the Main Building page (Server: Page Failed 1)");
			printMsg(aTaskDetails + ' ' + aLangStrings[64]+" ("+aLangStrings[74]+" "+aLangStrings[46]+" 1)", true); // Your building can't be demolished.
			addToHistory(aTask, false, aLangStrings[74]+" "+aLangStrings[46]+" 1");
		}
	};
	httpRequest.send(null);
	_log(3,"End demolish("+aTask+")");
}

function handleRequestDemolish(httpRequest, aTask) {
	_log(3,"Begin handleRequestDemolish("+httpRequest+", "+aTask+")");
	if (httpRequest.readyState == 4) {
		var oldVID = parseInt(aTask[5]);
		if (isNaN(oldVID)) oldVID = -2;
		var aTaskDetails = getTaskDetails(aTask);
		if (httpRequest.status == 204) { // ok, no response from server
			printMsg(aTaskDetails + ' ' + aLangStrings[63]); // Your building is being demolished.
			addToHistory(aTask, true);
			return;
		}
		switchActiveVillage(currentActiveVillage);
		_log(1, "Demolish Building request was sent. Bad response from server when attempting to load the Main Building page for confirmation (Confirmation Failed, Server: Page Failed 2)");
		printMsg(aTaskDetails + ' ' + aLangStrings[64]+" ("+aLangStrings[75]+", "+aLangStrings[74]+" "+aLangStrings[46]+" 2)", true); // Your building can't be demolished.
		addToHistory(aTask, false, aLangStrings[75]+", "+aLangStrings[74]+" "+aLangStrings[46]+" 2");
	}
}
// *** End Demolish Functions ***
