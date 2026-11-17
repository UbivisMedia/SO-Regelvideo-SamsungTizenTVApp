/* Spieleauswahl: quadratische Kacheln mit Spielbild, Navigation per Pfeiltasten. */
var GridView = (function () {
    'use strict';
    var $ = Util.$;
    var COLS = 6;
    var ROW_HEIGHT = 290;    // Kachel 260 (inkl. Rahmen) + 2x15 Abstand
    var VISIBLE_ROWS = 3;
    var NOT_FOUND_MIN_SIZE = 1000;

    var el, grid, tiles = [], games = [], idx = 0, scrollRow = 0, onSelect = null;

    function init(selectHandler) {
        el = $('view-grid');
        grid = $('grid');
        onSelect = selectHandler;
    }

    /** Bild vorladen; bei Fehler kleinere Variante, sonst Platzhalter behalten. */
    function loadImage(tile, game) {
        var sources = [game.image, game.imageSmall];
        function attempt(i) {
            if (i >= sources.length) { return; }
            var img = new Image();
            img.onload = function () {
                // Fehlende Artikelbilder leitet der Server auf "BildNichtGefunden.jpg" (1200x1200) um,
                // echte Bilder sind max. ~450px. -> dann unseren Platzhalter behalten.
                if (img.naturalWidth >= NOT_FOUND_MIN_SIZE) { return; }
                tile.style.backgroundImage = 'url("' + sources[i] + '")';
                var ph = tile.querySelector('.placeholder');
                if (ph) { tile.removeChild(ph); }
            };
            img.onerror = function () { attempt(i + 1); };
            img.src = sources[i];
        }
        attempt(0);
    }

    function render(list) {
        games = list;
        tiles = [];
        grid.innerHTML = '';
        $('grid-count').textContent = '(' + list.length + ')';
        if (list.length) { Util.hide($('grid-empty')); } else { Util.show($('grid-empty')); }

        for (var i = 0; i < list.length; i++) {
            var tile = document.createElement('div');
            tile.className = 'tile';
            tile.innerHTML = '<div class="placeholder">&#9654;</div>' +
                             '<div class="title">' + Util.escapeHtml(list[i].title) + '</div>';
            grid.appendChild(tile);
            tiles.push(tile);
            loadImage(tile, list[i]);
        }
        refreshProgress();
        scrollRow = 0;
        focus(Math.min(idx, list.length - 1));
    }

    function focus(i) {
        if (!tiles.length) { return; }
        if (tiles[idx]) { Util.toggleClass(tiles[idx], 'focused', false); }
        idx = Math.max(0, Math.min(tiles.length - 1, i));
        Util.toggleClass(tiles[idx], 'focused', true);

        var row = Math.floor(idx / COLS);
        if (row < scrollRow) { scrollRow = row; }
        if (row >= scrollRow + VISIBLE_ROWS) { scrollRow = row - VISIBLE_ROWS + 1; }
        var y = -scrollRow * ROW_HEIGHT;
        grid.style.webkitTransform = 'translateY(' + y + 'px)';
        grid.style.transform = 'translateY(' + y + 'px)';
    }

    /** Fortschrittsbalken (Fortsetzen-Stand) auf allen Kacheln aktualisieren. */
    function refreshProgress() {
        for (var i = 0; i < tiles.length; i++) {
            var bar = tiles[i].querySelector('.progress');
            var f = Progress.fraction(games[i].id);
            if (f === null) {
                if (bar) { tiles[i].removeChild(bar); }
                continue;
            }
            if (!bar) {
                bar = document.createElement('div');
                bar.className = 'progress';
                tiles[i].appendChild(bar);
            }
            bar.style.width = Math.max(3, Math.round(f * 100)) + '%';
        }
    }

    function show() { refreshProgress(); Util.show(el); }
    function hide() { Util.hide(el); }

    function onKey(key) {
        switch (key) {
        case 'LEFT': if (idx % COLS > 0) { focus(idx - 1); } return true;
        case 'RIGHT': if (idx % COLS < COLS - 1 && idx + 1 < tiles.length) { focus(idx + 1); } return true;
        case 'UP': if (idx - COLS >= 0) { focus(idx - COLS); } return true;
        case 'DOWN':
            if (idx + COLS < tiles.length) { focus(idx + COLS); }
            else if (Math.floor(idx / COLS) < Math.floor((tiles.length - 1) / COLS)) { focus(tiles.length - 1); }
            return true;
        case 'ENTER':
        case 'PLAY':
        case 'PLAYPAUSE':
            if (games[idx]) { onSelect(games[idx]); }
            return true;
        }
        return false;
    }

    return { init: init, render: render, show: show, hide: hide, onKey: onKey };
}());
