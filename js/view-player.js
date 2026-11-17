/*
 * Videoplayer mit Kapiteln: Jedes Kapitel ist eine eigene MP4-Datei.
 * Nach Kapitelende wird automatisch das naechste Kapitel gestartet.
 */
var PlayerView = (function () {
    'use strict';
    var $ = Util.$;
    var SEEK_STEP = 10;           // Sekunden
    var OSD_TIMEOUT = 4000;       // ms
    var LIST_TIMEOUT = 8000;      // ms

    var el, video, osd, chapterBox, chapterList, status, progress, timeEl;
    var game = null, chapters = [], current = 0, listIdx = 0;
    var osdTimer = null, listTimer = null, onExit = null;

    // ----------------------------------------------------------- Diagnose
    // Blaue Taste (Desktop: D) blendet Wiedergabe-Statistiken ein/aus.
    var stats = { waiting: 0, stalled: 0 }, debugTimer = null, lastFrames = null;

    function frameCounts() {
        if (video.getVideoPlaybackQuality) {
            var q = video.getVideoPlaybackQuality();
            return { total: q.totalVideoFrames, dropped: q.droppedVideoFrames };
        }
        if (video.webkitDecodedFrameCount !== undefined) { // altes WebKit (Tizen 2.3)
            return { total: video.webkitDecodedFrameCount, dropped: video.webkitDroppedFrameCount };
        }
        return null;
    }

    function updateDebug() {
        var ahead = 0, b = video.buffered;
        for (var i = 0; i < b.length; i++) {
            if (b.start(i) <= video.currentTime && b.end(i) >= video.currentTime) { ahead = b.end(i) - video.currentTime; }
        }
        var f = frameCounts(), fps = '-', drop = '-';
        if (f) {
            if (lastFrames) {
                fps = String(f.total - lastFrames.total);
                drop = String(f.dropped - lastFrames.dropped);
            }
            lastFrames = f;
        }
        Util.$('player-debug').textContent = [
            'Zeit      ' + video.currentTime.toFixed(1) + ' / ' + (video.duration || 0).toFixed(1),
            'Puffer    ' + ahead.toFixed(1) + ' s voraus',
            'State     ready=' + video.readyState + ' net=' + video.networkState + (video.paused ? ' PAUSE' : ''),
            'Frames/s  ' + fps + '   verloren/s ' + drop + (f ? '   gesamt ' + f.dropped + '/' + f.total : ''),
            'waiting   ' + stats.waiting + '   stalled ' + stats.stalled,
            'Video     ' + video.videoWidth + 'x' + video.videoHeight,
            'Fenster   ' + window.innerWidth + 'x' + window.innerHeight + ' @' + (window.devicePixelRatio || 1),
            'Kapitel   ' + (listVisible() ? 'offen' : 'zu') + '   OSD ' + (/\bhidden\b/.test(osd.className) ? 'aus' : 'an')
        ].join('\n');
    }

    function toggleDebug() {
        var box = Util.$('player-debug');
        if (debugTimer) {
            clearInterval(debugTimer); debugTimer = null; Util.hide(box);
        } else {
            lastFrames = null; updateDebug(); Util.show(box);
            debugTimer = setInterval(updateDebug, 1000);
        }
    }

    function init(exitHandler) {
        el = $('view-player');
        video = $('video');
        osd = $('player-osd');
        chapterBox = $('player-chapters');
        chapterList = $('chapter-list');
        status = $('player-status');
        progress = $('osd-progress');
        timeEl = $('osd-time');
        onExit = exitHandler;

        // Listener nur einmal registrieren (die Originalseite haengt bei jedem Kapitelwechsel
        // einen weiteren "ended"-Listener an).
        video.addEventListener('ended', function () {
            if (current + 1 < chapters.length) {
                playChapter(current + 1);
            } else {
                setStatus('Video beendet');
                showList();
            }
        });
        video.addEventListener('timeupdate', updateOsd);
        video.addEventListener('playing', function () { setStatus(null); });
        video.addEventListener('waiting', function () { stats.waiting++; setStatus('Lade…'); });
        video.addEventListener('stalled', function () { stats.stalled++; });
        video.addEventListener('pause', function () { if (!video.ended) { showOsd(true); } });
        video.addEventListener('error', function () {
            if (!video.getAttribute('src')) { return; } // beim Schliessen
            // z.B. das Start-Intro liegt hinter Cloudflare -> automatisch weiter
            if (current + 1 < chapters.length) {
                setStatus('Kapitel konnte nicht abgespielt werden – weiter…');
                var failed = current;
                setTimeout(function () { if (current === failed) { playChapter(current + 1); } }, 2000);
            } else {
                setStatus('Kapitel konnte nicht abgespielt werden.');
            }
        });
    }

    /** play() liefert in neueren Browsern ein Promise, auf Tizen 2.3 undefined. */
    function safePlay() {
        var p = video.play();
        if (p && typeof p.catch === "function") { p.catch(function () {}); }
    }

    function setStatus(msg) {
        if (msg) { status.textContent = msg; Util.show(status); } else { Util.hide(status); }
    }

    // ---------------------------------------------------------------- OSD

    var lastTimeText = '';

    /**
     * Wird bei jedem "timeupdate" aufgerufen -> moeglichst billig halten:
     * nur wenn das OSD sichtbar ist, Fortschritt per transform (kein Layout/Repaint),
     * Zeittext nur bei Aenderung (1x pro Sekunde).
     */
    function updateOsd() {
        if (/\bhidden\b/.test(osd.className)) { return; }
        var d = video.duration, t = video.currentTime;
        var scale = 'scaleX(' + (d > 0 ? Math.min(1, t / d) : 0).toFixed(4) + ')';
        progress.style.webkitTransform = scale;
        progress.style.transform = scale;
        var txt = Util.formatTime(t) + ' / ' + Util.formatTime(d);
        if (txt !== lastTimeText) { lastTimeText = txt; timeEl.textContent = txt; }
    }

    function showOsd(sticky) {
        $('osd-game').textContent = game ? game.title : '';
        $('osd-chapter').textContent = (current + 1) + '/' + chapters.length + '  ' +
            (chapters[current] ? chapters[current].title : '');
        Util.show(osd);
        updateOsd();
        clearTimeout(osdTimer);
        if (!sticky) {
            osdTimer = setTimeout(function () { if (!video.paused) { Util.hide(osd); } }, OSD_TIMEOUT);
        }
    }

    // ------------------------------------------------------------- Kapitel

    /** Liste einmal pro Video aufbauen; danach nur noch Klassen umschalten. */
    function buildList() {
        var html = '';
        for (var i = 0; i < chapters.length; i++) {
            html += '<li><span class="num">' + (i + 1) + '</span>' +
                    Util.escapeHtml(chapters[i].title) + '</li>';
        }
        chapterList.innerHTML = html;
    }

    function renderList() {
        var items = chapterList.children;
        for (var i = 0; i < items.length; i++) {
            var cls = (i === current ? 'current' : '') + (i === listIdx ? ' focused' : '');
            if (items[i].className !== cls) { items[i].className = cls; }
        }

        // fokussiertes Kapitel sichtbar halten (per transform statt "top")
        var li = items[listIdx];
        var maxVisible = 880;
        var offset = li ? Math.max(0, li.offsetTop + li.offsetHeight - maxVisible) : 0;
        chapterList.style.webkitTransform = 'translateY(' + (-offset) + 'px)';
        chapterList.style.transform = 'translateY(' + (-offset) + 'px)';
    }

    function listVisible() { return !/\bhidden\b/.test(chapterBox.className); }

    function showList() {
        if (!listVisible()) { listIdx = current; }
        renderList();
        Util.show(chapterBox);
        showOsd(true);
        clearTimeout(listTimer);
        listTimer = setTimeout(hideList, LIST_TIMEOUT);
    }

    function hideList() {
        clearTimeout(listTimer);
        Util.hide(chapterBox);
        if (!video.paused) { showOsd(); }
    }

    function playChapter(i) {
        if (i < 0 || i >= chapters.length) { return; }
        current = i;
        listIdx = i;
        setStatus('Lade…');
        video.src = chapters[i].url;
        video.load();
        safePlay();
        if (listVisible()) { renderList(); }
        showOsd();
    }

    // ------------------------------------------------------------- Steuerung

    function open(g, videoInfo) {
        game = g;
        chapters = videoInfo.chapters;
        buildList();
        Util.show(el);
        hideList();
        playChapter(0);
    }

    function close() {
        chapters = []; // verhindert verzoegerte Kapitelwechsel nach dem Schliessen
        video.pause();
        video.removeAttribute('src');
        video.load();
        clearTimeout(osdTimer);
        clearTimeout(listTimer);
        Util.hide(osd);
        Util.hide(chapterBox);
        setStatus(null);
        Util.hide(el);
    }

    function togglePlay() {
        if (video.paused) { safePlay(); showOsd(); } else { video.pause(); }
    }

    function seek(delta) {
        if (!isFinite(video.duration)) { return; }
        video.currentTime = Math.max(0, Math.min(video.duration - 0.5, video.currentTime + delta));
        showOsd();
    }

    function onKey(key) {
        if (listVisible()) {
            clearTimeout(listTimer);
            listTimer = setTimeout(hideList, LIST_TIMEOUT);
            switch (key) {
            case 'UP': listIdx = Math.max(0, listIdx - 1); renderList(); return true;
            case 'DOWN': listIdx = Math.min(chapters.length - 1, listIdx + 1); renderList(); return true;
            case 'ENTER': hideList(); playChapter(listIdx); return true;
            case 'BACK': case 'LEFT': hideList(); return true;
            }
        }

        switch (key) {
        case 'UP': case 'DOWN': showList(); return true;
        case 'ENTER': case 'PLAYPAUSE': togglePlay(); return true;
        case 'PLAY': safePlay(); showOsd(); return true;
        case 'PAUSE': video.pause(); return true;
        case 'LEFT': case 'RW': seek(-SEEK_STEP); return true;
        case 'RIGHT': case 'FF': seek(SEEK_STEP); return true;
        case 'NEXT': playChapter(current + 1); return true;
        case 'PREV':
            // wie bei CD-Playern: nach >3s erst an den Kapitelanfang
            if (video.currentTime > 3) { video.currentTime = 0; showOsd(); } else { playChapter(current - 1); }
            return true;
        case 'BLUE': toggleDebug(); return true;
        case 'STOP': case 'BACK': if (debugTimer) { toggleDebug(); } close(); onExit(); return true;
        }
        return false;
    }

    return { init: init, open: open, close: close, onKey: onKey };
}());
