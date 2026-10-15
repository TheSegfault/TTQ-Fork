
// *** Begin History Functions ***
/**************************************************************************
 *  Adds task to the log DIV.
 *  @param bSuccess: true if the task was successfully performed.
 ***************************************************************************/
function addToHistory(aTask, bSuccess, tMsg) {
	_log(3, "Begin Adding to history...");
	if(iHistoryLength < 1) { return; }
	var oldValue = ttqTrimData(getVariable("TTQ_HISTORY", ""), iHistoryLength-1, true);
	if ( oldValue != "" ) oldValue += "|";
	var newValue = aTask[0] + ',' + aTask[1] + ',' + aTask[2] + ',' + aTask[3] + ',' + aTask[4];
	if(aTask[5]) newValue += ',' + aTask[5];
	else newValue += ',' + 'null';
	newValue += ',' + bSuccess;
	if(!bSuccess && tMsg) newValue += ',' + tMsg;
	else newValue += ',' + 'null';
	newValue = oldValue + '' + newValue;
	_log(2, "Writing var TTQ_HISTORY: "+newValue);
	if(!setVariable("TTQ_HISTORY", newValue)) _log(1, "Failed logging to history.")
	aTasks = newValue.split("|");
	refreshHistory(aTasks);
	ttqUpdatePanel();
	ttqBusyTask = 0;
	return;
}

function flushHistory() {
	setVariable("TTQ_HISTORY", "");
	refreshHistory();
}

function refreshHistory(aTasks) {
	_log(3, "Begin refreshHistory()");
	// Remove old history
	var oOldHistory = $id("ttq_history");
	if(oOldHistory) document.body.removeChild(oOldHistory);

	//if there are no tasks in the history, return
	if(!aTasks || aTasks.length < 1) return;
	var sTime = "";

	//Create new tasklist
	var oHistory = document.createElement('div');
	oHistory.id = "ttq_history";
	oHistory.innerHTML = "<div id='ttq_history_draghandle' class='handle ttq_draghandle' onmousedown='return false;'>"+aLangStrings[42]+"<img src='"+sTitleBarLogo+"' style='float: right; margin: 1px 5px;' onmousedown='return false;'></div>";
	ttqAddEventListener(oHistory, "dblclick", doMinimize, false);

	//position the list
	var listCoords = getOption("HISTORY_POSITION", "200px_687px");
	listCoords = listCoords.split("_");
	oHistory.style.top = listCoords[0];
	oHistory.style.left = listCoords[1];

	if ( getOption("LIST_HISTORY_MINIMIZED", false, "boolean") ) {
		oHistory.style.height = "16px";
		oHistory.style.width = "150px";
		oHistory.style.overflow = "hidden";
	}

	document.body.appendChild(oHistory);

	makeDraggable($id('ttq_history_draghandle'));

	for(var i = 0; i < aTasks.length; ++i) {
		var aThisTask = aTasks[i].split(",");
		oHistory.appendChild( makeHistoryRow(aThisTask, i/*, iServerTimeOffset*/) );
		var oTaskTimeSpan = $id("ttq_history_tasktime_" +i);
		if(oTaskTimeSpan) { ttqAddEventListener(oTaskTimeSpan, "click", editTime, false); }
	}

	orderList(38, "ttq_history_row");

	//flush link
	var oFlushLink = document.createElement('div');
	oFlushLink.id = 'ttq_flush_history';
	oFlushLink.innerHTML = "&ndash; "+aLangStrings[43]+" &ndash;";
//	oFlushLink.href = '#';
	oHistory.appendChild(oFlushLink);
	ttqAddEventListener(oFlushLink, 'click', flushHistory, false);
}

function makeHistoryRow(aTask, index/*, iServerTimeOffset*/) {
		_log(3,"Begin makeHistoryRow()");
		var oDate = new Date( parseInt(aTask[1]) * 1000 );
		var sTime = "<span style=' cursor:pointer;' id='ttq_history_tasktime_" +index+ "' title='This is your local time. Click to add new task.' ttq_taskid='" +index+ "' >" + oDate.toLocaleString() + "</span>";

		var oHistoryRow = document.createElement("div");
		oHistoryRow.id = "ttq_history_row_" +index;
		oHistoryRow.className = "ttq_history_row";
		oHistoryRow.setAttribute("tasktype", aTask[0]);
		oHistoryRow.setAttribute("timestamp", aTask[1]);
		oHistoryRow.setAttribute("tasktarget", aTask[2]);
		oHistoryRow.setAttribute("taskoptions", aTask[3]);
		oHistoryRow.setAttribute("villagedid", aTask[5]);
		oHistoryRow.setAttribute("taskmessage", aTask[7]);
		var sTaskSubject = "";
		var sTask = "";
		var sTaskMoreInfo = "";
		var isError = aTask[6] == "true" ? false : true;

		switch(aTask[0]) {
			case "0":  //build
			case "1":  //upgrade
				sTaskSubject = "- "+aTask[3].split("_")[1];
				sTask = aLangTasks[aTask[0]];
				sTaskMoreInfo = aLangStrings[35] + " " +aTask[2];
				break;
			case "2":  //attack
				sTaskSubject = ' >> <span id="ttq_placename_history_' +aTask[2]+ '">' +getVillageNameZ(aTask[2])+ '</span>';
				var aTroops = aTask[3].split("_");
				var iIndex = parseInt(aTroops[0]);
				var langStringNo = iIndex == 5 ? 20 : iIndex == 3 ? 21 : 22;
				if((iIndex == 3 || iIndex == 4) && onlySpies(aTroops) ) {
					sTaskSubject = " "+aTroops[14]+" "+sTaskSubject;
					sTask = aLangStrings[47];
				} else { sTask = aLangStrings[langStringNo]; }
				sTaskMoreInfo = getTroopsInfo(aTroops);
				break;
			case "3":  //research
				var aOptions = aTask[3].split("_");
				sTaskSubject = "- "+aOptions[2];
				sTask = aLangTasks[aOptions[1]];
				break;
			case "4":
				sTaskSubject = getTroopsInfo(aTask[3].split("_"));
				sTask = aLangTasks[4];
				break;
			case "5":
				sTaskSubject = aLangStrings[53];
				sTask = aLangTasks[5];
				break;
			case "6":  //Demolish
				sTask = aLangTasks[6];
				var tO = aTask[3].split("_");
				sTaskSubject = "A Building";
				var tT = parseInt(aTask[2]);
				for ( var i = 0,k = tO.length ; i < k ; ++i ) {
					if ( parseInt(tO[i].replace(/\[/g,"")) == tT ) {
						sTaskSubject = "- "+tO[i];
						break;
					}
				}
				sTaskMoreInfo = aLangStrings[35] + " " +aTask[2];
				break;
			case "7": //Send Merchants
				sTask = aLangTasks[7];
				sTaskSubject = " >> " + getVillageNameZ(aTask[2]) + "<br>" + getMerchantInfo(aTask[3]);
				sTaskMoreInfo = "Werd to your mudder!";
				break;
			case "8": //Send Back/Withdraw
				sTask = aLangTasks[8];
				sTaskSubject = " >> " + aTask[2] + "<br>" + getTroopsInfo(aTask[3].split("_"));
				sTaskMoreInfo = "So long and thanks for all the fish.";
				break;
			case "9": // Send troops through Gold-Club
				sTask = getOption('FARMLIST','');
				sTaskSubject = " >> " + aTask[2] + " ";
				break;
			default:
				break;
		}
		if ( isError && aTask && aTask[7] != "null" ) sTaskSubject += " (" + aTask[7] + ")";

		var sBgColor = isError ? "#FFB89F": "#90FF8F";
		oHistoryRow.style.backgroundColor = sBgColor;

		oHistoryRow.innerHTML = getVillageName(aTask[5])+": <span title='" +sTaskMoreInfo+ "' style='cursor:help;' >" +sTask+ " " +sTaskSubject+ " </span><br><span class='ttq_time_village_wrapper' >" +sTime+"</span>";
		oDate = null;

		var oDeleteLink = document.createElement('a');
		var oDeleteImg = document.createElement('img');
		oDeleteImg.src = sDeleteBtn;
		oDeleteImg.alt = 'X';
		oDeleteImg.style.verticalAlign = 'middle';
		oDeleteImg.style.display = 'inline-block';
		oDeleteLink.appendChild(oDeleteImg);
		oDeleteLink.title = aLangStrings[15];
		oDeleteLink.setAttribute("itaskindex", index);
		oDeleteLink.setAttribute("istask", "false");
		ttqAddEventListener(oDeleteLink, 'click', deleteTask, false);
		oHistoryRow.appendChild(oDeleteLink);
		return oHistoryRow;
}
// *** End History Functions
