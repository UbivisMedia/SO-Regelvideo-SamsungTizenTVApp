/*
 * Wiedergabe-Fortschritt pro Spiel (fuer "Fortsetzen"), gespeichert im localStorage.
 * Eintrag: { c: Kapitelindex, t: Sekunde im Kapitel, d: Kapiteldauer, n: Kapitelanzahl, u: Zeitstempel }
 */
var Progress = (function () {
    'use strict';
    var KEY = 'so_progress';
    var MAX_ENTRIES = 200;
    var cache = null;

    function loadAll() {
        if (cache) { return cache; }
        try { cache = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { cache = {}; }
        return cache;
    }

    function persist() {
        var all = loadAll();
        // Speicher begrenzen: aelteste Eintraege verwerfen
        var ids = [];
        for (var id in all) { if (all.hasOwnProperty(id)) { ids.push(id); } }
        if (ids.length > MAX_ENTRIES) {
            ids.sort(function (a, b) { return all[a].u - all[b].u; });
            for (var i = 0; i < ids.length - MAX_ENTRIES; i++) { delete all[ids[i]]; }
        }
        try { localStorage.setItem(KEY, JSON.stringify(all)); } catch (e) {}
    }

    function get(id) {
        return loadAll()[id] || null;
    }

    function save(id, chapter, time, duration, count) {
        loadAll()[id] = {
            c: chapter,
            t: Math.floor(time || 0),
            d: isFinite(duration) ? Math.floor(duration) : 0,
            n: count,
            u: new Date().getTime()
        };
        persist();
    }

    function clear(id) {
        delete loadAll()[id];
        persist();
    }

    /** Anteil 0..1 fuer den Fortschrittsbalken der Kachel, null wenn nichts gespeichert. */
    function fraction(id) {
        var p = get(id);
        if (!p || !p.n) { return null; }
        var inChapter = p.d > 0 ? Math.min(1, p.t / p.d) : 0;
        return Math.min(1, (p.c + inChapter) / p.n);
    }

    return { get: get, save: save, clear: clear, fraction: fraction };
}());
