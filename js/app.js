/* Ablaufsteuerung: Start -> (Login) -> Spieleauswahl -> Player. */
var App = (function () {
    'use strict';
    var view = null; // aktive Ansicht: LoginView | GridView | PlayerView

    function setView(v) {
        if (view && view !== v && view.hide) { view.hide(); }
        view = v;
    }

    function exitApp() {
        try {
            tizen.application.getCurrentApplication().exit();
        } catch (e) {
            // Desktop-Browser: nichts zu tun
        }
    }

    function errorText(err) {
        if (err && err.code === 'cloudflare') {
            return 'Die Spiele-Offensive blockiert den Zugriff (Cloudflare-Schutz). Bitte später erneut versuchen.';
        }
        return (err && err.message) || 'Unbekannter Fehler';
    }

    // ------------------------------------------------------------------ Login

    function showLogin(error) {
        var creds = CredStore.load();
        setView(LoginView);
        LoginView.show({ user: creds ? creds.user : '', error: error });
    }

    function doLogin(user, pass) {
        Api.setCredentials({ user: user, pass: pass });
        Util.loading(true, 'Anmelden…');
        // fresh: eine evtl. noch bestehende Sitzung (anderes Konto?) nicht uebernehmen
        Api.login(function (err) {
            Util.loading(false);
            if (err) { return LoginView.showError(errorText(err)); }
            CredStore.save(user, pass);
            Progress.setAccount(user);
            LoginView.hide();
            loadGames();
        }, true);
    }

    function logout() {
        CredStore.clear();
        Api.logout();
        showLogin('Du wurdest abgemeldet.');
    }

    // ------------------------------------------------------------ Spiele

    function loadGames() {
        Util.loading(true, 'Lade Videorechte…');
        Api.getGames(function (err, games) {
            Util.loading(false);
            if (err) {
                return showLogin(errorText(err));
            }
            setView(GridView);
            GridView.render(games);
            GridView.show();
        });
    }

    function openGame(game) {
        Util.loading(true, 'Lade Video…');
        Api.getVideo(game, function (err, info) {
            Util.loading(false);
            if (err) { return alertMsg(errorText(err)); }
            if (info.title) { game = { id: game.id, title: info.title, url: game.url }; }
            GridView.hide();
            setView(PlayerView);
            PlayerView.open(game, info);
        });
    }

    function closePlayer() {
        setView(GridView);
        GridView.show();
    }

    function alertMsg(msg) {
        // kurze Meldung ueber die Ladeanzeige
        Util.loading(true, msg);
        Util.$('loading').className += ' message';
        setTimeout(function () {
            Util.$('loading').className = Util.$('loading').className.replace(/\s*message/g, '');
            Util.loading(false);
        }, 3000);
    }

    // ------------------------------------------------------------ Tasten

    function onKeyDown(evt) {
        var key = Keys.name(evt);
        if (!key) { return; }

        // Waehrend Laden/Meldung keine Eingaben verarbeiten
        if (!/\bhidden\b/.test(Util.$('loading').className)) {
            evt.preventDefault();
            return;
        }

        var handled = view && view.onKey(key);

        if (!handled && view === GridView) {
            if (key === 'RED') { logout(); handled = true; }
            else if (key === 'GREEN') { loadGames(); handled = true; }
            else if (key === 'BACK') { exitApp(); handled = true; }
        }
        if (!handled && view === LoginView && key === 'BACK') { exitApp(); handled = true; }

        if (handled) { evt.preventDefault(); }
    }

    // ------------------------------------------------------------ Start

    function start() {
        Keys.register();
        LoginView.init(doLogin);
        GridView.init(openGame);
        PlayerView.init(closePlayer);
        document.addEventListener('keydown', onKeyDown);

        // Desktop-Test: Mausklick auf Kacheln/Kapitel ist nicht vorgesehen, nur Tastatur.
        var creds = CredStore.load();
        if (creds || Api.isMock) {
            Api.setCredentials(creds);
            Progress.setAccount(creds && creds.user);
            loadGames();
        } else {
            showLogin();
        }
    }

    window.addEventListener('load', start);

    return { start: start };
}());
