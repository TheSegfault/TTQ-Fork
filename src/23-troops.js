
// *** Begin Send Troops Functions ***
function createAttackLinks() {
	_log(3,"Begin createAttackLinks()");
	var xpathResult = xpath("id('content')//input[@type='text']");
	if(xpathResult.snapshotLength < 1) {
		_log(3, "We are not creating the 'Send later' button here.");
		return false;
	}
	if ($id("combatSimulator")) {
		_log(3, "Combat simulator page. We are not creating the 'Send later' button here.");
		return false;
	}

	// create the button //Add the new button after the original
	if ( /[&?]from=\d+/.test(location.search)) { //At Send Troops Back screen
		var SndLtrBtn = generateButton(aLangStrings[16], scheduleSendBack);
		var oOkBtn = $id('checksum');
		oOkBtn.after(SndLtrBtn);
	} else {
		//create textbox for hero if it's not present
		var heroBox = document.getElementsByClassName("line-last column-last");
		if( ( heroBox.length > 0 ) && heroBox[0].firstElementChild == null ) { //no hero textbox - make one
			heroBox[0].innerHTML = '<img class="unit uhero" src="/img/x.gif" title="'+aLangTroops[10]+'" alt="'+aLangTroops[10]+'" />'
				+ '<input type="text" inputmode="numeric" class="text" name="troop[t11]" value="" />'
				+ '&nbsp;/&nbsp;<a href="#" onclick="jQuery(\'table#troops\').find(\'input[name=\\\'troop[t11]\\\']\').val(1); return false">1 ('+aLangStrings[33]+')</a>';
		}
		var SndLtrBtn = generateButton(aLangStrings[16], scheduleAttack);
		var oOkBtn = $id('ok');
		if (oOkBtn) { oOkBtn.after(SndLtrBtn); } else { _log(3, "No Send button found."); }
	}
	_log(3, "End createAttackLinks()");
}

function scheduleSendBack(e) {
	_log(2,"ScheduleSendBack> Begin.");
	var aTroops = new Array();
	aTroops[0] = urlParams;
	var xpathRes = xpath("//table//td/input[@type='text']");
	var bNoTroops = true;
	var c = 0;
	var aThisInput, iTroopId;
	if(xpathRes.snapshotLength > 0) {
		for (var i = 1; i < 12; ++i) {
			aThisInput = xpathRes.snapshotItem(c);
			if ( aThisInput != null ) iTroopId = parseInt(aThisInput.name.split("[t")[1].split("]")[0]);
			else iTroopId = 0;
			if ( iTroopId == i ) {
				aTroops[i] = (aThisInput.value != '') ? aThisInput.value : 0;
				++c;
			} else aTroops[i] = 0;
			if(aThisInput != null && aThisInput.value) {bNoTroops = false;}  //at least 1 troop has to be sent
		}
	} else {
		_log(1, "No info about troops found. Unable to schedule the send back/withdraw.");
		printMsg(aLangStrings[17] , true);
		return false;
	}
	if(bNoTroops) {
		_log(1, "No troops were selected. Unable to schedule the send back/withdraw.");
		printMsg(aLangStrings[17] , true);
		return false;
	}

	displayTimerForm(8, document.getElementsByClassName("role")[0].firstChild.innerHTML.onlyText() , aTroops);
	_log(3,"ScheduleSendBack> End.");
}

function sendbackwithdraw (aTask) {
	_log(2,"sendbackwithdraw> Begin. aTask = " + aTask);
	printMsg(aLangStrings[6] + " > 1<br><br>" + getTaskDetails(aTask));
	var aTroops = aTask[3].split("_");
	get(fullName+"build.php" + aTroops[0], sendbackwithdraw2, aTask);
	_log(3,"sendbackwithdraw> End.");
}

function sendbackwithdraw2 (httpRequest,aTask) {
	_log(2,"sendbackwithdraw2> Begin. aTask = " + aTask);
	printMsg(aLangStrings[6] + " > 1 > 2<br><br>" + getTaskDetails(aTask));

	if (httpRequest.status == 200 && httpRequest.responseText) {
		var parser = new DOMParser();
		var holder = parser.parseFromString(httpRequest.responseText, "text/html");
		var err = holder.getElementsByClassName("error");
		if ( err.length > 0 ) {
			err = "["+err[0].innerHTML+"]";
			_log(1, "attack2> I could not send the troops. Reason: " + err);
			printMsg(sFromName + aLangStrings[19] + " >> " +sPlaceName + " " + aLangStrings[69] + " (" + aLangStrings[13] + ": "+err+")", true);
			addToHistory(aTask, false, aLangStrings[13] + ": "+err);
			return false;
		}
		var aTroops = aTask[3].split("_");
		var sParams = "action=troopsSend";
		for ( var i = 1 ; i < 12 ; ++i ) if ( parseInt(aTroops[i]) > 0 ) sParams += "&troop[t"+i+"]="+aTroops[i];
		var okBtn = holder.getElementsByName('checksum');
		var checkSum = okBtn[0].value;
		sParams += "&checksum=" + checkSum;
		post(fullName+"build.php" + aTroops[0], sParams, handleSendBackRequestConfirmation, aTask);
	}
	_log(3,"sendbackwithdraw2> End.");
}

function handleSendBackRequestConfirmation (httpRequest, options) {
	if (httpRequest.readyState == 4 ){
		printMsg(aLangStrings[6] + " > 1 > 2<br><br>" + getTaskDetails(options));
		if ( httpRequest.status == 200 && httpRequest.responseText ) {
			var holder = document.createElement('div');
			holder.innerHTML = httpRequest.responseText;
			if ( holder.getElementsByClassName('gid16').length > 0 ) {  //if its the rally point, it should have been successful.
				_log(1, "I think those troops were sent back/withdrawn.");
				printMsg(aLangStrings[78]+" "+options[2]);
				addToHistory(options, true);
			} else {
				_log(1, "I'm not so sure those troops were sent back/withdrawn.");
				printMsg(aLangStrings[79]+" "+options[2]+" ("+aLangStrings[75] + ", " +aLangStrings[74] + " " + aLangStrings[11]+")",true);
				addToHistory(options, false, aLangStrings[75] + ", " +aLangStrings[74] + " " + aLangStrings[11]);
			}
			if( getActiveVillage(holder) != currentActiveVillage ) switchActiveVillage(currentActiveVillage);
			return;
		}
		_log(1, "Request to Send Back/Withdraw was sent, however, I could not confirm it. Bad response from server when confirming. (Confirmation Failed, Server: Page Failed)");
		printMsg(aLangStrings[79]+" "+options[2] + " ("+aLangStrings[75] + ", " + aLangStrings[74] + " " + aLangStrings[46], true);
		addToHistory(aTask, false, aLangStrings[75] + ", " +aLangStrings[74] + " " + aLangStrings[46]);
	}
}

function scheduleAttack(e) {
	_log(3,"scheduleAttack> Begin.");

	var iVillageId = crtPath.match(/[&?]z=(\d+)/);  // target village
	if(iVillageId != null) {
		iVillageId = iVillageId[1];
	} else { //try to get the coordinates
		var sX = document.getElementsByName('x');
		var sY = document.getElementsByName('y');
		iX = sX[0].value;
		iY = sY[0].value;
		if(iX != '' && iY != '') iVillageId = coordsXYToZ(iX, iY);
	}
	if(iVillageId == null) {
		_log(2, "Target village ID not found.");
		printMsg(aLangStrings[34], true);
		return false;
	}//            0		1	2	3	4	5	6	7	8	9	10		11		12		13		14		15		16
			//     type, 	t1,	t2,	t3,	t4,	t5,	t6,	t7,	t8,	t9,	t10,	t11(h),	traps,	gid,	spy,	kata1,	kata2
	var aTroops = [0,		0,	0,	0,	0,	0,	0,	0,	0,	0,	0,		0,		0,		-1,		-1,		-1,		-1,];
	var iAttackType = null;
	var xpathRes = xpath("id('content')//input[@type='radio']");
	for (var i = 0; i < xpathRes.snapshotLength; ++i) if (xpathRes.snapshotItem(i).checked) iAttackType = xpathRes.snapshotItem(i).value;
	if(iAttackType != null) {aTroops[0] = iAttackType;}
	else {
		_log(2, "The type of attack was not determined again. Unable to schedule the attack.");
		printMsg("Attack type not determined",true);
		return false;
	}

	xpathRes = xpath("//*[@id='troops']//td/input");
	var bNoTroops = true;
	if(xpathRes.snapshotLength > 10) {
		for (var i = 0; i < 11 ; ++i) {
			var aThisInput = xpathRes.snapshotItem(i);
			if (aThisInput.name.indexOf('troop[t') !== -1) {
				var iTroopId = parseInt(aThisInput.name.match(/troop\[t(\d+)\]/)[1]);
			}
			if ( isNaN(iTroopId) || iTroopId < 1 || iTroopId > 11 ) continue;
			var tV = parseInt(aThisInput.value);
			if ( isNaN(tV) || tV < 1 ) {
				aTroops[iTroopId] = 0;
			} else {
				aTroops[iTroopId] = tV;
				bNoTroops = false;  //at least 1 troop has to be sent
			}
		}
	} else {
		_log(2, "No info about troops found. Unable to schedule the attack.");
		printMsg("No info about troops found. Unable to schedule the attack.",true);
		return false;
	}

	if(bNoTroops) {
		_log(2, "No troops were selected. Unable to schedule the attack.");
		printMsg(aLangStrings[17] , true);
		return false;
	}

	var xpathRes = $gn("redeployHero");
	aTroops[17] = xpathRes.length > 0 && xpathRes[0].checked == true ? 1: 0;

	// Good, we have at least 1 troop. Display the form
	displayTimerForm(2, iVillageId, aTroops);
	_log(3, "End scheduleAttack()");
}

function attack(aTask) {
	_log(1,"Begin attack("+aTask+")");
	printMsg(aLangStrings[6] + " > 1<br><br>" + getTaskDetails(aTask));
	if(aTask[5] != 'null') {  //multiple villages
		//we need to switch village (while at the same time, setting the target destination)
		get(fullName+"build.php?gid=16&tt=2&newdid=" + aTask[5] + "&targetMapId=" + aTask[2], attack2, aTask);
	} else {  //only 1 village. Perform attack immediately
		post(fullName+"build.php?gid=16&tt=2", "targetMapId=" + aTask[2], attack2, aTask);
		_log(2, "The attack was requested.");
	}
	_log(1, "End attack("+aTask+")");
}

function attack2(httpRequest,aTask) {
	if (httpRequest.readyState == 4) {
		printMsg(aLangStrings[6] + " > 1 > 2<br><br>" + getTaskDetails(aTask));
		var oldVID = parseInt(aTask[5]);
		if ( isNaN(oldVID) ) oldVID = -2;
		var sPlaceName = '<span id="ttq_placename_'+aTask[2]+'">'+getVillageNameZ(aTask[2])+'</span><br>' + getTroopsInfo(aTask[3].split("_"));
		var sFromName = '<span class="ttq_village_name" style="display:block;" id="ttq_placename_'+oldVID+'">'+getVillageName(oldVID)+':</span><br>';
		if (httpRequest.status == 200 && httpRequest.responseText) {
			var parser = new DOMParser();
			var holder = parser.parseFromString(httpRequest.responseText, "text/html");
			var bld = holder.getElementById('build');
			var aTroops = holder.getElementsByClassName("error");
			if ( aTroops.length > 0 ) {
				aTroops = "["+aTroops[0].innerHTML+"]";
				_log(1, "attack2> I could not send the troops. Reason: " + aTroops);
				printMsg(sFromName + aLangStrings[19] + " >> " +sPlaceName + " " + aLangStrings[69] + " (" + aLangStrings[13] + ": "+aTroops+")", true); // Your building can't be built. Because there was no button and a reason provided.
				addToHistory(aTask, false, aLangStrings[13] + ": "+aTroops);
				return false;
			}

			var reqVID = getActiveVillage(holder,holder);

			aTroops = new Array();  //extract troops numbers and attack type
			var needC = true;
			aTroops = aTask[3].split("_");
			var tInputs = bld.getElementsByTagName('input');
			var sParams = '';
			var t,k = tInputs.length;
			if ( oldVID == reqVID && bld.getElementsByClassName("a2b").length == 1 && k > 15 ) {
				for (var q = 0 ; q < k ; ++q ) {
					t = tInputs[q].name;
					if (t.indexOf('troop[t') !== -1) {
						if (tInputs[q].disabled == true) continue;
						var troopsNr = aTroops[parseInt(t.match(/troop\[t(\d+)\]/)[1])];
						if (troopsNr == 0 ) {
							sParams += t + "=&";
						} else {
							sParams += t + "=" + troopsNr + "&";
						}
					} else if ( t == "eventType" ) {
						if ( needC ) {
							sParams += "eventType=" + aTroops[0] + "&";
							needC = false;
						}
					} else if ( t == "redeployHero" ) {
						if( aTroops[17] == 1 ) sParams += "&redeployHero=" + tInputs[q].value + "&";
					} else {
						sParams += t + "=" + tInputs[q].value + "&";
					}
				}
				sParams += "ok=ok";
				post(fullName+'build.php?gid=16&tt=2', sParams, attack3, aTask);
				return;
			}
			if ( reqVID != currentActiveVillage ) switchActiveVillage ( currentActiveVillage );
			_log(1, "Your attack could not be sent. It seems I am at the wrong screen. (Server: Redirected 1)");
			printMsg(sFromName + aLangStrings[19] + " >> " +sPlaceName + " " + aLangStrings[9] + " (" +aLangStrings[74]+" "+aLangStrings[11]+" 1)", true);
			addToHistory(aTask, false, aLangStrings[74]+" "+aLangStrings[11]+" 1");
			return;
		}
		switchActiveVillage(currentActiveVillage);
		_log(1, "Your attack could not be sent. Bad response from server when sending request. (Server: Page Failed 1)");
		printMsg(sFromName + aLangStrings[19] + " >> " +sPlaceName + " " + aLangStrings[73] + " ("+aLangStrings[74] + " " + aLangStrings[46]+" 1)", true);
		addToHistory(aTask, false, aLangStrings[74] + " " + aLangStrings[46]+" 1");
	}
}

function attack3(httpRequest,aTask){
	if (httpRequest.readyState == 4) {
		printMsg(aLangStrings[6] + " > 1 > 2 > 3<br><br>" + getTaskDetails(aTask));
		var oldVID = parseInt(aTask[5]);
		if ( isNaN(oldVID) ) oldVID = -2;
		var sPlaceName = '<span id="ttq_placename_'+aTask[2]+'">'+getVillageNameZ(aTask[2])+'</span><br>' + getTroopsInfo(aTask[3].split("_"));
		var sFromName = '<span class="ttq_village_name" style="display:block;" id="ttq_placename_'+oldVID+'">'+getVillageName(oldVID)+':</span><br>';
		if (httpRequest.status == 200 && httpRequest.responseText) { // ok
			var parser = new DOMParser();
			var holder = parser.parseFromString(httpRequest.responseText, "text/html");
			var bld = holder.getElementById('build');
			var reqVID = getActiveVillage(holder,holder);

			var q = bld.getElementsByClassName("error");
			if ( q.length > 0 ) {
				if ( reqVID != currentActiveVillage ) switchActiveVillage(currentActiveVillage);
				q = "["+q[0].innerHTML+"]";
				_log(1, "attack3> I could not send the troops. Reason: " + q);
				printMsg(sFromName + aLangStrings[19] + " >> " +sPlaceName + " " + aLangStrings[69] + " (" + aLangStrings[13] + ": "+q+")", true); // Your building can't be built. Because there was no button and a reason provided.
				addToHistory(aTask, false, aLangStrings[13] + ": "+q);
				return false;
			}

			var tInputs = bld.getElementsByTagName('input');
			var k = tInputs.length;
			if ( reqVID == oldVID && bld.getElementsByClassName("a2b").length == 1 && k > 15 ) {
				var aTroops = new Array();  //extract troops numbers and attack type
				aTroops = aTask[3].split("_");
				var sParams = '';
				var tSelect = bld.getElementsByTagName('select');
				var okBtn = holder.getElementsByClassName('rallyPointConfirm');
				var sOnclick = okBtn[0].getAttribute('onclick');
	       		var checkSum = sOnclick.split(';')[1].split('value = \'')[1].split('\'')[0];
				for (q = 0 ; q < tSelect.length ; ++q) {
					t = tSelect[q].name;
					if ( /kata\W/.test(t) ) {
						if ( aTroops[15] > -1 ) sParams += t + "=" + aTroops[15] + "&";
						else sParams += t + "=" + tSelect[q].value + "&"; //default, dont change anything... random?
					} else if ( /kata2/.test(t) ) {
						if ( aTroops[16] > -1 ) sParams += t + "=" + aTroops[16] + "&";
						else sParams += t + "=" + tSelect[q].value + "&";  //default, dont change anything... random?
					}
				}
				for (q = 0 ; q < k ; ++q) {
					t = tInputs[q].name;
					if ( /spy/.test(t) ){
						if ( aTroops[14] > -1 ) sParams += t + "=" + aTroops[14] + "&";
						else sParams += "spy=1&";  //"Spy troops  and resources" by default
						++q;
					} else if (t=='checksum') sParams += "checksum=" + checkSum + "&";
					else sParams += t + "=" + tInputs[q].value + "&";
				}
				if (sParams.charAt(sParams.length - 1) == '&') { sParams = sParams.slice(0, -1); }
				post(fullName+'build.php?gid=16&tt=2', sParams, handleRequestAttack, aTask);
				return;
			}
			if ( reqVID != currentActiveVillage ) switchActiveVillage(currentActiveVillage);
			_log(1, "Your attack could not be sent. It seems I am at the wrong screen. (Server: Redirected 2)");
			printMsg(sFromName + aLangStrings[19] + " >> " +sPlaceName + " " + aLangStrings[9] + " (" +aLangStrings[74]+" "+aLangStrings[11]+" 2)", true);
			addToHistory(aTask, false, aLangStrings[74]+" "+aLangStrings[11]+" 2");
			return;
		}
		switchActiveVillage(currentActiveVillage);
		_log(1, "Your attack could not be sent. Bad response from server when sending request. (Server: Page Failed 2)");
		printMsg(sFromName + aLangStrings[19] + " >> " +sPlaceName + " " + aLangStrings[73] + " ("+aLangStrings[74] + " " + aLangStrings[46]+" 2)", true);
		addToHistory(aTask, false, aLangStrings[74] + " " + aLangStrings[46]+" 2");
	}
}

function handleRequestAttack(httpRequest, aTask) {
	if (httpRequest.readyState == 4) {
		var oldVID = parseInt(aTask[5]);
		if ( isNaN(oldVID) ) oldVID = -2;

		var sPlaceName = '<span id="ttq_placename_'+aTask[2]+'">'+getVillageNameZ(aTask[2])+'</span><br>' + getTroopsInfo(aTask[3].split("_"));
		var sFromName = '<span class="ttq_village_name" style="display:block;" id="ttq_placename_'+oldVID+'">'+getVillageName(oldVID)+':</span><br>';
		if (httpRequest.status == 200 && httpRequest.responseText) { // ok
			var holder = document.createElement('div');
			holder.innerHTML = httpRequest.responseText;
			var re = holder.getElementsByClassName("error");
			if ( re.length > 0 ) {
				re = "["+re[0].innerHTML+"]";
				_log(1, "handleRequestAttack> I could not send the troops. Reason: " + re);
				printMsg(sFromName + aLangStrings[19] + " >> " +sPlaceName + " " + aLangStrings[69] + " (" + aLangStrings[13] + ": "+re+")", true); // Your building can't be built. Because there was no button and a reason provided.
				addToHistory(aTask, false, aLangStrings[13] + ": "+re);
				return false;
			}

			var reqVID = getActiveVillage(holder);
			if ( reqVID != currentActiveVillage ) switchActiveVillage(currentActiveVillage);
			if ( oldVID == reqVID && holder.getElementsByClassName("gid16").length == 1 ) {
				re = new RegExp('karte\\.php\\?d=' + aTask[2], 'i');
				if(re.test(httpRequest.responseText)) {
					_log(1, "It seems your attack was successfully sent.");
					printMsg(sFromName + aLangStrings[18] + " >> " + sPlaceName );
					addToHistory(aTask, true);
				} else {
					_log(1, "Your attack could not be sent. Confirmation failed.");
					printMsg(sFromName + aLangStrings[19] + " >> " +sPlaceName+ " (" + aLangStrings[75]+")", true);
					addToHistory(aTask, false, aLangStrings[75]);
				}
			} else {
				_log(1, "Attack request was sent, however, I could not confirm. It seems we have been redirected. (Confirmation Failed, Server: Redirected 3)");
				printMsg(sFromName + aLangStrings[19] + " >> " +sPlaceName + " " + aLangStrings[73] + " " + aLangStrings[50] + " ("+aLangStrings[75] + ", " +aLangStrings[74] + " " + aLangStrings[11]+" 3)", true);
				addToHistory(aTask, false, aLangStrings[75] + ", " +aLangStrings[74] + " " + aLangStrings[11]+" 3");
			}
			return;
		}
		switchActiveVillage(currentActiveVillage);
		_log(1, "Attack request was sent, however, I could not confirm. Bad response from server when trying to confirm. (Confirmation Failed, Server: Page Failed 3)");
		printMsg(sFromName + aLangStrings[19] + " >> " +sPlaceName + " " + aLangStrings[73] + " " + aLangStrings[50] + " ("+aLangStrings[75] + ", " +aLangStrings[74] + " " + aLangStrings[46]+" 3)", true);
		addToHistory(aTask, false, aLangStrings[75] + ", " +aLangStrings[74] + " " + aLangStrings[46]+" 3");
	}
	_log(3, "End handleRequestAttack("+httpRequest+", "+aTask+")");
}
// *** End Send Troops Functions ***
// farm from gold-club
// writed by Serj_LV
// Farm List "Send later" supports recurring schedules via the timer form.
// Recurrence is expanded into normal TTQ tasks so it survives page reloads.
// Each occurrence is independently timestamped when the series is created.
function createGoldClubBtn () {
	_log(3,"Begin createGoldClubBtn()");
	var arrList = $gc('farmListWrapper');
	for (var i = 0; i < arrList.length; i++) {
		var SndLtrBtn = generateButton(aLangStrings[16], scheduleSendClub);
		arrList[i].parentNode.insertBefore(SndLtrBtn, arrList[i].parentNode.firstChild);
	}
	_log(3, "End createGoldClubBtn()");
}

function createGoldClubBtnAll () {
	_log(3,"Begin createGoldClubBtnAll()");
	var arrList = $gc('startAllFarmLists');
	if (arrList.length > 0) {
		arrList[0].parentNode.parentNode.style.marginTop = "130px";
		var SndLtrBtn = generateButton(aLangStrings[16], scheduleSendClubAll);
		arrList[0].parentNode.appendChild(document.createElement("div"));
		arrList[0].parentNode.appendChild(SndLtrBtn);
	}
	_log(3, "End createGoldClubBtnAll()");
}

function scheduleSendClub () {
	_log(3,"Begin scheduleSendClub()");
	var list = this.parentNode;
	listNameClass = list.querySelectorAll('[data-list]');
	if (listNameClass.length > 0) {
		var listName = $gc("farmListName",list)[0].textContent.replace('|','&#124;').replace(',','&#44;').trim();
		var listID = listNameClass[0].getAttribute('data-list');
	}
	displayTimerForm(9,listName,listID);
	_log(3, "End scheduleSendClub()");
}

function scheduleSendClubAll () {
	_log(3,"Begin scheduleSendClubAll()");
	var lists = $id('rallyPointFarmList');
	listNameClass = lists.querySelectorAll('[data-list]');
	var listIDs = '';
	for (var i = 0; i < listNameClass.length; i++) {
		var listName = $gc("startAllFarmLists")[0].textContent.replace('|','&#124;').replace(',','&#44;').trim();
		listIDs += listNameClass[i].getAttribute('data-list') + ";";
	}
	displayTimerForm(9,listName,listIDs);
	_log(3, "End scheduleSendClubAll()");
}

function sendGoldClub (aTask) {
	_log(1,"Begin attack from gold-club ("+aTask+")");
	printMsg(aLangStrings[6] + " > 1<br><br>" + getTaskDetails(aTask));
	//post(fullName+'api/v1/raid-list/slots', sParams, sendGoldClub1, aTask);
	get(fullName+"build.php?id=39&gid=16&tt=99", sendGoldClub2, aTask);
	_log(2, "The attack was requested.");
	_log(1, "End attack from gold-club ("+aTask+")");
}
function getActiveVillage (el,adoc) {
	var reqVID = xpath('//div[@id="sidebarBoxVillageList"]//a[@class="active"]',el,true,adoc);
	if ( reqVID ) {
		reqVID = parseInt(reqVID.href.split("=")[1]);
		if ( isNaN(reqVID) ) reqVID = -1;
	} else { reqVID = -1; }
	return reqVID;
}
function sendGoldClub2(httpRequest,aTask) {
	if (httpRequest.readyState == 4) {
		printMsg(aLangStrings[6] + " > 1 > 2<br><br>" + getTaskDetails(aTask));
		if (httpRequest.status == 200 && httpRequest.responseText) {
			_log(3,"Preparing sending farm list...");
			var parser = new DOMParser();
			var holder = parser.parseFromString(httpRequest.responseText, "text/html");
			var build = holder.getElementsByClassName('gid16');
			var scripts = build[0].getElementsByTagName('script');
			_log(3,"Script content: "+scripts[0].textContent);
			//var data = JSON.parse(scripts[0].textContent.match(/viewData:.*}} /)[0].replace('viewData','{ "viewData"').replace(new RegExp('}} $'), '}}}'));
			var data = JSON.parse(scripts[0].textContent.match(/viewData:.*}}}/)[0].replace('viewData','{ "viewData"'));
			_log(3,"Script content: "+data);
			var farmLists = data.viewData.ownPlayer.farmLists;
			var sParams;
			aTask[3] = aTask[3].replace(/;$/, "");
			var listIDs = aTask[3].split(';');
			for (var k=0; k<listIDs.length; k++) {
				for (var i=0; i<farmLists.length; i++) {
					if (farmLists[i].id == listIDs[k]) {
						var targets = [];
						for (var j=0; j<farmLists[i].slotsStates.length; j++) {
							var village = farmLists[i].slotsStates[j];
							if (village.isActive == true) { //farmlists with casualties are automatically inactivated
								targets.push(village.id);
							}
						}
						if (listIDs.length == 1) {
							sParams = '{"action":"farmList","lists":[{"id":'+listIDs[k]+',"targets":'+JSON.stringify(targets)+'}]}';
						} else{
							if (k==0) {
								sParams = '{"action":"farmList","lists":[{"id":'+listIDs[k]+',"targets":'+JSON.stringify(targets)+'}], "startedAll": true}';
							} else {
								sParams = '{"action":"farmList","lists":[{"id":'+listIDs[k]+',"targets":'+JSON.stringify(targets)+'}], "triggeredBySendAll": true}';
							}
						}
						_log(3,"parameters: "+sParams);
						post(fullName+'api/v1/farm-list/send', sParams, sendGoldClubConfirmation, aTask);
						break;
					}
				}
			}
			return;
		}
		_log(1, "Your attack could not be sent. Bad response from server when sending request. (Server: Page Failed 1)");
		printMsg(aTask, false, aLangStrings[74] + " " + aLangStrings[46]+" 1", true);
		addToHistory(aTask, false, aLangStrings[74] + " " + aLangStrings[46]+" 1");
	}
}
function sendGoldClubConfirmation (httpRequest, aTask) {
		if (httpRequest.readyState == 4 ){
		printMsg(aLangStrings[6] + " > 1 > 2<br><br>" + getTaskDetails(aTask));
		if ( httpRequest.status == 200 && httpRequest.responseText ) {
			var data = JSON.parse(httpRequest.responseText);
			if ( !data.lists[0].error ) {
				_log(1, "I think those troops were sent.");
				printMsg(aLangStrings[18]+", "+aTask[2]);
				addToHistory(aTask, true);
			} else {
				_log(1, "I'm not so sure those troops were sent. Confirmation failed. " + data.lists[0].error);
				printMsg(aLangStrings[19] + " >> " +aTask[2]+ " (" + aLangStrings[75]+")" + data.lists[0].error, true);
				addToHistory(aTask, false, aLangStrings[75]);
			}
			return;
		}
		_log(1, "Farm request was sent, however, I could not confirm. Bad response from server when trying to confirm. (Confirmation Failed, Server: Page Failed 3)");
		printMsg(aLangStrings[19]+" "+aTask[2] + " ("+aLangStrings[75] + ", " + aLangStrings[74] + " " + aLangStrings[46], true);
		addToHistory(aTask, false, aLangStrings[75] + ", " +aLangStrings[74] + " " + aLangStrings[46]);
	}
}
// *** End Send Troops from gold-club ***
