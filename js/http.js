/*
 * HTTP-Zugriff per XMLHttpRequest.
 * Spiele-Offensive liefert ISO-8859-1. XHR wuerde ohne Charset im Header als UTF-8
 * dekodieren -> wir holen die Bytes (arraybuffer) und dekodieren selbst.
 * Auf dem TV hebt <access origin="*"> in config.xml die CORS-Beschraenkung auf;
 * Cookies (Session) verwaltet die Web-Runtime selbst.
 */
var Http = (function () {
    'use strict';

    function decodeLatin1(bytes) {
        var out = '', CHUNK = 8192;
        for (var i = 0; i < bytes.length; i += CHUNK) {
            out += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
        }
        return out;
    }

    function detectCharset(contentType, bytes) {
        var m = /charset=([\w-]+)/i.exec(contentType || '');
        if (m) { return m[1].toLowerCase(); }
        var head = decodeLatin1(bytes.subarray(0, Math.min(bytes.length, 4096)));
        m = /<meta[^>]+charset=["']?([\w-]+)/i.exec(head);
        return m ? m[1].toLowerCase() : 'utf-8';
    }

    /**
     * Header/Meta-Angaben sind nicht immer korrekt (Seite deklariert ISO-8859-1, gespeicherte
     * Kopien sind UTF-8). Daher: gueltiges UTF-8 -> UTF-8, sonst Latin-1.
     */
    function decode(bytes) {
        var latin = decodeLatin1(bytes);
        if (!/[\x80-\xff]/.test(latin)) { return latin; } // reines ASCII
        try {
            return decodeURIComponent(escape(latin));
        } catch (e) {
            return latin;
        }
    }

    /**
     * opts: { url, method, body, timeout }
     * cb(err, { status, text, charset, url })
     */
    function request(opts, cb) {
        var xhr = new XMLHttpRequest();
        var done = false;
        function finish(err, res) { if (!done) { done = true; cb(err, res); } }

        xhr.open(opts.method || 'GET', opts.url, true);
        xhr.responseType = 'arraybuffer';
        xhr.withCredentials = true;
        if (opts.body !== undefined) {
            xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
        }
        xhr.timeout = opts.timeout || 20000;
        xhr.ontimeout = function () { finish({ code: 'timeout', message: 'Zeitüberschreitung' }); };
        xhr.onerror = function () { finish({ code: 'network', message: 'Netzwerkfehler' }); };
        xhr.onload = function () {
            var bytes = new Uint8Array(xhr.response || new ArrayBuffer(0));
            var charset = detectCharset(xhr.getResponseHeader('Content-Type'), bytes);
            var text = decode(bytes);
            var res = { status: xhr.status, text: text, charset: charset, url: xhr.responseURL || opts.url };

            if (xhr.status === 403 && /cf-mitigated|challenge-platform|cf_chl/i.test(text)) {
                return finish({ code: 'cloudflare', message: 'Zugriff von Cloudflare blockiert (Bot-Schutz)' }, res);
            }
            if (xhr.status >= 400) {
                return finish({ code: 'http', message: 'HTTP-Fehler ' + xhr.status }, res);
            }
            finish(null, res);
        };
        xhr.send(opts.body !== undefined ? opts.body : null);
    }

    /** URL-Encoding wie ein Browser-Formular mit dem angegebenen Charset. */
    function encodeComponent(str, charset) {
        if (/utf-?8/.test(charset)) { return encodeURIComponent(str).replace(/%20/g, '+'); }
        var out = '';
        for (var i = 0; i < str.length; i++) {
            var c = str.charCodeAt(i);
            if ((c >= 48 && c <= 57) || (c >= 65 && c <= 90) || (c >= 97 && c <= 122) ||
                    c === 45 || c === 46 || c === 95 || c === 42) {
                out += str.charAt(i);
            } else if (c === 32) {
                out += '+';
            } else if (c < 256) {
                out += '%' + (c < 16 ? '0' : '') + c.toString(16).toUpperCase();
            } else {
                // Zeichen ausserhalb Latin-1: Browser senden &#NNNN;
                out += encodeComponent('&#' + c + ';', charset);
            }
        }
        return out;
    }

    function encodeForm(fields, charset) {
        var parts = [];
        for (var i = 0; i < fields.length; i++) {
            parts.push(encodeComponent(fields[i][0], charset) + '=' + encodeComponent(fields[i][1], charset));
        }
        return parts.join('&');
    }

    return {
        get: function (url, cb) { request({ url: url }, cb); },
        post: function (url, body, cb) { request({ url: url, method: 'POST', body: body }, cb); },
        encodeForm: encodeForm
    };
}());
