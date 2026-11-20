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

    // ----------------------------------------------------------- Fortsetzen
    var SAVE_INTERVAL = 5;        // Sekunden zwischen Speicherungen
    var RESUME_REWIND = 3;        // beim Fortsetzen etwas zurueckspringen (Kontext)
    var MIN_RESUME = 10;          // erst ab 10 s im ersten Kapitel lohnt Fortsetzen
    var lastSavedTime = 0, resumeEntry = null, resumeIdx = 0, seekPending = false;

    function saveProgress() {
        if (!game || !chapters.length || seekPending || video.ended) { return; }
        var t = video.currentTime, d = video.duration;
        lastSavedTime = t;
        if (isFinite(d) && d > 0 && t > d - 2) {
            // praktisch am Kapitelende -> naechstes Kapitel merken
            if (current + 1 < chapters.length) {
                Progress.save(game.id, current + 1, 0, 0, chapters.length);
            }
            return;
        }
        Progress.save(game.id, current, t, d, chapters.length);
    }

    /**
     * Fortsetzen nur anbieten, wenn es sich lohnt: mind. 10 s in einem Kapitel oder ab dem
     * 3. Kapitel. (Kapitel 1 ist meist das kurze Start-Intro; "Kapitel 2 bei 0:00" waere sinnlos.)
     */
    function canResume(p) {
        return !!p && p.c < chapters.length && (p.t >= MIN_RESUME || p.c >= 2);
    }

    function showResumeDialog(p) {
        resumeEntry = p;
        resumeIdx = 0;
        var ch = chapters[p.c];
        $('resume-info').textContent = 'Kapitel ' + (p.c + 1) + '/' + chapters.length + ': ' +
            (ch ? ch.title : '') + (p.t > 0 ? ' (bei ' + Util.formatTime(p.t) + ')' : '');
        renderResume();
        Util.show($('player-resume'));
    }

    function renderResume() {
        Util.toggleClass($('resume-continue'), 'focused', resumeIdx === 0);
        Util.toggleClass($('resume-restart'), 'focused', resumeIdx === 1);
    }

    function resumeVisible() { return !/\bhidden\b/.test($('player-resume').className); }

    function chooseResume(cont) {
        var p = resumeEntry;
        Util.hide($('player-resume'));
        resumeEntry = null;
        if (cont) {
            playChapter(p.c, Math.max(0, p.t - RESUME_REWIND));
        } else {
            Progress.clear(game.id);
            playChapter(0);
        }
    }

    // ----------------------------------------------------------- Vorpuffern
    // <video> laesst sich die Puffergroesse nicht vorschreiben. Stattdessen pausieren wir
    // selbst, bis genug Vorlauf geladen ist: beim Kapitelstart und nach jedem Haenger.
    // So gibt es eine kurze Wartezeit statt staendigem Stocken.
    var START_BUFFER = 10;        // Sekunden Vorlauf vor dem Start eines Kapitels
    var STALL_BUFFER = 20;        // Sekunden Vorlauf nach einem Haenger
    var BUFFER_CHECK = 250;       // ms
    var NO_PROGRESS_WAIT = 4000;  // ms ohne Fortschritt beim Laden -> trotzdem starten
    var MAX_BUFFER_WAIT = 30000;  // ms maximale Wartezeit
    var buffering = null;         // { target, started, lastAhead, lastGrowth, timer }

    function bufferedAhead() {
        var b = video.buffered, t = video.currentTime;
        for (var i = 0; i < b.length; i++) {
            if (b.start(i) <= t + 0.5 && b.end(i) >= t) { return Math.max(0, b.end(i) - t); }
        }
        return 0;
    }

    function startBuffering(target) {
        stopBuffering();
        var now = new Date().getTime();
        buffering = { target: target, started: now, lastAhead: 0, lastGrowth: now, timer: null };
        if (!video.paused) { video.pause(); }
        checkBuffer();
        if (buffering) { buffering.timer = setInterval(checkBuffer, BUFFER_CHECK); }
    }

    function stopBuffering() {
        if (!buffering) { return; }
        clearInterval(buffering.timer);
        buffering = null;
    }

    function checkBuffer() {
        if (!buffering) { return; }
        var now = new Date().getTime();
        var ahead = bufferedAhead();
        var d = video.duration;
        var remaining = isFinite(d) && d > 0 ? d - video.currentTime : Infinity;
        var need = Math.min(buffering.target, Math.max(0, remaining - 0.5));

        if (ahead > buffering.lastAhead + 0.1) { buffering.lastAhead = ahead; buffering.lastGrowth = now; }

        var enough = video.readyState >= 3 && !seekPending && ahead >= need;
        // Laedt der TV im Pausezustand nicht (weiter), nicht ewig warten - dann normal abspielen
        var stuck = now - buffering.lastGrowth > NO_PROGRESS_WAIT;
        var timeout = now - buffering.started > MAX_BUFFER_WAIT;

        if (enough || stuck || timeout) {
            stopBuffering();
            setStatus(null);
            safePlay();
            showOsd();
            return;
        }
        setStatus('Puffern… ' + Math.floor(ahead) + ' / ' + Math.ceil(need || buffering.target) + ' s');
    }

    // ------------------------------------------------- Naechstes Kapitel vorladen
    // Ein zweites, unsichtbares <video> laedt gegen Ende eines Kapitels schon das naechste.
    // Beim Kapitelwechsel werden die beiden Elemente nur getauscht -> kein Warten.
    // Manche aeltere TVs koennen nur ein Video gleichzeitig verarbeiten: Gibt es dann einen
    // Fehler im laufenden Kapitel, wird das Vorladen fuer diese Sitzung abgeschaltet.
    var PRELOAD_NEXT = true;
    var PRELOAD_LEAD = 60;        // Sekunden vor Kapitelende mit dem Vorladen beginnen
    var standby = null;           // das jeweils unsichtbare <video>
    var preloadIdx = -1;          // Kapitel, das in "standby" vorgeladen wird
    var preloadOff = false;       // nach Problemen fuer diese Sitzung aus
    var preloadFailed = -1;       // Kapitel, dessen Vorladen fehlschlug (nicht erneut versuchen)

    function checkPreload() {
        if (!PRELOAD_NEXT || preloadOff || buffering) { return; }
        var next = current + 1;
        if (next >= chapters.length || preloadIdx === next || preloadFailed === next) { return; }
        var d = video.duration;
        if (!isFinite(d) || d <= 0) { return; }
        var remaining = d - video.currentTime;
        if (remaining > PRELOAD_LEAD) { return; }
        // Der Bandbreite des laufenden Kapitels nichts wegnehmen: erst starten, wenn es bis zum
        // Ende geladen ist - oder spaetestens in der zweiten Haelfte der Vorlaufzeit.
        if (bufferedAhead() < remaining - 1 && remaining > PRELOAD_LEAD / 2) { return; }
        dropPreload();
        preloadIdx = next;
        standby.src = chapters[next].url;
        standby.load();
    }

    function dropPreload() {
        preloadIdx = -1;
        if (standby && standby.getAttribute('src')) {
            standby.pause();
            standby.removeAttribute('src');
            standby.load();
        }
    }

    /** Vorgeladenes Element sichtbar machen und zum aktiven Player machen. */
    function swapToStandby() {
        var old = video;
        video = standby;
        standby = old;
        preloadIdx = -1;
        Util.toggleClass(video, 'standby', false);
        Util.toggleClass(standby, 'standby', true);
        standby.pause();
        standby.removeAttribute('src');
        standby.load();
    }

    function preloadInfo() {
        if (!PRELOAD_NEXT || preloadOff) { return 'aus'; }
        if (preloadIdx < 0) { return '-'; }
        var b = standby.buffered, end = b.length ? b.end(b.length - 1) : 0;
        return 'Kapitel ' + (preloadIdx + 1) + ': ' + end.toFixed(1) + ' s geladen, ready=' + standby.readyState;
    }

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
            'waiting   ' + stats.waiting + '   stalled ' + stats.stalled +
                (buffering ? '   VORPUFFERN ziel ' + buffering.target + ' s' : ''),
            'Vorladen  ' + preloadInfo(),
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

    /** Listener an beide <video> haengen, aber nur Ereignisse des aktiven Players verarbeiten. */
    function listen(type, fn) {
        var els = [$('video'), $('video2')];
        for (var i = 0; i < els.length; i++) {
            els[i].addEventListener(type, function (e) { if (e.target === video) { fn(e); } });
        }
    }

    function init(exitHandler) {
        el = $('view-player');
        video = $('video');
        standby = $('video2');
        osd = $('player-osd');
        chapterBox = $('player-chapters');
        chapterList = $('chapter-list');
        status = $('player-status');
        progress = $('osd-progress');
        timeEl = $('osd-time');
        onExit = exitHandler;

        // Fehler beim Vorladen (z. B. 403): still verwerfen, Kapitel wird dann normal geladen
        var onStandbyError = function (e) {
            if (e.target !== standby || preloadIdx < 0 || !e.target.getAttribute('src')) { return; }
            preloadFailed = preloadIdx;
            dropPreload();
        };
        video.addEventListener('error', onStandbyError);
        standby.addEventListener('error', onStandbyError);

        // Listener nur einmal registrieren (die Originalseite haengt bei jedem Kapitelwechsel
        // einen weiteren "ended"-Listener an).
        listen('ended', function () {
            if (current + 1 < chapters.length) {
                playChapter(current + 1);
            } else {
                if (game) { Progress.clear(game.id); } // komplett gesehen -> naechstes Mal von vorne
                setStatus('Video beendet');
                showList();
            }
        });
        listen('timeupdate', function () {
            updateOsd();
            checkPreload();
            if (Math.abs(video.currentTime - lastSavedTime) >= SAVE_INTERVAL) { saveProgress(); }
        });
        listen('pause', function () { saveProgress(); });
        listen('playing', function () { setStatus(null); });
        listen('waiting', function () {
            stats.waiting++;
            // Haenger waehrend der Wiedergabe: ordentlich Vorlauf sammeln statt Stop-and-Go
            // (nach einem Sprung reicht der kleinere Vorlauf)
            if (!buffering && chapters.length) { startBuffering(video.seeking ? START_BUFFER : STALL_BUFFER); }
        });
        listen('stalled', function () { stats.stalled++; });
        listen('pause', function () { if (!video.ended) { showOsd(true); } });
        listen('error', function () {
            if (!video.getAttribute('src')) { return; } // beim Schliessen
            stopBuffering();
            // Fehler mitten im Kapitel, waehrend im Hintergrund vorgeladen wird: Vermutlich kann
            // der TV nicht zwei Videos gleichzeitig. Vorladen abschalten, Kapitel an der Stelle
            // neu laden (einmalig).
            if (preloadIdx >= 0 && video.currentTime > 0 && !preloadOff) {
                preloadOff = true;
                dropPreload();
                setStatus('Vorladen wird abgeschaltet – lade Kapitel neu…');
                var idx = current, pos = video.currentTime;
                setTimeout(function () { if (current === idx && chapters.length) { playChapter(idx, pos); } }, 1000);
                return;
            }
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

    /** startAt (optional): Startposition in Sekunden, z.B. beim Fortsetzen. */
    function playChapter(i, startAt) {
        if (i < 0 || i >= chapters.length) { return; }
        current = i;
        listIdx = i;
        lastSavedTime = startAt || 0;
        setStatus('Lade…');
        if (preloadIdx === i && !(startAt > 0)) {
            swapToStandby(); // schon im Hintergrund geladen -> Puffer ist (fast) voll
        } else {
            dropPreload();
            video.src = chapters[i].url;
            video.load();
        }
        if (startAt > 0) {
            // Springen ist erst moeglich, wenn die Metadaten (Dauer) bekannt sind.
            seekPending = true;
            var onMeta = function () {
                video.removeEventListener('loadedmetadata', onMeta);
                seekPending = false;
                try { video.currentTime = Math.min(startAt, Math.max(0, video.duration - 1)); } catch (e) {}
            };
            video.addEventListener('loadedmetadata', onMeta);
        } else {
            seekPending = false;
        }
        // nicht sofort abspielen, sondern erst etwas Vorlauf laden (preload="auto")
        startBuffering(START_BUFFER);
        if (game) { Progress.save(game.id, i, startAt || 0, 0, chapters.length); }
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
        var saved = Progress.get(game.id);
        if (canResume(saved)) {
            showResumeDialog(saved);
        } else {
            playChapter(0);
        }
    }

    function close() {
        if (!resumeVisible()) { saveProgress(); }
        Util.hide($('player-resume'));
        resumeEntry = null;
        chapters = []; // verhindert verzoegerte Kapitelwechsel nach dem Schliessen
        stopBuffering();
        dropPreload();
        preloadFailed = -1;
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
        if (buffering) { stopBuffering(); setStatus('Pausiert'); showOsd(true); return; }
        if (video.paused) { setStatus(null); safePlay(); showOsd(); } else { video.pause(); }
    }

    function seek(delta) {
        if (!isFinite(video.duration)) { return; }
        video.currentTime = Math.max(0, Math.min(video.duration - 0.5, video.currentTime + delta));
        showOsd();
    }

    function onKey(key) {
        if (resumeVisible()) {
            switch (key) {
            case 'LEFT': case 'UP': resumeIdx = 0; renderResume(); return true;
            case 'RIGHT': case 'DOWN': resumeIdx = 1; renderResume(); return true;
            case 'ENTER': case 'PLAY': case 'PLAYPAUSE': chooseResume(resumeIdx === 0); return true;
            case 'BACK': case 'STOP': close(); onExit(); return true;
            }
            return true; // andere Tasten im Dialog ignorieren
        }
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
        case 'PLAY': stopBuffering(); setStatus(null); safePlay(); showOsd(); return true;
        case 'PAUSE': if (buffering) { togglePlay(); } else { video.pause(); } return true;
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
