/*----------------------------------------------------------------------------- 
#fsociety Extension for Google Chrome

file version:   0.5
date:           2016-10-03
author:         David Richer (IronY) & Jay Baldwin (Darc)
irc:            irc.freenode.net #fsociety
website:        fsociety.guru

version history: 

DATE         AUTHOR     CHANGES
2016-10-03   JJBIV      Initial version
-----------------------------------------------------------------------------*/

"use strict";

var fsext = {
    
    API_TIMEOUT: 5,                         // number of seconds required between user-initiated API calls
    STORAGE_LIFETIME: (1*60),               // number of seconds before internal data is considered stale and needs to be refreshed 
    ENABLE_LOG: true,
    STORAGE_KEY_USERTOKEN: "userToken",
    STORAGE_KEY_API_URLS_LAST_CALL: "api_urls_last_call",
    STORAGE_KEY_API_URLS_DATA: "api_urls_data",

    api_urls: {
        urls: "https://bot.fsociety.guru/api/urls"
    },
        
    log: function(str) {
        if (fsext.ENABLE_LOG !== true) return;
        
        if (typeof (console) === 'undefined' || typeof (console.log) === 'undefined') return;
        console.log(str);
    },

    // helpers to access chrome localStorage
    storage: {
        set: function (key, obj) {
            fsext.log("fsext.storage.set();");
            let values = JSON.stringify(obj);
            localStorage.setItem(key, values);
        },

        get: function (key) {
            fsext.log("fsext.storage.get();");
            if (localStorage.getItem(key) == null) return false;
            return JSON.parse(localStorage.getItem(key));
        },

        update: function (key, newData) {
            fsext.log("fsext.storage.update();");
            if (localStorage.getItem(key) == null) return false;

            let oldData = JSON.parse(localStorage.getItem(key));
            for (keyObj in newData) {
                oldData[keyObj] = newData[keyObj];
            }
            let values = JSON.stringify(oldData);
            localStorage.setItem(key, values);
        }
    },


    // API methods for calling MrNodeBot's features! :)
    api: {
        urlsGetMostRecent: function (intNumberToGet, fnc_callback) {
            fsext.log("fsext.api.urlsGetMostRecent();");

            // TODO - escape API calls if too many too quickly.
            
            let strApiUrl = fsext.api_urls.urls;
            fsext.log("fsext.api.urlsGetMostRecent() - sending API request to " + strApiUrl);
            
            // initiate the api call
            try {
                let req = new XMLHttpRequest();
                req.open("GET", strApiUrl, true);
                req.onreadystatechange = function() {
                    if (req.readyState == 4) {
                        let data = req.responseText;
                        if (typeof (data) === 'undefined' || data.length == 0) return;
                        fsext.log("fsext.api.urlsGetMostRecent() - reqeuest received -- " + data.length.toString() + " characters long");
                        let jsonData = JSON.parse(data);
                        fnc_callback(jsonData);
                    }
                }
                req.send(null);
            }
            catch(err) { }
        }
    },


    // this function used for chrome localization
    localization: {
    
        replace_i18n: function (obj, tag) {
            fsext.log("fsext.localization.replace_i18n();");
            let msg = tag.replace(/__MSG_(\w+)__/g, function(match, v1) {
                return v1 ? chrome.i18n.getMessage(v1) : '';
            });

            if (msg !== tag) obj.innerHTML = msg;
        },


        // chrome extension default for non-hosted set
        localizeHtmlPage: function () {
            // Localize using __MSG_***__ data tags
            let data = document.querySelectorAll('[data-localize]');

            for (let i in data) if (data.hasOwnProperty(i)) {
                let obj = data[i];
                let tag = obj.getAttribute('data-localize').toString();

                fsext.localization.replace_i18n(obj, tag);
            }

            // Localize everything else by replacing all __MSG_***__ tags
            let page = document.getElementsByTagName('html');

            for (let j = 0; j < page.length; j++) {
                let obj = page[j];
                let tag = obj.innerHTML.toString();

                fsext.localization.replace_i18n(obj, tag);
            }
        },

    },

    
    // this section used with popup.html
    popup: {
            
        init: function () {
            fsext.log("fsext.popup.init();");
            fsext.localization.localizeHtmlPage();

            let strUserToken = localStorage[fsext.STORAGE_KEY_USERTOKEN];
            let blnUserAuthenticated = (strUserToken && strUserToken.replace(" ","").length > 0);
            fsext.log((blnUserAuthenticated ? "User Token is: " + strUserToken : "NO USER TOKEN SPECIFIED!"));

            // escape so we don't let the users do more, cool things. 
            if (!blnUserAuthenticated) return;

            // If you pass here, the script believes you're authenticated.  
            // TODO: I'm planning to auth the user token on save, at which point I think
            // we can trust that you're a real user.  We optionally may want to re-check every 
            // 50th hit to verify we didn't turn the user token off on the back-end.

            let gate = document.getElementById('gate');
            let authed = document.getElementById('authed');
            gate.style.display = 'none';
            authed.style.display = 'block';

            let lnkInfo = document.getElementById('lnkInfo');
            lnkInfo.onclick = function () { alert(chrome.i18n.getMessage("fsext_info")); };
            let lnkRefresh = document.getElementById('lnkRefresh');
            lnkRefresh.onclick = fsext.popup.refresh;

            fsext.popup.refresh();
        },

        reloadLinks: function (blnForceCacheOverride) {
            fsext.log("fsext.popup.reloadLinks();");

            let blnPerformRefresh = false;

            if (localStorage[fsext.STORAGE_KEY_API_URLS_DATA] == null || localStorage[fsext.STORAGE_KEY_API_URLS_LAST_CALL] == null) {
                fsext.log("fsext.popup.reloadLinks() - api not called before - setting blnPerformRefresh to true.");
                blnPerformRefresh = true;
            }
            else if (blnForceCacheOverride !== true) {

                let dttmNow = new Date(); // get the date to compare with the last one.
                let dttmLastChecked = (localStorage[fsext.STORAGE_KEY_API_URLS_LAST_CALL] != null ? new Date(parseInt(localStorage[fsext.STORAGE_KEY_API_URLS_LAST_CALL])) : new Date((new Date()).getFullYear(), 0, 1));

                fsext.log("fsext.popup.reloadLinks() - data last refreshed: " + dttmLastChecked);

                let blnPerformRefresh = blnForceCacheOverride || false;

                if ((dttmLastChecked.getTime() + (fsext.STORAGE_LIFETIME*1000)) <= dttmNow) {
                    fsext.log("fsext.popup.reloadLinks() - stored data is stale... refresh it!");
                    blnPerformRefresh = true; 
                }

            } 

            if (blnPerformRefresh !== true) {
                fsext.log("fsext.popup.reloadLinks() - using stored data - it's newish!");
                fsext.popup.linksRender(fsext.storage.get(fsext.STORAGE_KEY_API_URLS_DATA))
            }
            else {
                fsext.log("fsext.popup.reloadLinks() - stored data is about to be refreshed!");
                let fnc_callback = function(jsonData) {
                    fsext.popup.linksRender(jsonData);
                    fsext.storage.set(fsext.STORAGE_KEY_API_URLS_DATA, jsonData);
                    localStorage[fsext.STORAGE_KEY_API_URLS_LAST_CALL] = new Date().getTime();
                };
                fsext.api.urlsGetMostRecent(0, fnc_callback);
            }
        },

        refresh: function (blnForceCacheOverride) {
            fsext.log("fsext.popup.refresh();");
            let lt = document.getElementById('links-table');
            lt.innerHTML = '';
            fsext.popup.reloadLinks(blnForceCacheOverride);
        },

        linksRender: function (jsonData) {
            //fsext.log(jsonData);

            if (jsonData === null || typeof (jsonData) === 'undefined') jsonData = fsext.storage.get(fsext.STORAGE_KEY_API_URLS_DATA);

            let channel = document.getElementById('hfChannel').value;

            let lt = document.getElementById('links-table');
            let ltt = document.getElementById('links-table-template');
            let TEMPLATE = ltt.innerHTML;
            let compiled_links = "";

            let channels = new Array();
            let filter_channels = document.getElementById('dynamic-channels');
            filter_channels.innerHTML = '';

            
            for (let i = 0; i < jsonData.results.length; i++) {
                let link = jsonData.results[i];

                if (channels.indexOf(link.to) === -1) {
                    channels.push(link.to);
                    filter_channels.innerHTML += '<span class="filter-option" data-value="' + link.to + '">' + link.to + '</span>';
                }
                
                if (channel != 'all' && link.to != channel) continue;

                if (link.title === null || typeof (link.title) === 'undefined') {
                    link.title = (link.url.length < 67 ? link.url : "No title - hover to see URL");
                }

                let str = TEMPLATE;      
                str = str.replace(/##DTTM##/g, new Date(link.timestamp).toLocaleDateString() + " " + new Date(link.timestamp).format("H:MM"));
                str = str.replace(/##NICK##/g, link.from);
                str = str.replace(/##URL##/g, link.url);
                str = str.replace(/##TITLE##/g, link.title);

                compiled_links += str;
            }

            let els = document.querySelectorAll(".filter-option:not([onclick])");
            for (let i = 0; i < els.length; i++) {
                els[i].addEventListener("click", function(e) {
                    let chan = e.target.getAttribute('data-value');
                    fsext.popup.changeChannelFilterLinks(chan);
                });
            }

            
            els = document.querySelectorAll(".filter-option");
            for (let i = 0; i < els.length; i++) {
                let el = els[i];
                let chan = el.getAttribute('data-value');

                if (chan.toLowerCase() == channel.toLowerCase()) el.classList.add('selected');
                else if (chan.toLowerCase() != channel.toLowerCase()) el.classList.remove('selected');
            }

            lt.innerHTML = compiled_links;
        },

        changeChannelFilterLinks: function (channel) {
            fsext.log("fsext.popup.changeChannelFilterLinks(); - channel: " + channel);

            document.getElementById('hfChannel').value = channel;

            fsext.popup.reloadLinks();
        }
        
    },

    
    // this section used with options.html
    options: {
            
        init: function () {
            fsext.log("fsext.options.init();");
            fsext.localization.localizeHtmlPage();
            
            // Add event listeners once the DOM has fully loaded by listening for the
            // `DOMContentLoaded` event on the document, and adding your listeners to
            // specific elements when it triggers.
            document.addEventListener('DOMContentLoaded', fsext.options.onDOMContentLoaded);
        },
        
        onDOMContentLoaded: function () {
            fsext.log("fsext.options.onDOMContentLoaded();");
            //btnSave
            document.getElementById('btnSave').addEventListener('click', function (e) { fsext.options.saveSettings(); });
            //document.querySelector('button').addEventListener('click', btnSave_Click);

            fsext.options.populateSettings();
        },

        populateSettings: function () {
            fsext.log("fsext.options.populateSettings();");
            let strUserToken = fsext.storage.get(fsext.STORAGE_KEY_USERTOKEN);
            if (!strUserToken) return;
            let txtUserToken = document.getElementById("txtUserToken");
            txtUserToken.value = strUserToken;
        },
            
        saveSettings: function () {
            fsext.log("fsext.options.saveSettings();");
            let txtUserToken = document.getElementById("txtUserToken");
            let strUserToken = txtUserToken.value;
            fsext.log("fsext.options.saveSettings() - user token: " + strUserToken);
            
            // Store the user token.
            
            fsext.storage.set(fsext.STORAGE_KEY_USERTOKEN, strUserToken);
            //getStatsByNick(setBadge);

            let divMessage = document.getElementById('divMessage');
            divMessage.innerHTML = "<div class=\"success\">__MSG_fsext_options_saved__</span>";
            fsext.localization.replace_i18n(divMessage, divMessage.innerHTML);
        }

    }

};