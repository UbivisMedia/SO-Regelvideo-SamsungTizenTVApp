/* Login-Ansicht: E-Mail + Passwort eingeben, per Fernbedienung bedienbar. */
var LoginView = (function () {
    'use strict';
    var $ = Util.$;
    var el, items, idx = 0, editing = false, onSubmit = null;

    function init(submitHandler) {
        el = $('view-login');
        items = [$('login-user'), $('login-pass'), $('login-submit')];
        onSubmit = submitHandler;

        // Bildschirmtastatur geschlossen -> Bearbeitungsmodus verlassen
        for (var i = 0; i < 2; i++) {
            items[i].addEventListener('blur', function () { editing = false; });
        }
    }

    function focus(i) {
        idx = Math.max(0, Math.min(items.length - 1, i));
        for (var j = 0; j < items.length; j++) { Util.toggleClass(items[j], 'focused', j === idx); }
    }

    function startEdit() {
        editing = true;
        items[idx].focus(); // oeffnet auf dem TV die Bildschirmtastatur (IME)
    }

    function stopEdit() {
        editing = false;
        items[idx].blur();
    }

    function show(opts) {
        opts = opts || {};
        $('login-user').value = opts.user || '';
        $('login-pass').value = '';
        $('login-error').textContent = opts.error || '';
        Util.show(el);
        focus(opts.user ? 1 : 0);
    }

    function hide() { stopEdit(); Util.hide(el); }

    function submit() {
        var user = $('login-user').value.replace(/^\s+|\s+$/g, '');
        var pass = $('login-pass').value;
        if (!user || !pass) {
            $('login-error').textContent = 'Bitte E-Mail-Adresse und Passwort eingeben.';
            return;
        }
        $('login-error').textContent = '';
        onSubmit(user, pass);
    }

    function showError(msg) { $('login-error').textContent = msg; }

    function onKey(key) {
        if (editing) {
            // Waehrend der Texteingabe bekommt das Input-Feld die Tasten.
            if (key === 'ENTER' || key === 'IME_DONE') {
                stopEdit();
                focus(idx + 1);
                return true;
            }
            if (key === 'BACK' || key === 'IME_CANCEL') { stopEdit(); return true; }
            return false;
        }
        switch (key) {
        case 'UP': focus(idx - 1); return true;
        case 'DOWN': focus(idx + 1); return true;
        case 'ENTER':
            if (idx < 2) { startEdit(); } else { submit(); }
            return true;
        }
        return false;
    }

    return { init: init, show: show, hide: hide, onKey: onKey, showError: showError };
}());
