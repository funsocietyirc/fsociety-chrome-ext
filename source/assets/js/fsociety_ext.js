/*-----------------------------------------------------------------------------
#fsociety Extension for Google Chrome

author:         Jay Baldwin (Darc) 
eml:            darc !AT! fsociety.online
irc:            irc.freenode.net #fsociety
website:        fsociety.online

dependencies:   MrNodeBot API by David Richer (IronY)

changelog & file version:
https://github.com/funsocietyirc/fsociety-chrome-ext/blob/master/source/assets/js/fsociety_ext.js
-----------------------------------------------------------------------------*/

"use strict";

/**
 * fsociety extension
 */
var fsext = {

    /* Constants and configuration
    -----------------------------------------------------------------------------*/

    /**
     * Number of seconds that defines API rate limiting period.
     *
     * @const
     * @type {integer}
     */
    API_TIMEOUT: 60,


    /**
     * Number of API calls allowed in period.
     *
     * @const
     * @type {integer}
     */
    API_TIMEOUT_MAX_CALLS: 10,


    /**
     * Rate limited try-again delay in seconds
     *
     * @const
     * @type {integer}
     */
    RATE_LIMIT_DELAY: 5,


    /**
     * Number of seconds before internal data is considered stale and needs to be
     * refreshed
     *
     * @const
     * @type {integer}
     */
    STORAGE_LIFETIME: (1 * 60),


    /**
     * Number of seconds between background refreshes
     *
     * @const
     * @type {integer}
     */
    BACKGROUND_REFRESH_FREQUENCY: (30 * 60),


    /**
     * Debugging?  Should NOT be true in production.
     *
     * @const
     * @type {boolean}
     */
    DEBUG_MODE: true,


    /**
     * Should we output to the console?  Should NOT be true in production.
     *
     * @const
     * @type {boolean}
     */
    ENABLE_LOG: true,


    /**
     * Should we output info to the console?
     *
     * @const
     * @type {boolean}
     */
    ENABLE_INFO_OUTPUT: true,


    /**
     * Should we output warnings to the console?
     *
     * @const
     * @type {boolean}
     */
    ENABLE_WARN_OUTPUT: true,


    /**
     * Should we output errors to the console?
     *
     * @const
     * @type {boolean}
     */
    ENABLE_ERROR_OUTPUT: true,


    /**
     * Key that is used to store the MrNodeBot User Token in Chrome's localStorage
     *
     * @const
     * @type {string}
     */
    STORAGE_KEY_USERTOKEN: "fsext_userToken",


    /**
     * Key that is used to store the User's nick associated with the MrNodeBot User Token 
     *      in Chrome's localStorage
     *
     * @const
     * @type {string}
     */
    STORAGE_KEY_USERNICK: "fsext_userNick",


    /**
     * Key that is used to store the channel filter value last selected in
     * Chrome's localStorage
     *
     * @const
     * @type {string}
     */
    STORAGE_KEY_URLS_CHANNEL_FILTER_LAST_SELECTED: "fsext_urls_channel_filter_last_selected",


    /**
     * Key that is used to store the datetime the URLs API was last called in
     * Chrome's localStorage
     *
     * @const
     * @type {string}
     */
    STORAGE_KEY_API_URLS_LAST_CALL: "fsext_api_urls_last_call",


    /**
     * Key that is used to store the DATA from the last  URLs API call in
     * Chrome's localStorage
     *
     * @const
     * @type {string}
     */
    STORAGE_KEY_API_URLS_DATA: "fsext_api_urls_data",


    /**
     * Key that is used to store the user preference to notify on link
     *
     * @const
     * @type {string}
     */
    STORAGE_KEY_NOTIFICATION_ON_LINK: "fsext_notify_on_link",


    /**
     * Key that is used to store the channel list to notify on link
     *
     * @const
     * @type {string}
     */
    STORAGE_KEY_CHANNELS_TO_NOTIFY_ON_LINK: "fsext_channels_to_notify_on_link",


    /**
     * Pusher App Key
     * 
     * @const 
     * @type {string}
     */
    PUSHER_APP_KEY: '9d0bcd17badf5ab7cc79', // MrNodeBot
    //PUSHER_APP_KEY: 'ebb7ef5b6e5092256ffe', // DarkNode 



    /* Pusher Variables
    -----------------------------------------------------------------------------*/

    /**
     * Pusher instance holder for URLs
     *
     * @type {Pusher object}
     */
    pusherURLs: null,


    /**
     * Pusher Public Channel instance holder for URLs
     *
     * @type {Pusher PublicChannel object}
     */
    pusherURLsPublicChannel: null,



    /* API URLs
    -----------------------------------------------------------------------------*/

    /**
     * Collection of production API URLs
     *
     * @type {array}
     */
    api_urls: {
        /**
         * QueryString Parameters:
         * - pageSize
         * - channel
         * - user
         * - type (def:null|images)
         * - sort (def:desc|asc)
         */
        urls: "https://bot.fsociety.online/api/urls?pageSize=50",

        // Authorize MrNodeBot token.  Returns your nick.
        auth_token: "https://bot.fsociety.online/api/getNickByToken"  // Receives POST variable "token"
    },



    /* Helper Functions
    -----------------------------------------------------------------------------*/

    /**
     * Logs to the console if the configuration allows.
     * 
     * @param {string} str Message to write to console
     */
    log: function (str) {
        // We don't need to log the use of the log function. ;)
        if (fsext.ENABLE_LOG !== true) return;

        if (typeof (console) === 'undefined' || typeof (console.log) === 'undefined') return;

        console.log('[LOG] ' + str);

        if (typeof (str) !== 'string') console.log(str);
    },


    /**
     * Logs info to the console if the configuration allows.
     * 
     * @param {string} str Message to write to console
     */
    info: function (str) {
        // We don't need to log the use of the log function. ;)
        if (fsext.ENABLE_INFO_OUTPUT !== true) return;

        if (typeof (console) === 'undefined' || typeof (console.info) === 'undefined') return;

        console.info('[INFO] ' + str);
    },


    /**
     * Logs warnings to the console if the configuration allows.
     * 
     * @param {string} str Message to write to console
     */
    warn: function (str) {
        // We don't need to log the use of the log function. ;)
        if (fsext.ENABLE_WARN_OUTPUT !== true) return;

        if (typeof (console) === 'undefined' || typeof (console.warn) === 'undefined') return;

        console.warn('[WARN] ' + str);
    },


    /**
     * Logs warnings to the console if the configuration allows.
     * 
     * @param {string} str Message to write to console
     */
    error: function (str) {
        // We don't need to log the use of the log function. ;)
        if (fsext.ENABLE_ERROR_OUTPUT !== true) return;

        if (typeof (console) === 'undefined' || typeof (console.error) === 'undefined') return;

        console.error('[ERROR] ' + str);
    },


    /**
     * Returns a rfc4122 version 4 compliant GUID 
     */
    newGuid: function () {
        // Taken from http://stackoverflow.com/a/2117523 
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0, v = (c == 'x' ? r : (r & 0x3 | 0x8));
            return v.toString(16);
        });
    },


    /**
     * Returns localized value of message from messages.json file.
     *
     * @param {string} key Name of the message.
     * @return {string} Localized message.
     */
    getMessage: function (key) {
        return chrome.i18n.getMessage(key);
    },


    /**
     * Pusher methods and Functions
     */
    pusher: {

        /**
         * See if Pusher is a script we can use.
         * 
         * @return {boolean} True if Pusher is there.  False if not.
         */
        checkDependency: function () {
            fsext.log("fsext.pusher.checkDependency();");
            return (typeof (Pusher) !== 'undefined');
        },


        /**
         * Initiate an instance of Pusher and bind to the appropriate channels.
         */
        init: function () {
            fsext.log("fsext.pusher.init();");

            if (!fsext.pusher.checkDependency()) {
                fsext.log("fsext.pusher.init(); - exiting.  Pusher not found or instantiated.");
                return;
            }

            fsext.pusherURLs = new Pusher(fsext.PUSHER_APP_KEY, { encrypted: true });
            fsext.pusherURLsPublicChannel = fsext.pusherURLs.subscribe('public');

            fsext.pusherURLsPublicChannel.bind('url', fsext.pusher.pushHandlerUrls);
            fsext.pusherURLsPublicChannel.bind('image', fsext.pusher.pushHandlerImages);
        },


        /**
         * Pusher handler for links and images
         */
        pushHandlerUrlsAndImages: function (data) {
            fsext.log("fsext.pusher.pushHandlerUrlsAndImages();");

            let jsonCachedData = fsext.storage.get(fsext.STORAGE_KEY_API_URLS_DATA);

            if (typeof (jsonCachedData) === 'undefined' || typeof (jsonCachedData.results) === 'undefined') {
                fsext.log("fsext.pusher.pushHandlerUrlsAndImages(); - exiting. Cached results were invalid.");
                return;
            }

            let jsonResults = jsonCachedData.results;

            jsonResults.unshift(data);

            jsonCachedData.results = jsonResults;

            fsext.storage.set(fsext.STORAGE_KEY_API_URLS_DATA, jsonCachedData);


            // Should we raise a notification?

            // First, check the settings
            let blnNotify = (fsext.storage.getRaw(fsext.STORAGE_KEY_NOTIFICATION_ON_LINK) == "true");

            if (!blnNotify) return;


            // Is the channel in the watch list in the settings?
            let strChannels = fsext.storage.get(fsext.STORAGE_KEY_CHANNELS_TO_NOTIFY_ON_LINK);

            if (typeof (strChannels) === 'undefined' || strChannels === '') return;

            let aryChannels = strChannels.split(",");

            let channel = data.to;

            blnNotify = false;

            for (let i = 0; i < aryChannels.length; i++) {
                if (channel.toLowerCase() == aryChannels[i].toLowerCase()) blnNotify = true;
            }

            if (!blnNotify) return;


            // Prepare the notification 

            let notification = {
                options: {
                    "type": "basic",
                    "iconUrl": "/assets/images/icon_128.png",
                    "title": (data.from + " to " + channel),
                    "message": (data.url + (data.title ? "\r\nTitle: " + data.title : ""))
                },
                "isClickable": true,
                "requestedId": data.shortUrl
            };

            let id = fsext.notifications.create(notification);
        },


        /**
         * Pusher handler for links
         */
        pushHandlerUrls: function (data) {
            fsext.log("fsext.pusher.pushHandlerUrls();");
            fsext.pusher.pushHandlerUrlsAndImages(data);
        },


        /**
         * Pusher handler for images
         */
        pushHandlerImages: function (data) {
            fsext.log("fsext.pusher.pushHandlerImages();");
            fsext.pusher.pushHandlerUrlsAndImages(data);
        }
    },


    /* Developer Tools
    -----------------------------------------------------------------------------*/

    /**
     * Tools for development checking.
     */
    tools: {

        /**
         * FormData object logger.
         */
        formDataLog: function (formData) {
            fsext.log("fsext.tools.formDataLog();");

            if (typeof (formData) !== 'object' || typeof (formData.entries) !== 'function') return;

            for (var pair of formData.entries()) {
                fsext.log(pair[0] + ', ' + pair[1]);
            }
        }

    },


    /**
     * Helpers to access chrome localStorage
     */
    storage: {

        /**
         * Stores string or JSON data in Chrome's localStorage
         *
         * @param {string} key Key or name of the variable
         * @param {string||JSON object} obj Value to store
         */
        set: function (key, obj) {
            fsext.log("fsext.storage.set(); key: " + key);
            let values = JSON.stringify(obj);
            localStorage.setItem(key, values);
        },


        /**
         * Gets string or JSON data from Chrome's localStorage
         *
         * @param {string} key Key or name of the variable
         * @return {string||JSON object} Value requested
         */
        get: function (key) {
            fsext.log("fsext.storage.get(); key: " + key);
            if (localStorage.getItem(key) == null) return null;
            return JSON.parse(localStorage.getItem(key));
        },


        /**
         * Updates key that already exists in JSON object to new value
         * and stores in Chrome's localStorage
         *
         * @param {string} key Key or name of the variable
         * @return {string||JSON object} newData Value requested
         */
        update: function (key, newData) {
            fsext.log("fsext.storage.update(); key: " + key);
            if (localStorage.getItem(key) == null) return null;

            let oldData = JSON.parse(localStorage.getItem(key));
            for (keyObj in newData) {
                oldData[keyObj] = newData[keyObj];
            }
            let values = JSON.stringify(oldData);
            localStorage.setItem(key, values);
        },


        /**
         * Gets string from Chrome's localStorage
         *
         * @param {string} key Key or name of the variable
         * @return {string} Value requested
         */
        getRaw: function (key) {
            fsext.log("fsext.storage.getRaw(); key: " + key);
            return localStorage[key];
        },


        /**
         * Stores string in Chrome's localStorage
         *
         * @param {string} key Key or name of the variable
         * @param {string} obj Value to store
         */
        setRaw: function (key, value) {
            fsext.log("fsext.storage.setRaw(); key: " + key);
            localStorage[key] = value;
        }

    },


    /* API Methods
    -----------------------------------------------------------------------------*/

    /**
     * API methods for calling MrNodeBot's features! :)
     */
    api: {

        /**
         * Use to track # of API calls in a given moment.  
         * @return {boolean} True if it's been too close to the last call to make another 
         */
        callCount: 0,


        /**
         * Use to track # of API calls in a given moment.  
         * @return {boolean} True if it's been too close to the last call to make another 
         */
        callPeriodBeginDateTime: null,


        /**
         * Registers a call to the API. 
         */
        registerCall: function () {
            fsext.log('fsext.api.registerCall();');

            if (typeof (fsext.api.callPeriodBeginDateTime) === 'undefined' || fsext.api.callPeriodBeginDateTime === null) fsext.api.callPeriodBeginDateTime = new Date();

            fsext.api.callCount++;
        },


        /**
         * Clears the current API call cycle.
         */
        resetCallCount: function () {
            fsext.log('fsext.api.resetCallCount();');

            fsext.api.callPeriodBeginDateTime = null;
            fsext.api.callCount = 0;
        },


        /**
         * Stub for when API calls can be rate-limited.
         * @return {boolean} True if it's been too close to the last call to make another 
         */
        rateLimitCheck: function () {
            fsext.log('fsext.api.rateLimitCheck();');

            if (typeof (fsext.api.callCount) !== 'undefined') fsext.info('callCount: ' + fsext.api.callCount);
            if (
                typeof (fsext.api.callPeriodBeginDateTime) !== 'undefined' 
                && fsext.api.callPeriodBeginDateTime !== null
            )
                fsext.info('callPeriodBeginDateTime: ' + fsext.api.callPeriodBeginDateTime);

            let callCheckDateTime = new Date(fsext.api.callPeriodBeginDateTime + (fsext.API_TIMEOUT * 1000));
            let now = new Date();

            if (callCheckDateTime <= now) {
                // Last call + timeout is in the past.  Reset.
                fsext.api.resetCallCount();
                return false;
            }

            // Escape API calls if too many too quickly.
            return (fsext.api.callCount >= fsext.API_TIMEOUT_MAX_CALLS);
        },


        /**
         * Retrieves most recent URLs from the API
         *
         * @param {function} fnc_callback Callback to handle API response asynchronously.
         *      Function must have a parameter for response data to be passed through.
         * @param {function} fnc_error Callback to handle errors.
         */
        urlsGetMostRecent: function (fnc_callback, fnc_error) {
            fsext.log("fsext.api.urlsGetMostRecent();");

            if (fsext.api.rateLimitCheck()) {
                fsext.log("fsext.api.urlsGetMostRecent(); - rate limit exceeded. exiting.");

                // Don't hard return if rate limited... wait and try again for user.
                setTimeout(function () { fsext.api.urlsGetMostRecent(fnc_callback, fnc_error); }, fsext.RATE_LIMIT_DELAY * 1000);
                return;
            }

            fsext.api.registerCall();

            let url = fsext.api_urls.urls;
            fsext.log("fsext.api.urlsGetMostRecent() - sending API request to " + url);

            // Initiate the api call
            try {
                let req = new XMLHttpRequest();
                req.open("GET", url, true);
                req.onreadystatechange = function () {
                    if (req.readyState == 4) {
                        let data = req.responseText;
                        if (typeof (data) === 'undefined' || data.length == 0) return;
                        fsext.log("fsext.api.urlsGetMostRecent() - request received -- " + data.length.toString() + " characters long");
                        let jsonData = JSON.parse(data);
                        if (typeof (fnc_callback) === 'function') fnc_callback(jsonData);
                    }
                }
                req.send(null);
            }
            catch (err) {
                if (typeof (fnc_error) === 'function') fnc_error(err);
            }

            fsext.log("fsext.api.urlsGetMostRecent(); -- api call completed.");
        },


        /**
         * Attempts to authorize a single MrNodeBot user-channel token.
         * 
         * @param {string} token user-channel token to validate
         * @param {function} fnc_callback Callback to handle API response asynchronously.
         *      Function must have a parameter for response data to be passed through.
         * @param {function} fnc_error Callback to handle errors.
         */
        authToken: function (token, fnc_callback, fnc_error) {
            fsext.log("fsext.api.authToken(); -- token: " + token);

            if (fsext.api.rateLimitCheck()) {
                fsext.log("fsext.api.authToken(); - rate limit exceeded. exiting.");

                // Don't hard return if rate limited... wait and try again for user.
                setTimeout(function () { fsext.api.authToken(token, fnc_callback, fnc_error); }, fsext.RATE_LIMIT_DELAY * 1000);
                return;
            }

            fsext.api.registerCall();

            // // The API is broken so this is here for now...
            // if (true == false) {

            //     var error = {
            //         "status": "error",
            //         "result": null
            //     };
            //     var success = {
            //         "status": "success",
            //         "user": {
            //             "user": "Darc",
            //             "channel": "#fsociety",
            //             "timestamp": "2016-10-04T07:04:18.000Z"
            //         }
            //     };

            //     if (typeof (fnc_callback) === 'function') fnc_callback(token == "error" ? error : success);


            //     return;
            // }

            // Build our FormData object              
            var formData = new FormData();
            formData.append('token', token);
            //fsext.tools.formDataLog(formData);            

            let url = fsext.api_urls.auth_token;
            fsext.log("fsext.api.authToken() - sending API request to " + url);

            // Initiate the api call
            try {
                let req = new XMLHttpRequest();
                req.open('POST', url, true);

                // The Content-Type declaration is only necessary when using POST data in querystring format.
                // It is not needed when we use the FormData() js object. 
                //req.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded; charset=utf-8');

                req.onreadystatechange = function () {
                    if (req.readyState == 4) {
                        let data = req.responseText;
                        if (typeof (data) === 'undefined' || data.length == 0) return;
                        fsext.log("fsext.api.authToken() - request received -- " + data.length.toString() + " characters long");
                        let jsonData = JSON.parse(data);
                        if (typeof (fnc_callback) === 'function') fnc_callback(jsonData);
                    }
                }

                //req.send('token=' + token);  
                req.send(formData);
            }
            catch (err) {
                if (typeof (fnc_error) === 'function') fnc_error(err);
            }

            fsext.log("fsext.api.authToken(); -- api call completed.");
        }
    },


    /* Native Chrome Implementations
    -----------------------------------------------------------------------------*/

    /**
     * Facilitates Chrome localization
     */
    localization: {

        /**
         * Replaces __MSG_(\w+)__ variables in object obj with their localized versions
         * in the messages.json file.
         *
         * @param {object} obj HTML element to search for i18n variables.
         * @param {string} tag i18n variable to look for
         */
        replace_i18n: function (obj, tag) {
            fsext.log("fsext.localization.replace_i18n();");
            let msg = tag.replace(/__MSG_(\w+)__/g, function (match, v1) {
                return (v1 ? chrome.i18n.getMessage(v1) : '');
            });

            if (msg !== tag) obj.innerHTML = msg;
        },


        /**
         * Replaces __MSG_(\w+)__ variables in the DOM with their localized versions
         * in the messages.json file.
         */
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

            for (let i = 0; i < page.length; i++) {
                let tag = page[i].innerHTML.toString();

                fsext.localization.replace_i18n(page[i], tag);
            }
        },

    },



    /**
     * Facilitates Chrome notifications
     */
    notifications: {

        clickActionsByID: [],

        /**
         * Handle a click from a Chrome notification
         * 
         * @param {string} notificationId GUID or user-specified ID of the notification instance
         */
        clickHandler: function (notificationId) {
            fsext.log("fsext.notifications.clickHandler(); notificationId: " + notificationId);

            let url = (notificationId.indexOf('http') == 0 ? notificationId : fsext.storage.getRaw("notif_" + notificationId));

            fsext.log("fsext.notifications.clickHandler(); url: " + url);

            if (typeof (url) !== 'undefined' && url != null) chrome.tabs.create({ "url": url });

            if (notificationId.indexOf('http') == 0) fsext.storage.setRaw("notif_" + notificationId, null);

            chrome.notifications.clear(notificationId);
        },


        /**
         * Create Chrome notification
         * 
         * @param {object} options Specified options for the creation of the notification. See 
         *      chrome.notifications API for more information.
         */
        create: function (options) {
            fsext.log("fsext.notifications.create();");

            if (typeof (options) === 'undefined' || typeof (options.options) === 'undefined') {
                console.warn("fsext.notifications.create(); - No options provided.")
                return;
            }

            //fsext.log(options);

            if (
                fsext.notifications.current
                && typeof (fsext.notifications.current) !== 'undefined'
                && typeof (fsext.notifications.current.cancel) !== 'undefined'
            ) fsext.notifications.current.cancel();

            // let notification = {
            //     "type": "basic",
            //     "iconUrl": "/assets/images/icon_128.png",
            //     "title": "#fsociety Extension",
            //     "message": msg
            // };

            //let id = fsext.newGuid();
            let id = (typeof (options) !== 'undefined' && typeof (options.requestedId) !== 'undedined' ? options.requestedId : fsext.newGuid());

            chrome.notifications.create(id, options.options, function () { });

            // setTimeout(function () {
            //     fsext.storage.setRaw("notif_" + id, null);
            //     if (
            //         fsext.notifications.current
            //         && typeof (fsext.notifications.current) !== 'undefined'
            //         && typeof (fsext.notifications.current.cancel) !== 'undefined'
            //     ) fsext.notifications.current.cancel();
            // }, (options.timeout || 1000 * 5));

            return id;
        },


        /**
         * Sets the badge on the extension icon on the toolbar.
         *
         * @param {object} options JSON object with "text" and "backgroundColor" properties.
         */
        setBadge: function (options) {
            fsext.log("fsext.notifications.setBadge();");

            if (typeof (options) === 'undefined') {
                chrome.browserAction.setBadgeText({ text: "" });
                return;
            }

            if (typeof (options.text) !== 'undefined') {
                chrome.browserAction.setBadgeText({ text: options.text });
            }

            if (typeof (options.backgroundColor) !== 'undefined') {
                chrome.browserAction.setBadgeBackgroundColor({ color: options.backgroundColor });
            }

        },


        /**
         * Clears the badge on the extension icon on the toolbar.
         */
        clearBadge: function () {
            fsext.log("fsext.notifications.setBadge();");
            chrome.browserAction.setBadgeText({ text: "" });
        }

    },


    /* Support functions for Popup|Options|Background pages
    -----------------------------------------------------------------------------*/

    /**
     * popup.html Methods & Routines
     */
    popup: {

        /**
         * Handles setup of the popup
         */
        init: function () {
            fsext.log("fsext.popup.init();");


            // Add event listeners once the DOM has fully loaded by listening for the
            // `DOMContentLoaded` event on the document, and adding your listeners to
            // specific elements when it triggers.
            document.addEventListener('DOMContentLoaded', fsext.popup.onDOMContentLoaded);
        },


        /**
         * Executes when the page is loaded to the end.
         */
        onDOMContentLoaded: function () {
            fsext.log("fsext.popup.onDOMContentLoaded();");

            fsext.localization.localizeHtmlPage();

            let strUserToken = fsext.storage.get(fsext.STORAGE_KEY_USERTOKEN);
            let blnUserAuthenticated = (strUserToken && strUserToken.replace(" ", "").length > 0);
            fsext.log((blnUserAuthenticated ? "User Token is: " + strUserToken : "NO USER TOKEN SPECIFIED!"));

            // Bind click events to buttons that require javascript. Chrome doesn't let you put

            let title = chrome.runtime.getManifest().title;
            let version = chrome.runtime.getManifest().version;
            fsext.info('Loading ' + title + ' v' + version);

            // JS inline.
            let lnkInfo = document.getElementById('lnkInfo');
            lnkInfo.onclick = function () { alert(chrome.i18n.getMessage("fsext_info").replace('##VERSION##', version)); };

            // escape so we don't let the users do more, cool things.
            if (!blnUserAuthenticated) return;

            // TODO: We optionally may want to re-check your user token every
            // 50th hit to verify we didn't turn the user token off on the back-end.


            let lnkRefresh = document.getElementById('lnkRefresh');
            lnkRefresh.onclick = function () { fsext.popup.refresh(); };            

            let gate = document.getElementById('gate');
            let authed = document.getElementById('authed');
            gate.style.display = 'none';
            authed.style.display = 'block';

            fsext.popup.refresh();
        },


        /**
         * Reloads the current display of the URLs API.
         *
         * @param {boolean} blnForceCacheOverride Pass true if you want to force a reload from API
         */
        reloadLinks: function (blnForceCacheOverride) {
            fsext.log("fsext.popup.reloadLinks();");

            let blnPerformRefresh = (blnForceCacheOverride || false);

            if (fsext.storage.getRaw(fsext.STORAGE_KEY_API_URLS_DATA) == null || fsext.storage.getRaw(fsext.STORAGE_KEY_API_URLS_LAST_CALL) == null) {
                fsext.log("fsext.popup.reloadLinks() - api not called before - setting blnPerformRefresh to true.");
                blnPerformRefresh = true;
            }
            else if (blnForceCacheOverride !== true) {

                let dttmNow = new Date(); // get the date to compare with the last one.
                let dttmLastChecked = (fsext.storage.getRaw(fsext.STORAGE_KEY_API_URLS_LAST_CALL) != null ? new Date(parseInt(fsext.storage.getRaw(fsext.STORAGE_KEY_API_URLS_LAST_CALL))) : new Date((new Date()).getFullYear(), 0, 1));

                fsext.log("fsext.popup.reloadLinks() - data last refreshed: " + dttmLastChecked);

                if ((dttmLastChecked.getTime() + (fsext.STORAGE_LIFETIME * 1000)) <= dttmNow) {
                    fsext.log("fsext.popup.reloadLinks() - stored data is stale... refresh it!");
                    blnPerformRefresh = true;
                }

            }

            fsext.log("fsext.popup.reloadLinks() - blnPerformRefresh = " + blnPerformRefresh);

            if (blnPerformRefresh != true) {
                fsext.log("fsext.popup.reloadLinks() - using stored data - it's newish!");
                fsext.popup.linksRender(fsext.storage.get(fsext.STORAGE_KEY_API_URLS_DATA))
            }
            else {
                fsext.log("fsext.popup.reloadLinks() - stored data is about to be refreshed!");
                let fnc_callback = function (jsonData) {
                    fsext.log("BEGIN DATA");
                    fsext.log(jsonData);
                    fsext.log("END DATA");
                    fsext.popup.linksRender(jsonData);
                    fsext.storage.set(fsext.STORAGE_KEY_API_URLS_DATA, jsonData);
                    fsext.storage.setRaw(fsext.STORAGE_KEY_API_URLS_LAST_CALL, new Date().getTime());
                };
                fsext.api.urlsGetMostRecent(fnc_callback);
            }
        },


        /**
         * Reloads the current display of popup.
         *
         * @param {boolean} blnForceCacheOverride Pass true if you want to force a reload from API
         */
        refresh: function (blnForceCacheOverride) {
            fsext.log("fsext.popup.refresh();");
            let lt = document.getElementById('links-table');
            lt.innerHTML = '';
            fsext.popup.reloadLinks(blnForceCacheOverride);
        },


        /**
         * Renders the URLs from the API response into the popup.
         *
         * @param {string||JSON Object} jsonData Data from the API
         */
        linksRender: function (jsonData) {
            fsext.log("fsext.popup.linksRender();");
            //fsext.log(jsonData);

            if (jsonData === null || typeof (jsonData) === 'undefined') jsonData = fsext.storage.get(fsext.STORAGE_KEY_API_URLS_DATA);

            let channel = fsext.storage.getRaw(fsext.STORAGE_KEY_URLS_CHANNEL_FILTER_LAST_SELECTED) || "all";

            fsext.log("fsext.popup.linksRender(); channel filter: " + channel);

            let lt = document.getElementById('links-table');
            let ltt = document.getElementById('links-table-template');
            let TEMPLATE = ltt.innerHTML;
            let compiled_links = "";

            let channels = new Array();
            let filter_channels = document.getElementById('dynamic-channels');
            filter_channels.innerHTML = '';

            if (typeof (jsonData) !== 'undefined' && typeof (jsonData.results) !== 'undefined') {
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
            }

            let els = document.querySelectorAll(".filter-option:not([onclick])");
            for (let i = 0; i < els.length; i++) {
                els[i].addEventListener("click", function (e) {
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


        /**
         * Handles clicks from channel filter options.
         *
         * @param {string} channel Which channel to display. Or 'all'
         */
        changeChannelFilterLinks: function (channel) {
            fsext.log("fsext.popup.changeChannelFilterLinks(); - channel: " + channel);

            // store channel selected for next load.
            fsext.storage.setRaw(fsext.STORAGE_KEY_URLS_CHANNEL_FILTER_LAST_SELECTED, channel);

            fsext.popup.reloadLinks();
        }

    },


    /**
     * options.html Methods & Routines
     */
    options: {

        /**
         * Handles setup of the options page
         */
        init: function () {
            fsext.log("fsext.options.init();");

            // Add event listeners once the DOM has fully loaded by listening for the
            // `DOMContentLoaded` event on the document, and adding your listeners to
            // specific elements when it triggers.
            document.addEventListener('DOMContentLoaded', fsext.options.onDOMContentLoaded);
        },


        /**
         * Executes when the page is loaded to the end.
         */
        onDOMContentLoaded: function () {
            fsext.log("fsext.options.onDOMContentLoaded();");

            fsext.localization.localizeHtmlPage();

            //btnSave
            document.getElementById('btnSave').addEventListener('click', function (e) { fsext.options.saveSettings(); });

            fsext.options.populateSettings();


            let txtUserToken = document.getElementById("txtUserToken");
            if (txtUserToken.value.length == 0) txtUserToken.focus();
        },


        /**
         * Populates the user settings from Chrome's localStorage
         */
        populateSettings: function () {
            fsext.log("fsext.options.populateSettings();");
            let strUserToken = fsext.storage.get(fsext.STORAGE_KEY_USERTOKEN);
            if (strUserToken) {
                let txtUserToken = document.getElementById("txtUserToken");
                txtUserToken.value = strUserToken;

                let nick = fsext.storage.get(fsext.STORAGE_KEY_USERNICK);
                let welcome = document.getElementById('welcome');
                let nick_field = document.getElementById('nick_field');

                nick_field.innerHTML = nick;
                welcome.style.display = 'block';
            }

            let blnNotifyOnLink = (fsext.storage.getRaw(fsext.STORAGE_KEY_NOTIFICATION_ON_LINK) == "true");
            let chkNotifyOnLinks = document.getElementById("chkNotifyOnLinks");
            chkNotifyOnLinks.checked = blnNotifyOnLink;

            let strChannelsToWatchForLinks = fsext.storage.get(fsext.STORAGE_KEY_CHANNELS_TO_NOTIFY_ON_LINK);
            let txtChannelsToWatchForLinks = document.getElementById("txtChannelsToWatchForLinks");
            txtChannelsToWatchForLinks.value = strChannelsToWatchForLinks;
        },


        /**
         * Handles the API response.
         *
         * @param {string||JSON Object} jsonData Data from the API
         */
        authTokenHandler: function (jsonData) {
            fsext.log("fsext.options.authTokenHandler();");
            fsext.log(jsonData);

            let sent_token = window.sentUserToken;
            window.sentUserToken = null;

            let check_valid = document.getElementById('token_valid');
            let check_invalid = document.getElementById('token_invalid');

            if (typeof (jsonData) === 'undefined' || typeof (jsonData.status) === 'undefined') {
                fsext.log("fsext.options.authTokenHandler(); - jsonData or jsonData.status undefined");
                check_invalid.style.display = 'inline';
                return;
            }

            let success = (jsonData.status == "success");

            if (!success) {
                check_invalid.style.display = 'inline';
                return;
            }

            check_valid.style.display = 'inline';

            // Store the token since we know it's good.
            fsext.storage.set(fsext.STORAGE_KEY_USERTOKEN, sent_token);

            let nick = jsonData.result.user;
            let welcome = document.getElementById('welcome');
            let nick_field = document.getElementById('nick_field');

            nick_field.innerHTML = nick;
            welcome.style.display = 'block';

            // Store the user nick given by the API.
            fsext.storage.set(fsext.STORAGE_KEY_USERNICK, nick);

            // All is well
            let divMessage = document.getElementById('divMessage');
            divMessage.innerHTML = "<div class=\"success\">__MSG_fsext_options_saved__</span>";
            fsext.localization.replace_i18n(divMessage, divMessage.innerHTML);
        },


        /**
         * Validate the User Token
         */
        authToken: function (token) {
            fsext.log("fsext.options.authToken();");

            let check_valid = document.getElementById('token_valid');
            let check_invalid = document.getElementById('token_invalid');
            let welcome = document.getElementById('welcome');
            check_valid.style.display = 'none';
            check_invalid.style.display = 'none';
            welcome.style.display = 'none';

            let strUserToken = token;

            if (typeof (strUserToken) === 'undefined') {
                let txtUserToken = document.getElementById("txtUserToken");
                strUserToken = txtUserToken.value;
            }

            fsext.info("fsext.options.authToken() - token entered was: " + strUserToken);

            var fnc_error = function (err) {
                fsext.error("fnc_error() --> fsext.options.authTokenHandler() --> fsext.options.authToken()");
                window.sentUserToken = null;
            };

            // Store the token in the window so we know what we sent to save it next time.
            if (typeof (window.sentUserToken) === 'undefined') window.sentUserToken = strUserToken;

            fsext.api.authToken(strUserToken, fsext.options.authTokenHandler, fnc_error);
        },


        /**
         * Saves the user settings to Chrome's localStorage
         */
        saveSettings: function () {
            fsext.log("fsext.options.saveSettings();");

            let divMessage = document.getElementById('divMessage');
            divMessage.innerHTML = '';

            // Store the settings you can before we touch the Internet.

            // Notify on links
            let chkNotifyOnLinks = document.getElementById("chkNotifyOnLinks");
            fsext.log("fsext.options.saveSettings() - chkNotifyOnLinks.checked: " + chkNotifyOnLinks.checked);
            fsext.storage.setRaw(fsext.STORAGE_KEY_NOTIFICATION_ON_LINK, chkNotifyOnLinks.checked.toString().toLowerCase());

            // Channels to Watch for links
            let txtChannelsToWatchForLinks = document.getElementById("txtChannelsToWatchForLinks");
            let strChannelsToWatchForLinks = txtChannelsToWatchForLinks.value;
            fsext.log("fsext.options.saveSettings() - channels to watch: " + strChannelsToWatchForLinks);
            fsext.storage.set(fsext.STORAGE_KEY_CHANNELS_TO_NOTIFY_ON_LINK, strChannelsToWatchForLinks);

            // User Token
            let txtUserToken = document.getElementById("txtUserToken");
            let strUserToken = txtUserToken.value;
            fsext.log("fsext.options.saveSettings() - token entered was: " + strUserToken);

            // Send the entered Auth Token to the API and handle the rest in the callback.
            fsext.options.authToken(strUserToken);

            // Don't write a save message here, because the save is conditional on the token being correct.
        }

    },


    /**
     * background.html Methods & Routines
     */
    background: {

        /**
         * Initializes the background.html page.
         */
        init: function () {
            fsext.log("fsext.background.init();");

            chrome.notifications.onClicked.addListener(function (notificationId) {
                fsext.notifications.clickHandler(notificationId);
            });

            // Add event listeners once the DOM has fully loaded by listening for the
            // `DOMContentLoaded` event on the document, and adding your listeners to
            // specific elements when it triggers.
            document.addEventListener('DOMContentLoaded', fsext.background.onDOMContentLoaded);
        },


        /**
         * Reloads the current display of the URLs API.
         *
         * @param {boolean} blnForceCacheOverride Pass true if you want to force a reload from API
         */
        reloadLinks: function (blnForceCacheOverride) {
            fsext.log("fsext.background.reloadLinks();");

            let fnc_callback = function (jsonData) {
                fsext.storage.set(fsext.STORAGE_KEY_API_URLS_DATA, jsonData);
                fsext.storage.setRaw(fsext.STORAGE_KEY_API_URLS_LAST_CALL, new Date().getTime());
            };
            fsext.api.urlsGetMostRecent(fnc_callback);

        },


        /**
         * Reloads the data.
         *
         * @param {boolean} blnForceCacheOverride Pass true if you want to force a reload from API
         */
        refresh: function (blnForceCacheOverride) {
            fsext.log("fsext.background.refresh();");
            fsext.background.reloadLinks(blnForceCacheOverride);
        },


        /**
         * Executes when the page is loaded to the end.
         */
        onDOMContentLoaded: function () {
            fsext.log("fsext.background.onDOMContentLoaded();");

            fsext.localization.localizeHtmlPage();

            fsext.pusher.init();

            fsext.background.refresh();
            setInterval(function () { fsext.background.refresh(); }, fsext.BACKGROUND_REFRESH_FREQUENCY * 1000);

        }

    }

};
