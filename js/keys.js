/* Fernbedienungs-Tasten: Registrierung (Tizen) und Abbildung auf logische Namen. */
var Keys = (function () {
    'use strict';

    // Fallback-KeyCodes (Samsung Tizen TV) + Desktop-Tasten fuer Tests im Browser.
    var map = {
        37: 'LEFT', 38: 'UP', 39: 'RIGHT', 40: 'DOWN',
        13: 'ENTER',
        10009: 'BACK', 8: 'BACK', 27: 'BACK',
        10252: 'PLAYPAUSE', 32: 'PLAYPAUSE',
        415: 'PLAY', 19: 'PAUSE', 413: 'STOP',
        417: 'FF', 412: 'RW',
        10233: 'NEXT', 10232: 'PREV',
        427: 'NEXT', 428: 'PREV',          // ChannelUp / ChannelDown
        33: 'NEXT', 34: 'PREV',            // PageUp / PageDown (Desktop)
        403: 'RED', 404: 'GREEN', 405: 'YELLOW', 406: 'BLUE',
        82: 'RED', 71: 'GREEN', 68: 'BLUE', // R / G / D (Desktop)
        65376: 'IME_DONE', 65385: 'IME_CANCEL'
    };

    var tizenKeys = {
        MediaPlayPause: 'PLAYPAUSE', MediaPlay: 'PLAY', MediaPause: 'PAUSE', MediaStop: 'STOP',
        MediaFastForward: 'FF', MediaRewind: 'RW',
        MediaTrackNext: 'NEXT', MediaTrackPrevious: 'PREV',
        ChannelUp: 'NEXT', ChannelDown: 'PREV',
        ColorF0Red: 'RED', ColorF1Green: 'GREEN', ColorF2Yellow: 'YELLOW', ColorF3Blue: 'BLUE'
    };

    function register() {
        if (!window.tizen || !tizen.tvinputdevice) { return; }
        for (var name in tizenKeys) {
            if (!tizenKeys.hasOwnProperty(name)) { continue; }
            try {
                tizen.tvinputdevice.registerKey(name);
                var k = tizen.tvinputdevice.getKey(name);
                if (k && k.code) { map[k.code] = tizenKeys[name]; }
            } catch (e) {
                // Taste auf diesem Modell nicht vorhanden (z.B. MediaTrackNext auf 2.3) -> ignorieren
            }
        }
    }

    function name(evt) {
        return map[evt.keyCode] || null;
    }

    return { register: register, name: name };
}());
