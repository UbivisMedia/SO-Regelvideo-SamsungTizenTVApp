/* Allgemeine Hilfsfunktionen (ES5, kompatibel zum WebKit von Tizen 2.3). */
var Util = (function () {
    'use strict';

    function $(id) { return document.getElementById(id); }

    function show(el) { el.className = el.className.replace(/\s*\bhidden\b/g, ''); }
    function hide(el) { if (!/\bhidden\b/.test(el.className)) { el.className += ' hidden'; } }

    function toggleClass(el, cls, on) {
        var re = new RegExp('\\s*\\b' + cls + '\\b', 'g');
        el.className = el.className.replace(re, '');
        if (on) { el.className += ' ' + cls; }
    }

    function text(el) {
        return (el.textContent || '').replace(/\s+/g, ' ').replace(/^\s+|\s+$/g, '');
    }

    /**
     * Parst HTML in ein inertes Dokument (keine Skripte, keine Nachlade-Anfragen).
     * Altes WebKit (Tizen 2.3) laedt Ressourcen evtl. auch in Dokumenten ohne Fenster.
     * Darum werden alle Attribute/Tags, die etwas nachladen koennten, vorab entschaerft.
     * Ausgewertet werden nur Links (href), Formularfelder und Texte - die bleiben erhalten.
     */
    function parseHtml(html) {
        // Skripte/Styles vorab entfernen: spart Speicher und Zeit auf alten TVs.
        html = html.replace(/<script\b[\s\S]*?<\/script>/gi, '')
                   .replace(/<style\b[\s\S]*?<\/style>/gi, '')
                   // Lade-Attribute umbenennen (src="x" -> data-x-src="x")
                   .replace(/(\s)(src|srcset|poster|background|data|style|xlink:href)(\s*=)/gi, '$1data-x-$2$3')
                   // Tags, die ueber href/andere Attribute laden, unschaedlich umbenennen
                   .replace(/<(\/?)(link|iframe|frame|object|embed|image|use|meta|base)\b/gi, '<$1x-$2');
        var doc = document.implementation.createHTMLDocument('');
        doc.documentElement.innerHTML = html;
        return doc;
    }

    function resolveUrl(href, base) {
        if (/^https?:\/\//i.test(href)) { return href; }
        var origin = base.match(/^(https?:\/\/[^\/]+)/i)[1];
        if (href.indexOf('//') === 0) { return 'https:' + href; }
        if (href.charAt(0) === '/') { return origin + href; }
        return base.replace(/[?#].*$/, '').replace(/[^\/]*$/, '') + href;
    }

    function formatTime(sec) {
        if (!isFinite(sec) || sec < 0) { sec = 0; }
        sec = Math.floor(sec);
        var m = Math.floor(sec / 60), s = sec % 60;
        return m + ':' + (s < 10 ? '0' : '') + s;
    }

    function escapeHtml(s) {
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
                        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    var loadingCount = 0;
    function loading(on, msg) {
        loadingCount = Math.max(0, loadingCount + (on ? 1 : -1));
        if (msg) { $('loading-text').textContent = msg; }
        if (loadingCount > 0) { show($('loading')); } else { hide($('loading')); }
    }

    return {
        $: $, show: show, hide: hide, toggleClass: toggleClass, text: text,
        parseHtml: parseHtml, resolveUrl: resolveUrl, formatTime: formatTime,
        escapeHtml: escapeHtml, loading: loading
    };
}());
