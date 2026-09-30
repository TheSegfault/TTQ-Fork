
// *** Begin Helper Functions ***

function onlySpies(aTroops) { // @return true if there are only spies, false if there is anything else or no spies.
	_log(3,"Begin onlySpies()");
	var iScoutUnit = (iMyRace == 7) ? 2 : ((iMyRace == 2 || iMyRace == 6) ? 3 : 4);
	if(aTroops[iScoutUnit] < 1) { //no spies
		_log(3, "No spies.");
		return false;
	}
	for(var i=1; i <= 11; ++i) {
		if(i != iScoutUnit && parseInt(aTroops[i]) > 0) { //at least one other troop
			_log(3, "Troops other than spies are present.");
			return false;
		}
	}
	_log(3, "This is a spying mission.");
	return true;
}

function switchActiveVillage(did) {
	_log(2, "Switching your village back to " +did);
	if ( Number.isInteger(did) && did > 0 ) get(fullName+"dorf1.php?newdid="+did, null, null);
}

// *** Display Helper Functions
function generateButton(title, callback){
	_log(3, "Begin generateButton()");
	var oBtn = document.createElement("span");
	oBtn.style.border="1px solid #71D000";
	oBtn.style.backgroundImage = "linear-gradient(to top,#ccd5cc,#ffffff)";
	oBtn.style.verticalAlign="middle";
	oBtn.style.margin="5px 5px";
	oBtn.style.borderRadius = "5px";
	oBtn.style.cursor="pointer";
	oBtn.style.padding="4px";
	oBtn.style.display="inline-block";
	oBtn.style.lineHeight="initial";
	oBtn.setAttribute("onMouseOver", "this.style.border='1px solid #808080';");
	oBtn.setAttribute("onMouseOut", "this.style.border='1px solid #71D000';");
	oBtn.setAttribute("onclick", "window.scroll(0, 0);");
	oBtn.innerHTML = "<span style='font-size: 8pt; margin: 5px; color: #808080'>"+title+"</span>";
	ttqAddEventListener(oBtn,"click", callback, false);
	_log(3, "End generateButton()");
	return oBtn;
}

function printMsg(sMsg,bError) {
	_log(3,"Begin printMsg()");
	var oDate = new Date();
	var sWhen = oDate.toLocaleString() + "\n";
	_log(1, sWhen + sMsg);
	var oOldMessage = $id("ttq_message");
	if(oOldMessage) {
		_log(3, "Removing the old message." +oOldMessage);
		oOldMessage.parentNode.removeChild(oOldMessage); 	// delete old message
	}
	// here we generate a link which closes the message //Use img tag directly
	var sLinkClose = "<img src='" +sCloseBtn+ "' alt='["+aLangStrings[56]+"]' title='"+aLangStrings[56]+"' id='ttq_close_btn' class='ttq_close_btn' onclick='document.body.removeChild(document.getElementById(\"ttq_message\"));' />";
	var sBgColor = (bError) ? "#FFB89F" : "#90FF8F";
	var oMsgBox = document.createElement("div");
	oMsgBox.innerHTML = "<div id='ttq_draghandle_msg' class='handle'>" + sLinkClose + sMsg + "</div>";
	oMsgBox.style.backgroundColor = sBgColor;
	var msgCoords = getOption("MSG_POSITION", "215px_215px");
	msgCoords = msgCoords.split("_");
	oMsgBox.style.top = msgCoords[0];
	oMsgBox.style.left = msgCoords[1];
	oMsgBox.id = "ttq_message";
	document.body.appendChild(oMsgBox);
	makeDraggable($id('ttq_draghandle_msg'));
	_log(3, "End printMsg()");
}

function ttqRandomNumber() {
	var aleat = Math.random() * (MAX_REFRESH_MINUTES-MIN_REFRESH_MINUTES);
	aleat = Math.round(aleat);
	return parseInt(MIN_REFRESH_MINUTES) + aleat;
}

function ttqAddEventListener (obj, str, handler, boole) {
	if ( obj && str && handler ) {
		theListeners.push([obj, str, handler, boole]);
		obj.addEventListener(str, handler, boole);
	}
}

function ttqAniShadePanelYellowToRed(tNode) {  //This all assumes that CHECK_TASKS_EVERY is set to the default 10 seconds.
	var tGreen = 255;
	var tBlue = 255;
	return function () {
		if ( tBlue > 135 ) tBlue -= 24;
		else tGreen -= 24;
		tNode.style.backgroundColor = "rgb(255,"+tGreen+","+tBlue+")";
	}
}

function ttqAniShadePanelGreen(tNode) {  //This all assumes that CHECK_TASKS_EVERY is set to the default 10 seconds.
	var tRed = 255;
	var tBlue = 255;
	var tStyle = tNode.style;
	return function () {
		tBlue -= 5;
		tRed -= 5;
		tStyle.backgroundColor = "rgb("+tRed+",255,"+tBlue+")";
	}
}

function ttqUpdatePanel(aTasks,tTime){
	if ( oAnimateTimerIR  ) {
		window.clearInterval(oAnimateTimerIR);
		oAnimateTimerIR = null;
	}
	var ttqTimer = $id("ttqReloadTimer");
	if ( ttqTimer ) {
		tA = Math.floor(Date.now()/1000);
		vName = getOption('RELOAD_AT', 0, "integer") - tA; //Recycled Variables
		vName = Math.floor(vName/60)+"m"+vName%60 + "s";
		ttqTimer.innerHTML = vName;
		if ( !isTroopsLoaded || !isTTQLoaded ) return; // Its grey while something (getTroopNames) is running, so we let it stay grey
		ttqTimer = ttqTimer.parentNode.parentNode;
		if ( !aTasks ) aTasks = getVariable("TTQ_TASKS", "");
		if ( !tTime ) tTime = tA;
		tX = 0;
		tY = 0;
		if ( aTasks != "" ) {
			tA = aTasks.split("|");
			for ( tY = tA.length ; tX < tY ; ++tX ) {
				vName = parseInt(tA[tX].split(",")[1]);
				if ( vName <= tTime+60 ) {
					if ( vName <= tTime+CHECK_TASKS_EVERY) {
						if ( vName <= tTime ) {
							ttqTimer.style.backgroundColor ="#EE8787";
						} else {
							ttqTimer.style.backgroundColor ="#FFFF00";
							oAnimateTimerIR = window.setInterval(ttqAniShadePanelYellowToRed(ttqTimer), CHECK_TASKS_EVERY*99);
						}
					} else {
						ttqTimer.style.backgroundColor ="#BBFFBB";
						oAnimateTimerIR = window.setInterval(ttqAniShadePanelGreen(ttqTimer), CHECK_TASKS_EVERY*99);
					}
					tX = tY;
				}
			}
		}
		if ( tX != tY+1 ) ttqTimer.style.backgroundColor ="#FFFFFF";
	}
}

// *** End Helper Functions ***
