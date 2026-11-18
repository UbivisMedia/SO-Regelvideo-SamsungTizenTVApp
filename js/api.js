/*
 * Zugriff auf spiele-offensive.de: Login, Videorechte, Regelvideo-Seiten.
 * Die Seiten werden als HTML geladen und ausgewertet (es gibt keine offizielle API).
 *
 * Mock-Modus (Entwicklung im Desktop-Browser, ohne CORS/Login):
 *   index.html?mock  -> laedt die Beispieldateien aus .dev/HTML-Beispiele/
 */
var Api = (function () {
    'use strict';

    var BASE = 'https://www.spiele-offensive.de';
    var URL_LOGIN = BASE + '/index.php?cmd=login&z=kundenbereich';
    var URL_RIGHTS = BASE + '/index.php?cmd=videorechte';
    var URL_LOGOUT = BASE + '/index.php?cmd=logout';
    var MAX_CHAPTER_INDEX = 500;
    var MEDIA = 'https://mediaservice.happyshops.com/ANY/Article/';

    var MOCK = /[?&]mock\b/.test(location.search);
    var MOCK_FILES = {
        rights: '.dev/HTML-Beispiele/videorechte.html',
        video: '.dev/HTML-Beispiele/videoseite.tml'
    };

    var credentials = null;

    function isLoggedIn(html) {
        return /cmd=logout/i.test(html);
    }

    function setCredentials(c) { credentials = c; }

    // ------------------------------------------------------- Erlaubte Server

    /** Nur diese Server bekommen Anfragen (mit Cookies bzw. Zugangsdaten). */
    function isSiteUrl(url) {
        return /^https:\/\/(www\.)?spiele-offensive\.de(\/|$)/i.test(url);
    }

    /** Videos duerfen zusaetzlich vom Happyshops-Medienserver kommen. */
    function isMediaUrl(url) {
        return isSiteUrl(url) || /^https:\/\/mediaservice\.happyshops\.com\//i.test(url);
    }

    function unsafeUrl(url) {
        return { code: 'unsafe_url', message: 'Unerwartete Zieladresse, Anfrage blockiert: ' + url };
    }

    // ------------------------------------------------------------------ Login

    /** Liest das Loginformular aus (inkl. dynamischem "doubletracker"). */
    function parseLoginForm(html, pageUrl) {
        var doc = Util.parseHtml(html);
        var forms = doc.getElementsByTagName('form');
        var form = null, i;
        for (i = 0; i < forms.length; i++) {
            if (forms[i].querySelector('input[type=password]')) { form = forms[i]; break; }
        }
        if (!form) { return null; }

        var fields = [], userName = null, passName = null;
        var inputs = form.getElementsByTagName('input');
        for (i = 0; i < inputs.length; i++) {
            var inp = inputs[i];
            var type = (inp.getAttribute('type') || 'text').toLowerCase();
            var name = inp.getAttribute('name');
            if (!name) { continue; }
            if (type === 'password') {
                passName = name;
            } else if ((type === 'text' || type === 'email') && !userName) {
                userName = name;
            } else if (type === 'hidden' || type === 'submit') {
                fields.push([name, inp.getAttribute('value') || '']);
            } else if ((type === 'checkbox' || type === 'radio') && inp.hasAttribute('checked')) {
                fields.push([name, inp.getAttribute('value') || 'on']);
            }
        }
        return {
            action: Util.resolveUrl(form.getAttribute('action') || '/index.php?seite=13', pageUrl),
            userField: userName || 'email',
            passField: passName || 'pwd',
            fields: fields
        };
    }

    /**
     * Anmelden. cb(err)
     * fresh=true (Login ueber das Formular): eine noch bestehende Sitzung wird nicht uebernommen,
     * sondern zuerst beendet - sie koennte zu einem anderen Konto gehoeren.
     */
    function login(cb, fresh) {
        if (MOCK) { return setTimeout(function () { cb(null); }, 300); }
        if (!credentials) { return cb({ code: 'no_credentials', message: 'Keine Zugangsdaten' }); }

        Http.get(URL_LOGIN, function (err, res) {
            if (err) { return cb(err); }
            if (!isLoggedIn(res.text)) { return submitLogin(res, cb); }
            if (!fresh) { return cb(null); } // Session besteht noch

            Http.get(URL_LOGOUT, function (errOut) {
                if (errOut) { return cb(errOut); }
                Http.get(URL_LOGIN, function (err2, res2) {
                    if (err2) { return cb(err2); }
                    if (isLoggedIn(res2.text)) {
                        return cb({ code: 'logout_failed',
                            message: 'Die bestehende Sitzung konnte nicht beendet werden. Bitte erneut versuchen.' });
                    }
                    submitLogin(res2, cb);
                });
            });
        });
    }

    /** Loginformular aus der geladenen Seite ausfuellen und absenden. */
    function submitLogin(res, cb) {
        var form = parseLoginForm(res.text, res.url);
        if (!form) { return cb({ code: 'parse', message: 'Loginformular nicht gefunden' }); }
        // Zugangsdaten nur an Spiele-Offensive senden, egal was im Formular steht
        if (!isSiteUrl(form.action)) { return cb(unsafeUrl(form.action)); }

        var fields = [[form.userField, credentials.user], [form.passField, credentials.pass]]
            .concat(form.fields);
        Http.post(form.action, Http.encodeForm(fields, res.charset), function (err, res2) {
            if (err) { return cb(err); }
            if (isLoggedIn(res2.text)) { return cb(null); }
            cb({ code: 'login_failed', message: 'Anmeldung fehlgeschlagen. Bitte E-Mail und Passwort prüfen.' });
        });
    }

    /** Laedt eine Seite, die einen Login braucht; meldet sich bei Bedarf (erneut) an. */
    function getAuthed(url, cb) {
        if (!isSiteUrl(url)) { return cb(unsafeUrl(url)); }
        Http.get(url, function (err, res) {
            if (err) { return cb(err); }
            if (isLoggedIn(res.text)) { return cb(null, res.text); }
            loginAndGet(url, false, cb);
        });
    }

    /**
     * Anmelden und Seite erneut laden. Ist sie danach immer noch nicht angemeldet, gilt die
     * Sitzung nur halb (z. B. nach App-Neustart: Login-Seite meldet "angemeldet", die Seite selbst
     * nicht) -> einmal komplett abmelden und mit den Zugangsdaten frisch anmelden.
     */
    function loginAndGet(url, fresh, cb) {
        login(function (err) {
            if (err) { return cb(err); }
            Http.get(url, function (err2, res2) {
                if (err2) { return cb(err2); }
                if (isLoggedIn(res2.text)) { return cb(null, res2.text); }
                if (!fresh) { return loginAndGet(url, true, cb); }
                cb({ code: 'login_failed', message: 'Anmeldung fehlgeschlagen.' });
            });
        }, fresh);
    }

    function getPage(url, mockKey, cb) {
        if (MOCK) {
            return Http.get(MOCK_FILES[mockKey], function (err, res) { cb(err, res && res.text); });
        }
        getAuthed(url, cb);
    }

    // ------------------------------------------------------------ Videorechte

    function articleImage(id, size) {
        var padded = ('000000000000' + id).slice(-12);
        return MEDIA + padded + '/' + (size ? 'size=' + size + '/' : '') + id + '.jpg';
    }

    /**
     * Alphabetischer Sortierschluessel, unabhaengig von localeCompare
     * (das alte WebKit auf Tizen 2.3 ignoriert das Gebietsschema und sortiert "Ä" hinter "Z").
     */
    function sortKey(title) {
        return title.toLowerCase()
            .replace(/[äàáâã]/g, 'a').replace(/[öòóôõ]/g, 'o').replace(/[üùúû]/g, 'u')
            .replace(/[éèêë]/g, 'e').replace(/[íìîï]/g, 'i').replace(/ß/g, 'ss')
            .replace(/^[^a-z0-9]+/, '');
    }

    function compareTitles(a, b) {
        var ka = sortKey(a.title), kb = sortKey(b.title);
        if (ka !== kb) { return ka < kb ? -1 : 1; }
        return a.title < b.title ? -1 : (a.title > b.title ? 1 : 0);
    }

    /** Liefert [{ id, title, url, image, imageSmall }] */
    function parseGames(html) {
        var doc = Util.parseHtml(html);
        var links = doc.querySelectorAll('a[href*="/Regelvideo/"]');
        var seen = {}, games = [];
        for (var i = 0; i < links.length; i++) {
            var href = links[i].getAttribute('href');
            var m = /-(\d+)\.html/.exec(href);
            if (!m || seen[m[1]]) { continue; }
            var url = Util.resolveUrl(href, BASE + '/');
            if (!isSiteUrl(url)) { continue; }
            seen[m[1]] = true;
            games.push({
                id: m[1],
                title: Util.text(links[i]),
                url: url,
                image: articleImage(m[1]),              // Originalgroesse
                imageSmall: articleImage(m[1], '200x200') // Fallback
            });
        }
        games.sort(compareTitles);
        return games;
    }

    function getGames(cb) {
        getPage(URL_RIGHTS, 'rights', function (err, html) {
            if (err) { return cb(err); }
            cb(null, parseGames(html));
        });
    }

    // ------------------------------------------------------------- Videoseite

    /** Liefert { title, chapters: [{ title, url }] } */
    function parseVideoPage(html) {
        // Nur tatsaechlich vorhandene Indizes durchgehen (nicht 0..max), max. Index begrenzen
        var urls = {}, indices = [], m;
        var re = /playlist\[(\d{1,4})\]\s*=\s*['"]([^'"]+)['"]/g;
        while ((m = re.exec(html)) !== null) {
            var n = parseInt(m[1], 10);
            if (n > MAX_CHAPTER_INDEX) { continue; }
            if (!urls.hasOwnProperty(n)) { indices.push(n); }
            urls[n] = m[2];
        }
        indices.sort(function (a, b) { return a - b; });

        var doc = Util.parseHtml(html);
        var chapters = [];
        for (var i = 0; i < indices.length; i++) {
            var url = Util.resolveUrl(urls[indices[i]], BASE + '/');
            if (!isMediaUrl(url)) { continue; }
            var el = doc.getElementById('playlist_' + indices[i]);
            chapters.push({
                title: el ? Util.text(el) : 'Kapitel ' + indices[i],
                url: url
            });
        }

        var h1 = doc.querySelector('h1');
        var title = h1 ? Util.text(h1).replace(/^Videoregelerklärung zu\s*/i, '') : '';
        return { title: title, chapters: chapters };
    }

    function getVideo(game, cb) {
        getPage(game.url, 'video', function (err, html) {
            if (err) { return cb(err); }
            var video = parseVideoPage(html);
            if (!video.chapters.length) {
                return cb({ code: 'no_video', message: 'Für dieses Spiel wurden keine Videokapitel gefunden.' });
            }
            cb(null, video);
        });
    }

    function logout() {
        credentials = null;
        if (!MOCK) { Http.get(URL_LOGOUT, function () {}); }
    }

    return {
        isMock: MOCK,
        setCredentials: setCredentials,
        login: login,
        getGames: getGames,
        getVideo: getVideo,
        logout: logout,
        // fuer Tests
        _parseLoginForm: parseLoginForm,
        _parseGames: parseGames,
        _parseVideoPage: parseVideoPage,
        _isSiteUrl: isSiteUrl,
        _isMediaUrl: isMediaUrl
    };
}());
