/*-----------------------------------------------------------------------------
#fsociety Extension for Google Chrome

author:         Jay Baldwin (Darc) 
eml:            darc !AT! fsociety.guru
irc:            irc.freenode.net #fsociety
website:        fsociety.guru

changelog & file version:
https://github.com/funsocietyirc/fsociety-chrome-ext/blob/master/source/assets/js/fsociety_ext_popup_init.js
-----------------------------------------------------------------------------*/


(function () {
    if (typeof(fsext) === 'undefined' || typeof(fsext.popup) === 'undefined') return;
    fsext.popup.init();
})();