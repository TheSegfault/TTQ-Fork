(function () {

function allInOneTTQ () {
notRunYet = false;
var sCurrentVersion = "2.1.8";

//find out if Server errors
var strTitle = document.title;
if ( (strTitle.indexOf("500 ") > -1 ) || (strTitle.indexOf("502 ") > -1 ) || (strTitle.indexOf("503 ") > -1 ) ) {
	window.setTimeout ( function() { window.location.reload(true); }, ttqRandomNumber()*100 );
}

// *** Begin Initialization and Globals ***
/*********************
 *		Settings
 *********************/
var LOG_LEVEL = -1; // 0 - quiet, 1 - nearly quite, 2 - verbose, 3 - detailed

// How often do we check for tasks to trigger in seconds. Default is 10 secs.
// Low value = high accuracy in triggering tasks. To make your browser unresponsive, set this to some ridiculously small number.
// You probably do not want to tamper with this setting. As many things in TTQ-T4 are assuming its set to 10 seconds.
var CHECK_TASKS_EVERY = 10;

// Never launch a task more than five minutes after its scheduled time.
var MAX_TASK_LATENESS_SECONDS = 5 * 60;

// Set this to the server's url to override automatic server detection (i.e. s1.travian.net)
// Don't set it if you're playing on multiple servers simultaneously!
var CURRENT_SERVER = "";

var MIN_REFRESH_MINUTES = 8;  // TTQ will refresh every 5 to 10 minutes
var MAX_REFRESH_MINUTES = 16;
var MAX_PLACE_NAMES = 100; // The number of non-player village names it keeps stored. It destroys the oldest when making space.
// RACE and HISTORY LENGTH are set with user accessible menus through the GreaseMonkey icon. As well as a way to fully reset TTQ.
/*********************
 *	End of Settings
 *********************/
//-- DO NOT TAMPER WITH THE BELOW
var starttime = Date.now();
var myPlayerID;

// Your local computer time MUST still be correct (both time and date!).
var bUseServerTime = false; //getOption("USE_SERVER_TIME", false, "boolean"); //IMPORTANT!!! If true, you must be using 24-hour format on your server, otherwise there WILL be errors.
var bLocked = false; // for locking the TTQ_TASKS variables
var ttqBusyTask = 0; // for detecting if TTQ is still busy processing a task
var oIntervalReference = null;
var oAnimateTimerIR = null;
var isTTQLoaded = false;
var isTroopsLoaded = false;
var iSiteId = -6;
var theListeners = [];

/*********************** common library ****************************/

//-- для начала должны быть перечислены все "библиотечные" функции. Чтобы небыло неопределенности привызове.

function $id(id) { return document.getElementById(id); } // getElementById Helper (shortcut) Function
function $gc(str,m) { return (typeof m == 'undefined' ? document:m).getElementsByClassName(str); }
Number.prototype.NaN0=function() { return isNaN(this) ? 0 : this; }
String.prototype.onlyText = function(){return this.replace(/([\u2000-\u20ff])/g,'').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/<[\s\S]+?>/g,'').replace(/(\u2212)/g,'-');}
function $gn(aID) {return (aID != '' ? document.getElementsByName(aID) : null);}
function $gt(str,m) { return (typeof m == 'undefined' ? document:m).getElementsByTagName(str); }
function $at(aElem, att) {if (att !== undefined) {for (var xi = 0; xi < att.length; xi++) {aElem.setAttribute(att[xi][0], att[xi][1]); if (att[xi][0].toUpperCase() == 'TITLE') aElem.setAttribute('alt', att[xi][1]);};};}//Acr111-addAttributes
//function $c(iHTML, att) { return $ee('TD',iHTML,att); }
//function $a(iHTML, att) { return $ee('A',iHTML,att); }
function $e(nElem, att) {var Elem = document.createElement(nElem); $at(Elem, att); return Elem;}
function $ee(nElem, oElem, att) {var Elem = $e(nElem,att); if (oElem !== undefined) if( typeof(oElem) == 'object' ) Elem.appendChild(oElem); else Elem.innerHTML = oElem; return Elem;}
function ajaxNDIV(aR) {var ad = $ee('div',aR.responseText,[['style','display:none;']]); return ad;}
//function $em(nElem, mElem, att) {var Elem = document.createElement(nElem); if (mElem !== undefined) for(var i = 0; i < mElem.length; i++) { if( typeof(mElem[i]) == 'object' ) Elem.appendChild(mElem[i]); else Elem.appendChild($t(mElem[i])); } $at(Elem, att); return Elem;}
//function $t(iHTML) {return document.createTextNode(iHTML);}

var linkVSwitch = [];
var villages_id = [];
var currentActiveVillage = -5;
var villages_count = 0;
var RB = new Object();
	RB.vList = [];
var crtPath = window.location.href;
var fullName = window.location.origin + "/";
var urlParams = window.location.search;

// Custom log function
function _log(level, msg) {
	if (level <= LOG_LEVEL) {
		var nL = $id('_LOG');
		if( ! nL ) {
			nL = $e('DIV',[['id','_LOG']]);
			document.body.appendChild( nL );
		}
		nL.innerHTML += msg + "<br>";
	}
}

function sortArray(arr1,arr2) { return arr1[0] - arr2[0]; }

function xpath(query, object, qt, adoc) { // Searches object (or document) for string/regex, returning a list of nodes that satisfy the string/regex
	if( !object ) object = document;
	if( !adoc ) adoc = document;
	var type = qt ? XPathResult.FIRST_ORDERED_NODE_TYPE: XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE;
	var ret = adoc.evaluate(query, object, null, type, null);
	return (qt ? ret.singleNodeValue : ret);
}

/**************************************************************************
 * @param options: [aTask, iCurrentActiveVillage] (optional)  OR sNewdid in case of finding the code for construction.
 ***************************************************************************/
function get(url, callback, options) {
	var httpRequest = new XMLHttpRequest();
	if(callback) {
		httpRequest.onreadystatechange = function() {
			if( httpRequest.readyState == 4 && (httpRequest.status == 200 || httpRequest.status == 304))
				callback(httpRequest, options);
		};
	}
	httpRequest.open("GET", url, true);
	httpRequest.send(null);
}

function post(url, data, callback, options) {
	var httpRequest = new XMLHttpRequest();
	httpRequest.open("POST", url, true);
	httpRequest.onreadystatechange = function() {
		callback(httpRequest, options)
	};
	if (url.includes("api/v1/farm-list")){
		httpRequest.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
	}
	else if (url.includes("api/v1/building/demolish")){
		httpRequest.setRequestHeader('Content-Type', 'application/json;');
	}
	else if (url.includes("api/v1/")){
		httpRequest.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
		httpRequest.setRequestHeader('X-Nonce', nonceValue);
	} else {
		data = encodeURI(data);
		httpRequest.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
	}
	httpRequest.send(data);
}

function put(url, data, callback, options) {
	var httpRequest = new XMLHttpRequest();
	httpRequest.open("PUT", url, true);
	httpRequest.onreadystatechange = function() {
		callback(httpRequest, options)
	};
	if (url.includes("api/v1/farm-list")){
		httpRequest.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
	}
	else if (url.includes("api/v1/")){
		httpRequest.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
	} else {
		data = encodeURI(data);
		httpRequest.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
	}
	httpRequest.send(data);
}

/**************************************************************************
 * Detects the server so we can figure out the language used
 * @returns the servers location
 **************************************************************************/
function detectLanguage() {
	var lang = TTQ_getValue(CURRENT_SERVER+"lang","0");
	if( lang != 0 ) return lang;
	try {
		lang = document.getElementsByName("content-language")[0].getAttribute("content").toLowerCase(); lang = lang.substring(3,5);
	} catch(e) { lang = "en"; }
	try {
		lang = $id("mainLayout").getAttribute("lang").toLowerCase(); lang = lang.substring(3,5);
	} catch(e) { lang = "en"; }
	return lang;
}

function detectMapSize () {
	var mapSize = getOption("MAP_SIZE", 0, "integer");
	if( mapSize !== 0 ) return mapSize;
	var aText = xpath('//script[contains(@src, "/Variables.js")]',document, true);
	if (aText) {
		get(aText.src, function(ajaxResp) {
			var ad = ajaxNDIV(ajaxResp);
			T4_Variables = JSON.parse(ad.textContent.match(/Travian.Variables\s*=\s*(.*});/)[1]);
			ad = null;
			mapSize = T4_Variables.Map.Size.width;
			setOption("MAP_SIZE", mapSize);
		}, null);
		return 0;
	}
}

function processSortedTaskList(element) { $id("ttq_tasklist").appendChild(element[1]); }
function processSortedHistory(element) { $id("ttq_history").appendChild(element[1]); }
// *** trim functions
function trim(str) {
	var	str = str.replace(/^\s\s*/, ''),
		ws = /\s/,
		i = str.length;
	while (ws.test(str.charAt(--i)));
	return str.slice(0, i + 1);
}

// Coordinate Conversion Helper Functions
function coordsXYToZ(x, y) {
	return (1 + (parseInt(x) + mapRadius) + (MapSize * Math.abs(parseInt(y) - mapRadius)));
}

function coordZToXY(z) {
	z = parseInt(z);
	var x = ((z - 1) % MapSize) - mapRadius;
	var y = mapRadius - (parseInt(((z - 1) / MapSize)));
	return [x,y];
}

function getVidFromCoords ( txt ) {
	var xy = new Array;
	if( /coordinateX/.test(txt) ) {
		txt = txt.replace(/([\u2000-\u20ff])/g,'');
		txt = txt.replace(/(\u2212)/g,'-');
		xy[1] = txt.match(/coordinateX.+?(-?\d{1,3})/)[1];
		xy[2] = txt.match(/coordinateY.+?(-?\d{1,3})/)[1];
	} else
		xy = txt.match(/\((-?\d{1,3})\D+?(-?\d{1,3})\)/);
	return xy ? coordsXYToZ(xy[1],xy[2]): -1;
}

// ** Begin Date/Time Block ***
/**************************************************************************
 * @param {int}
 * @return {str} Formatted date.
 ***************************************************************************/
function formatDate(yyyy, mm, dd, hh, min, sec) {
	if(dd < 10) {dd = "0" + dd;}
	if(mm < 10) {mm = "0" + mm;}
	if(min < 10) {min = "0" + min;}
	if(sec < 10) {sec = "0" + sec;}
	return yyyy+"/"+mm+"/"+dd+" "+hh+":"+min+":"+sec;
}
// *** End Date/Time Block ***

/**************************************************************************
 *  This only trims the value read from variables. Variable itself is trimmed when new event is entered into history.
 *  It trimms the value down to maxlength. And returns the array, you can join it if ya need.
 ***************************************************************************/
function ttqTrimData(data, maxlength, asString, token) {
	if ( data.length < 1 || maxlength < 1 || data == '' ) {
		if ( asString ) return "";
		else return new Array();
	}
	if ( typeof(token) == "undefined"  || !token ) var token = "|";
	data = data.split(token+"");
	var excessTasks = data.length - maxlength;
	if(excessTasks >  0) data.splice(0, excessTasks);
	if ( asString ) return data.join(token+"");
	else return data;
}

function TTQ_addStyle(css) {
	var head = document.getElementsByTagName('head')[0];
	if (head) {
		var style = $e("style");
		style.type = "text/css";
		style.appendChild(document.createTextNode(css));
		head.appendChild(style);
	}
}

function TTQ_getValue ( key, defaultValue ) {
	var value = window.localStorage.getItem(key);
	if( value == null ) value = defaultValue;
	return value;
}
function TTQ_setValue( key, value ) {
	window.localStorage.setItem( key, value );
}
function TTQ_deleteValue( key ) {
	window.localStorage.removeItem( key );
}

// *** Begin Storage Block ***
/**************************************************************************
 * Retrieves the value corresponding do the given variable name and the current Travian server
 * Use greasemonkey's built-in system instead of variables to permantenly store and read settings
 * @param name The name of the variable
 * @param defaultValue  default value if name is not found
 ***************************************************************************/
function getVariable(name, defaultValue) {
    if(!defaultValue) { var defaultValue = ''; }
    name = CURRENT_SERVER + myPlayerID + "_" + name;
    var data = TTQ_getValue(name, defaultValue);
    return data;
}

/**************************************************************************
 * Sets the value for the given variable name and the current Travian server
 * Use greasemonkey's built-in system instead of variables to permantenly store and read settings
 * @param name  The name of the variable
 * @param value The value to be assigned
 ***************************************************************************/
function setVariable(name, value) {
    name = CURRENT_SERVER + myPlayerID + "_" + name;
	TTQ_setValue(name, value);
    return true;
}

function setOption(key, value) {
    var options = getVariable('TTQ_OPTIONS', '');
	if(options != '') options = options.split(",");
	else options = [];
    var myOption = options.indexOf(key);
	if(myOption < 0) {
		options.push(key);
		options.push(value);
	} else options[myOption + 1] = value;
    setVariable('TTQ_OPTIONS', options.join(","));
}

/**************************************************************************
 * @param key: name of the parameter in the TTQ_OPTIONS variable
 * @param defaultValue: this is returned if the parameter is not found
 * @param type: if set, type conversion occurs. Values {string, integer, boolean} The conversion occurs only if it is not the defaultValue being returned.
 ***************************************************************************/
function getOption(key, defaultValue, type) {
    var options = getVariable('TTQ_OPTIONS', '');
	options = options.split(",");
	var myOption = options.indexOf(key);
	if(myOption < 0) {return defaultValue;}
	switch(type) {
		case "boolean":
			var myOption = ( options[myOption + 1] == "true") ? true:false;
			break;
		case "integer":
			var myOption = parseInt(options[myOption + 1]);
			break;
		case "string":
		default:
			var myOption = options[myOption + 1];
			break;
	}
    return myOption;
}

function getAllOptions() { //Uses recycled variables
    tA = getVariable('TTQ_OPTIONS', '');
	tA = tA.split(",");
	vName = new Object();
	for ( tX = 0, tY = tA.length ; tX < tY ; tX += 2 ) vName[tA[tX]] = tA[tX+1];
	return vName;
}
// *** End Storage Block ***

function saveODCookie ( nameCoockie, contentCookie ) {
	var newCookie = '';
	for( var i = 0; i < linkVSwitch.length; i++ ) {
		var nd = parseInt(linkVSwitch[i].match(/newdid=(\d+)/)[1]);
		if( contentCookie[nd] !== undefined )
			newCookie += nd + '@_' + contentCookie[nd] + '@#_';
	}
	setVariable(nameCoockie, newCookie);
}

function loadOVCookie ( nameCoockie, contentCookie ) {
	var RCookie = getVariable(nameCoockie,'');
	var oneCookie = [];
	var cCount = 0;
	var Rej = new RegExp("(\\d+)@_(.*?)@#_", 'g');
	while ((oneCookie = Rej.exec(RCookie)) != null) { RB[contentCookie][oneCookie[1]] = oneCookie[2]; cCount++; }
	return cCount;
}

//-- проверка, страничка ли это травы, и если да, то инициализация.
function initialize() {
	if (CURRENT_SERVER != "") return true;
	CURRENT_SERVER = location.hostname + "_";
	_log(1, "Init> Using settings for server '" + CURRENT_SERVER + "'");
	try {
		var uName = $gc('playerName',$id('sidebarBoxActiveVillage'))[0].textContent.trim();
	} catch(e) { return false }
	var uidcookie = TTQ_getValue(CURRENT_SERVER + 'TTQ-UID', "");
	var uIDs = uidcookie.split("@@_");
	for( var i = 0; i < uIDs.length; i++ ) {
		var uID = uIDs[i].split("\/@_");
		if (uID[0] == uName) { myPlayerID = uID[1]; return true; }
		if (uID[1] == uName) { myPlayerID = uID[2]; return true; }
	}
	get(fullName+'statistics/player', getuId, '');
	function getuId(httpRequest) {
		if (httpRequest.readyState == 4) {
			if (httpRequest.status == 200 && httpRequest.responseText) {
				var holder = document.createElement('div');
				holder.innerHTML = httpRequest.responseText;
				var aV = xpath('//td[contains(@class,"pla")]/a[contains(@href,"profile") and text() = "' + uName + '"]', holder, true);
				if (aV) {
					var uId = aV.href.match(/profile\/(\d+)/)[1];
					uidcookie += uName +"\/@_"+ uId +"@@_";
					TTQ_setValue(CURRENT_SERVER + 'TTQ-UID', uidcookie);
					myPlayerID = uId;
					return true;
				} else { myPlayerID == null; return false; }
			}
		}
	}
	if (myPlayerID == null) {
		_log(1,"Init> Unknown page. TTQ is not running. Possible Login screen. Attempting Auto-Login in a few seconds...");
		return false;
	}
}

var init = initialize();
/*********************
 *		GLOBALS
 *********************/
if (init) {
	var allLangs = ["en","ae","ar","ba","bg","br","cl","cn","cz","de","dk","ee","eg","es","fi","fr","gr","he","il","hk","hr","hu","id","ir","it",
		"jp","kr","lt","lv","mx","my","nl","no","pt","pl","ro","ru","se","rs","sa","si","sk","sy","th","tr","tw","ua","vn"];
    var aLangBuildings = 0;
    var aLangTasks = 0;
    var aLangStrings = 0;
    var aLangMenuOptions = 0;
    var sLang = detectLanguage();

	// Default is English. This is also the array that will be used to replace the zeros (missing words) in the below translations. The Buildings are only used for catapult targeting for now. I hope to get rid of it entirely.
	var nLangBuildings = ["", "Woodcutter", "Clay Pit", "Iron Mine", "Cropland", "Sawmill", "Brickyard", "Iron Foundry", "Grain Mill", "Bakery", "Warehouse", "Granary", "<No Building>", "Smithy", "Tournament Square", "Main Building", "Rally Point", "Marketplace", "Embassy", "Barracks", "Stable", "Workshop", "Academy", "Cranny", "Town Hall", "Residence", "Palace", "Treasury", "Trade Office", "Great Barracks", "Great Stable", "City Wall", "Earth Wall", "Palisade", "Stonemason's Lodge", "Brewery", "Trapper", "Hero's Mansion", "Great Warehouse", "Great Granary", "Wonder Of The World", "Horse Drinking Trough", "Stone Wall", "Makeshift Wall", "Command Center", "Waterworks", "Hospital"];
	var nLangTasks = ["Build", "Upgrade", "Attack", "Research", "Train", "Party", "Demolish", "Send Merchants", "Send Back/Withdraw"];
	var nLangStrings = ["Build later", "Upgrade later", "Unknown Town", "Research later", "Schedule this Task for Later", "We started building ", "<center>HALT!</center><br>Please wait, TTQ is processing this task!<br>Step", "Traps", " build request sent. However, it appears that the building is not building.", "was attempted but the server redirected us.", "The task was scheduled.", "Redirected", "We can't schedule this task right now.", "Error", "Scheduled Tasks", "Delete", "Send later", "No troops were selected.", "Your troops were sent to", "Your troops could not be sent to", "Reinforcement", "Attack", "Raid", "Catapults will aim at", "random", "at", "or after", "seconds", "minutes", "hours", "days", "Spy for resources and troops", "Spy for troops and defenses", "away", "The attack cannot be scheduled because no destination was specified.", "at site no.", "Sort by:", "type ", "time ", "target ", "options ", "village ", "Task History", "Flush History", "We started researching ", " cannot be researched.", "Page Failed", "Spy", "train later", "troops.", "... May have not happened!", "We started training ", " cannot be trained.", "Party Later", " but not today.", "We started to ", "Close", "Add/Edit Task Schedule", "Edit and Close", "Add and Close", "Add", "Are you sure you want to [s1] [s2]?", "Demolish Later", "Demolishing", "Cannot demolish", "Invalid coordinates or no resources selected.", "Using Local Time", "Using Server Time", " was attempted but we could not find the link.", " was attempted but failed. Reason: ", "No Link", " was attempted but the building was not found.", "No Building", " was attempted but the server returned an error.", "Server:", "Confirmation Failed", "Sorry, I <b>may</b> have built the building in the wrong town.", "Misbuild:", "Sent Back/Withdrew troops.<br>Troops are going home to:", "Sent Back/Withdrew troops Failed (I think).<br>Troops were supposed to go home to: ", "Click to make this your Active Village." , "Click to see this Village Details screen.", "Timeout or TTQ Crash"];
	var nLangMenuOptions = ["TTQ: ", "Use server time", "Use local time", "Set your tribe", "Task History", "Reset", "\nHow many past tasks do we keep in history?\n(Type 0 to disable task history.) \nCurrently: ", " What is your tribe on this server?\nType 0 for Romans, 1 for Teutons, 2 for Gauls, 5 for Egyptians, 6 for Huns, 7 for Spartans, 8 for Vikings. Or a negative number to enable autodetect (ie: -1)\nCurrently: ", "Are you sure you want to reset all TTQ variables?", "Debug", "Enable debug log on screen. Debug level values:\n0 - quiet, 1 - nearly quite, 2 - verbose, 3 - detailed"];
	// The english troop names are not really needed. But they are provided here in the situation that the the troop name autodetect (rip) does not work. (ie. no rally point)
	var nLangTroops = new Array();
	nLangTroops.push( ["Legionnaire", "Praetorian", "Imperian", "Equites Legati", "Equites Imperatoris", "Equites Caesaris", "Battering Ram", "Fire Catapult", "Senator", "Settler", "Hero", nLangStrings[7]] );
	nLangTroops.push( ["Clubswinger", "Spearman", "Axeman", "Scout", "Paladin", "Teutonic Knight", "Ram", "Catapult", "Chief", "Settler", "Hero", nLangStrings[7]] );
	nLangTroops.push( ["Phalanx", "Swordsman", "Pathfinder", "Theutates Thunder", "Druidrider", "Haeduan", "Ram", "Trebuchet", "Chieftain", "Settler", "Hero", nLangStrings[7]] );
	nLangTroops.push( ["Rat", "Spider", "Snake", "Bat", "Wild Boar", "Wolf", "Bear", "Crocodile", "Tiger", "Elephant"] );
	nLangTroops.push( ["Pikeman", "Thorned Warrior", "Guardsman", "Birds Of Prey", "Axerider", "Natarian Knight", "War Elephant", "Ballista", "Natarian Emperor", "Settler"] );
	nLangTroops.push( ["Slave Militia", "Ash Warden", "Khopesh Warrior", "Sopdu Explorer", "Anhur Guard", "Resheph Chariot", "Ram", "Stone Catapult", "Nomarch", "Settler", "Hero"] );
	nLangTroops.push( ["Mercenary", "Bowman", "Spotter", "Steppe Rider", "Marksman", "Marauder", "Ram", "Catapult", "Logades", "Settler", "Hero"] );
	nLangTroops.push( ["Hoplite", "Sentinel", "Shieldsman", "Twinsteel Therion", "Elpida Rider", "Corinthian Crusher", "Ram", "Ballista", "Ephor", "Settler", "Hero"] );
	nLangTroops.push( ["Thrall", "Shield Maiden", "Berserker", "Heimdall's Eye", "Huskarl Rider", "Valkyrie's Blessing", "Ram", "Catapult", "Jarl", "Settler", "Hero"] );

	// The english resource names are also not really needed. But provided in the case that the resource autodetect should fail.
	var aLangResources = ["Lumber","Clay","Iron","Crop"];


	/***************************************************************************
    *								Translations
	*                            --------------------
	*  There are four translation arrays: aLangBuildings, aLangTasks, aLangStrings and aLangMenuOptions
	*  aLangTroops is ripped from rally point upon first load. aLangResources is ripped each load.
	*  If an array does not appear for your language, TTQ will use the english version instead.
	*  Words that are removed, and appear as the number zero (0), currently have no translation and the english version is used.
 	***************************************************************************/
	switch(sLang) {
	case "ae": //Arabic (U.A.E) by Fahad (updated by Pimp Trizkit)
	case "eg": //Arabic (Egypt)
	case "sa": //Arabic (Saudi Arabia)
	case "sy": //Arabic (Syria)
		aLangTasks = ["بناء", "تطوير", "هجوم", "فتح قسم", "تدريب", "احتفل", "دمر", "ارسال التجار"];
		aLangStrings = ["البناء لاحقا", "تطوير لاحقا", 0, "فتح القسم لاحقا", "جدولة هذا العمل لاحقا", "لقد بداءالبناء ", 0, 0, " لا يمكن ان يبناء.", 0, "هذا العمل مجدول", 0, "لا يمكن ادراج هذه العملية لان.", 0,"المهام المجدولة", "حذف", "ارسال لاحقا", "لم يتم اختيار الجنود.", "الجنود متوجهين الى","جيوشك لا يمكن ارسالها الى", "مساندة", "هجوم", "نهب", "تصويب المقلاع نحو", "عشوائي", "عند", "او بعد", "ثانية", "دقيقة", "ساعة", "يوم", "التجسس على الجيوش والموارد","التجسس على الجيوش والتحصينات", "بعيد","لا يمكن جدولة هذا الهجوم لان الهدف غير محدد ", "الموقع غير موجود", "فرز بواسطة:","النوع ", "الوقت ", "الهدف ", "الخيارات ", "القرية ", "مهام محفوظه", "محفوظات حالية","بداية عملية البحث ", " لا تستطيع اعادة البحث" , 0 , "تجسس" , "تدريب لاحقا" , "جنود" , 0 , "تم بدء التدريب" , "لا تستطيع التدريب"];
		break;

	case "ba": //Bosnian by bhcrow (updated by Pimp Trizkit)
		aLangTasks = ["Izgradi", "Unaprijedi", "Napad", "Istraživati", "Trenirati", "Zabava", "Rušiti", "Pošalji trgovci"];
		aLangStrings = ["Gradi poslije", "Unaprijedi poslije", 0, "Istraživati poslije", "Isplaniraj ovaj zadatak za poslije.", "Počela je gradnja ", 0, 0, " ne može graditi.", 0, "Isplaniran je zadatak.", 0, "Ne možemo zakazati ovaj zadatak upravo sada.", 0, "Planirani zadaci", "Izbrisati", "Pošalji Kasnije", "Trupe nisu odabrane.", "Vaša trupe su poslane", "Vaše postrojbe nisu mogle biti poslane u", "Podrška", "Napad", "Pljačka", "Katapulti će cilj", "slučajan", "u", "ili nakon", "sekundi", "minuta", "sahati", "dana", "špijun za resurse i trupe", "špijun za trupe i obrana", "od", "Napad ne može se planirati jer odredište nije naveden.", "na stranici br."];
		break;

	case "bg": //Bulgarian by penko & pe (updated by Pimp Trizkit)
		aLangTasks = ["Построяване на", "Надстройка на", "Атака към", "Откриване на", "Трениране на", "Партия", "Сривам", "Изпрати Търговци"];
		aLangStrings = ["Постройте по-късно", "Надстройте по-късно", 0, "Открийте по-късно", "Запишете тази задача за по-късно.", "Започна строеж ", 0, 0, " не може да бъде построено.", 0, "Задачата е планирана.", 0, "Тази задача не може да бъде планирана сега.", 0, "Планирани задачи", "Изтриване", "Изпрати по-късно", "Атаката не може да бъде планирана, защото не са избрани войници.", "Вашите войници са изпратени към", "Вашите войници не могат да бъдат изпратени към", "Подкрепление към", "Атака към", "Набег към", "Катапултите се целят в", "случайно", "в", "или след", "секунди", "минути", "часа", "дена", "Шпиониране за ресурси и войска", "Шпиониране за войска и защита", "липсва", "Атаката не може да бъде планирана, тъй като не е избрана цел.", 0, "Сортиране по:", "тип ", "време ", "цел ", "опции ", "град ", "История на задачите", "изчистване на историята", "Започна изучаването", " не може да бъде изучен.", 0, "Шпионаж", "Тренирай по-късно", "войски.", 0, "Започна тренирането ", " не може да бъде трениран."];
		break;

	case "br": //Brazilian Portuguese by getuliojr (updated by Pimp Trizkit)
		aLangTasks = ["Construir", "Melhorar", "Atacar", "Desenvolver", "Treinar", "Festa", "Demolir", "Enviar comerciantes"];
		aLangStrings = ["Construir Mais Tarde", "Melhorar Mais Tarde", 0, "Desenvolver Mais Tarde", "Programar esta tarefa para mais tarde.", "Começamos a construir ", 0, 0, " não pode ser construído.", 0, "A tarefa foi programada.", 0, "Não conseguimos programar esta tarefa agora.", 0, "Tarefas Programadas", "Apagar", "Enviar Mais Tarde", "Não foram selecionadas tropas.", "As suas tropas foram enviadas para", "Não foi possível enviar as suas tropas para", "Reforços", "Ataque:normal", "Ataque:assalto", "As catapultas irão mirar em", "Aleatório", "em", "ou depois","segundos", "minutos", "horas", "dias","Espiar recursos e tropas", "Espiar defesas e tropas", "Ausente", "O ataque não pode ser programado pois nenhum destino foi escolhido.", "na localização no.", "Ordenar por:", "tipo ", "hora ", "alvo ", "opções ", "aldeia ","Histórico das Tarefas", "apagar histórico", "Começamos a pesquisar ", " não pode ser pesquisado.", 0, "Espiar", "Treinar mais tarde", "tropas.", 0, "Começamos a treinar ", " não pode ser treinado."];
		break;

	case "cl": //Spanish Chilean by Benjamin F. (updated by Pimp Trizkit)
		aLangTasks = ["Construir", "Mejorar", "Atacar", "Investigar", "Entrenar", "Fiesta", "Demoler", "Enviar Comerciantes"];
		aLangStrings = ["Construir más tarde", "Actualización más tarde", 0, "Investigar más tarde", "Programar esta tarea para más tarde", "Hemos empezado a construir el edificio ", 0, 0, " no puede ser construido.", 0, "La tarea ha quedado programada.", 0, "No se puede programar esa tarea ahora.", 0, "Tareas programadas", "Eliminar", "Enviar más tarde", "No se selecionaron tropas.", "Tus tropas se enviaron a", "Tus tropas NO han podido ser enviadas", "Refuerzos", "Ataque: normal", "Ataque: asalto", "Catapultas atacar...", "aleatorio", "a", "o después", "segundos", "minutos", "horas", "días", "Espiar recursos y tropas ", "Espiar defensas y tropas", "fuera(away)", "El ataque no se ha programado porque no se fijo el objetivo.", "al cuadrante ns", 0, 0, 0, 0, 0, 0, "Historial de la Tarea", "Borrar la Historia", "Comenzamos la investigación de ", " no puede ser investigado.", 0, "Espiar", "Entrenar más Tarde", "las tropas.", 0, "Hemos comenzado a entrenar a ", " no pueden ser entrenados.", "Fiesta más Tarde", " pero no hoy.", "Empezamos a ", "Cerrar", "Agregar / Editar Lista de Tareas", "Editar y Cerrar", "Agregar y Cerrar", "Agregar", "¿Estás seguro de que desea [s1] [s2]?", "Demoler más Tarde", "Demolición", "No se puede demoler"];
		break;

	case "cn": //Chinese (PRC) by Jacky-Q (updated by Pimp Trzikit)
		aLangTasks = ["建筑", "升级", "攻击", "研发", "训练", "党的", "拆除", "发送招商"];
		aLangStrings = ["预定建筑", "预定升级", 0, "预定研发", "将此事预定稍后进行.", "建筑开始了", 0, 0, " 不能建筑.", 0, "此事项已预定稍后执行.", 0, "我们暂时不能预定稍后执行.", 0, "已预订稍后执行项目", "删除", "稍后送出", "攻击不能预定执行因为没有选择军队.","你的军队已送出", "你的军队不能送出", "支援", "攻击", "抢夺", "投石车会瞄准", "随机", "于", "或之后", "秒", "分", "时", "日", "侦察物资及军队", "侦察物资及防御","不在", "攻击无法预定执行,因为没有指定目的地.", 0, "分类以:", "类型", "时间", "目标 ", "选项", "村庄", "工作记录", "刷新历史", "我们开始研究", "不能研究", 0, "间谍", "培训后", "部队。", 0, "我们开始训练", "不能训练。"];
		break;

	case "cz": //Czech (updated by Pimp Trizkit)
		aLangTasks = ["Postavit", "Rozšířit", "Zaútočit na", "Vyzkoumat", "Trénovat", "Večírek", "Zbourat", "Poslat Obchodníci"];
		aLangStrings = ["Postavit později", "Rozšířit později", 0, "Vyzkoumat později", "Naplánujte tuto akci na později.", "Začali jsme stavět ", 0, 0, " se nedá postavit.", 0, "Úloha byla naplánována.", 0, "Tuto akci momentálně není možné naplánovat.", 0, "Naplánované akce", "Smazat", "Vyslat později", "Útok není možné naplánovat, protože nebyly vybrány žádné jednotky.", "Jednotky jsou na cestě do", "Nepodařilo se vyslat jednotky do", "Podpořit", "Zaútočit na", "Oloupit", "Katapulty zamířit na", "náhodně", "o", "anebo za", "sekund", "minut", "hodin", "dní", "Prozkoumat jednotky a suroviny", "Prozkoumat jednotky a obranné objekty", "pryč", "Útok není možné naplánovat, protože chybí cíl.", "na místě č.", "Třídit podle:", "druhu ", "času ", "cíle ", "možnosti ", "vesnice ", "Historie", "smazat historii", "Začli jsme vyvíjet ", " se nedá vynajít.", 0, "Vyšpehovat", "Vycvičit později", "jednotky.", 0, "Začli jsme cvičit ", " se nedá vycvičit."];
		break;

	case "de": //German by Metador (updated by Pimp Trizkit)
        aLangTasks = ["Gebäude bauen", "Ausbau von", "Angriff", "Unterstützung", "verbessern", "Partei", "Abreißen", "Händler senden"];
        aLangStrings = ["Später bauen", "Später ausbauen", 0, "Später unterstützen", "Führe den Auftrag später aus.", "Gebäudebau gestartet von ", 0, "Fallen", " kann nicht gebaut werden.", 0, "Der Auftrag wurde hinzugefügt.", 0, "Dieser Auftrag kann jetzt nicht Aufgegeben werden.", 0, "Aufträge:", "Löschen", "Später senden", "Keine Truppen ausgewählt worden.", "Deine Truppen wurden geschickt zu", "Deine Truppen konnten nicht geschickt werden zu", "Unterstützung", "Angriff: Normal", "Angriff: Raubzug", "Die Katapulte zielen auf", "Zufall", "um", "oder nach", "Sekunden", "Minuten", "Stunden", "Tage", "Rohstoffe und Truppen ausspähen", "Verteidigungsanlagen und Truppen ausspähen", "weg", 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, "Ungültige Koordinaten oder keine Ressourcen ausgewählt"];
        break;

	case "dk": //Danish by Polle1 (updated by PT)
		aLangTasks = ["Byg", "Viderebyg", "Angrib", "Udforsk", "Uddan", "Hold fest", "Nedriv", "Send Handelsmænd"];
		aLangStrings = ["Byg senere", "Viderebyg senere", 0, "Udforsk senere", "Planlæg denne opgave til senere.", "Vi har startet byggeriet", 0, 0, " kan ikke bygges.", 0, "Opgaven blev planlagt til senere.", 0, "Vi kan ikke planlægge denne opgave lige nu.", 0, "Planlagte opgaver", "Slet", "Send senere", "Der er ikke nok tropper tilgængelig.", "Dine tropper blev sendt til", "Dine tropper kunne ikke sendes til", "Opbakning", "Angrib", "Plyndringstogt", "Katapulterne skyder mod", "tilfældigt", "mod", "eller om", "sekunder", "minutter", "timer", "dage", "Efterforsk råstoffer og tropper", "Efterforsk forsvarsanlæg og tropper", "væk", "Angrebet kan ikke planlægges pga. mangel på mål.", "på plads nr.", "Sorter efter:", 0, "tid ", "mål", "valg ", "landsby ", "Opgave-historik", "slet historik", "vi startede udforskning ", " kan ikke udforskes.", 0, "Spion", "Uddan senere", "tropper.", 0, "vi startede uddannelse", " kan ikke uddannes.", "Hold fest senere", " men ikke i dag.", "Vi startede ", "Luk", "Tilføj/Edit Task Schedule", "Edit og luk", "Tilføj og luk", "Tilføj", "Er du sikker på at du ønsker at [s1] [s2]?", "Nedriv sener", "Nedriver", "Kan ikke nedrive", "Forkerte koordinater el. ingen råstoffer valgt."];
		aLangMenuOptions = [0, "Brug server tid", "brug pc tid", "Indstil dit folkeslag", "Opgave historie", 0, "\nHvor mange opgaver skal vi vise i opgavehistorie?\n(Tast 0 hvis du ikke ønske opgavehistorie.) \nNuværende: ", "\nHvilket folkeslag er du på denne server?\n(Tast 0 for Romer, 1 for Germaner, 2 for Galler.) \nNuværende: ", 0];
		break;

	case "ee": //Estonian by hit^
		aLangTasks = ["Ehita", "Täiusta", "Ründa", "Arenda", "Treeni"];
		aLangStrings = ["Ehita hiljem", "Täiusta hiljem", 0, "Arenda hiljem", "Täida ülesanne hiljem.", "Alustasime ehitamist: ", 0, 0, " ei saa ehitada.", 0, "Ülesanne seatud.", 0, "Ülesannet ei saa hetkel ajastada.", 0, "Ajastatud ülesanded", "Kustuta", "Saada hiljem", "Ühtegi sõdurit pole valitud.", "Sõdurid saadeti külasse", "Sõdureid ei saa saata külasse", "Tugi", "Ründa", "Rüüsta", "Katapultide sihtmärk", "juhuslik", "kell", "või peale", "sekundit", "minutit", "tundi", "päeva", "Luura ressursse ja sõdureid", "Luura sõdureid ja kaitset", "eemal", "Sihtpunkt pole määratud.", 0, "Sorteeri:", "tüüp ", "aeg ", "sihtmärk ", "valikud ", "küla ", "Alalugu", "puhasta ajalugu", "Alustasime arendamist ", " ei saa arendada.", 0, "Luura", "Treeni hiljem", "sõjavägi.", 0, "Alustasime treenimist: ", " ei saa treenida."];
		break;

	case "ar": //Spanish Argentinian
	case "es": //Spanish by Carlos R (fixed by Mr.Kurt & Voltron).
		aLangTasks = ["Construir", "Mejorar", "Atacar", "Investigar", "Entrenar"];
		aLangStrings = ["Construir más tarde", "Mejorar más tarde", 0, "Investigar más tarde", "Programar esta tarea para más tarde", "Hemos empezado a construir el edificio ", 0, 0, " no puede ser construido.", 0, "La tarea ha quedado programada.", 0, "No se puede programar esa tarea ahora.", 0, "Tareas programadas", "Eliminar", "Enviar más tarde", "No se selecionaron tropas.", "Tus tropas se enviaron a", "Tus tropas NO han podido ser enviadas", "Refuerzo", "Atacar", "Saquear", "Catapultas atacarán...", "aleatorio", "a", "o después", "segundos", "minutos", "horas", "días", "Espiar recursos y tropas ", "Espiar defensas y tropas", "fuera(away)", "El ataque no se ha programado porque no se fijo el objetivo.", "al cuadrante nş", "Ordenar por:", "tipo ", "hora ", "objetivo ", "opciones ", "aldea ", "Historial de tareas", "Borrar Historial", "Se ha empezado a investigar ", " no puede ser investigado.", 0, "Espiar", "Entrenar más tarde", "tropas.", 0, "Se ha empezado a entrenar ", " no se puede entrenar."];
		break;

	case "fi": //Finish Ei vielä valmis, auttakaas !
		aLangTasks = ["Rakenna", "Päivitä", "Hyökkää", "Tiedustele", "Kouluta"];
		aLangStrings = ["Rakenna myöhemmin", "Päivitä myöhemmin", 0, "Tiedustele myöhemmin", "Lisää rakennusjonoon", "Rakenna ", 0, 0, " ei voida rakentaa.", 0, "Tehtävä lisätty rakennusjonoon.", 0, "Ei voida lisätä rakennusjonoon juuri nyt.", 0, "Tehtävät rakennusjonossa", "Poista", "Lähetä myöhemmin", "Hyökkäystä ei voitu lisätä jonoon, koska yhtään joukkoja ei ole valittu.", "Joukkosi on lähetetty ", "Joukkojasi ei voida lähettää ", "Ylläpito", "Hyökkäys: Normaali", "Hyökkäys: Ryöstö", "Katapulttien kohde", "satunnainen", "nyt", "tai myöhemmin", "sekuntit", "minuutit", "tunnit", "päivät", "Tiedustele resursseja ja joukkoja", "Tiedustele joukkoja ja puollustuksia","poissa", 0, 0, "Järjestä:", "tyyppi ", "aika ", "kohde ", "asetukset ", "kylä "];
		aLangMenuOptions = [0, "Käytä palvelimen aikaa", "Käytä paikallista aikaa", "Aseta heimo", "Tehtävähistoria", 0, 0, "\nMinkä heimon valitsit tälle serverille?\n(Vastaa 0 Roomalaiset, 1 Teutonit, 2 Gallialaiset.) \nNykyinen: ", 0];
		break;

	case "fr": //French
		aLangTasks = ["Construire le bâtiment", "Augmenter au"];
		aLangStrings = ["Construire plus tard", "Améliorer plus tard", 0, "Rechercher plus tard", "Programmer cette tâche pour plus tard.", "Construction commencée ", 0, 0, " ne peut être construit.", 0, "La tâche a été programmée.", 0, "Cette tâche ne peut être programmée actuellement.", 0, "Tâches programmées", "Supprimer", "Envoyer plus tard", "L'attaque ne peut pas être programmée car aucune troupe n'a été sélectionnée.", "Vos troupes ont été envoyées à ", "Vos troupes n'ont pas pu être envoyées à ", "Assistance", "Attaque: Normal", "Attaque: pillage", "Les catapultes ont pour cible", "aléatoire", "sur", "ou après", "secondes", "minutes", "heures", "jours", "Espionner troupes et ressources", "Espionner troupes et défenses", "ailleurs", "L'attaque ne peut être programmée car aucune destination n'a été spécifiée.", "au site no.", "Trier par:", "type ", "durée ", "cible "];
		break;

	case "gr": //Greek by askgdb (fixed by tsekouri_gr)
		aLangTasks = ["Κατασκευή", "Αναβάθμιση", "Επίθεση", "Έρευνα", "Εκπαίδευση","Αποστολή Πρώτων Υλών"];
		aLangStrings = ["Κατασκευή Αργότερα", "Αναβάθμιση Αργότερα", 0, "Έρευνα Αργότερα", "Πραγραμματισμός Εργασίας Για Αργότερα.", "Ξεκίνησε Κατασκευή", 0, 0, " Δεν Μπορεί Να Κατασκευαστεί.", 0,  "Η Εργασία Πραγραμματίστηκε .", 0, "Δεν Μπορεί Να Πραγραμματισθεί Αυτή Η Εργασία Τώρα.", 0, "Πραγραμματισμένες Εργασίες", "Διαγραφή", "Αποστολή Αργότερα", "Η Επίθεση Δεν Μπορεί Να Προγραμματισθεί Επειδή Δεν Επιλέχθηκαν Στρατιώτες.", "Οι Στρατιώτες Στάλθηκαν", "Οι Στρατιώτες Δεν Μπόρεσαν Να Σταλούν", "Ενίσχυσεις", "Επίθεση", "Εισβολή Αρπαγής", "Οι Καταπέλτες Θα Στοχέυσουν Σε", "Τυχαία", "Σε", "ή Μετά", "Δευτερόλεπτα", "Λεπτά",   "Ώρες",  "Μέρες", "Ανίχνευση Πρώτων Υλών Και Στρατευμάτων", "Ανίχνευση Οχύρωσης Και Στρατευμάτων", "Μακριά", "Η Επίθεση Δεν Μπορεί Να Προγραμματισθεί Επειδή Δεν Ορίστικαν Συντεταγμένες ή Όνομα Χωριού.", "Σε Θέση.", "Ταξινόμηση Κατά:", "Τύπο ", "Χρόνο ", "Στόχο ", "Επιλογές ", "Χωριό ", "Ιστορικό Εργασιών", "Καθαρισμός Ιστορικού", "Ξεκίνησε η έρευνα ", " δεν μπορεί να ερευνηθεί.", 0, "Ανίχνευσε", "Εκπαίδευσε αργότερα", "μονάδες.", 0, "Ξεκίνησε η εκπαίδευση ", " δεν μπορεί να εκπαιδευτεί.",  "Αργότερα Κόμμα", 0, 0, "Κλείνω", "Προσθήκη / Επεξεργασία ομάδας Πρόγραμμα", "Επεξεργασία και Κλείσιμο", "Προσθήκη και Κλείσιμο", "Προσθέτω", "Είστε σίγουροι ότι θέλετε να [s1] [s2]?", "Αργότερα κατεδάφιση", "Κατεδάφιση", "Δεν είναι δυνατή η κατεδάφιση", "Άκυρα συντεταγμένες ή δεν πόρων επιλέγονται."];
		break;

	case "he": //Hebrew
	case "il": //Israel by DMaster
		aLangTasks = ["בנה", "שדרג", "התקף", "חקור", "אמן", "שלח משאבים"];
		aLangStrings = ["בנה בעתיד", "שדרג בעתיד", 0, "חקור בעתיד", "הכנס משימה זו ללוח הזמנים בעתיד.", "התחלנו לבנות ", 0, 0, " לא יכול להבנות.", 0, "המשימה נכנסה ללוח הזמנים.", 0, "אנחנו לא יכולים להכניס משימה זו ללוח הזמנים כרגע.", 0, "משימות בלוח הזמנים", "מחק", "שלח בעתיד", "לא נבחרו כוחות.", "הכוחות שלך נשלחו ל", "הכוחות שלך לא יכלו להשלח ל", "עזרה", "התקפה: רגילה", "התקפה: בזיזה", "בליסטראות ישאף ב", "אקראית", "ב", "או לאחר", "שניות", "דקות", "שעות", "ימים", "ברר אחר משאבים וכוחות", "ברר לגבי הגנות וכוחות", "רחוק", "ההתקפה לא נכנסה ללוח הזמנים משום שהיעד אינו צויין.", "מבנה מספר ", "מיין לפי:", "מיקום, ", "שעות, ", "מטרה, ", "אפשוריות ", "כפר, ", "היסטוריה", "רוקן היסטוריה", "התחלנו לבנות ", " לא יכולנו לבנות.", 0, "רגל", "אמן בעתיד", "כוחות.", 0, "התחלנו לאמן ", " לא יכולנו לאמן.", "צד אחר", " אבל לא היום.", "התחלנו ", "סגור", "הוספה / עריכה של המשימות לוח", "עריכת סגור", "הוסף וסגור", "להוסיף", "האם אתה בטוח שאתה רוצה [s1] [s2]?", "להרוס מאוחר", "להריסת", "לא יכול להרוס", "הקואורדינטות לא חוקית או ללא משאבים נבחרים."];
		break;

	case "hk": //Chinese (Hong Kong)
		aLangTasks = ["建築", "升級", "攻擊", "研發", "訓練", "舉行派對", "拆毀"];
		aLangStrings = ["排程建造", "排程升級", 0, "排程研發", "將此事項排程稍後執行。", "已經開始建造", 0, 0, "建造失敗。", 0, "工作已編入排程。", 0, "暫時不能排程稍後執行.", 0, "已排定的工作", "删除", "排程派遣軍隊", "你沒有選擇軍隊。","你的軍隊已派遣至", "你的軍隊不能派遣至", "增援", "攻擊", "搶奪", "投石車會瞄準", "隨機目標", "於", "或之後", "秒", "分鐘", "小時", "天", "偵察物資及軍隊", "偵察軍隊及防禦","不在", "攻擊無法排程執行，因為沒有指定目的地。", "位於地點編號", "排序︰", "類型", "時間", "目標", "選項", "村莊", "工作記錄", "清除記錄", "已經開始研發", "研發失敗。", 0, "偵察", "排程訓練", "部隊。", 0, "已經開始訓練", "訓練失敗。", "排程舉行派對", "失敗", "已經開始", "關閉", "新增/編輯工作排程", "編輯及關閉", "新增及關閉", "新增", "你確定要[s1][s2]嗎？", "排程拆毀", "正在拆毀", "無法拆毀"];
		aLangMenuOptions = [0, "使用伺服器的時間", "使用本地時間", "設定你的種族", "工作記錄", 0, "\n要保留多少項工作記錄？\n(要停用工作記錄請輸入 0 ) \n現在的設定值︰", "\n你在這個伺服器是甚麼種族？\n(0 是羅馬, 1 是條頓, 2 是高盧)\n現在的設定值︰", 0];
		break;

	case "hr": //Croatian by Damir B.
		aLangTasks = ["Izgradi", "Nadogradi", "Napad", "Istraži", "Treniraj"];
		aLangStrings = ["Gradi poslije", "Nadogradi poslije", 0, "Istraži poslije", "Isplaniraj ovaj zadatak za poslije.", "Počela je gradnja ", 0, 0, " ne može biti izgrađeno.", 0, "Isplaniran je zadatak.", 0, "Ne može se isplanirati ovaj zadatak sada.", 0, "Planirani zadaci", "izbriši", "Pošalji poslije", "Trupe nisu odabrane.", "Vaša vojska je poslana na", "Vaša vojska ne može biti poslana na", "Podrška", "Napad", "Pljačka", "Katapulti će rušiti", "slučajno", "u", "ili nakon", "sekundi", "minuta", "sati", "dana", "Špijuniraj resourse i trupe", "Špijuniraj trupe i odbranu", "odsutan", "Napad ne može biti isplaniran jer destinacija nije određena.", "na stranici br.", "Sortiraj po:", "tip ", "vrijeme ", "meta ", "opcije ", "selo "];
		break;

	case "hu": //Hungarian by [TAJM]Kobra
		aLangTasks = ["Építés", "Szintemelés", "Támadás", "Fejlesztés", "Kiképzés"];
		aLangStrings = ["Építés később", "Szintemelés később", 0, " Fejlesztés később", "A művelet időzítve későbbre.", "Az építés elkezdődött ", 0, 0, " nem épülhet meg.", 0, "Időzítésre került feladat:", 0, "Jelenleg nem időzíthető", 0, "Időzített feladatok:", "Törlés", "Küldés később", "A támadás nem időzíthető! Nem lettek egységek kiválasztva.", "Az egységeid elküldve","Az egységek elküldése nem sikerült, ide:", "Támogatás", "Normál támadás", "Rablótámadás", "A katapult(ok) célpontja", "véletlenszerű", "Ekkor:", "vagy késleltetve", "másodperccel", "perccel", "órával", "nappal", "Nyersanyagok és egységek kikémlelése", "Egységek és épületek kikémlelése", "távol", "A támadás nem időzíthető! Nem lett végcél kiválasztva.", "a következő azonisítóval rendelkező helyen:", "Rendezés:", "típus ", "idő ", "célpont ", "beállítások ", "falu ", "Feladat története", "előzmények törlése"];
		break;

	case "id": //Indonesian by iwean
		aLangBuildings = ["", "Penebang Kayu", "Galian Tanah Liat", "Tambang Besi", "Ladang", "Pemotong Kayu", "Pabrik Bata", "Pelebur Besi", "Gilingan Gandum", "Toko Roti", "Gudang", "Lumbung", "<Tanah Kosong>", "Pandai Besi", "Titik Temu", "Balai Desa", "Pusat Kebugaran", "Pasar", "Kedutaan", "Barak", "Kandang", "Bengkel", "Akademi", "Celah", "Balai Kota", "Kastil", "Istana", "Gudang Ilmu", "Kantor Dagang", "Barak Besar", "Kandang Besar", "Tembok Kota", "Tembok Tanah", "Pagar Kayu", "Tukang Batu", "Pabrik Bir", "Ahli Perangkap", "Padepokan", "Gudang Besar", "Lumbung Besar", "Keajaiban Dunia", "Palung Kuda", "Pagar Batu", "Pagar Darurat", "Pusat Komando", "Menara Air","Rumah Sakit"];
		aLangTasks = ["Bangun", "Tingkatkan", "Serang", "Penelitian", "Latih", "Pesta", "Hancurkan", "Kirim Pedagang", "Kirim Balik/Tarik"];
		aLangStrings = ["Bangun nanti", "Tingkatkan nanti", "Kampung Entah", "Teliti nanti", "Atur Tugas Nanti", "Kita mulai membangun", "<center>TAHAN!</center><br>Mohon bersabar, TTQ sedang memproses tugas!<br>Langkah", "Perangkap", " permintaan bangunan terkirim. Namun, tampaknya itu bukan bangunan.", " dicoba tetapi server mengalihkan kita.", "Tugas dijadwalkan.", "Dialihkan", "Tidak dapat menjadwalkannya sekarang.", "Galat", "Tugas Terjadwal", "Hapus", "Kirim nanti", "Tak ada pasukan dipilih.", "Pasukan berangkat ke", "Pasukan tak bisa berangkat ke", "Bantuan", "Serangan", "Begal", "Katapul membidik ke", "acak", "pada", "atau sesudah", "detik", "menit", "jam", "hari", "Pengintau sumberdaya dan pasukan", "Pengintai pasukan dan pertahanan", "pergi", "Serangan tak bisa dijadwalkan karena tidak ada tujuan.", "halaman.", "Urutan:", "tipe ", "waktu ", "target ", "pilihan ", "desa ", "Catatan Tugas", "Tutup Catatan", "Kami mulai meneliti ", " tidak dapat diteliti.", "Halaman Gagal", "Pengintai", "latih nanti", "pasukan.", "... Mungkin belum terjadi!", "Kita mulai latihan ", " tak dapat dilatih.", "Pesta nanti", " tapi tak sekarang.", "Kita mulai ", "Tutup", "Tambah/Sunting Jadwal Tugas", "Sunting dan Tutup", "Tambah dan Tutup", "Tambah", "Anda yakin mau [s1] [s2]?", "Hancurkan nanti", "Menghancurkan", "Tak dapat dihancurkan", "Koordinat salah atau tak ada sumber daya dipilih.", "Waktu Setempat", "Waktu Server", " dicoba tapi gagal menemukan tautan.", " dicoba tapi gagal. Alasan: ", "Tak ada Tautan", " dicoba tapi gagal menemukan bangunan.", "Tak ada Bangunan", " dicoba tapi server error.", "Server:", "Konfirmasi Gagal", "Maaf, <b>mungkin</b> membangun di desa yang salah.", "Salah bangun:", "Kirim Balik/Tarik pasukan.<br>Pasukan pulang ke:", "Kirim Balik/Tarik pasukan Gagal (mungkin).<br>Pasukan seharusnya pulang ke: ", "Klik untuk jadikan ini Desa aktif.", "Klik untuk melihat layar Detail Desa ini.", "Timeout atau Hang"];
		break;

	case "ir": //Persian (Iran) by nekooee
		aLangTasks = ["بنا کردن", "ارتقاء دادن", "حمله کردن", "تحقیق کردن", "تربیت کردن"];
		aLangStrings = ["بعدا بنا کن", "بعدا ارتقاء بده", 0, "بعدا تحقیق کن", "زمان بندی وظیفه برای بعدا", "شروع کردیم به ساختن ", 0, 0, " نمی توان بنا کرد.", 0, "وظیفه زمان بندی شد.", 0, "نمی توانیم این وظیفه را به درستی زمانبندی کنیم همکنون.", 0, "وظایف زمانبندی شده", "حذف کردن", "بعدا بفرست", "لشکر انتخاب نشده.", "لشکر شما فرستاده شد به", "لشکر شما را نمی توان فرستاد به", "پشتیبانی", "حمله عادی", "غارت", "منجنیقها هدف گرفتند", "تصادفی", "به سوی", "یا بعد از", "ثانیه", "دقیقه", "ساعت", "روز", "شناسایی منابع و لشکریان", "شناسایی عوامل مدافع و لشکریان", "در راه", "حمله نمی تواند زمان بندی شود زیرا مقصد مشخص نشده است.", "زیر ساخت آماده نیست.", "دسته بندی با:", "مدل ", "زمان ", "هدف ", "تنظیمات ", "دهکده ", "تاریخچه وظایف", "پاک کردن تاریخچه", "تحقیق را آغاز کردیم ", " نمی توان تحقیق را آغاز کرد.", 0, "جاسوسی", "بعدا تربیت کن", "لشکریان.", 0, "تربیت کردن را آغاز کردیم ", " نمی توان تربیت کرد."];
        aLangMenuOptions = ["در صف قرار دادن وظایف در تراوین: ", "از ساعت سرور استفاده کند", "از ساعت محلی استفاده کند", "نژاد خود را مشخص کنید", "تاریخچه وظیفه", 0, "\nچه تعداد وظیفه را در تاریخچه نگه دارد؟\n(اگر می خواهید تاریخچه غیر فعال باشد صفر را انتخاب کنید.) \nفعلی: ", "\nنژاد شما در این سرور چیست؟\n(برای رومن 0 برای توتن 1 و برای گول 2 را وارد کنید.) \nفعلی: ", 0];
		break;

	case "it": //Italian by BLM (Updated by PT)
		aLangTasks = ["Costruisci", "Amplia", "Attacca", "Ricerca", "Addestra", 0, 0, "Invia Risorse"];
		aLangStrings = ["Costruisci piu' tardi", "Amplia piu' tardi", 0, "Ricerca piu' tardi", "Programma questa attivita'.", "E' iniziata la costruzione di ", 0, 0, " non puo' essere costruito.", 0, "L'attivita' e' stata programmata.", 0, "Non e' possibile programmare questa attivita' adesso.", 0, "Attivita' Programmate", "Cancella", "Invia piu' tardi", "L'attacco non puo' essere programmato in quanto non sono state selezionate truppe.", "Truppe sono state inviate a", "Non e' stato possibile inviare le truppe a", "Rinforzo", "Attacco", "Raid", "Obbiettivo catapulte", "a caso", "all'orario", "oppure dopo", "secondi", "minuti", "ore", "giorni", "Spiare truppe e risorse", "Spiare difese e truppe", "assente", "L'attacco non puo' essere programmato in quanto non e' stato specificato l'obbiettivo.", "alla posizione n.", "Ordina per:", "tipo ", "orario ", "obbiettivo ", "opzioni ", "villaggio", "Archivio Attivita'", "svuota archivio", "La ricerca è iniziata", " non può essere ricercato", 0, "Spia", "Addestra più tardi", "truppe.", 0, "L'Addestramamento è iniziato ", " non può essere addestrato."];
		break;

	case "jp": //Japanese - By stchu (Updated by PT)
		aLangTasks = ["建築", "レベル上げ", "攻撃", "研究", "訓練"];
		aLangStrings = ["あとで建築する", "あとでレベルを上げる", 0, "あとで研究する", "このタスクをスケジュールする", "建築を始めました： ", 0, 0, " は建てられません。", 0, "タスクに追加されました。", 0, "このタスクは現在スケジュールできません。", 0, "タスク一覧", "削除", "あとで送る", "兵士が選択されていません。", "兵士が送られました： ", "兵士は送られませんでした： ", "援兵", "攻撃", "奇襲", "カタパルトの狙い： ", "ランダム", "時刻指定：", "もしくは時間指定：", "秒", "分", "時", "日", "資源と兵力を偵察", "資源と防衛力を偵察", 0, "目的地が特定できなかったので、攻撃はスケジュールできませんでした。", "サイトNo.", "ソート:", "タイプ ", "時間 ", "ターゲット ", 0, "村 ", "タスク履歴", "履歴をクリア", "研究を開始しました： ", " は研究できません。", 0, "偵察", "あとで訓練", "兵士", 0, "訓練を開始しました： ", " は訓練できません。"];
		aLangMenuOptions = [0, "サーバ時間を使用する。：日本ならば、GMT標準時刻＋9時間を設定してください。(「9」と入力)", "PCの時計を使用する。", "種族の設定", "タスク履歴", 0, "\nタスク履歴はいくつまでリストに残しますか?\n(0に設定すると、タスク履歴は使用しません。) \n現在の設定値: ", "\nあなたの種族は?\n(ローマ：0, チュートン：1, ガウル：2) \n現在の設定値: ", 0];
		break;

	case "kr": //Korean by Kimmo
		aLangTasks = ["것물 짓기", "업그레이드", "공격", "연구", "훈련"];
		aLangStrings = ["건설 예약", "업그레이드 예약", 0, "연구 예약", "작업을 나중으로 예약.", "건설을 시작: ", 0, 0, "을(를) 건설할수 없음.", 0, "작업이 예약되었습니다.", 0, "이 작업을 지금 시작 할 수 없습니다.", 0, "예정된 작업", "삭제", "보내기 예약", "선택된 병사가 없습니다.", "병력을 보냄: ", "병력을 보낼수 없음: ", "지원", "공격", "약탈", "투석기가 겨냥중: ", "임 의", "시각", "혹은 다음에", "초", "분", "시", "일", "병력과 자원을 염탐", "병력과 방어를 염탐", "송 환", "이 공격은 목적지가 지정되지 않아 불가능 합니다.", "지역 번호.", "정렬:", "유형 ", "시간 ", "대상 ", "설정 ", "마을 ", "작업 대기열", "기록 지우기", "연구를 시작: ", "은(는) 연구되지 않았습니다."];
		break;

	case "lt": //Lithuanian by NotStyle & ( GodZero, negadink daugiau skripto)
		aLangTasks = ["Statyti", "Patobulinti", "Siųsti karius", "Tyrinėti", "Treniruoti"];
		aLangStrings = ["Statyti vėliau", "Patobulinti vėliau", 0, "Tyrinėti vėliau", "Užplanuoti užduotį.", "Mes pradėjome statyti ", 0, 0, " neimanoma pastatyti.", 0, "Užduotis užplanuota.", 0, "Mes negalime užplanuoti dabar sitą užduoti.", 0, "Užplanuotos užduotys", "Ištrinti", "Siųsti vėliau", "Ataka negali būti užplanuota nes kariai nepasirinkti.", "Jūsų kariai nusiųsti į", "Jūsų kariai negali būti nusiųsti į", "Parama", "Ataka", "Reidas", "Katapultos bus nutaikyti į", "atsitiktinis", "į", "arba vėliau", "sekundės", "minutės", "valandos", "dienos", "Resursų bei pajėgų žvalgyba", "Gynybinių fortifikacijų bei pajėgų žvalgyba", "nėra", "Negalima užplanuoti atakos, nes taikinys nerastas.", "puslapyje Nr.", "Rūšiuoti pagal:", "[tipą] ", "[laiką] ", "[taikinį] ", "pasirinktys ", "[gyvenvietę] ", "Užduočių Praeitis", "[išvalyti praeitį]", "Mes pradėjome tyrinėjimą ", " negali būti tyrinėjamas."];
		break;

	case "lv": //Latvian by sultāns
		aLangTasks = ["Būvēt", "Paplašināt", "Uzbrukt", "Izpētīt", "Apmācīt"];
		aLangStrings = ["Būvēt vēlāk", "Uzlabot vēlāk", 0, "Izpētīt vēlāk", "Izveidot uzdevumu.", "Tika uzsākta būvniecība ", 0, 0, " nevar uzbūvēt.", 0, "Uzdevums ir ieplānots.", 0, "Mēs nevaram šobrīd to ieplānot.", 0, "Ieplānotie uzdevumi", "Dzēst", "Sūtīt vēlāk", "Uzbrukums nevar notikt, jo nav atzīmēti kareivji.", "Jūsu kareivji tika nosūtīti uz", "Jūsu kareivji nevar tikt nosūtīti", "Papildspēki", "Uzbrukums", "Iebrukums", "Ar katapultām bombardēt", "nejaušs", "kad", "vai pēc", "sekundes", "minūtes", "stundas", "dienas", "Izlūkot resursus un kareivjus", "Izlūkot aizsardzību un kareivjus", "Prom", "Uzbrukums nevar tikt izpildīts, jo nav norādīts mērķis.", "koordinātes kartē.", "Šķirot pēc:", "tipa ", "laika ", "mērķa ", "veida ", "ciema ", "Uzdevumu vēsture", "nodzēst vēsturi", "tika uzsākta izpēte", " nevar tikt izpētīts.", 0, "Izlūkot", "Apmācīt vēlāk", "kareivji.", 0, "Tika uzsākta uzlabošana", "nevar tikt uzlaboti."];
		break;

	case "mx": //Mexican Spanish by fidelmty
		aLangTasks = [ "Construir", "Mejorar", "Atacar", "Investigar", "Entrenar"];
		aLangStrings = ["Construir más tarde", "Mejorar más tarde", 0, "Investigar más tarde", "Programar esta tarea para más tarde", "Hemos empezado a construir el edificio ", 0, 0, " no puede ser construido.", 0, "La tarea ha quedado programada.", 0, "No se puede programar esa tarea ahora.", 0, "Tareas programadas", "Eliminar", "Enviar más tarde", "El ataque no ha sido programado porque no se selecionaron tropas.", "Tus tropas se enviaron a", "Tus tropas NO han podido ser enviadas", "Refuerzo", "Atacar", "Saquear", "Catapultas atacarán...", "aleatorio", "a", "o después", "segundos", "minutos", "horas", "días", "Espiar recursos y tropas ", "Espiar defensas y tropas", "fuera(away)", "El ataque no se ha programado porque no se fijo el objetivo.", "al cuadrante ns"];
		break;

	case "my": //Malay by ocellatus (Updated by PT)
		aLangTasks = ["Bina", "Tingkatkan Tahap", "Serang", "Selidik", "Latih", "Adakan", "Musnah", "Hantar Pedagang"];
		aLangStrings = ["Bina Kemudian", "Tingkatkan Kemudian", 0, "Selidik Kemudian", "Jadualkan Tugasan Ini Kemudian", "Memulakan Pembinaan ", 0, 0, " Tidak Dapat Dibina.", 0, "Tugasan Telah Dijadualkan.", 0, "Tidak Dapat Dijadualkan Sekarang.", 0, "Tugasan Telah Dijadualkan", "Buang", "Hantarkan Kemudian", "Tiada Askar Dipilih.", "Askar-askar Anda Dihantar Ke", "Askar-askar Anda Tidak Dapat Dihantar Ke", "Bantuan", "Serang", "Serbuan", "Tarbil Akan Disasarkan Ke", "Tidak Ditetapkan", "Pada", "Atau Selepas", "Saat", "Minit", "Jam", "Hari", "Tinjauan Sumber Dan Askar", "Tinjauan Askar dan Pertahanan", "Pergi", "Serangan Tidak Dapat Dijadualkan Kerana Tiada Destinasi Ditetapkan.", "Di Tapak No.", 0, 0, 0, 0, 0, 0, 0, 0, 0, " Tidak Boleh Diselidik.","Tingkatkan Kemudian", "Tinjau", "Latih Kemudian", "Askar.", "Latih", "Memulakan Latihan ", " Tidak Boleh Dilatih.","Perayaan", " Tetapi Tidak Pada Hari Ini.", "Memulakan Untuk", 0, 0, 0, 0, 0, "Adakah Anda Pasti Untuk [s1] [s2]?", "Musnah Kemudian", "Sedang Dimusnahkan", "Tidak Boleh Dimusnahkan", "Koordinat Tidak Wujud Atau Tiada Sumber Dipilih."];
		break;

	case "nl": //Dutch by Roshaoar & Kris Fripont
		aLangTasks = ["Gebouw Bouwen", "Verbeter", "Val Aan", "Ontwikkel"];
		aLangStrings = ["Bouw later", "Verbeter later", 0, "Ontwikkel later", "Plan deze taak voor later.", "Bouw is begonnen ", 0, 0, " kan niet worden gebouwd.", 0, "deze taak was gepland.", 0, "We kunnen deze taak nu niet plannen.", 0, "Geplande taken", "Verwijder", "Stuur later", "De aanval kan niet worden gepland omdat er geen troepen zijn geselecteerd.", "Jou troepen zijn gestuurd naar", "Jou troepen konden niet worden gestuurd naar", "Versterk", "Val aan", "Roof", "De katapulten zullen mikken op", "willekeurig", "op", "of na", "seconden", "minuten", "uren", "dagen", "spioneer naar voorraden en troepen", "spioneer naar troepen en verdediging", "weg", "Het aanval kan niet worden gepland omdat geen destinatie gezet was.", "op bouwplaats nummer ", "Sorteer via:", "soort ", "tijd ", "doel ", "keuzen ", "dorp "];
		break;

	//case "no": //Norwegian

	case "pt": //Portuguese by Guinness, NomadeWolf, getuliojr (updated by Pimp Trizkit)
		aLangTasks = ["Construir", "Melhorar", "Atacar", "Desenvolver", "Treinar", "Festa", "Demolir", "Enviar comerciantes"];
		aLangStrings = ["Construir Mais Tarde", "Melhorar Mais Tarde", 0, "Desenvolver Mais Tarde", "Programar esta tarefa para mais tarde.", "Começamos a construir ", 0, 0, " não pode ser construído.", 0, "A tarefa foi programada.", 0, "Não conseguimos programar esta tarefa agora.", 0, "Tarefas Programadas", "Apagar", "Enviar Mais Tarde", "Não foram selecionadas tropas.", "As suas tropas foram enviadas para", "Não foi possível enviar as suas tropas para", "Reforços", "Ataque:normal", "Ataque:assalto", "As catapultas irão mirar em", "Aleatório", "em", "ou depois","segundos", "minutos", "horas", "dias","Espiar recursos e tropas", "Espiar defesas e tropas", "Ausente", "O ataque não pode ser programado pois nenhum destino foi escolhido.", "na localização no.", "Ordenar por:", "tipo ", "hora ", "alvo ", "opções ", "aldeia ","Histórico das Tarefas", "apagar histórico", "Começamos a pesquisar ", " não pode ser pesquisado.", 0, "Espiar", "Treinar mais tarde", "tropas.", 0, "Começamos a treinar ", " não pode ser treinado."];
		break;

	case "pl": //Polish by Oskar (corrected by CamboX)
		aLangTasks = ["Buduj", "Rozbuduj", "Atak", "Zbadać", "Szkolić"];
		aLangStrings = ["Buduj później", "Rozbuduj później", 0, "Zbadaj później", "Zaplanuj zadanie na później.", "Rozpoczęto budowę ", 0, 0, " nie może byc zbudowany.", 0, "Zadanie zostało zaplanowane.", 0, "Nie mozna teraz zaplanowac tego zadania.", 0, "Zaplanowane zadania", "Usuń", "Wyślij później", "Nie wybrano żadnych jednostek.", "Twoje jednoski zostały wysłane", "Twoje jednostki nie mogą zostać wysłane", "Pomoc", "Atak", "Grabież", "Katapulty celują w", "losowy", "o", "lub za", "sekundy", "minuty", "godziny", "dni", "Obserwuj surowce i jednostki", "Obserwuj fortyfikacje i jednostki", "nieobecny", "Atak nie może zostać zaplanowany, ponieważ nie wybrano celu.", "Na pozycji nr.", "Sortowanie:", "typ ", "czas ", "cel ", "opcje ", "osada ", 0, 0, 0, 0, 0, 0, "Szkolic później"];
		break;

	case "ro": //Romanian by Atomic (edited by fulga, Pimp Trizkit, adipiciu)
		aLangTasks = ["Clădire", "Upgrade", "Atacă", "Cercetează", "Instruiește", "Petrecere", "Demolează", "Trimite negustori", "Trimite înapoi/retrage"];
		aLangStrings = ["Construiește mai târziu", "Upgrade mai târziu", "Sat necunoscut", "Cercetează ulterior", "Programează această acțiune pentru mai târziu", "Construcția a fost pornită ", "<center>STOP!</center><br>Te rugăm să aștepți, TTQ procesează comanda!<br>Step", "Celule", " cererea de construcție a fost trimisă. Cu toate acestea, se pare că nu a pornit construcția.", "s-a încercat, dar server-ul a redirecționat cererea.", "Acțiunea a fost programată", "Redirecționat", "Programarea acțiunii nu e posibilă momentan", "Eroare", "Acțiuni Programate", "Șterge", "Trimite mai târziu", "Nici o unitate nu a fost selectată.", "Trupele tale au fost trimise la:", "Trupele tale nu au putut fi trimise la:", "Intăriri", "Atac normal", "Atac rapid (Raid)", "Catapultele vor ținti", "Aleator", "la", "sau după", "secunde", "minute", "ore", "zile", "Spionează resurse și trupe", "Spionează fortificații și trupe", "plecate", "Atacul nu poate fi programat! Destinația nu a fost selectată.", "pe locul (ID) nr.", "Sortează după:", "«tip» ", "«timp» ", "«țintă» ", "«opțiuni» ", "«sate» " ,"Acțiuni derulate", "închide", "Cercetarea a fost pornită ", " Cercetarea nu este posibilă", 0, "Spionaj", "Antrenează mai târziu", "trupe.", 0, "Antrenamentul pornit "," Antrenamentul nu este posibil", " mai târziu", 0, "Am început să ", "Închide lista", "Adaugă/Editează", "Editează şi închide", "Adaugă şi închide", "Adaugă", "Ești sigur că dorești să [s1] [s2 ]?", "Demolează mai târziu", "Se demolează", "Nu s-a putut demola", "Nu au fost selectate resurse sau Coordonate invalide.", "Folosind ora locală", "Folosind ora server-ului", " was attempted but we could not find the link.", " was attempted but failed. Reason: ", "No Link", " was attempted but the building was not found.", "No Building", " was attempted but the server returned an error.", "Server:", "Confirmation Failed", "Sorry, I <b>may</b> have built the building in the wrong town.", "Misbuild:", "Sent Back/Withdrew troops.<br>Troops are going home to:", "Sent Back/Withdrew troops Failed (I think).<br>Troops were supposed to go home to: ", "Click to make this your Active Village." , "Click to see this Village Details screen.", "Timeout or TTQ Crash"];
		aLangMenuOptions = [0, "Folosește ora server-ului", "Folosește ora locală", "Setează tribul", "Istoric acțiuni", "Resetează", "\nCâte acțiuni vrei să păstrezi în istoric?\n(Introdu 0 pentru a dezactiva istoricul acțiunilor.) \nAcum: ", " Care este tribul tău?\nIntrodu 0 pentru Romani, 1 pentru Barbari, 2 pentru Daci. Sau introdu un număr negativ pentru detectarea automată a tribului (ie: -1)\nAcum: ", "Ești sigur că vrei să resetezi toate variabilele script-ului TTQ?"];
		break;

	case "ru": //Russian by Hosstor (edited by v_kir)
		aLangTasks = ["Построить", "Развить", "Атаковать", "Изучить", "Обучить"];
		aLangStrings = ["Построить позже", "Развить позже", 0, "Обучить позже", "Запланировать задачу.", "Мы начали строительство ", 0, 0, " не может быть построено.", 0, "Задача запланирована.", 0, "Мы не можем планировать этого сейчас.", "Ошибка", "Запланированные задачи", "Удалить", "Отправить позже", "Атака не может быть запланирована, поскольку войска не выбраны.", "Ваши войска были отправленны", "Ваши войска не могут быть отправлены", "Поддержка", "Атака", "Набег", "Какапульты нацелены на", "Случайно", "в", "или по истечении", "секунд", "минут", "часов", "дней", "Разведка ресурсов и войск", "Разведка войск и оборонительных сооружений", "Отсутствует", "Атака не может быть запланирована, не были заданы координаты.", "на поле номер.", "Сортивовка по:", "типу ", "времени ", "цели ", "настройкам ", "деревне ", "История задач", "очистить историю", "Мы начали исследования", " не могут быть исследованы.", 0, "Шпион", "тренировать позже", "войска.", 0 , "Мы начали тренировку", " не может тренироваться", "Отправить позже", " но не сегодня.", "Мы начали ", "Закрыть", "Добавить/Изменить Расписание задачи", "Изменить и закрыть", "Добавить и закрыть", "Добавить", "Вы уверены, что хотите [S1] [S2]?", "Разрушить позже", "Разрушено", "Не может быть разрушено"];
		break;

	case "se": //Swedish by Storgran
		aLangTasks = ["Konstruera", "Uppgradera", 0, "Förbättra", "Träna"];
		aLangStrings = ["Konstruera senare", "Uppgradera senare", 0, "Förbättra senare", "Schemalägg uppgiften tills senare.", "Byggnationen påbörjad ", 0, 0, " kan inte byggas.", 0, "Uppgiften är schemalagd.", 0, "Det går inte att schemalägga denna uppgift just nu.", 0, "Schemalägg uppgift", "Ta bort", "Skicka senare", "Attacken kunde inte bli schemalagd då inga trupper valdes.", "Dina trupper skickades till", "Dina trupper kunde inte skickas till", "Förstärkning", 0, "Plundring", "Katapulterna ska sikta på", 0, "vid", "eller efter", "sekunder", "minuter", "timmar", "dagar", "Spionera på trupper och resurser", "Spionera på trupper och försvarsbyggnader", "borta", "Attacken misslyckades, var vänlig och välj en destination.", "ingen destination.", "Sortera efter:", "typ ", "tid ", "mal ", "alternativ ", "by ", "Tidigare"];
		break;

	case "rs": //Serbian by isidora
		aLangTasks = ["Изградња зграда", "Надоградњна на", "Напад", "Побољшати", "Започни обуку"];
		aLangStrings = ["Гради после", "Побољшај после", 0, "Истражи после", "Испланирај овај задатак за после.", "Почела је градња ", 0, 0, " не може бити изграђено.", 0, "испланиран је задатак.", 0, "Не може се испланирати овај задатак сада.", 0, "Планирани задаци", "избриши", "Пошаљи после", "Трупе нису одабране.", "Ваша војска је послана на", "Ваша војска не може бити послана на", "Појачање", "Напад", "Пљачка", "Катапулти ће рушити", "случајно", "у", "или након", "секунди", "минута", "сати", "дана", "Извиђање сировина и војске", "Извиђање одбране и војске", 0, "Напад не може бити испланиран јер дестинација није одређена.", "на страници бр.", "Сортирај по:", 0, 0, 0, "опције ", "село "];
		break;

	case "si": //Slovenian by SpEkTr and matej505
		aLangTasks = ["Postavi nov objekt", "Nadgradi", "Napad na ", "Razišči", "Izuri"];
		aLangStrings = ["Postavi nov objekt kasneje", "Nadgradi kasneje", 0, "Izuri kasneje", "Nastavi to nalogo za kasneje", "Z gradnjo začnem ", 0, 0, " ne morem zgraditi.", 0, "Naloga je nastavljena.", 0, "Te naloge trenutno ni možno nastaviti.", 0, "Nastavljene naloge:", "Zbriši", "Pošlji kasneje", "Nisi označil nobenih enot.", "Tvoje enote so bile poslane,", "Tvoje enote ne morejo biti poslane,", "Okrepitev", "Napad", "Roparski pohod", "Cilj katapultov je", "naključno", "ob", "ali kasneje", "sekund", "minut", "ur", "dni", "Poizvej o trenutnih surovinah in enotah", "Poizvej o obrambnih zmogljivostih in enotah", "proč", "Napad ne more biti nastavljen, ker ni bila izbrana nobena destinacija.", "na strani št.", "Sortiraj po:", "tipu ", "času ", "tarči ", "možnosti ", "vasi "];
		break;

	case "sk": //Slovak
		aLangTasks = ["Postaviť", "Rozšíriť", "Zaútočiť na", "Vynájsť", "Trénovať"];
		aLangStrings = ["Postaviť neskôr", "Rozšíriť neskôr", 0, "Vynájsť neskôr", "Naplánujte túto akciu na neskôr.", "Začali sme stavať ", 0, 0, " sa nedá postaviť.", 0, "Úloha je naplánovaná.", 0, "Túto úlohu momentálne nie je možné naplánovať.", 0, "Naplánované úlohy", "Zmazať", "Vyslať neskôr", "Neboli vybraté žiadne jednotky.", "Jednotky mašírujú do", "Nepodarilo sa vyslať jednotky do", "Podporiť", "Zaútočiť na", "Olúpiť", "Katapulty zacieliť na", "náhodne", "o", "alebo za", "sekúnd", "minút", "hodín", "dní", "Preskúmať jednotky a suroviny", "Preskúmať jednotky a obranné objekty", "preč", "Útok nemožno naplánovať, pretože nie je známy cieľ.", "na mieste č.", "Zoradiť podľa:", "typu ", "času ", "cieľa ", "iné ", "dediny ", "História akcií", "zmazať históriu", "Začali sme vyvíjať ", " sa nedá vynájsť.", "Vylepšiť neskôr", "Vyšpehovať", "Trénovať neskôr", "jednotky.", "Vytrénovať", "Začali sme trénovať ", " sa nedá vytrénovať." ];
		break;

	case "th": //Thai
		aLangTasks = ["สร้าง", "อัพเกรด", "โจมตี", "วิจัย", "ฝึก", 0, 0,"ส่งทรัพยากร"];
		aLangStrings = ["สร้างภายหลัง", "อัพเกรดภายหลัง", 0, "วิจัยภายหลัง", "กำหนดเวลาทำงานนี้ภายหลัง", "เริ่มสร้าง ", 0, 0, " ไม่สามารถสร้างได้", 0, "กำหนดเวลาทำงานเป็นที่เรียบร้อย", 0, "ยังไม่สามารถกำหนดเวลาทำงานได้ในขณะนี้", 0, "เพิ่มงาน", "ลบ", "ส่งในภายหลัง", "ยังไม่ได้เลือกทหาร", "กองกำลังของคุณถูกส่งไปที่ ", "ไม่สามารถส่งกองกำลังของคุณไปยัง", "ส่งกำลังสนับสนุน", "โจมตี", "ปล้น", "เครื่องยิงเล็งไปยัง ", "สุ่ม", "ที่", "หรือหลังจาก", "วินาที", "นาที", "ชั่วโมง", "วัน", "สอดแนมกองกำลังและทรัพยากร", "สอดแนมกองกำลังและการป้องกัน", 0, "ไม่สามารถโจมตีได้เนื่องจากไม่มีหมู่บ้านที่ตำแหน่งนั้น", "ที่จุดสร้างหมายเลข", "เรียงลำดับตาม:", "ชนิด ", "เวลา ", "เป้าหมาย ", "ตัวเลือก ", "หมู่บ้าน ", "ประวัติงานที่ได้ทำไป", "เคลียร์ประวัติงาน", "เริ่มทำการวิจัย ", " ไม่สามารถวิจัยได้", 0, "สายลับ", "ฝึกในภายหลัง", "กำลังทหาร", 0, "เริ่มการฝึก", "ไม่สามารถฝึกได้"];
		aLangMenuOptions = ["ทราเวียน ", "ใช้เวลาของเซิร์ฟเวอร์", "ใช้เวลาของท้องถิ่น", "ตั้งค่าคู่แข่ง", "หน้าต่างงาน", 0, "\nคุณจะให้เราเก็บข้อมูลการเพิ่มงานไว้ในหน้าต่างงานเท่าไรดีล่ะ?\n(ใส่ 0 ถ้าไม่ต้องการให้แสดงหน้าต่างงาน) \nปัจจุบัน: ", "\nคู่แข่งของคุณในเซิร์ฟเวอร์คือเผ่าอะไร?\n(ใส่ 0 สำหรับโรมันส์, 1 สำหรับทูทั่นส์, 2 สำหรับกอลส์.) \nปัจจุบัน: ", 0];
		break;

	case "tr": //Turkish by sanalbaykus
		aLangTasks = ["Kurulacak bina", "Geliştirilecek Bina", "Asker gönder", "geliştir", "Yetiştir"];
		aLangStrings = ["Daha sonra KUR", "Daha Sonra GELİŞTİR", 0, "Sonra araştır", "Bu işlemi sonra planla.", "Yapım başladı. ", 0, 0, " İnşa edilemedi.", 0, "İşlem sıraya alındı.", 0, "İşlemi şu an planlayamıyoruz.", 0, "Sıradaki İşlemler", "Sil", "Daha sonra yolla", "Önce asker seçmelisiniz..", "Askerlerin gönderildiği yer ", "Askerler yollanamadı", "Destek olarak", "Normal Saldırı olarak", "Yağmala olarak", "Mancınık hedefi", "Rastgele", "Şu an", "Yada bu zaman sonra", "saniye sonra", "dakika sonra", "saat sonra", "gün sonra", "Hammadde ve askerleri izle", "Asker ve defansı izle", "uzakta","Saldırı planı için adres girmediniz.","adres", "Sıralama Kriteri:", ".Tip.", " .Süre.", ".Hedef. ", "Ayarlar", ".Köy. ","Tamamlanan işlemler", "Geçmişi sil", "Araştırılıyor.", " Araştırılamadı.", 0, "Casus", "Sonra yetiştir", "Askerler.", 0, "Yetiştirme Başladı ", " Yetiştirme Başlamadı."];
		aLangMenuOptions = [0, "Server saatini kullan", "Yerel saati kullan", "Hakını seç", "Görev geçmişi", 0, "\nGörev geçmişinde kaç adet görev görüntülensin?\n(0 yazarsanız görev geçmişi devre dışı kalır.) \nŞu anda: ", "\nBu server'daki halkınız hangisi?\n(Romalılar için 0, Cermenler için 1, Galyalılar için 2.) \nŞu anda: ", 0];
		break;

	case "tw": //Chinese (Taiwan) by syrade
		aLangTasks = ["建築", "升級", "攻擊", "研發", "訓練"];
		aLangStrings = ["預定建築", "預定升級", 0, "預定研發", "將此事項預定稍後執行.", "建築開始了 ", 0, 0, " 不能建築.", 0, "此事項已預定稍後執行.", 0, "我們暫時不能預定稍後執行.", 0, "已預定稍後執行項目", "删除", "稍後送出", "攻擊不能預定執行因為沒有選擇軍隊.","你的軍隊已送去", "你的軍隊不能送去", "支援", "攻擊", "搶奪", "投石車會瞄準", "隨機", "於", "或之後", "秒", "分", "時", "日", "偵察物資及軍隊", "偵察物資及防禦","不在", "攻擊無法預定執行,因為沒有指定目的地.", 0, "分類以:", "類型", "時間", "目標 ", "選項", "村莊", "任務紀錄", "清除紀錄", "開始研發", "無法研發", 0, "偵查", "預定訓練", "軍隊", 0, "開始訓練", "無法訓練"];
		aLangMenuOptions = [0, "使用伺服器時間", "使用電腦時間", "設定種族", "任務紀錄", 0, "\n任務紀錄最多要保持幾項？\n(0 代表取消任務紀錄) \n目前設定: ", "\n你所使用的種族是？\n(0 代表羅馬人, 1 代表 條頓人, 2 代表 高盧人) \n目前設定: ",0];
		break;

	case "ua": //Ukrainian by Rustle rs11[@]ukr.net
		aLangTasks = ["Побудувати", "Розвиток", "Атакувати", "Дослідити", "тренувати"];
		aLangStrings = ["Побудувати пізніше", "Розвити пізніше", 0, "Тренувати пізніше", "Запланувати задачу.", "Ми почали будівництво ", 0, 0, " неможливо побудувати.", 0, "Задача запланована.", 0, "Ми не можемо планувати це зараз.", "Помилка", "Заплановані задачі", "Видалити", "Відправити пізніше", "Атака не може бути запланована, оскільки війська не вибрані.", "Ваші війська були відправлені", "Ваші війська не можуть бути відправлені", "Підкріплення", "Атакувати", "Розбійницький набіг", "Какапульти націлені на", "Випадково", "в", "чи через", "секунд", "хвилин", "годин", "днів", "Розвідати ресурси та військо супротивника", "Розвідати оборонні споруди та військо супротивника", "Відсутнє", "Атака неможе бути запланована бо немає цілі.", "Поле №.", "Сортувати:", "тип ", "час ", "ціль ", "настройки ", "селище "];
		break;

 	case "vn": //Vietnamese by botayhix (Updated by PT)
		aLangTasks = ["Xây dựng công trình", "Nâng cấp", "Tấn Công", "Nghiên cứu", "Cướp Bóc"];
		aLangStrings = ["Xây Dựng Sau", "Nâng cấp sau", 0, "Nghiên cứu sau", "Kế hoạch", "Bắt đầu xây dựng ", 0, 0, " Không thể xây dựng.", 0, "Nhiệm vụ trong kế hoạch.", 0, "Chúng ta không thể thực hiện kế hoạch bây giờ.", 0, "Kế hoạch nhiệm vụ", "Xoá", "Gửi Sau", "Không có quân nào được chọn.", "Quân của bạn được gửi đến", "Quân của bạn không được gửi đi", "Tiếp viện", "Tấn Công", "Cướp bóc", "Máy bắn đá tấn công vào", "Ngẫu nhiên", "Tại", "Hoặc sau đó", "Giây", "Phút", "Giờ", "Ngày", "Do thám tài nguyên và quân đội", "Do thám quân đội và phòng thủ", "Khoảng cách", "Cuộc tấn công không thể thực hiện do đích đến không đúng.", "Vị trí.", 0, "Kiểu_ ", "thời gian ", "Mục tiêu: ", "Lựa chọn ", "Làng_ ", 0, "Xoá history", "Bắt đầu thực hiện ", " Không thể thực hiện."];
		break;

	default:
	}

function vlist_addButtonsT4 () {
	var vlist = $id("sidebarBoxVillagelist");
	if( ! vlist ) { vlist = $id("sidebarBoxVillageList") }
	var villages = $gc("listEntry village",vlist);
	for ( var vn = 0; vn < villages.length; vn++ ) {
		var linkEl = $gt("a",villages[vn])[0];
		var villageID = villages[vn].getAttribute('data-did');
		//linkVSwitch[vn] = linkEl.getAttribute('href');
		linkVSwitch[vn] = "?newdid=" + villageID + "&"
		var coords = $gc("coordinatesGrid",villages[vn])[0];
		var did = getVidFromCoords(coords.innerHTML);
		var nd = parseInt(linkVSwitch[vn].match(/newdid=(\d+)/)[1]);
		villages_id[vn] = did;

		if( linkEl.hasAttribute('class') && linkEl.getAttribute('class').indexOf("active") != -1 ) {
			currentActiveVillage = nd;
		}
	}
}

var TTQ_registeredMenu = $e('UL',[['style','font-size:12px;']]);
var TTQ_registeredMenuFL = true;
function TTQ_registerMenuCommand(t,f) {
	var newLI = $ee('LI',t);
	ttqAddEventListener(newLI,'click',f,false);
	TTQ_registeredMenu.appendChild(newLI);
}
function TTQ_showMenuCommand() {
	if( TTQ_registeredMenuFL ) {
		$id('ttqPanel').appendChild(TTQ_registeredMenu);
		TTQ_registeredMenuFL = false;
	} else {
		$id('ttqPanel').removeChild(TTQ_registeredMenu);
		TTQ_registeredMenuFL = true;
	}
}

	var tX, tY, vName, tA = null;  //Recyclable Global Variables... scary, I know.. but, hey, it speeds things up, and saves memory usage.
	//Display the TTQ box
	var docDir = ['left', 'right'];
	var ltr = true;
	if (document.defaultView.getComputedStyle(document.body, null).getPropertyValue("direction") == 'rtl') { docDir = ['right', 'left']; ltr = false; }

	tA = document.createElement("div");
	tA.setAttribute("id", "ttqPanel");
	tA.setAttribute("style", "position:absolute;top:"+(parseInt(getPosition($id("background")).y)+32)+"px;"+docDir[0]+":"+(parseInt(getPosition($id("outOfGame")).x))+"px;background-color:#AAAAAA;padding:0px 3px 0px 3px;white-space:nowrap;color:black;font-family:'Lucida Sans Unicode','Comic Sans MS';font-size:10px;border-radius:6px;border:2px solid black;z-index:501;cursor:pointer;");
	tA.innerHTML = "<span id='ttqPanelSpan'><b>TTQ</b>-T4 v" + sCurrentVersion + " - <span id='ttqLoad' style='font-weight: bold' >0</span> ms - <span id='ttqReloadTimer'>0</span></span>";
	ttqAddEventListener(tA, "click", TTQ_showMenuCommand, false);
	document.body.appendChild(tA);
	// Fix language arrays, replace zeros with english
	if ( aLangBuildings == 0 ) aLangBuildings = nLangBuildings;
	if ( aLangTasks == 0 ) aLangTasks = nLangTasks;
	else for ( tX = 0 ; tX < nLangTasks.length; ++tX ) if ( typeof(aLangTasks[tX]) == "undefined" || !aLangTasks[tX] ) aLangTasks[tX] = nLangTasks[tX];
	if ( aLangStrings == 0 ) aLangStrings = nLangStrings;
	else for ( tX = 0, tY = nLangStrings.length; tX < tY ; ++tX ) if ( typeof(aLangStrings[tX]) == "undefined" || !aLangStrings[tX] ) aLangStrings[tX] = nLangStrings[tX];
	if ( aLangMenuOptions == 0 ) aLangMenuOptions = nLangMenuOptions;
	else for ( tX = 0 ; tX < nLangMenuOptions.length; ++tX ) if ( typeof(aLangMenuOptions[tX]) == "undefined" || !aLangMenuOptions[tX] ) aLangMenuOptions[tX] = nLangMenuOptions[tX];
	var myID = myPlayerID; // Save off into Recycled Variable for later use
	//Get Player ID  (uid)
	//myPlayerID = myID.src.match(/uid=(\d+)/)[1];
	//Get MapSize
	var MapSize = detectMapSize();
	var mapRadius = (MapSize - 1) / 2;
	vlist_addButtonsT4();
	var myPlaceNames = new Object();
	// Put Coords next to village names and make them clickable to view that village's details screen, and move the villages names over to the left some, and save them all for getVillageName() and getVillageNameXY()
	var vlist = $id("sidebarBoxVillagelist");
	if( ! vlist ) { vlist = $id("sidebarBoxVillageList") }
	var villages = $gc('listEntry village',vlist); //Recycled variable
	var l8, m8, n8;  //Sorry for the names, i was just being funny.
	for ( n8 = 0, m8 = 0, l8 = villages.length ; m8 < l8 ; ++m8 ) {
	//Determine the coordinates of the active building and create a SPAN with clickable links to the village.
		tA = villages[m8];
		var villageID = tA.getAttribute('data-did');
		var xy = coordZToXY(villages_id[n8]);
		tX = xy[0];
		tY = xy[1];
		vName = $gc('name',tA)[0].textContent;
		vName = '<span class ="ttq_village_name" onclick="window.location = \''+fullName+'?newdid='+villageID+'&'+'\';return false;" title="'+aLangStrings[80]+'">' + vName + '</span>&nbsp;<span class ="ttq_village_name ttq_village_coords" title="'+aLangStrings[81]+'" onclick="window.location = \'' + window.location.origin + '/position_details.php?x='+tX+'&y='+tY+'\';return false;" >(' + tX + '|' + tY + ')</span>';
		myPlaceNames[parseInt(villageID)] = vName;  // village id
		myPlaceNames[tX+" "+tY] = vName;
		n8++;
	}
	var iSiteId = crtPath.split("?id=");
	if ( iSiteId.length > 1 ) iSiteId = parseInt(iSiteId[1]);
	// Grab Building site id while we are here... if its there.
	if ( isNaN(iSiteId) || iSiteId < 0 ) iSiteId = getSiteId();
	//Grab any other place (village) names I can see here and save them
	var otherPlaceNames = ttqTrimData(getVariable("OTHER_PLACE_NAMES", ""),MAX_PLACE_NAMES,false,"↨⌂₧☻");
	if ( window.location.href.indexOf("position_details") != -1 ) {
		tA = $gc("coordText");
		tX = $gc("coordinateX");
		tY = $gc("coordinateY");
		if ( tA.length > 0 && tX.length > 0 && tY.length > 0 ) {
			tX = parseInt(tX[0].innerHTML.onlyText().replace("(",""));
			tY = parseInt(tY[0].innerHTML.onlyText().replace(")",""));
			if ( typeof ( myPlaceNames[tX+" "+tY] ) == "undefined" ) {
				for ( m8 = 0, l8 = otherPlaceNames.length ; m8 < l8 ; ++m8 ) {
					vName = otherPlaceNames[m8].split("|");
					if ( parseInt(vName[0]) == tX && parseInt(vName[1]) == tY ) {
						otherPlaceNames.splice(m8,1);
						break;
					}
				}
				otherPlaceNames.push(tX+"|"+tY+"|"+tA[0].innerHTML.onlyText());
			}
		}
	}
	if ( otherPlaceNames.length > 0 ) setVariable("OTHER_PLACE_NAMES", otherPlaceNames.join("↨⌂₧☻"));
	var tOpts = getAllOptions();
	var isMinimized = tOpts["LIST_MINIMIZED"] == "true" ? true : false;
	var isHistoryMinimized = tOpts["LIST_HISTORY_MINIMIZED"] == "true" ? true : false;
	// GetRace
	detectTribe();
	//Set History length
	var iHistoryLength = parseInt(tOpts["HISTORY_LENGTH"]);
	if (isNaN (iHistoryLength) || iHistoryLength < 0 ) iHistoryLength = 50;
	// Set Tab ID
	myID = Math.round(Math.random()*1000000000);
	setVariable("TTQ_TABID", myID);
	// Grab Resource Names
	var stockBar = $id('send_select');
	if (stockBar) {
		tA = $gc("nam",stockBar);
		if (tA.length == 4) {
			for (var i=0; i<4; i++) {
				aLangResources[i] = tA[i].textContent.onlyText().trim();
			}
		}
	}
	// Grab Troop Names
	var aLangTroops = nLangTroops[iMyRace];
	tA = getVariable("TROOP_NAMES", "");
	if ( tA == "" ) getTroopNames();
	else {
		aLangTroops = tA.split("|");
		isTroopsLoaded = true;
	}
	// Images
    var sCloseBtn = "data:image/png;base64,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";
    var sDeleteBtn = "data:image/gif;base64,R0lGODlhEAAMAIABAP8AAP///yH5BAEKAAEALAAAAAAQAAwAAAIfTICmu5j8lAONMuOwvTLzun3HJI5WBKGotrYrlpZBAQA7";
    var sTitleBarLogo = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEwAAAASCAAAAAGjf1fmAAAAAnRSTlMA/1uRIrUAAAAJcEhZcwAACxIAAAsSAdLdfvwAAARJSURBVHicfVNbUFpXFN1cDgqoF0FBQAUEEfGF1QSxRJNYk9pEzaSpbZpxknamM23/O/npd2c6nU6+k49+2E6jM7GdamyStoltjRot8RF8IAEUEBV5ySOAF3n0gpqmr6yZe84++669zzr77INSNhDDeE3+UjUKioc9JQJD82MdwqEboEgGVwClNoUAe4gCyDjYGinY6oIhpPgU0hg9h1LgnupK2ztsctDx7VpAu3Q9rY+7dBaTb00Sl456bDoRyRttS1FISmS1mP2wxSIDQKBrA4qPA+ClsxdbYgLyL/JWXuPn8+z1M439QZ+hx7AQLkK0VN1TFRnR+DXx3ceuiLsgIScFtrdDNRlxmfxKvvwkHZsCWJUCjON1cIBnuQBzFCk+2wALO80WmixNAzAojTxfo90LmJ1v1oKTbxPf5RfjA28nFur1nnhpgL5HRYs13HuakdbAGj3gzbcyowx9SP5Ft3+8QoKNdIJiivPVxY2HvagGCjugF6DjcM/TAFf3Le6tHuNRZi3wqjLaiLmUCnaKD3lg3KgrJPUa2HwImMWFsK8tka0BA1HwnGVVKAgdAyxKgLts7tYhjWITh2RZpB3LytBcbNajExnre3XJo2bYp4VpeOKmpCwvhuNLORwcnOp1a7MpawNkAxfdC5xQMsCJhdDKZvx0lOePBSNBD3tF43FT+aWDFG7ebBNZYS53DCYx7WQFqnBp4dr5Fa/dXy80BbeyS+jTzPj2j6pYzFMLcNvnEK5N5WYjUysMdVa5t5tWHZZKvtKZTeOGGpwdcYokGWHqO0d2CxDRwEcKgHMAxwEqMlr5ANKDE2ODZ5RPuuDgCP+Py2t9Hx6Y6fKSCLro1IDPTLBc4hx17r8CHFQa4XOb85OuSkYLwARHgZFe3xM7IWhcreIc0vb3fOYkhQmgmHwd/wVfHgugOFVUiqdXexNaGjlNeltzeql3jNV58LdkhD88tHecO8qtPXT/rmb8lSsUcLjR2cTwyUyuyOP0PW4Ov8taKqeaq6I8eCEZ4ZgXNpS8AvBgbWxeANMXZqto1tZxbLmnT64RQmh1WVtWRjZRv3rRu6ciKq/X/9RONc18BFAdCJSPm5IOiTEVVm0WrwHSy2T2Iy57M0yY8PdvntC/8/OZxUjbYNfEpfuvG7H4agWzRqRnyGEgqDu2q7Aqb2cV5lIjf7yVVsLaHk3VGeFGS6jcTlxv0iBGEtS6iJz4Bgm7f7swJ+5/b9nZeuPKWPkPry1WMimQlNt+TWo3vn0VOzLnMW9bZf6oEnZF2enqzIsx0VPpg89vSTdEo59ZcSQP2OLCoIfywbQQUpYoOho9dj9XM0eZOu/gqciO2QqDyD+jvOpzrSSkrHCjQUu+Dk7pnXoswWtKoPUce4WeH8QcVZYahIDF2q9eE8BJcqpON54w7eBm3IKD4nLefE4jIZH8sqBZh8gb2Iu3/rJ2fClOnTLign/4/gQqw6wmWh5IVAAAAABJRU5ErkJggg%3D%3D";
    var sTimerFormBackground = "data:image/png;base64,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%3D";

    //Styles
    var cssStyle = "";
cssStyle += "#ttq_tasklist, #ttq_history {position:absolute; background-color: #ffffff; max-width: 800px; color:#000000; border:1px solid #C0C0C0;padding:5px 0 2px 0; z-index:501; border-radius:10px;}";
cssStyle += "#ttq_flush_history {text-align:center;color:#71D000;cursor:pointer;font-weight:bold;font-size:14px;font-family:'Lucida Sans Unicode','Arial';} #ttq_flush_history:hover {color:#00BF00}";
cssStyle += ".ttq_tasklist_row {padding:1px 10px;}";
cssStyle += ".ttq_history_row {padding:1px 5px 1px 10px;border-style:dashed;border-color:grey;border-width:0px 0px 1px 0px;}";
cssStyle += ".ttq_village_name {font-weight:bold;cursor:pointer;font-size:11px;font-family:'Lucida Sans Unicode','Arial'} .ttq_village_name:hover {color:#00BF00}";
cssStyle += ".ttq_village_coords { } .ttq_village_coords:hover {color:#00BF00}";
cssStyle += ".ttq_draghandle { font-weight:bold; color:black; border-bottom:1px solid #C0C0C0; height:20px; padding-left:11px;}";
cssStyle += ".ttq_time_village_wrapper {font-weight:bold; font-size:80%;} .ttq_time_village_wrapper:hover {color:#00BF00}";
cssStyle += ".ttq_close_btn {float:"+docDir[1]+"; margin-"+docDir[1]+":-10px; cursor:pointer}";
cssStyle +=	"#timerForm {padding:0px 20px 10px 20px; }";
cssStyle += "#timerform_wrapper {position:absolute; width:550px !important; margin:0; background:url(" + sTimerFormBackground + ") no-repeat center center; background-color: #FFFFFF; color: black; border: 1px #59D72F solid; z-index: 502; border-radius:8px;}";
cssStyle += "#timerform_wrapper p { margin:5px; }";
cssStyle +=	"#ttq_message {position:absolute; z-index:503; border:1px solid #71D000; padding:10px 20px; color:black; width:335px; border-radius:10px;}";
cssStyle += ".handle {cursor: move;}";
cssStyle += "#ttq_tasklist_sortlinks {border-bottom:1px solid #C0C0C0; margin-bottom: 5px; padding:0;}";
cssStyle += ".ttq_tasklist_sortlinks_header {padding-"+docDir[0]+": 10px; background-color: #e0e0e0;}";
cssStyle += ".ttq_tasklist_sortlinks_child {border-left: 1px solid #C0C0C0; text-align: center; background-color: #e0e0e0; cursor: pointer;}";
cssStyle += ".ttq_tasklist_sortlinks_child:hover {background-color: #efefef;}";
cssStyle += ".ttq_tasklist_sortlinks_child_active {border-left: 1px solid #C0C0C0; text-align: center; background-color: #ffffff; cursor: pointer;}";
cssStyle += ".ttq_sort_header {font-style:italic;font-weight:bold;color:red;}";
cssStyle += ".ttq_research_later {display:block;}";
cssStyle += "#sortLinkWrapper{border-bottom:1px dashed #000000;}";

cssStyle += "#ttq_tasklist{width:640px;max-width:calc(100vw - 24px);max-height:72vh;overflow:auto;padding:0;background:#f4f7f5;border:1px solid #cad8ce;box-shadow:0 10px 32px #0002;font:13px/1.5 Arial,sans-serif;color:#20382b} #ttq_tasklist .ttq_draghandle{height:auto;padding:10px 14px;background:#254c39;color:white} #ttq_tasklist .ttq_tasklist_row{padding:9px 12px;border-bottom:1px solid #e1e8e3;overflow-wrap:anywhere} #ttq_tasklist .ttq_tasklist_row:hover{background:#eaf3ed} .ttq_farm_group{margin:8px;border:1px solid #cfddd3;border-radius:8px;background:white;overflow:hidden} .ttq_farm_group summary{cursor:pointer;padding:12px;overflow-wrap:anywhere} .ttq_farm_group summary strong{font-size:14px} .ttq_farm_village{margin-left:12px;color:#617368} .ttq_farm_meta{display:block;color:#52675a;margin-top:5px;font-size:12px;font-variant-numeric:tabular-nums} .ttq_queue_tools{padding:12px;display:grid;gap:8px;color:#52675a} .ttq_queue_tools input{box-sizing:border-box;width:100%;padding:8px;border:1px solid #bacdbf;border-radius:6px;background:white} #ttq_tasklist [hidden]{display:none!important} #ttq_tasklist a[istask]{cursor:pointer;display:inline-block;padding:5px} #timerform_wrapper{background:#fff!important;border:1px solid #c5d7ca;box-shadow:0 12px 40px #0003;max-width:calc(100vw - 24px);font:13px/1.6 Arial,sans-serif} #timerForm input,#timerForm select{border:1px solid #b8cbbb;border-radius:5px;padding:6px;box-sizing:content-box} #timerForm .ttq_duration{padding:12px;background:#edf5ef;border-radius:8px;margin:12px 0} .ttq_duration span{font-size:12px;color:#536a5b} #timerForm #submitBtn{background:#285c3d!important;color:white;padding:8px 22px;cursor:pointer} #ttq_tasklist input:focus-visible,#timerForm input:focus-visible, .ttq_farm_group summary:focus-visible{outline:2px solid #398654;outline-offset:2px}";
cssStyle += "#ttq_tasklist{width:760px}.ttq_village_dashboard{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:10px}.ttq_village_tile{background:#fff;border:1px solid #d6e1da;border-radius:7px;padding:10px;font-size:12px;line-height:1.7;overflow-wrap:anywhere}.ttq_village_title{font-weight:bold;font-size:14px}.ttq_village_average{font-weight:bold;margin-top:5px}.ttq_overview_note{font-size:11px;color:#627469}.ttq_countdown{display:block;font-weight:bold;color:#285c3d;font-variant-numeric:tabular-nums;margin-top:5px}.ttq_due,.ttq_timing_notice{color:#92500b}.ttq_timing_notice{background:#fff6e4;padding:3px 6px;border-radius:4px;margin-top:5px}";
cssStyle += "#ttq_tasklist .ttq_farm_wave{display:flex;align-items:center;gap:12px;padding:6px 12px}#ttq_tasklist .ttq_farm_wave .ttq_time_village_wrapper{flex:0 0 auto;font-size:12px;font-variant-numeric:tabular-nums} .ttq_wave_name{flex:1;min-width:0;overflow-wrap:anywhere}#ttq_tasklist .ttq_farm_wave a[istask]{flex:0 0 auto}";
cssStyle += "#ttq_tasklist .ttq_farm_group{margin:5px 8px}#ttq_tasklist .ttq_farm_group summary{padding:7px 10px;display:block;position:relative;padding-left:25px;line-height:1.4}#ttq_tasklist .ttq_farm_group summary:before{content:'▸';position:absolute;left:9px;top:7px}#ttq_tasklist .ttq_farm_group[open] summary:before{content:'▾'}.ttq_farm_headline{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap}.ttq_farm_headline .ttq_farm_title{flex:1;min-width:100px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px}.ttq_farm_headline .ttq_countdown{display:inline;margin:0;font-size:12px;white-space:nowrap}.ttq_inline_stat{font-size:12px;white-space:nowrap}.ttq_farm_timing{display:flex;flex-wrap:wrap;gap:4px 14px;margin-top:3px;color:#344c3d}#ttq_tasklist .ttq_farm_timing strong{font-size:12px;font-weight:700}.ttq_farm_context{display:block;font-size:11px;color:#627469;margin-top:2px}";
cssStyle += "#ttq_tasklist .ttq_simple_task{margin:5px 8px;padding:8px 10px;background:white;border:1px solid #cfddd3;border-radius:7px;gap:10px} .ttq_simple_task .ttq_wave_name{display:flex;flex-wrap:wrap;align-items:baseline;gap:5px 10px}.ttq_task_kind{font-size:12px;color:#285c3d}.ttq_task_subject{font-size:12px}#ttq_tasklist .ttq_simple_countdown{font-size:11px;margin:0;max-width:170px;text-align:right}#ttq_tasklist .ttq_simple_task .ttq_time_village_wrapper{font-size:12px}";
cssStyle += "#ttq_tasklist .ttq_remove_all{border:1px solid #e0bcbc;border-radius:5px;background:#fff7f7;color:#9b3434;font:11px Arial,sans-serif;padding:4px 7px;cursor:pointer;white-space:nowrap}#ttq_tasklist .ttq_remove_all:hover{background:#fbe3e3}#ttq_tasklist .ttq_remove_all:focus-visible{outline:2px solid #9b3434;outline-offset:2px}";
cssStyle += "#ttq_tasklist{resize:both;overflow:auto;box-sizing:border-box;min-width:300px;min-height:140px;max-width:calc(100vw - 24px);max-height:calc(100vh - 24px);padding-bottom:12px}#ttq_tasklist.ttq_minimized{resize:none;min-width:0;min-height:0;padding-bottom:0}#ttq_tasklist::-webkit-resizer{background:linear-gradient(135deg,transparent 45%,#527b60 46%,#527b60 55%,transparent 56%,transparent 65%,#527b60 66%,#527b60 75%,transparent 76%)}";
TTQ_addStyle(cssStyle);
}
// *** End of Initialization and Globals ***

