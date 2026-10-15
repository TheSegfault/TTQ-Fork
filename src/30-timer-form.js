
//  *** BEGIN Timer Form Code ***
/**************************************************************************
 * @param iTask: 0 - build, 1 - upgrade, 2 - attack,raid,support, 3 - research, 4 - train troops, 6 - demolish, 7 - Send Merchants, 8 - Send Troops Back
 * @param target: sitedId for iTask = 0 or 1; iVillageId for siteId = 2
 * @param options: buildingId for iTask = 0; troops for attacks.
 * @param timestamp: if it is passed, suggest the time calculated from this (Caution! It is in seconds).
 * @param taskindex: (optional) task index for editing tasks
 * @param villagedid: (optional) the original task's corresponding village (default: current village)
 * This function functions both as a Listener for Build later and Upgrade later links,
 * and as regular function when arguments are supplied (in case of scheduling attacks and editing existing tasks).
 * @param buildingGID: building gid
 ***************************************************************************/
function displayTimerForm(iTask, target, options, timestamp, taskindex, villagedid, buildingGID) {
	_log(3,"Begin displayTimerForm("+iTask+", "+target+", "+options+", "+timestamp+", "+taskindex+", "+villagedid+")");
	var iVillageId = typeof(villagedid) != 'undefined' ? villagedid : currentActiveVillage;
	// For build and upgrade, we need to extract arguments from the event object
	if((typeof(iTask) == 'object' || iTask < 2) && target == null) {  //if params are supplied, we do not extract them from the event object target (link)
		var el = iTask.target;  // iTask really is the Event object!
		var iTask = parseInt(el.getAttribute("itask"));
		var target = el.getAttribute("starget");
		var options = el.getAttribute("soptions");
		if(iTask == undefined || target == undefined || options == undefined) {
			_log(2, "Missing arguments:\niTask="+iTask+"\ntarget="+target+"\noptions="+options);
			return false;
		}
	}
	_log(2, "Arguments:\niTask="+iTask+"\ntarget="+target+"\noptions="+options);
	var sTask = '';
	var sWhat = '';
	var sMoreInfo = '';
	var sWho = '<span id="ttq_placename_' +iVillageId+ '">'+getVillageName(iVillageId)+':</span>';
	if (typeof(options) != 'object') options = options.split("_");
	switch(iTask) {
		case 0:  //build
		case 1:  //upgrade
			sWhat = "- "+options[1];
			sTask = aLangTasks[iTask];
			sMoreInfo = aLangStrings[35] + " " +target;
			break;
		case 2:  //Attack, Raid, Support
			var iAttackType = parseInt(options[0]);
			var langStringNo = iAttackType == 5 ? 20 : iAttackType == 3 ? 21 : 22;
			var bLetsSpy = (iAttackType < 5 && onlySpies(options));
			sWhat = ( bLetsSpy ? aLangStrings[47] : aLangStrings[langStringNo] )+' >> <span id="ttq_placename_' +target+ '">' +getVillageNameZ(target)+ '</span>';
			var bCatapultPresent = (options[8] > 0) ? true : false;
			if(options[11] == undefined) options[11] = 0;  //if no heros are specified, set them to zero
			sMoreInfo = getTroopsInfo(options);
			break;
		case 3:  //Research
			sWhat = "- "+options[2];
			sTask = aLangTasks[options[1]];
			break;
		case 4:  //Training
			sWhat = "" + (options[12] > 0 ? aLangTroops[11] : aLangStrings[49]);
			sTask = aLangTasks[4];
			sMoreInfo = getTroopsInfo(options);
			break;
		case 5:  //Party
			sWhat = aLangStrings[53];
			sTask = aLangTasks[5];
			break;
		case 6:  //Demolish
			sWhat = '<select name="abriss" onchange="var t = document.getElementsByName(\'timerTarget\'); if ( t.length > 0 ) t[0].value = this.value; t = document.getElementById(\'timerMoreInfo\'); if ( t ) { var k = t.innerHTML.split(\' \'); k.pop(); k.push(this.value); t.innerHTML = k.join(\' \'); }">';
			target = parseInt(target);
			if (isNaN(target)) target = -1;
			for ( tX = 0, tY = options.length ; tX < tY ; ++tX ) {
				tA = parseInt(options[tX].replace("[",""));
				sWhat += '<option value="' +tA+ '" '+( tA == target ? 'selected' : '' )+'>'+options[tX]+'</option>';
			}
			sWhat = "- " + sWhat + "</select>";
			sTask = aLangTasks[6] + ": ";
			sMoreInfo = aLangStrings[35] + " " +target;
			break;
		case 7:  //Send Merchants
			sTask = aLangTasks[7];
			sWhat = " >> " + getVillageNameZ(target);
			sMoreInfo = getMerchantInfo(options);
			break;
		case 8: // Send Back Troops
			sTask = aLangTasks[8];
			sWhat = " >> " + target;
			sMoreInfo = getTroopsInfo(options);
			break;
		case 9: // Send troops through Gold-Club
			var sTask = getOption('FARMLIST','');
			if( sTask == '' ) {
				sTask = $gc('tabItem',$gc('favorKey99')[0])[0].textContent;
				setOption('FARMLIST',sTask);
			}
			sWhat = " >> " + target;
			var tA = $gc('iReport1');
			//if( tA.length > 0 ) {
			//	tA = tA[0].getAttribute('alt');
			//	sWhat += ' >> <img class="iReport iReport1" src="img/x.gif" title="' + tA +
			//	'" alt="' + tA + '"><input type="checkbox" "checked">';
			//}
			/* добавлять код надо ниже, там, где каты. Это будут 6й,7й,8й элемент. Обязательно дать name для 6го.
			 * затем в функции ниже парсить. Перевод надо добавить. Лучше не ловить с сервера.
			 */
			break;
	}

	var oTimerForm = document.createElement("form");
	oTimerForm.setAttribute('name','myForm');
	//Suggest the current time. Can be local or server time.
		var sTimeType = "This is your local time.";

		if(timestamp) var date = new Date(timestamp * 1000);
		else var date = new Date();
		var dd = date.getDate();
		var mm = date.getMonth() + 1;
		var yyyy = date.getFullYear();
		var hh = date.getHours();
		var min = date.getMinutes();
		var sec = date.getSeconds();

		//Convert small numbers to conventional format
		var sTime = formatDate(yyyy, mm, dd, hh, min, sec);
	// Allow target selection for catapults if this is Normal Attack and at least 1 cata is sent
	var sCataTargets = '';
	if(iTask == 2 && iAttackType == 3 && bCatapultPresent) {
		var sCataOptions = "";
		for(var j=1; j < aLangBuildings.length; ++j) {
			if (j==12 || j==23 || j==31 || j==32 || j==33 || j==34 || j==36 || j==42 || j==43) continue; //skip walls and untargetable buildings
			sCataOptions += '<option value="' +j+ '">' +aLangBuildings[j]+ '</option>';
		}
		sCataTargets = '<select name="kata"><option value="99">' +aLangStrings[24]+ '</option>' + sCataOptions + '</select>';
		if ( options[8] >= 20 ) sCataTargets += '<select name="kata2"><option value="0"></option><option value="99">' +aLangStrings[24]+ '</option>' + sCataOptions + '</select>';
	}
	//Allow specifying the spying mode (only if there is nothing but spies being sent and if this is not a support)
	var sSpyMode = '';
	if(iTask == 2 && bLetsSpy) sSpyMode = '<input type="radio" name="spy" value="1" checked>' +aLangStrings[31]+ ' <input type="radio" name="spy" value="2">' +aLangStrings[32];
	oTimerForm.id = "timerForm";
	oTimerForm.setAttribute("onsubmit", "return false;");
	//Use img tag directly
	var sLinkClose = "<img src='" +sCloseBtn+ "' alt='["+aLangStrings[56]+"]' title='"+aLangStrings[56]+"' id='ttq_close_btn' class='ttq_close_btn' onclick='document.body.removeChild(document.getElementById(\"timerform_wrapper\"));' />";
	if (typeof(options) == "object") options = options.join("_");
	oTimerForm.innerHTML =
	/* 0 */ '<input type="hidden" name="timerTask" value="' +iTask+ '" />' +
	/* 1 */	'<input type="hidden" name="timerTarget" value="' +target+ '" />' +
	/* 2 */	'<input type="hidden" name="timerOptions" value="'+options+'" />'+sWho+'<br /><br />' +sTask+ ' ' +sWhat+ '<br /><br /><span style="display:inline-block;">' + aLangStrings[25] + '</span>' +
	/* 3 */ ' <input name="TTQat" type="text" id="TTQat" style="width:145px;" value="' +sTime+ '" onmousedown="dragObject = null;" onfocus="document.getElementById(\'TTQafter\').value = \'\'; this.value=\'' +sTime+ '\'" title="' +sTimeType+ '" /><span>' + aLangStrings[26] + '</span>' +
	/* 4 */ ' <input name="TTQafter" type="text" id="TTQafter" style="width:145px;" onmousedown="dragObject = null;" onmousemove="dragObject = null;" onmouseup="dragObject = null;" onfocus="document.getElementById(\'TTQat\').value = \'\';" />' +
	/* 5 */	'<select name="timeUnit"><option value="1">' + aLangStrings[27]
	+ '</option><option value="60" selected="selected">' + aLangStrings[28]
	+ '</option><option value="3600">' + aLangStrings[29]
	+ '</option><option value="86400">' + aLangStrings[30]
	+ '</option></select><span id="timerMoreInfo" style="font-size:85%;color:red; cursor:default;display:block;">' +sMoreInfo+ '</span>';

	// Recurring Farm List scheduling. The normal "Send later" time is the
	// first occurrence; subsequent occurrences are randomized.
	if (iTask == 9) {
        oTimerForm.innerHTML = '<input type="hidden" name="timerTask" value="9" /><input type="hidden" name="timerTarget" /><input type="hidden" name="timerOptions" />' +
            '<input type="hidden" name="TTQat" value="" /><p><b>Schedule farm list</b></p><p class="ttq_farm_form_name"></p>' +
            '<label>Send after <input name="TTQafter" type="number" min="0" step="any" value="0" style="width:80px" /></label> ' +
            '<select name="timeUnit" aria-label="Send delay unit"><option value="60">minutes</option><option value="3600">hours</option></select>';
        oTimerForm.elements.timerTarget.value = target;
        oTimerForm.elements.timerOptions.value = options;
        oTimerForm.querySelector('.ttq_farm_form_name').textContent = target;
        if (timestamp) oTimerForm.elements.TTQafter.value = Math.max(0, (timestamp - Date.now() / 1000) / 60).toFixed(2);
        oTimerForm.innerHTML +=
			'<p style="margin:8px 0 4px 0;"><b>Recurring Farm List</b></p>' +
			'<p style="margin:4px 0;">Repeat every ' +
			'<input name="repeatInterval" type="number" min="0" step="1" value="30" style="width:55px;" /> minutes ' +
			'<span style="font-size:85%;">(+ random range: <input name="repeatRandomMin" type="number" min="0" step="1" value="1" style="width:42px;" /> to <input name="repeatRandomMax" type="number" min="0" step="1" value="6" style="width:42px;" /> minutes, plus random seconds)</span></p>' +
			'<p style="margin:4px 0;">Number of repeats ' +
			'<input name="repeatCount" type="number" min="0" step="1" value="0" style="width:55px;" /> ' +
			'<span style="font-size:85%;">(0 = one-time send)</span></p>' +
			'<p class="ttq_duration"><label>Run for <input name="repeatDuration" type="number" min="0.01" step="any" placeholder="10" style="width:80px" /></label> ' +
            '<select name="repeatDurationUnit" aria-label="Duration unit"><option value="3600">hours</option><option value="60">minutes</option></select><br />' +
            '<span>Measured from now. Overrides the repeat count; leave blank to use the count. First send follows the interval above.</span></p>';
	}

    if (iTask == 9) {
        oTimerForm.elements.timerTarget.value = target;
        oTimerForm.elements.timerOptions.value = options;
        if (timestamp) oTimerForm.elements.TTQafter.value = Math.max(0, (timestamp - Date.now() / 1000) / 60).toFixed(2);
    }
	/* 6,7*/if(sCataTargets != '') oTimerForm.innerHTML += '<p>' + aLangStrings[23] + ': ' +sCataTargets+ ' </p>';
	/* 6,7*/if(sSpyMode != '') oTimerForm.innerHTML += '<p>' +sSpyMode+ '</p>';

	// if taskindex is set, we are editing a task
	if (typeof(taskindex) != 'undefined') sSubmitButtonLabel = aLangStrings[58];
	else sSubmitButtonLabel = "OK";
	var oSubmitBtn = $e("input",[['name',"submitBtn"],['id',"submitBtn"],['type',"submit"],['style','border:1px solid darkgray;background-color:#ccc;margin-top:2px;']]);
	oSubmitBtn.value = sSubmitButtonLabel;
	ttqAddEventListener(oSubmitBtn, 'click', function() {handleTimerForm(this.form, 1, taskindex, iVillageId, buildingGID)}, true);
	/* 8 */oTimerForm.appendChild(oSubmitBtn);

	// Add buttons if editing
	if (typeof(taskindex) != 'undefined') {
		var oAddCloseBtn = $e("input",[['name',"AddCloseBtn"],['value',aLangStrings[59]],['type',"button"]]);
		ttqAddEventListener(oAddCloseBtn, 'click', function() {handleTimerForm(this.form, 2, taskindex, iVillageId, buildingGID)}, true);
		oTimerForm.appendChild(oAddCloseBtn);

		var oAddBtn = $e("input",[['name',"AddBtn"],['value',aLangStrings[60]],['type',"button"]]);
		ttqAddEventListener(oAddBtn, 'click', function() {handleTimerForm(this.form, 3, taskindex, iVillageId, buildingGID)}, true);
		oTimerForm.appendChild(oAddBtn);
	}

	var oTitle = document.createElement("div");
	oTitle.id="timerform_title";
	oTitle.innerHTML = sLinkClose + "<span style='font-weight: bold;'>" + aLangStrings[57] + "<span>";
	oTitle.style.margin="10px 20px";
	oTitle.setAttribute("class", "handle");
	//oTitle.setAttribute("onmousedown", "return false;");

	var oWrapper = $e("div",[['id',"timerform_wrapper"]]);
	oWrapper.appendChild(oTitle);
	oWrapper.appendChild(oTimerForm);

	//position
	var formCoords = getOption("FORM_POSITION", "215px_215px");
	formCoords = formCoords.split("_");
	oWrapper.style.top = formCoords[0];
	oWrapper.style.left = formCoords[1];

	document.body.appendChild(oWrapper);
	makeDraggable($id("timerform_title"));
	_log(3, "End displayTimerForm()");
	return false;
}
/**************************************************************************
* 0 = timerTask, 1 = timerTarget, 2 = timerOptions, 3 = at, 4 = after
* 5 = timeUnit, 6 = OK - true - 1, 7 = undefined - false - 2, 8 = undefined - OK
/**************************************************************************/
function handleTimerForm(oForm, iAction, taskindex, villagedid, buildingGID) {
	_log(3,"Begin handleTimerForm()");
	var iTaskTime = [];
	var at = oForm.elements["TTQat"].value;
    if (oForm.elements.timerTask.value === '9' && (!isFinite(Number(oForm.elements.TTQafter.value)) || Number(oForm.elements.TTQafter.value) < 0)) {
        printMsg("Enter a valid non-negative send delay.", true); return false;
    }
	if(at == '') { // When you type in, say, 13 minutes
		var after = oForm.elements["TTQafter"].value;
		var timeUnit = oForm.elements["timeUnit"].value;
		var oDate = new Date();  // current GMT date. TODO: server time

		if (after.indexOf(",") > -1) {
			var arrafter = after.split(",");
			for (var i=0; i<arrafter.length; i++) {
				iTaskTime[i] = Math.floor(oDate.getTime()/1000 + arrafter[i]*timeUnit + ttqRandomNumber());
			}
		} else {
			iTaskTime[0] = Math.floor(oDate.getTime()/1000 + after*timeUnit);
		}
	} else {// when you use the specific time
		// convert formatted date to milliseconds
		var re = new RegExp("^(2[0-9]{3})/([0-9]{1,2})/([0-9]{1,2}) ([0-9]{1,2}):([0-9]{1,2}):([0-9]{1,2})$", "i");
		var aMatch = at.match(re);
		if(!aMatch) {
			_log(1, "You entered an invalid date format!");
			return;
		}
		for(var i = 2; i < aMatch.length; ++i) {
			// convert strings to integers
			if(aMatch[i].match(/0[0-9]{1}/i)) {aMatch[i] = aMatch[i].substring(1);}
			aMatch[i] = parseInt(aMatch[i]);
		}

		// Time zone conversions
		if(bUseServerTime) { //server time
			var iServerTimeOffset = getServerTimeOffset();
			if(iServerTimeOffset == -999) {  //problem. do nothing.
				_log(2, "We could not schedule this task, because we were unable to determine server's timezone.");
				printMsg("We could not schedule this task, because we were unable to determine server's timezone.", true);
				return false;
			}

			var oTaskDate = new Date(aMatch[1],aMatch[2]-1,aMatch[3],aMatch[4],aMatch[5],aMatch[6]);  //server time in local offset
			var newtimestamp = oTaskDate.getTime() - (oTaskDate.getTimezoneOffset() * 60000);  //server time in server's timezone
			newtimestamp = newtimestamp - (iServerTimeOffset * 3600000);  //get the UTC server time for this task
			iTaskTime[0] = Math.floor( newtimestamp/1000 );  //convert to seconds
		} else {  //local time
			var oDate = new Date(aMatch[1],aMatch[2]-1,aMatch[3],aMatch[4],aMatch[5],aMatch[6]);
			iTaskTime[0] = Math.floor(oDate.getTime()/1000);
		}
	}

	// Farm List recurrence:
	// - The first occurrence is scheduled from NOW, not immediately.
	// - Base interval may be any non-negative number of minutes.
	// - A configurable random minute range is added to every interval.
	// - Seconds are independently randomized from 0..59.
	// - repeatCount is the number of additional sends after the first one.
	if (parseInt(oForm.elements["timerTask"].value, 10) === 9 &&
			typeof(oForm.elements["repeatCount"]) != "undefined") {
		var repeatCount = parseInt(oForm.elements["repeatCount"].value, 10);
		var repeatInterval = parseInt(oForm.elements["repeatInterval"].value, 10);
		var repeatRandomMin = parseInt(oForm.elements["repeatRandomMin"].value, 10);
		var repeatRandomMax = parseInt(oForm.elements["repeatRandomMax"].value, 10);
        var durationField = oForm.elements["repeatDuration"];
        var useRepeatUntil = durationField && (durationField.value !== '' || (durationField.validity && durationField.validity.badInput));
        var durationSeconds = Number(durationField.value) * Number(oForm.elements["repeatDurationUnit"].value);
        var repeatUntil = useRepeatUntil ? Math.floor(Date.now() / 1000 + durationSeconds) : null;
        if (useRepeatUntil && (!isFinite(durationSeconds) || durationSeconds < 1 || !isFinite(repeatUntil))) {
            printMsg("Enter a positive duration in hours or minutes (for example, 10 hours).", true);
            return false;
        }

		if (isNaN(repeatCount) || repeatCount < 0) repeatCount = 0;
		if (isNaN(repeatInterval) || repeatInterval < 0) repeatInterval = 0;
		if (isNaN(repeatRandomMin) || repeatRandomMin < 0) repeatRandomMin = 0;
		if (isNaN(repeatRandomMax) || repeatRandomMax < 0) repeatRandomMax = 0;
		if (repeatRandomMax < repeatRandomMin) {
			var swapRandomRange = repeatRandomMin;
			repeatRandomMin = repeatRandomMax;
			repeatRandomMax = swapRandomRange;
		}

		if ((repeatCount > 0 || useRepeatUntil) && typeof(taskindex) == 'undefined') {
			var firstRandomExtraMinutes = repeatRandomMin +
				Math.floor(Math.random() * (repeatRandomMax - repeatRandomMin + 1));
			var firstRandomSeconds = Math.floor(Math.random() * 60);
			var firstIntervalSeconds = (repeatInterval + firstRandomExtraMinutes) * 60 + firstRandomSeconds;
			iTaskTime = [Math.floor(Date.now() / 1000) + Math.max(1, firstIntervalSeconds)];
			if (useRepeatUntil && iTaskTime[0] > repeatUntil) {
				printMsg("No waves fit in this duration. Choose a longer duration or a shorter interval.", true);
				return false;
			}

			for (var r = 1; useRepeatUntil || r <= repeatCount; r++) {
				var randomExtraMinutes = repeatRandomMin +
					Math.floor(Math.random() * (repeatRandomMax - repeatRandomMin + 1));
				var randomSeconds = Math.floor(Math.random() * 60);
				var intervalSeconds = (repeatInterval + randomExtraMinutes) * 60 + randomSeconds;
				var nextTime = iTaskTime[r - 1] + Math.max(1, intervalSeconds);
				if (useRepeatUntil && nextTime > repeatUntil) break;
				// Bound eager queue generation so a distant cutoff cannot freeze the browser.
				if (r >= 10000) {
					printMsg("This range creates more than 10,000 waves. Choose a shorter duration, fewer repeats, or a longer interval.", true);
					return false;
				}
				iTaskTime[r] = nextTime;
			}
		}
	}

	//Remove the form unless "add" is clicked
	if (iAction === 1 || iAction === 2) document.body.removeChild($id('timerform_wrapper'));
	_log(2, "Task will be scheduled for " +iTaskTime);  // The stored time is the absolute Unix GMT time.
	n = oForm.elements["timerOptions"].value.split("_");
	if ( typeof(oForm.elements["spy"]) != "undefined" ) { //We spy
		if ( oForm.elements["spy"].value == 1 ) n[14] = 1;
		else n[14] = 2;
	} else if ( typeof(oForm.elements["kata"]) != "undefined" ) { //We kata
		if ( oForm.elements["kata"].value > 0 ) n[15] = oForm.elements["kata"].value; //store catapults targets
		if(typeof(oForm.elements["kata2"]) != "undefined" && oForm.elements["kata2"].value > 0) n[16] = oForm.elements["kata2"].value;//store catapults targets
	} else if ( typeof(oForm.elements["abriss"]) != "undefined" ) { //We Demo
		n = new Array();
		var tO = oForm.elements["abriss"].getElementsByTagName("option");
		for ( var i = 0, j = tO.length ; i < j ; ++i ) n.push(tO[i].innerHTML);
	}
	oForm.elements["timerOptions"].value = n.join("_");

	// Added taskindex and villagedid, unset taskindex if adding new task
	//Also disabling the "edit" button when clicking the add button
	if (iAction === 2 || iAction === 3) {
		taskindex = undefined;
		at = $id('submitBtn');
		if ( at != null ) at.disabled=true;
	}
	var recurrenceID = '';
	var recurrenceTotal = iTaskTime.length;
	if (parseInt(oForm.elements["timerTask"].value, 10) === 9 && recurrenceTotal > 1 && typeof(taskindex) == 'undefined') {
		recurrenceID = Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
	}

	for (var i=0; i<iTaskTime.length; i++) {
		if ( iTaskTime[i] ) setTask(
			oForm.elements["timerTask"].value,
			iTaskTime[i],
			oForm.elements["timerTarget"].value,
			oForm.elements["timerOptions"].value,
			taskindex,
			villagedid,
			i==iTaskTime.length-1 ? true : false,
			buildingGID,
			recurrenceID,
			recurrenceID ? i + 1 : undefined,
			recurrenceID ? recurrenceTotal : undefined
		);
	}

	_log(3, "End handleTimerForm()");
}
/**************************************************************************
  * Schedules the specified task. The task is stored in a variable.
  * @param iTask: name of the task (0-build, 1-upgrade, 2-attack, 3-research, 4-train)
  * @param iWhen: date when the task is to be triggered
  * @param target: iBuildingId, or iVillageId
  * @param options: what to build, what units to send attacking (first member specifies the type of attack: 0-support, 1-normal attack, 2-raid).
  ***************************************************************************/
function setTask(iTask, iWhen, target, options, taskindex, villagedid, refreshTask, buildingGID, recurrenceID, recurrenceIndex, recurrenceTotal) {
	var iVillageId = typeof(villagedid) != 'undefined' ? villagedid : currentActiveVillage;
	if(bLocked) {
		_log(3, "The TTQ_TASKS variables is locked. We are not able to write it. The Task could not be scheduled.");
		printMsg(getVillageName(iVillageId)+ "<br>" +aLangStrings[12], true);
		return false;
	}

	bLocked = true;
	var data = getVariable("TTQ_TASKS");
	var aTasks = data.split("|");
	var iTaskIndex = typeof(taskindex) != 'undefined' ? taskindex : aTasks.length;
	var newValue = iTask + ',' + iWhen + ',' + target.replace('|','&#124;').replace(',','&#44;') + ',' + options + ',' + buildingGID;
	if ( iVillageId > 0 ) newValue += ',' + iVillageId;
	else newValue += ',' + 'null';

	// Optional recurrence metadata (fields 6-8). Existing tasks remain
	// backward compatible because these fields are optional.
	if (typeof(recurrenceID) != 'undefined' && recurrenceID !== '') {
		newValue += ',' + recurrenceID + ',' + recurrenceIndex + ',' + recurrenceTotal;
	}
	if (data=="") {
		data = newValue;
		aTasks = data.split("|");
	} else {
		aTasks.splice(iTaskIndex, (typeof(taskindex) != 'undefined' ? 1 : 0), newValue);  //replace/add the task
		data = aTasks.join("|");
	}
	_log(1, "Writing task list: "+data);
	setVariable("TTQ_TASKS", data);
	bLocked = false;
	if (refreshTask) refreshTaskList(aTasks);
	// Generate message
	var sTaskSubject = "";
	var sTask = "";
	switch(iTask) {
		case "0":  //build
		case "1":  //upgrade
			sTaskSubject = "- "+options.split("_")[1];
			sTask = aLangTasks[iTask];
			break;
		case "2":  //attack
			sTaskSubject = ' >> <span id="ttq_placename_' +target+ '">' +getVillageNameZ(target)+ '</span>';
			var aTroops = options.split("_");
			var iIndex = parseInt(aTroops[0]);
			var langStringNo = iIndex == 5 ? 20 : iIndex == 3 ? 21 : 22;
			if((iIndex == 3 || iIndex == 4) && onlySpies(aTroops) ) {
				sTask = aLangStrings[47];
				sTaskSubject = " "+aTroops[14]+" "+sTaskSubject;
			} else { sTask = aLangStrings[langStringNo]; }
			break;
		case "3":  //research
			var aOptions = options.split("_");
			sTaskSubject = "- "+aOptions[2];
			sTask = aLangTasks[aOptions[1]];
			break;
		case "4":  //training
			var aTroops = options.split("_");
			sTaskSubject = ' ' + getTroopsInfo(aTroops);
			sTask = aLangTasks[4];
			break;
		case "5":  //party
			sTaskSubject = ' ' + aLangStrings[53];
			sTask = aLangTasks[5];
			break;
		case "6":  //Demolish [ALPHA]
			var tO = options.split("_");
			sTaskSubject = "A building";
			target = parseInt(target);
			for ( var i = 0,k = tO.length ; i < k ; ++i ) {
				if ( parseInt(tO[i].replace(/\[/g,"")) == target ) {
					sTaskSubject = "- "+tO[i];
					i = k;
				}
			}
			sTask = aLangTasks[6];
			break;
		case "7": //Send Merchants
			sTask = aLangTasks[7];
			var opts = options.split("_");
			sTaskSubject = ": " + getVillageName(iVillageId) + " >> " + getVillageNameXY(opts[0],opts[1]) + "<br>" + getMerchantInfo(opts);
			break;
		case "8": //Send Back/Withdraw
			sTask = aLangTasks[8];
			var opts = options.split("_");
			sTaskSubject = " >> " + target + "<br>" + getTroopsInfo(opts) ;
			break;
		case "9": // Send troops through Gold-Club
			sTask = getOption('FARMLIST','');
			var opts = options.split("_");
			sTaskSubject = " >> " + target + " ";
			break;
		default:
			break;
	}

	printMsg(getVillageName(iVillageId,true) + '<br/>' + aLangStrings[10] + '<br/>' +sTask+ ' ' +sTaskSubject);
	if(!oIntervalReference) {
		oIntervalReference = window.setInterval(checkSetTasks, CHECK_TASKS_EVERY*1000);  //start checking if there is any task to trigger
		_log(2, "Started checking for the set tasks...");
	}
	ttqUpdatePanel(data);

	_log(3, "End setTask()");
}
// *** End Timer Form Code ***
