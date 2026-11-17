/*
 * Speicherung der Zugangsdaten im localStorage der App.
 * Hinweis: Base64 ist nur eine Verschleierung, keine Verschluesselung. Der localStorage
 * einer Tizen-App ist aber nur fuer diese App zugaenglich.
 */
var CredStore = (function () {
    'use strict';
    var KEY = 'so_credentials';

    function enc(s) { return btoa(unescape(encodeURIComponent(s))); }
    function dec(s) { return decodeURIComponent(escape(atob(s))); }

    function save(user, pass) {
        try { localStorage.setItem(KEY, enc(JSON.stringify({ u: user, p: pass }))); } catch (e) {}
    }

    function load() {
        try {
            var raw = localStorage.getItem(KEY);
            if (!raw) { return null; }
            var o = JSON.parse(dec(raw));
            return o && o.u ? { user: o.u, pass: o.p } : null;
        } catch (e) {
            return null;
        }
    }

    function clear() {
        try { localStorage.removeItem(KEY); } catch (e) {}
    }

    return { save: save, load: load, clear: clear };
}());
