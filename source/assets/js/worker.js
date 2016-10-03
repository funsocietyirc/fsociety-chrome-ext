/*----------------------------------------------------------------------------- 
#TheZone Kick Lotto Stats Extension for Google Chrome

version:   1.14
date:      2013-01-04
author:    Jorje Nava (Tweak) & Jay Baldwin IV (Darc)
irc:       irc.tzirc.com #TheZone
website:   tzirc.com

version history: 

DATE         AUTHOR     CHANGES
2010-12-01   JANJR      Initial version
2010-12-14   JJBIV      Updated GUI elements.  Single worker file.
2013-01-04   JJBIV      Updated to reflect Chrome extension changes, required by Google
-----------------------------------------------------------------------------*/



/* Inline Code
-----------------------------------------------------------------------------*/

var notification;
var nick = (!localStorage["nick"]) ? "botto" : localStorage["nick"];

if (!localStorage["kicks"]) localStorage["kicks"] = 0;



/* Initilization & Refreshing
-----------------------------------------------------------------------------*/

function initPopup() {
	getStatsTopTen(setPopup);
}


function initBackground() {
	RefreshBackground();
	intervalTimerId = setInterval(function() { RefreshBackground(); }, 1000*30*60);
}


function RefreshPopup() {
	var div = document.getElementById('divTable'); //document.createElement("div");
	div.innerHTML = '';

	var divMessage = document.getElementById('divMessage');
	divMessage.innerHTML = "";
	
	initPopup();
}


function RefreshBackground() {
	getStatsByNick(setBadge);
}



/* Localization
-----------------------------------------------------------------------------*/

function getMessage(strKey) {
	return chrome.i18n.getMessage(strKey);
}

function TextifyElement(strId, strMessageKey) {
	var el = document.getElementById(strId);
	el.innerHTML = getMessage(strMessageKey);
}



/* Notification Creation
-----------------------------------------------------------------------------*/

function createNotification(strTitle, strMessage) {
	if (notification) notification.cancel();
	notification = webkitNotifications.createNotification(
	  'imgs/icon_128.png',
	  strTitle,
	  strMessage
	);
}



/* Designer Callbacks
-----------------------------------------------------------------------------*/

function setBadge(HttpResponse) {
	if (!localStorage["nick"] || !HttpResponse) return;
	
	var rows = HttpResponse.split(";");
	var cols = rows[1].split(",");
	chrome.browserAction.setBadgeText({text: cols[1]});
	
	//localStorage["kicks"] = 0; // Testing the notification after changing the message handler
	
	if (localStorage["kicks"] != cols[1])
	{
		createNotification(getMessage("tzks_notification_title"), getMessage("tzks_notification_kickedmessage").replace('##kicksold##', localStorage["kicks"]).replace('##kicksnew##', cols[1]));
		notification.show();
		
		setTimeout("notification.cancel();", 1000*5);
		
		localStorage["kicks"] = cols[1];
	}
}


function setPopup(HttpResponse) {
	TextifyElement("lnkWebchat", "tzks_webchat_text");
	TextifyElement("lnkWeb", "tzks_web_text");
	TextifyElement("spnTitle", "tzks_table_title");
	TextifyElement("spnJoinTheZone", "tzks_jointhezone_text");
	
	var div = document.getElementById('divTable'); //document.createElement("div");
	
	if (!HttpResponse)
	{
		div.innerText = getMessage("tzks_gettop10_error");
		div.style.color = "red";
		document.body.appendChild(div);
		return;
	}

	var rows = HttpResponse.split(";");
	var cols = rows[0].split(',');
	
	var tableHTML = "";
	tableHTML += "<table>";
	tableHTML += "<tr>";
	tableHTML += "<th class=\"colRank\">" + getMessage("tzks_column_rank") + "</th>";
	tableHTML += "<th class=\"colNick\">" + getMessage("tzks_column_nick") + "</th>";
	tableHTML += "<th class=\"colKicks\">" + getMessage("tzks_column_count") + "</th>";
	tableHTML += "<th class=\"colLast\">" + getMessage("tzks_column_lastkicked") + "</th>";
	tableHTML += "</tr>";
	
	for (i = 1; i < rows.length; i++)
	{
		cols = rows[i].split(",");
	
		if (i < 11 || cols[0].toLowerCase() == nick.toLowerCase())
		{
			tableHTML += "<tr";
			tableHTML += (cols[0].toLowerCase() == nick.toLowerCase()) ? " class='selected'" : "";
			tableHTML += ">";
			tableHTML += "<td class=\"colRank\">" + i + ".</td>";
			tableHTML += "<td class=\"colNick\">" + cols[0] + "</td>";
			tableHTML += "<td class=\"colKicks\">" + cols[1] + "</td>";
			tableHTML += "<td class=\"colLast\">" + cols[5].replace(".", " ") + "</td>";
			tableHTML += "</tr>";
		}
	}
	
	tableHTML += "</table>";
	
	div.innerHTML = tableHTML;
	//document.body.appendChild(div);
	
	if (!localStorage["nick"])
	{
		var divMessage = document.getElementById('divMessage');
		divMessage.innerHTML = "<div style=\"color: red; text-align: center; margin-top: 20px;\">" + getMessage("tzks_setnick_text") + "</div>";
		//document.body.appendChild(divError);
	}
}

function main() {
	initPopup();
}

function lnkInfo_Click(e) {
	alert(getMessage('tzks_info'));
}

function lnkRefresh_Click(e) {
	RefreshPopup();
}


// Add event listeners once the DOM has fully loaded by listening for the
// `DOMContentLoaded` event on the document, and adding your listeners to
// specific elements when it triggers.
document.addEventListener('DOMContentLoaded', function () {
  var lnkInfo = document.getElementById('lnkInfo');
  var lnkRefresh = document.getElementById('lnkRefresh');
  
  if (lnkInfo == null || lnkInfo == undefined || lnkRefresh == null || lnkRefresh == undefined) return;
  
  lnkInfo.addEventListener('click', lnkInfo_Click);
  lnkRefresh.addEventListener('click', lnkRefresh_Click);
  main();
});



/* XMLHttpRequest Use
-----------------------------------------------------------------------------*/

// Saving this for later
/*
var httpResponseObject = {
	url: "",
	callback: "",
	returnValue: "",
	getResponse: function()
	{
		var req = new XMLHttpRequest();
		req.open("GET", this.url, true);
		req.onreadystatechange = function()
		{
			if (req.readyState == 4)
			{
				this.callback(req.ResponseText);
			}
		}
		req.send(null);
	}
}
*/

function getStatsByNick(callback) {
	try {
		var req = new XMLHttpRequest();
		req.open("GET", "http://tzirc.com/TheZoneIRC-dll/KickLottoGetStatsByNick.aspx?klaid=2&chan=%23thezone&t=0&nick=" + localStorage["nick"], true);
		req.onreadystatechange = function()
		{
			if (req.readyState == 4)
			{
				callback(req.responseText);
			}
		}
		req.send(null);
	}
	catch(err) { }
}


function getStatsTopTen(callback) {
	try {
		var req = new XMLHttpRequest();
		req.open("GET", "http://tzirc.com/TheZoneIRC-dll/KickLottoGetStatsByNick.aspx?klaid=2&chan=%23thezone&t=0&nick=", true);
		req.onreadystatechange = function()
		{
			if (req.readyState == 4)
			{
				callback(req.responseText);
			}
		}
		req.send(null);
	}
	catch(err) { }
}
