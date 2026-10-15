
// *** Begin Send Merchants Functions ***
function createMarketLinks() {
	_log(2,"CreateMarketLinks> Begin.");
	var tOK = xpath("//form//button[contains(@class,'send')]", $id("content"));
	if( tOK.snapshotLength != 1 ) {
		_log(1,"CreateMarketLinks> This is not the marketplace.");
		return false;
	}
	tOK = tOK.snapshotItem(0);
	var oBtn = generateButton(aLangStrings[16], scheduleMerchant);
	tOK.parentNode.appendChild(oBtn);
	_log(2,"CreateMarketLinks> End.");
}

function scheduleMerchant(e) {
	_log(1,"scheduleMarket> Begin.");
	var basee = $id('marketplaceSendResources');
	var tXX = parseInt($gt('input',$gc('coordinateX',basee)[0])[0].getAttribute("value"));
	var tYY = parseInt($gt('input',$gc('coordinateY',basee)[0])[0].getAttribute("value"));
	var tData = [tXX,tYY,0,0,0,0,iSiteId];

	var tmp,tmp2,isEmpty = true;
	var resnames = ["lumber","clay","iron","crop"];
	for ( var i = 0 ; i < 4 ; ++i ) {
		tmp = $gn(resnames[i],basee)[0];
		tmp2 = parseInt(tmp.value);
		if ( isNaN(tmp2) || tmp2 < 1 ) continue;
		tData[i+2] = tmp2;
		isEmpty = false;
	}
	if ( isNaN(tXX) || Math.abs(tXX) > mapRadius || isNaN(tYY) || Math.abs(tYY) > mapRadius || isEmpty ){
		printMsg(aLangStrings[65], true);
		_log(1, "scheduleMarket> Improper data or building ID not found. End.");
		return false;
	}
	displayTimerForm(7, coordsXYToZ(tXX,tYY), tData);
	_log(2,"scheduleMarket> End.");
}

function merchant(aTask) {
	_log(1,"SendMerchant> Begin. aTask = " + aTask);
	printMsg(aLangStrings[6] + " > 1<br><br>" + getTaskDetails(aTask));
	var opts = aTask[3].split("_");
	var nid = parseInt(aTask[5]);
	var target = parseInt(aTask[2]);
	var sUrl = "build.php?"+(isNaN(nid)?"":("newdid="+nid+"&")) + "t=5&gid=17" + ( (isNaN(target) || target < 1 || target > 641601) ? "" : "&z="+target );
	get(fullName+sUrl, handleMerchantRequest1, aTask);
	_log(2,"SendMerchant> End.");
}

function handleMerchantRequest1(httpRequest, aTask) {
	_log(3,"handleMerchantRequest1> Begin.");
	if (httpRequest.readyState == 4) {
		printMsg(aLangStrings[6] + " > 1 > 2<br><br>" + getTaskDetails(aTask));
		var oldCoords = aTask[3].split("_");
		oldCoords = "(" + oldCoords[0] + "|" + oldCoords[1] + ")";
		var oldName = getVillageNameZ(parseInt(aTask[2]));
		var oldVID = parseInt(aTask[5]);
		if ( isNaN(oldVID) ) oldVID = -2;
		if (httpRequest.status == 200 && httpRequest.responseText ) { // ok
			var sParams = {};
			//var parser = new DOMParser();
			//var holder = parser.parseFromString(httpRequest.responseText, "text/html");
			//var marketForm = holder.getElementById('marketplaceSendResources');
			//var tInputs = marketForm.getElementsByTagName('input');
			//var reqVID = getActiveVillage(holder);
			var opts = aTask[3].split("_");
			sParams = '{"action":"marketPlace","resources":{"lumber":'+opts[2]+',"clay":'+opts[3]+',"iron":'+opts[4]+',"crop":'+opts[5]+'},"destination":{"x":'+opts[0]+',"y":'+opts[1]+'},"runs":1,"useTradeShips":false}';
			/*
			if ( tInputs.length > 3 && holder.getElementsByClassName("gid17").length == 1 && reqVID == oldVID ) {
				var maxM = 20;
				var maxC = 500;
				var resNow = [Infinity,Infinity,Infinity,Infinity];
				tX = [500,1000,750,0,0,500,750,500];
				tY = getOption("RACE", -1, "integer");
				if( tY > -1 ) maxC = tX[tY];
				tX = $gc('merchantsAvailable',holder)[0];
				if( tX ) maxM = parseInt(tX.innerHTML.onlyText());
				tX = $gc('max',holder)[0];
				if( tX ) maxC = parseInt(tX.innerHTML.match(/>\(?(\d+)\)?</)[1]);
				maxC *= maxM;
				_log(3,"Merchants available:"+maxM+", total capacity:"+maxC);
				for( var i = 0; i < 4; i++ ) {
					tX = xpath('.//span[@id="l'+(1+i)+'"]',holder,true);
					if( tX ) {
						tX = tX.innerHTML.split("/");
						tY = parseInt(tX[0]);
						if( !isNaN(tY) ) resNow[i] = tY;
					}
				}
				_log(3,"Resources available:"+resNow.join(','));
				var opts = aTask[3].split("_");
				var tX = 0;
				sParams["x2"] = 1;
				for (var q = 0 ; q < tInputs.length ; ++q) {
					switch ( tInputs[q].id ) {
						case "r1":		if ( parseInt(opts[2]) ) {
											tY = parseInt(opts[2]);
											if( tY > resNow[0] ) tY = resNow[0];
											if( tY + tX > maxC ) tY = maxC - tX;
											tX += tY; opts[2] = tY;
											sParams["r1"] = tY.toString();
										} else {
											sParams["r1"] = "";
										}
										break;
						case "r2":		if ( parseInt(opts[3]) ) {
											tY = parseInt(opts[3]);
											if( tY > resNow[1] ) tY = resNow[1];
											if( tY + tX > maxC ) tY = maxC - tX;
											tX += tY; opts[3] = tY;
											sParams["r2"] = tY.toString();
										} else {
											sParams["r2"] = "";
										}
										break;
						case "r3":		if ( parseInt(opts[4]) ) {
											tY = parseInt(opts[4]);
											if( tY > resNow[2] ) tY = resNow[2];
											if( tY + tX > maxC ) tY = maxC - tX;
											tX += tY; opts[4] = tY;
											sParams["r3"] = tY.toString();
										} else {
											sParams["r3"] = "";
										}
										break;
						case "r4":		if ( parseInt(opts[5]) ) {
											tY = parseInt(opts[5]);
											if( tY > resNow[3] ) tY = resNow[3] - 10;
											if( tY < 0 ) tY = 0;
											if( tY + tX > maxC ) tY = maxC - tX;
											tX += tY; opts[5] = tY;
											sParams["r4"] = tY.toString();
										} else {
											sParams["r4"] = "";
										}
										break;
						default:		if (tInputs[q].name != "action") sParams[tInputs[q].name] = tInputs[q].value;
										break;
					}
				}
				var tSelect = marketForm.getElementsByTagName('select');
				for (var q = 0 ; q < tSelect.length ; q++) {
					sParams[tSelect[q].name] = tSelect[q].options[tSelect[q].selectedIndex].value;
				}
				aTask[3] = opts.join("_");
				aTask[5] = reqVID;
				_log(3,"sParams:"+sParams);
				post(fullName+'api/v1/marketplace/prepare', JSON.stringify(sParams), handleMerchantRequest2, aTask);
				return;
			}
			*/
			_log(3,"sParams:"+sParams);
			put(fullName+'api/v1/marketplace/resources/send', sParams, handleMerchantRequest2, aTask);
			return;

			if ( reqVID != currentActiveVillage ) switchActiveVillage(currentActiveVillage);
			printMsg(getVillageName(oldVID)+ "<br>" + aLangTasks[7] + " >> " + oldName + " " + oldCoords + "<br>" + getMerchantInfo(aTask[3]) + "<br>"+ aLangStrings[73] + " (" + aLangStrings[74]+" "+aLangStrings[11]+ " 1)",true); //Your merchants didnt send. (Server: Redirected)
			_log(1,"Your merchants were not sent. I was redirected before I could send the first request to send the merchant. Server: Redirected 1. From: " + getVillageName(oldVID) + "   To: " +oldName + " " + oldCoords + " carrying " + getMerchantInfo(aTask[3]) );
			addToHistory(aTask, false, aLangStrings[74]+" "+aLangStrings[11] + " 1");
			return;
		}
		switchActiveVillage(currentActiveVillage);
		printMsg(getVillageName(oldVID)+ "<br>" + aLangTasks[7] + " >> " + oldName + " " + oldCoords + "<br>" + getMerchantInfo(aTask[3]) + "<br>"+ aLangStrings[73] + " (" + aLangStrings[74]+" "+aLangStrings[46] + " 1)",true); //Your merchants didnt send. (Server: Page Failed)
		_log(1,"Your merchants were not sent. The server returned a non-200 code (or the request was empty) upon trying to load the marketplace page.  Server: Page Failed 1. From: " + getVillageName(oldVID) + "   To: " + oldCoords + " carrying " + getMerchantInfo(aTask[3]) );
		addToHistory(aTask, false, aLangStrings[74]+" "+aLangStrings[46]+" 1");
	}
}

function handleMerchantRequest2(httpRequest, aTask) {
	if (httpRequest.readyState == 4) {
		printMsg(aLangStrings[6] + " > 1 > 2 > 3<br><br>" + getTaskDetails(aTask));
		var options = new Array();
		options.push(aTask);
		var oldCoords = aTask[3].split("_");
		oldCoords = "(" + oldCoords[0] + "|" + oldCoords[1] + ")";
		var oldVID = parseInt(aTask[5]);
		if ( isNaN(oldVID) ) oldVID = -2;
		var oldName = getVillageNameZ(parseInt(aTask[2]));

		if (httpRequest.status == 200 && httpRequest.responseText) { // ok
			nonceValue = httpRequest.getResponseHeader('X-Nonce');
			var opts = aTask[3].split("_");
			sParams = '{"action":"marketPlace","resources":{"lumber":'+opts[2]+',"clay":'+opts[3]+',"iron":'+opts[4]+',"crop":'+opts[5]+'},"destination":{"x":'+opts[0]+',"y":'+opts[1]+'},"runs":1,"useTradeShips":false}';
			_log(3,"sParams:"+sParams);

			post(fullName+'api/v1/marketplace/resources/send', sParams, handleMerchantRequestConfirmation, aTask);
			return;
			var sParams = {};
			var holder = document.createElement('div');
			var marketData = JSON.parse(httpRequest.responseText);

			var reqVID = aTask[5];
			var tTime = marketData["errorMessage"];
			if ( tTime.length > 0 ) {
				if ( reqVID != currentActiveVillage ) switchActiveVillage(currentActiveVillage);
				_log(1, "handleMerchantRequest2> I could not send the Merchants. Reason: " + tTime);
				printMsg(getVillageName(aTask[5])+ "<br>" + aLangTasks[7] + " >> " + getVillageNameZ(parseInt(aTask[2])) + " " + oldCoords + "<br>" + getMerchantInfo(aTask[3]) + "<br> " + aLangStrings[69] + " (" + tTime +")",true); //Your merchants didnt send. (Server: Redirected)
				addToHistory(aTask, false, tTime);
				return;
			}

			holder.innerHTML = marketData["formular"];
			tTime = holder.getElementsByClassName("res_target");
			sParams["checksum"] = marketData["checksum"];
			var tInputs = holder.getElementsByTagName('input');
			if ( tTime.length > 0 && tInputs.length > 4 && reqVID == oldVID) {
				tTime = tTime[0].getElementsByTagName("td");
				options.push(parseInt(tTime[2].innerHTML.replace(/:/g,""),10));
				options.push(tTime[0].getElementsByClassName("coordinates coordinatesWrapper")[0].innerHTML);
				for (var q = 0 ; q < tInputs.length ; ++q) {
					if( tInputs[q].name == "dname" ) continue;
					if( tInputs[q].name == "checksum" ) continue;
					if( tInputs[q].name == "action" ) { sParams["action"] = "traderoute"; continue; }
					if( tInputs[q].name == "x2" ) {
						if (tInputs[q].checked) {
							sParams["x2"] = "2";
						} else {
							sParams["x2"] = "1";
						}
						continue;
					}
					sParams[tInputs[q].name] = tInputs[q].value;
				}
				var opts = aTask[3].split("_");
				sParams["r1"] = parseInt(opts[2]) ? opts[2] : ""; sParams["r2"] = parseInt(opts[3]) ? opts[3] : ""; sParams["r3"] = parseInt(opts[4]) ? opts[4] : ""; sParams["r4"] = parseInt(opts[5]) ? opts[5] : "";
				_log(3,"sParams:"+sParams);
				post(fullName+'api/v1/marketplace/prepare', JSON.stringify(sParams), handleMerchantRequestConfirmation, options);
				return;
			}
			if ( reqVID != currentActiveVillage ) switchActiveVillage(currentActiveVillage);
			printMsg(getVillageName(oldVID)+ "<br>" + aLangTasks[7] + " >> " + options[2] + " " + oldCoords + "<br>" + getMerchantInfo(aTask[3]) + "<br>"+ aLangStrings[73] + " (" + aLangStrings[74]+" "+aLangStrings[11] + " 2)",true); //Your merchants didnt send. (Server: Redirected)
			_log(1,"Your merchants were not sent. I was redirected before I could send the final request to send the merchant. Server: Redirected 2. From: " + getVillageName(oldVID) + "   To: " +options[2] + " " + oldCoords + " carrying " + getMerchantInfo(aTask[3]) );
			addToHistory(aTask, false, aLangStrings[74]+" "+aLangStrings[11]+" 2");
			return;
		}
		switchActiveVillage(currentActiveVillage);
		printMsg(getVillageName(oldVID)+ "<br>" + aLangTasks[7] + " >> " + oldName +" "+ oldCoords + "<br>" + getMerchantInfo(aTask[3]) + "<br>"+ aLangStrings[73] + " (" + aLangStrings[74]+" "+aLangStrings[46] + " 2)",true); //Your merchants didnt send. (Server: Page Failed)
		_log(1,"Your merchants were not sent. The server returned a non-200 code (or the request was empty) before I could send the final request to send the merchant.  Server: Page Failed 2. From: " + getVillageName(oldVID) + "   To: " + oldCoords + " carrying " + getMerchantInfo(aTask[3]) );
		addToHistory(aTask, false, aLangStrings[74]+" "+aLangStrings[46]+" 2");
	}
}

function handleMerchantRequestConfirmation(httpRequest, options) {
	_log(2,"handleMerchantRequestConfirmation> Begin. options = " + options);
	if (httpRequest.readyState == 4) {
		var aTask = options;
		var oldName = getVillageNameZ(parseInt(options[2]));
		var oldCoords = aTask[3].split("_");
		oldCoords = "(" + oldCoords[0] + "|" + oldCoords[1] + ")";
		var oldVID = parseInt(aTask[5]);
		if ( isNaN(oldVID) ) oldVID = -2;
		if ( httpRequest.status == 200 || httpRequest.status == 204 ) { // ok
			printMsg(getVillageName(oldVID)+ "<br>" + aLangTasks[7] + " >> " + oldName + " " + oldCoords + "<br>" + getMerchantInfo(aTask[3]) ); //Your merchants were sent.
			_log(1,"Your merchants were sent. From: " + getVillageName(oldVID) + "   To: " +oldName + " " + oldCoords + " carrying " + getMerchantInfo(aTask[3]) );
			addToHistory(aTask, true);
			return
			var holder = document.createElement('div');
			var marketData = JSON.parse(httpRequest.responseText);

			holder.innerHTML = marketData["formular"];
			var reqVID = aTask[5];
			if ( reqVID != currentActiveVillage ) switchActiveVillage(currentActiveVillage);
			if ( marketData["notice"].length > 0 ) {
				if(	marketData["errorMessage"].length == 0 ) {
					printMsg(getVillageName(oldVID)+ "<br>" + aLangTasks[7] + " >> " + oldName + " " + oldCoords + "<br>" + getMerchantInfo(aTask[3]) ); //Your merchants were sent.
					_log(1,"Your merchants were sent. From: " + getVillageName(oldVID) + "   To: " +oldName + " " + oldCoords + " carrying " + getMerchantInfo(aTask[3]) );
					addToHistory(aTask, true);
				} else {
					printMsg(getVillageName(oldVID)+ "<br>" + aLangTasks[7] + " >> " + oldName + " " + oldCoords + "<br>" + getMerchantInfo(aTask[3]) + "<br>"+aLangStrings[50]+" ("+aLangStrings[75]+")",true); //Your merchants didnt send. Confirmation failed
					_log(1,"Your merchants were NOT sent. Didnt see it on marketplace, could have actually been successfull if there was a long delay. Confirmation Failed.From: " + getVillageName(oldVID) + "   To: " +oldName + " " + oldCoords + " carrying " + getMerchantInfo(aTask[3]) );
					addToHistory(aTask, false, aLangStrings[75]);
				}
			} else {
				printMsg(getVillageName(oldVID)+ "<br>" + aLangTasks[7] + " >> " + oldName + " " + oldCoords + "<br>" + getMerchantInfo(aTask[3]) + "<br>"+ aLangStrings[73] + " (" +aLangStrings[75]+", "+ aLangStrings[74]+" "+aLangStrings[11] + " 3)",true); //Your merchants didnt send. (Server: Redirected)
				_log(1,"Request sent, however, I am unable to confirm it. My confirmation page was redirected. Confirmation Failed, Server: Redirected 3. From: " + getVillageName(oldVID) + "   To: " +oldName + " " + oldCoords + " carrying " + getMerchantInfo(aTask[3]) );
				addToHistory(aTask, false, aLangStrings[75] + ", " +aLangStrings[74]+" "+aLangStrings[11] + " 3");
			}
			return;
		}
		switchActiveVillage(currentActiveVillage);
		printMsg(getVillageName(oldVID)+ "<br>" + aLangTasks[7] + " >> " + oldName + " " + oldCoords + "<br>" + getMerchantInfo(aTask[3]) + "<br>"+ aLangStrings[50] +" " + aLangStrings[73] + " (" + aLangStrings[75] + ", " + aLangStrings[74]+" "+aLangStrings[46] + " 3)",true); //Your merchants didnt send. (Server: Page Failed)
		_log(1,"Request sent, however, I am unable to confirm it. The server returned a non-200 code (or the request was empty) after I sent the request. Confirmation Failed, Server: Page Failed 3. From: " + getVillageName(oldVID) + "   To: " +oldName + " " + oldCoords + " carrying " + getMerchantInfo(aTask[3]) );
		addToHistory(aTask, false, aLangStrings[75] + ", " + aLangStrings[74]+" "+aLangStrings[46]+" 3");
	}
}
// *** End Send Merchant Functions ***
// ****** END TTQ TASK FUNCTIONS ******
