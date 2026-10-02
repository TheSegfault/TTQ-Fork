// *** Begin TTQ Core Functions ***
/**************************************************************************
 * Performs some initial checkings on conditions that have to be met to run the script
 * @return true if initialization was successfull, false otherwise
***************************************************************************/

function ttqTaskIsDeprecated(aTask) {
	return Date.now() / 1000 - Number(aTask[1]) > MAX_TASK_LATENESS_SECONDS;
}

function ttqBlockSoloT1Attack(aTask) {
	if (!aTask || aTask[0] !== "2" || !ttqIsSoloT1Unit(String(aTask[3]).split("_"))) return false;

	var message = "Blocked: TTQ will not send one Tier-1 unit alone.";
	_log(1, "Troop safety> " + message);
	printMsg(message + "<br><br>" + getTaskDetails(aTask), true);
	addToHistory(aTask, false, message);
	ttqBusyTask = 0;
	return true;
}

function checkSetTasks() {
	_log(1, "CheckSetTasks> Begin. (tab ID = " + myID + ")");
	var aThisTask, aTasks = getVariable("TTQ_TASKS");
	var oDate = Math.floor(((new Date()).getTime())/1000); // local time
	ttqUpdatePanel(aTasks, oDate);

	if(bLocked) {
		_log(1, "CheckSetTasks> The TTQ_TASKS variables is locked. We are not able to write it. Canceling checkSetTasks...");
		return false;
	}
	bLocked = true;
	var data = getVariable("TTQ_TABID",0);
	if ( data == 0 ) {
		_log(1,"CheckSetTasks> TabID is zero. Taking control. Checking set tasks...");
		setVariable("TTQ_TABID", myID);
	} else if ( data == myID ) {
		_log(1,"CheckSetTasks> TabID is ME. Checking set tasks...");
	} else {
		_log(1,"CheckSetTasks> TabID is someone else. Canceling check set tasks. End.");
		bLocked = false;
		return false;
	}

	if ( ttqBusyTask != 0 ) {
		printMsg(getVillageName(parseInt(ttqBusyTask[4]))+ "<br>" + getTaskDetails(ttqBusyTask) + " " + aLangStrings[50] + " " + aLangStrings[69] + " ("+aLangStrings[82] +")", true); // Your task may have not been built, it appeared to timeout or crash.
		addToHistory(ttqBusyTask, false, aLangStrings[82]);
		ttqBusyTask = 0;
	}
	// Sweep the whole queue before dispatch, including after a suspended tab resumes.
	if (aTasks != "") {
		var pendingTasks = aTasks.split("|"), keptTasks = [], expiredTasks = [];
		for (var taskIndex = 0; taskIndex < pendingTasks.length; ++taskIndex) {
			var candidate = pendingTasks[taskIndex].split(",");
			if (ttqTaskIsDeprecated(candidate)) expiredTasks.push(candidate);
			else keptTasks.push(pendingTasks[taskIndex]);
		}
		if (expiredTasks.length > 0) {
			aTasks = keptTasks.join("|");
			// Persist removal before updating the UI or recording errors.
			setVariable("TTQ_TASKS", aTasks);
			refreshTaskList(keptTasks);
			for (var expiredIndex = 0; expiredIndex < expiredTasks.length; ++expiredIndex) {
				addToHistory(expiredTasks[expiredIndex], false, "didnt launch because deprecated");
			}
			printMsg("didnt launch because deprecated", true);
		}
	}
//-- было закоментировано { Должно останавливать таймер, если нет активных задач
	if(aTasks == '') {  // no tasks are set
		_log(2, "CheckSetTasks> No tasks are set. ");
		// stop checking, it would be pointless. Checking will be restarted when new tasks are set.
		if(oIntervalReference) {
			_log(1, "CheckSetTasks> No Tasks are set. Clearing Interval.");
			window.clearInterval(oIntervalReference);
			oIntervalReference = null;
			setVariable("TTQ_TABID", 0);
			$id("ttqPanel").style.backgroundColor ="#C0C0FF";
			var ttqTimer = $id("ttqReloadTimer");
			if ( ttqTimer ) ttqTimer.innerHTML = '';
		}
		_log(1,"CheckSetTasks> End.");
		bLocked = false;
		return false;
	}
//-- }
	if ( aTasks != "" ) {
		aTasks = aTasks.split("|");
		for( tX = 0, tY = aTasks.length ; tX < tY ; ++tX) {
			aThisTask = aTasks[tX].split(",");

		// The stored time (Unix GMT time) should be compared against the GMT time, not local!
			if(aThisTask[1] <= oDate) {
				_log(1, "CheckSetTasks> Triggering task: " + aTasks[tX]);
				aTasks.splice(tX, 1);  //delete this task
				refreshTaskList(aTasks);
				aTasks = aTasks.join("|");
				setVariable("TTQ_TASKS", aTasks);
				bLocked = false;
				triggerTask(aThisTask);
				return true;
			}
		}
	}
	bLocked = false;

	tA = getOption("RELOAD_AT", 0, "integer");
	if ( tA > 0 ) {
		if( tA <= oDate ) {
			window.location.reload();
			return;
		}
	} else setOption('RELOAD_AT', Math.floor((oDate*1000 + Math.round(ttqRandomNumber()*60000))/1000));

	_log(1, "CheckSetTasks> Some task is set, but it is not the time yet. End CheckSetTasks.");
}

function ttqRestoreQueueSize(list) {
    var size = getOption('LIST_SIZE', '').split('_');
    var width = Number(size[0]), height = Number(size[1]);
    if (isFinite(width) && width >= 300) list.style.width = Math.min(width, Math.max(300, window.innerWidth - 24)) + 'px';
    if (isFinite(height) && height >= 140) list.style.height = Math.min(height, Math.max(140, window.innerHeight - 24)) + 'px';
}
function ttqEnableQueueResize(list) {
    list.title = 'Drag the bottom-right corner to resize. Drag the title bar to move.';
    if (typeof ResizeObserver === 'undefined') return;
    var previous = '';
    list.ttqResizeObserver = new ResizeObserver(function() {
        if (!document.body.contains(list) || list.classList.contains('ttq_minimized')) return;
        // Native resizing writes inline dimensions; ignore automatic content height changes.
        if (!list.style.width || !list.style.height) return;
        var size = Math.round(parseFloat(list.style.width)) + '_' + Math.round(parseFloat(list.style.height));
        if (size !== previous) { previous = size; setOption('LIST_SIZE', size); }
    });
    list.ttqResizeObserver.observe(list);
}

function ttqCenterTaskList() {
	var taskList = $id("ttq_tasklist");
	if (!taskList) return false;

	if (taskList.classList.contains("ttq_minimized")) {
		taskList.classList.remove("ttq_minimized");
		taskList.style.height = "";
		taskList.style.width = "";
		taskList.style.overflow = "auto";
		setOption("LIST_MINIMIZED", false);
		ttqRestoreQueueSize(taskList);
	}

	var margin = 12;
	var scrollX = window.scrollX || window.pageXOffset || 0;
	var scrollY = window.scrollY || window.pageYOffset || 0;
	var maxLeft = Math.max(scrollX + margin, scrollX + window.innerWidth - taskList.offsetWidth - margin);
	var maxTop = Math.max(scrollY + margin, scrollY + window.innerHeight - taskList.offsetHeight - margin);
	var left = Math.min(maxLeft, Math.max(scrollX + margin, Math.round(scrollX + (window.innerWidth - taskList.offsetWidth) / 2)));
	var top = Math.min(maxTop, Math.max(scrollY + margin, Math.round(scrollY + (window.innerHeight - taskList.offsetHeight) / 2)));

	taskList.style.left = left + "px";
	taskList.style.top = top + "px";
	setOption("LIST_POSITION", top + "px_" + left + "px");
	return true;
}

function ttqEnsureQueueCenterButton() {
	var centerButton = $id("ttq_center_queue");
	if (centerButton) return;

	centerButton = document.createElement("button");
	centerButton.id = "ttq_center_queue";
	centerButton.type = "button";
	centerButton.textContent = "Center queue";
	centerButton.title = "Move the task queue to the middle of the screen";
	ttqAddEventListener(centerButton, "click", function() {
		ttqCenterTaskList();
	}, false);
	document.body.appendChild(centerButton);
}

function ttqRemoveQueueCenterButton() {
	var centerButton = $id("ttq_center_queue");
	if (centerButton) centerButton.parentNode.removeChild(centerButton);
}

function refreshTaskList(aTasks) {
	_log(3,"Begin 	()");
	// Remove old task list
	var oOldTaskList = $id("ttq_tasklist");
	if(oOldTaskList) { if (oOldTaskList.ttqResizeObserver) oOldTaskList.ttqResizeObserver.disconnect(); document.body.removeChild(oOldTaskList); };

	//if there are no tasks set, return
	if(!aTasks || aTasks.length < 1) {
		ttqRemoveQueueCenterButton();
		return;
	}
	var sTime = "";
	//Create new tasklist
	var oTaskList = document.createElement('div');
	oTaskList.id = "ttq_tasklist";
	oTaskList.innerHTML = "<div id='ttq_draghandle' class='handle ttq_draghandle' onmousedown='return false;'>"+aLangStrings[14]+"<img src='"+sTitleBarLogo+"' style='float: right; margin: 1px 5px;' onmousedown='return false;'></div>";
	ttqAddEventListener($id("ttq_draghandle") || oTaskList.firstChild, "dblclick", doMinimize, false);
	// Keep the queue ordered by next scheduled send.
	var currentSort = 38;
	//position the list
	var tM = getOption("LIST_POSITION", "70px_687px").split("_");
	oTaskList.style.top = tM[0];
	oTaskList.style.left = tM[1];
	tM = getOption("LIST_MINIMIZED", false, "boolean");
    ttqRestoreQueueSize(oTaskList);
    oTaskList.classList.toggle("ttq_minimized", tM);
	if ( tM ) {
		oTaskList.style.height = "16px";
		oTaskList.style.width = "150px";
		oTaskList.style.overflow = "hidden";
	}
	document.body.appendChild(oTaskList);

    ttqEnableQueueResize(oTaskList);
	ttqEnsureQueueCenterButton();
	makeDraggable($id('ttq_draghandle'));

	//get the server time offset once
	if(bUseServerTime) {
		var iServerTimeOffset = getServerTimeOffset();
		if ( iServerTimeOffset == -999 ) iServerTimeOffset = 0;
	}
	var timeOffsetString = '';
	for(var i = 0; i < aTasks.length; ++i) {
		var aThisTask = aTasks[i].split(",");
		//format the task time properly
		if(bUseServerTime) {
			//create timestamp for the tasktime offset to server time
			var iTaskServerTimestamp = ( parseInt(aThisTask[1]) + (iServerTimeOffset * 3600) ) * 1000;
			//create Date obj with this timestamp
			var oDate = new Date(iTaskServerTimestamp);
			//display the date without any further offsets
			//[TODO] custom date format
			var sTime = oDate.toGMTString();
			sTime = sTime.substring(0, sTime.length - 4);
			//[TODO] Isolate and internationalize descriptions
			sTime = "<span style='cursor:pointer;' id='ttq_tasktime_" +i+ "' title='This is the server time. Click to add/edit new task.' ttq_taskid='" +i+ "' >" + sTime + "</span>";
			oDate = oDate.toString().split(" GMT");
			if ( timeOffsetString == '' ) timeOffsetString = "(" + aLangStrings[67] + ": gmt "+iServerTimeOffset+")";
		} else {  //local time
			var oDate = new Date( parseInt(aThisTask[1]) * 1000 );
			oDate = oDate.toString().split(" GMT");
			var sTime = "<span style='cursor:pointer;float:left;margin:0px 2px 0px 0px;' id='ttq_tasktime_" +i+ "' title='This is your local time. Click to add/edit new task.' ttq_taskid='" +i+ "' >" + oDate[0] + "</span>";
			if ( timeOffsetString == '' ) timeOffsetString = "(" + aLangStrings[66] + ": gmt "+oDate[1].split(" ")[0]+")";
		}

		var oDeleteLink = document.createElement('a');
		var oDeleteImg = document.createElement('img');
		oDeleteImg.src = sDeleteBtn;
		oDeleteImg.alt = 'X';
		oDeleteImg.style.verticalAlign = 'middle';
		oDeleteImg.style.display = 'inline-block';
		oDeleteLink.appendChild(oDeleteImg);
		oDeleteLink.title = aLangStrings[15];
		oDeleteLink.setAttribute("itaskindex", i);
		oDeleteLink.setAttribute("istask", "true");
		ttqAddEventListener(oDeleteLink, 'click', deleteTask, false);

		var oTaskRow = document.createElement("div");
		oTaskRow.id = "ttq_task_row_" +i;
		oTaskRow.className = "ttq_tasklist_row";
		oTaskRow.setAttribute("tasktype", aThisTask[0]);
        if (aThisTask[0] === "9") oTaskRow.setAttribute("farmgroup", JSON.stringify([aThisTask[5], aThisTask[2], aThisTask[6] || aThisTask[3]]));
		oTaskRow.setAttribute("timestamp", aThisTask[1]);
		oTaskRow.setAttribute("tasktarget", aThisTask[2]);
		oTaskRow.setAttribute("taskoptions", aThisTask[3]);
		oTaskRow.setAttribute("villagedid", aThisTask[5]);

		var sTaskSubject = "";
		var sTask = "";
		var sTaskMoreInfo = "";
		switch(aThisTask[0]) {
			case "0":  //build
			case "1":  //upgrade
				sTaskSubject = "- "+aThisTask[3].split("_")[1];
				sTask = aLangTasks[aThisTask[0]];
				sTaskMoreInfo = aLangStrings[35] + " " +aThisTask[2];
				break;
			case "2":  //attack
				sTaskSubject = '>> <span id="ttq_placename_' +aThisTask[2]+ '">' +getVillageNameZ(aThisTask[2])+ '</span>';
				var aTroops = aThisTask[3].split("_");
				var iIndex = parseInt(aTroops[0]);
				var langStringNo = iIndex == 5 ? 20 : iIndex == 3 ? 21 : 22;
				if ( (iIndex == 3 || iIndex == 4) && onlySpies(aTroops) ) {
					sTask = aLangStrings[47];
					sTaskSubject = " "+aTroops[14]+" "+sTaskSubject;
				} else { sTask = aLangStrings[langStringNo]; }
				sTaskMoreInfo = getTroopsInfo(aTroops);
				break;
			case "3":  //research
				var aOptions = aThisTask[3].split("_");
				sTaskSubject = "- "+aOptions[2];
				sTask = aLangTasks[aOptions[1]];
				sTaskMoreInfo = sTask + " " + sTaskSubject;
				break;
			case "4":  //train
				var aTroops = aThisTask[3].split("_");
				sTaskSubject = getTroopsInfo(aTroops);
				sTaskMoreInfo = sTaskSubject;
				sTask = aLangTasks[4];
				break;
			case "5":  //party
				sTaskSubject = aLangStrings[53];
				sTask = aLangTasks[5];
				sTaskMoreInfo = "Drink a Beer! This one is for the BrownStaine!"
				break;
			case "6":  //Demolish
				var tO = aThisTask[3].split("_");
				sTaskSubject = "A Building";
				var tT = parseInt(aThisTask[2]);
				for ( var j = 0,k = tO.length ; j < k ; ++j ) {
					if ( parseInt(tO[j].replace(/\[/g,"")) == tT ) {
						sTaskSubject = "- "+tO[j];
						break;
					}
				}
				sTask = aLangTasks[6];
				//sTaskSubject = aThisTask[3];
				sTaskMoreInfo = aLangStrings[35] + " " +aThisTask[2];
				break;
			case "7": //Send Merchants
				sTask = aLangTasks[7];
				tM = aThisTask[3].split("_");
				sTaskSubject = ">> " + getVillageNameXY(tM[0],tM[1]);
				sTaskMoreInfo = getMerchantInfo(tM);
				break;
			case "8": //Send Back/Withdraw
				sTask = aLangTasks[8];
				sTaskSubject = ">> " + aThisTask[2];
				sTaskMoreInfo = getTroopsInfo(aThisTask[3].split("_"));
				break;
			case "9": // Send troops through Gold-Club
				sTask = getOption('FARMLIST','');
				sTaskSubject = " >> " + aThisTask[2] + " ";
				if (aThisTask.length >= 9 && aThisTask[6]) {
					sTaskSubject += " (" + aThisTask[7] + "/" + aThisTask[8] + ")";
					sTaskMoreInfo = "Recurring Farm List: occurrence " + aThisTask[7] + " of " + aThisTask[8];
				}
				break;
			default:
				break;
		}

		oTaskRow.innerHTML = "<span class='ttq_time_village_wrapper' >" +sTime + "</span><span style='float:"+docDir[0]+"'>&nbsp;&mdash;&nbsp;</span>"+ getVillageName(aThisTask[5])+" : <span title='" +sTaskMoreInfo+ "' style='cursor:help;' >" +sTask+ " " +sTaskSubject+ " </span></span>";

        {
            oTaskRow.textContent = '';
            oTaskRow.classList.add('ttq_farm_wave');
            var timeWrapper = document.createElement('span');
            timeWrapper.className = 'ttq_time_village_wrapper';
            var timeLabel = document.createElement('span');
            timeLabel.id = 'ttq_tasktime_' + i;
            timeLabel.setAttribute('ttq_taskid', i);
            var waveDate = new Date((Number(aThisTask[1]) + (bUseServerTime ? iServerTimeOffset * 3600 : 0)) * 1000);
            function padWaveTime(n) { return String(n).padStart(2, '0'); }
            timeLabel.textContent = bUseServerTime ?
                padWaveTime(waveDate.getUTCHours()) + ':' + padWaveTime(waveDate.getUTCMinutes()) + ':' + padWaveTime(waveDate.getUTCSeconds()) :
                padWaveTime(waveDate.getHours()) + ':' + padWaveTime(waveDate.getMinutes()) + ':' + padWaveTime(waveDate.getSeconds());
            timeLabel.title = new Date(Number(aThisTask[1]) * 1000).toLocaleString() + ' (local) — click to edit';
            timeLabel.style.cursor = 'pointer';
            timeWrapper.appendChild(timeLabel);
            oTaskRow.appendChild(timeWrapper);
            var waveName = document.createElement('span');
            waveName.className = 'ttq_wave_name';
            var decodedWaveName = document.createElement('textarea');
            decodedWaveName.innerHTML = aThisTask[2];
            if (aThisTask[0] === '9') {
                waveName.textContent = decodedWaveName.value;
            } else {
                oTaskRow.classList.add('ttq_simple_task');
                oTaskRow.style.borderLeft = '4px solid ' + ttqVillageColor(aThisTask[5]);
                var taskLabel = document.createElement('strong');
                taskLabel.className = 'ttq_task_kind';
                taskLabel.textContent = sTask;
                if (aThisTask[0] === '2') taskLabel.textContent = ttqTroopTaskLabel(aThisTask[3].split('_'), sTask);
                waveName.appendChild(taskLabel);
                var taskSubject = document.createElement('span');
                taskSubject.className = 'ttq_task_subject';
                taskSubject.innerHTML = sTaskSubject.replace(/^\s*(>>|-)\s*/, '');
                waveName.appendChild(taskSubject);
                // Details remain available without crowding the compact task row.
                var detailText = document.createElement('div');
                detailText.innerHTML = getVillageName(aThisTask[5]) + ' · ' + sTaskMoreInfo;
                waveName.title = detailText.textContent;
                oTaskRow.setAttribute('data-search-details', detailText.textContent);
            }
            oTaskRow.appendChild(waveName);
            if (aThisTask[0] !== '9') {
                var taskCountdown = document.createElement('span');
                taskCountdown.className = 'ttq_countdown ttq_simple_countdown';
                taskCountdown.setAttribute('data-due', aThisTask[1]);
                oTaskRow.appendChild(taskCountdown);
            }
        }

		oTaskRow.appendChild(oDeleteLink);
		oTaskList.appendChild(oTaskRow);
		//add listener for editing times in the task list
		var oTaskTimeSpan = $id("ttq_tasktime_"+i);
		ttqAddEventListener(oTaskTimeSpan, "click", editTime, false);
		oDeleteLink = null;
		oTaskRow = null;
		oDate = null;
	}
	$id('ttq_draghandle').innerHTML += " &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <font size=1>" + timeOffsetString + "</font>";
	orderList(currentSort, "ttq_task_row");
	_log(3, "End refreshTaskList()");
}

/**************************************************************************
 * @param iORderBy: 0 - tasktype, 1 - timestamp, 2 - target, 3 - options, 4 - villagedid
 ***************************************************************************/
function orderList (iOrderBy, sRowId) {
	var rows = xpath('//div[contains(@id, "' +sRowId+ '")]');
	if(rows.snapshotLength > 0) {
		switch(iOrderBy) {
			case 37:
				var sortKey = "tasktype";
				break;
			case 39:
				var sortKey = "target";
				break;
			case 40:
				var sortKey = "options";
				break;
			case 41:
				var sortKey = "villagedid";
				break;
			case 38:
			default:
				var sortKey = "timestamp";
				break;
		}
		var keyValue = "";
		var aRows = [];
		for(var i = 0; i < rows.snapshotLength; ++i) {
			keyValue = rows.snapshotItem(i).getAttribute(sortKey);
			aRows.push([keyValue, rows.snapshotItem(i)]);
		}
		aRows.sort(sortArray);
		switch(sRowId) {
			case "ttq_history_row":
				aRows.forEach(processSortedHistory);
				break;
			case "ttq_task_row":
			default:
				aRows.forEach(processSortedTaskList);
				break;
		}
		if (sRowId === "ttq_task_row") groupFarmQueue();
		return false;
	} else return;
}


// Keep stored task indexes and individual edit/delete controls intact inside cards.
var ttqFarmExpanded = Object.create(null);
var ttqFarmSearch = '';
var ttqFarmClock = null;
function ttqTroopTaskLabel(troops, fallback) {
    var hero = Number(troops[11]) === 1;
    var otherTroops = troops.slice(1,11).some(function(count) { return Number(count) > 0; });
    if (!hero) return fallback;
    if (Number(troops[0]) === 4) return otherTroops ? 'Raid · 1 hero + troops' : 'Hero raid · 1 hero';
    return fallback + (otherTroops ? ' · 1 hero + troops' : ' · 1 hero');
}
function ttqFarmDuration(seconds) {
    seconds = Math.max(0, Math.round(seconds));
    var hours = Math.floor(seconds / 3600), minutes = Math.floor(seconds % 3600 / 60);
    return (hours ? hours + 'h ' : '') + (minutes ? minutes + 'm ' : '') + (seconds % 60) + 's';
}
function ttqFarmStats(times, now) {
    times = times.filter(function(t) { return isFinite(t); }).sort(function(a,b) { return a-b; });
    var gaps = times.slice(1).map(function(t,i) { return t-times[i]; });
    return {count:times.length, first:times[0], last:times[times.length-1],
        average:gaps.length ? (times[times.length-1]-times[0])/gaps.length : null,
        min:gaps.length ? Math.min.apply(null,gaps) : null,
        max:gaps.length ? Math.max.apply(null,gaps) : null,
        due:times.filter(function(t) { return t <= now; }).length,
        soon:times.filter(function(t) { return t > now && t <= now+3600; }).length,
        close:gaps.filter(function(t) { return t < 60; }).length};
}
function ttqVillageColor(id) {
    var hash=0; String(id).split('').forEach(function(c) { hash=(hash*31+c.charCodeAt(0))>>>0; });
    return 'hsl(' + ((hash*137.508)%360).toFixed(1) + ', 52%, 36%)';
}
function groupFarmQueue() {
    var list = $id('ttq_tasklist');
    if (!list) return;
    // Detach rows before rebuilding cards, including when regrouping without sorting.
    var rows = Array.prototype.slice.call(list.querySelectorAll('.ttq_tasklist_row'));
    rows.forEach(function(row) { list.appendChild(row); });
    Array.prototype.forEach.call(list.querySelectorAll('.ttq_farm_group, .ttq_queue_tools'), function(el) { el.remove(); });
    if (ttqFarmClock) clearInterval(ttqFarmClock);
    var groups = Object.create(null), villages = Object.create(null), now = Date.now()/1000;
    function text(parent,tag,cls,value) {
        var el=document.createElement(tag); el.className=cls; el.textContent=value; parent.appendChild(el); return el;
    }
    function times(waves) { return waves.map(function(row) { return Number(row.getAttribute('timestamp')); }); }
    function date(t) { return new Date(t*1000).toLocaleString([], {month:'short',day:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit'}); }
    function average(stats) { return stats.average === null ? 'Needs 2 queued waves' : ttqFarmDuration(stats.average); }
    function countdown(parent,t) { var el=text(parent,'span','ttq_countdown',''); el.setAttribute('data-due',t); }
    rows.forEach(function(row) {
        var key=row.getAttribute('farmgroup'); if (!key) return;
        var id=row.getAttribute('villagedid');
        if (!groups[key]) groups[key]=[]; groups[key].push(row);
        if (!villages[id]) villages[id]={rows:[],groups:Object.create(null),names:Object.create(null)};
        villages[id].rows.push(row); villages[id].groups[key]=true;
        villages[id].names[row.getAttribute('tasktarget')]=true;
    });
    Object.keys(groups).forEach(function(key) {
        var waves=groups[key], stats=ttqFarmStats(times(waves),now), id=waves[0].getAttribute('villagedid');
        var card=document.createElement('details'); card.className='ttq_farm_group'; card.style.borderLeft='5px solid '+ttqVillageColor(id);
        card.open=!!ttqFarmExpanded[key];
        card.addEventListener('toggle',function() { ttqFarmExpanded[key]=card.open; });
        var summary=document.createElement('summary');
        // Decode the script's stored name entities safely as text.
        var name=document.createElement('textarea'); name.innerHTML=waves[0].getAttribute('tasktarget');
        var headline=text(summary,'span','ttq_farm_headline','');
        var farmTitle=text(headline,'strong','ttq_farm_title',name.value); farmTitle.title=name.value;
        countdown(headline,stats.first);
        text(headline,'span','ttq_inline_stat',stats.count+' waves remaining');
        text(headline,'span','ttq_inline_stat','Average gap: '+average(stats));
        var timing=text(summary,'span','ttq_farm_timing','');
        text(timing,'strong','','Final queued: '+date(stats.last));
        if (stats.min !== null) text(timing,'strong','','Gap range: '+ttqFarmDuration(stats.min)+' – '+ttqFarmDuration(stats.max));
        text(timing,'strong','','Queue span: '+ttqFarmDuration(stats.last-stats.first));
        var village=text(summary,'span','ttq_farm_context','');
        var villageName=text(village,'span','', ''); villageName.innerHTML=getVillageName(id);
        text(village,'span','',' · Next: '+date(stats.first)+' · '+stats.soon+' sends in the next hour'+(stats.due ? ' · '+stats.due+' due / awaiting execution' : ''));
        var removeAll = document.createElement('button');
        removeAll.type = 'button';
        removeAll.className = 'ttq_remove_all';
        removeAll.textContent = 'Remove all';
        removeAll.title = 'Remove all queued waves from this farm schedule';
        removeAll.setAttribute('aria-label', 'Remove all queued waves for ' + name.value);
        removeAll.addEventListener('click', function(event) {
            event.preventDefault(); event.stopPropagation();
            ttqRemoveFarmSchedule(key);
        });
        headline.appendChild(removeAll);
        card.appendChild(summary); list.insertBefore(card,waves[0]); waves.forEach(function(row) { card.appendChild(row); });
    });
    var tools=document.createElement('div'); tools.className='ttq_queue_tools';
    text(tools,'strong','',Object.keys(villages).length+' villages · '+Object.keys(groups).length+' farm schedules · '+rows.length+' total queued tasks');
    text(tools,'span','ttq_overview_note','Planned sends, not delivery confirmations. Averages use remaining queued waves; all times are local.');
    var dashboard=text(tools,'div','ttq_village_dashboard','');
    Object.keys(villages).sort(function(a,b) { return ttqFarmStats(times(villages[a].rows),now).first-ttqFarmStats(times(villages[b].rows),now).first; }).forEach(function(id) {
        var data=villages[id], stats=ttqFarmStats(times(data.rows),now);
        var tile=text(dashboard,'div','ttq_village_tile',''); tile.style.borderTop='4px solid '+ttqVillageColor(id);
        var name=text(tile,'div','ttq_village_title',''); name.innerHTML=getVillageName(id);
        text(tile,'div','',Object.keys(data.names).length+' list names · '+Object.keys(data.groups).length+' schedules · '+stats.count+' waves');
        countdown(tile,stats.first);
        text(tile,'div','ttq_village_average','Average between sends: '+average(stats));
        text(tile,'div','ttq_overview_note','Across all queued farm lists in this village');
        if (stats.min !== null) text(tile,'div','','Shortest: '+ttqFarmDuration(stats.min)+' · Longest: '+ttqFarmDuration(stats.max));
        text(tile,'div','',stats.soon+' sends in the next hour · Last: '+date(stats.last));
        if (stats.close) text(tile,'div','ttq_timing_notice',stats.close+' gaps under 1 minute (including simultaneous sends)');
        if (stats.due) text(tile,'div','ttq_timing_notice',stats.due+' waves due / awaiting execution');
    });
    var search=document.createElement('input'); search.type='search'; search.placeholder='Filter by task, farm list or village'; search.setAttribute('aria-label','Filter queue'); search.value=ttqFarmSearch;
    var results=text(tools,'span','ttq_overview_note','');
    function filter() {
        ttqFarmSearch=search.value; var visible=0,total=0;
        Array.prototype.forEach.call(list.children,function(el) {
            if (el.classList.contains('ttq_farm_group') || el.classList.contains('ttq_tasklist_row')) {
                total++; el.hidden=(el.textContent+' '+(el.getAttribute('data-search-details') || '')).toLowerCase().indexOf(ttqFarmSearch.toLowerCase())<0; if (!el.hidden) visible++;
            }
        });
        results.textContent=ttqFarmSearch ? visible+' of '+total+' queue entries match. Village totals above include the full queue.' : 'Village totals include the full queue.';
    }
    search.addEventListener('input',filter); tools.appendChild(search);
    list.insertBefore(tools,list.children[1] || null);
    function tick() {
        if (!document.body.contains(list)) { clearInterval(ttqFarmClock); return; }
        Array.prototype.forEach.call(list.querySelectorAll('[data-due]'),function(el) {
            var delta=Number(el.getAttribute('data-due'))-Date.now()/1000;
            el.textContent=delta>0 ? 'Next in '+ttqFarmDuration(delta) : 'Due '+ttqFarmDuration(-delta)+' ago · awaiting execution';
            el.classList.toggle('ttq_due',delta<=0);
        });
    }
    tick(); filter(); ttqFarmClock=setInterval(tick,1000);
}

function editTime(ev) {
	var oTaskRow = ev.target.parentNode.parentNode;
	var type = parseInt(oTaskRow.getAttribute("tasktype"));
	var timestamp = oTaskRow.getAttribute("timestamp");
	var target = oTaskRow.getAttribute("tasktarget");
	var options = oTaskRow.getAttribute("taskoptions").split("_");
	var villagedid = oTaskRow.getAttribute("villagedid");  //(should be fixed)not supported yet. The new task will have did of currently active village.
	// Try to get the task index and pass to the form
	if (oTaskRow.getElementsByTagName("a")[0])
    var taskindex = oTaskRow.getElementsByTagName("a")[0].getAttribute("itaskindex");
	displayTimerForm(type, target, options, timestamp, taskindex, villagedid);
}

function ttqRemoveFarmSchedule(key) {
    if (bLocked) { printMsg('The queue is busy. Please try again.', true); return false; }
    bLocked = true;
    var remaining;
    try {
        var stored = getVariable('TTQ_TASKS');
        remaining = ttqWithoutFarmSchedule(stored, key);
        setVariable('TTQ_TASKS', remaining.join('|'));
    } finally {
        bLocked = false;
    }
    delete ttqFarmExpanded[key];
    ttqUpdatePanel(remaining.join('|'));
    refreshTaskList(remaining);
    return false;
}
function ttqWithoutFarmSchedule(stored, key) {
    return (stored ? stored.split('|') : []).filter(function(task) {
        var parts = task.split(',');
        return parts[0] !== '9' || JSON.stringify([parts[5], parts[2], parts[6] || parts[3]]) !== key;
    });
}

function deleteTask(e) {
	_log(3,"Begin deleteTask()");
	var iTaskIndex = e.target.parentNode;
	var isTask = iTaskIndex.getAttribute("istask") == "true" ? true : false;
	iTaskIndex = iTaskIndex.getAttribute("itaskindex");
	_log(2, "Deleting task "+iTaskIndex);
	if(bLocked) {
		_log(3, "The TTQ_TASKS variables is locked. We are not able to write it.");
		printMsg("Delete Failed! TTQ_TASKS is locked!", true);
		return false;
	}
	bLocked = true;
	if ( isTask ) var data = getVariable("TTQ_TASKS");
	else var data = getVariable("TTQ_HISTORY");
	if(data == '') {
		_log(2, "No tasks are set. ");
		bLocked = false;
		return false;  // no tasks are set
	}
	var aTasks = data.split("|");
	aTasks.splice(iTaskIndex, 1);  //delete this task
	data = aTasks.join("|");
	if ( isTask ) {
		setVariable("TTQ_TASKS", data);
		ttqUpdatePanel(data);
	} else setVariable("TTQ_HISTORY", data);
	bLocked = false;
	if ( isTask ) refreshTaskList(aTasks);
	else refreshHistory(aTasks);
	return false;  // we return false to override default action on the link
	_log(3, "End deleteTask()");
}

/**************************************************************************
 * Performs the supplied task. Prints the report.
 * @param aTask: [task, when, target, options]
 ***************************************************************************/
function triggerTask(aTask) {
	// Recheck at dispatch in case the browser paused after selecting this task.
	if (ttqTaskIsDeprecated(aTask)) {
		addToHistory(aTask, false, "didnt launch because deprecated");
		printMsg("didnt launch because deprecated", true);
		return;
	}
	_log(3,"Begin triggerTask("+aTask+")");
	ttqBusyTask = aTask;
	switch(aTask[0]) {
		case "0": //build new building
		case "1": //upgrade building
			upgradebuild(aTask);
			break;
		case "2": //send attack
			if (ttqBlockSoloT1Attack(aTask)) return false;
			attack(aTask);
			break;
		case "3": //research
			research(aTask);
			break;
		case "4": //train troops
			train(aTask);
			break;
		case "5": //throw party
			party(aTask);
			break;
		case "6": //demolish building[ALPHA]
			demolish(aTask);
			break;
		case "7": //send merchants
			merchant(aTask);
			break;
		case "8": //send Back/Withdraw
			sendbackwithdraw(aTask);
			break;
		case "9": //send troops through Gold-Club
			sendGoldClub(aTask);
			break;
		default: //do nothing
			_log(1, "Can't trigger an unknown task.");
			break;
	}
	_log(3, "End triggerTask("+aTask+")");
}
// *** End TTQ Core Functions ***
