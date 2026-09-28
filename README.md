# Takt

Eine private, deutschsprachige PWA für persönliche Gewohnheiten. Gewohnheiten und Häkchen bleiben im lokalen Browserspeicher; die App funktioniert nach dem ersten Laden auch offline.

## Lokal starten

Benötigt wird Node.js 20 oder neuer. Es gibt keine Laufzeit-Abhängigkeiten.

```sh
npm start
```

Danach `http://localhost:4173` im Browser öffnen. Über das Browsermenü lässt sich Takt zum Startbildschirm hinzufügen.

Der lokale Server ist für die Entwicklung am selben Gerät gedacht. Für die Installation auf dem Smartphone müssen die statischen App-Dateien unter einer HTTPS-Adresse erreichbar sein; anschließend die Adresse im Browser des Telefons öffnen und Takt zum Startbildschirm hinzufügen.

## Auf GitHub Pages veröffentlichen

Im Repository unter **Settings → Pages → Build and deployment** einmal **GitHub Actions** als Quelle auswählen. Danach veröffentlicht der Workflow `.github/workflows/pages.yml` jeden Push auf `main`; ein manueller Start ist auch im Tab **Actions** möglich.

Die erwartete Adresse für dieses Repository ist <https://jdev64.github.io/habits-app/>. Nach einem erfolgreichen ersten Lauf ist Takt dort über HTTPS erreichbar und kann im Browser zum Startbildschirm hinzugefügt werden.

## Checks

```sh
npm test
npm run check
```

Erinnerungen sind standardmäßig ausgeschaltet. Wenn sie aktiviert sind, prüft Takt zur gewählten Zeit, ob heute eine noch offene Gewohnheit ansteht. Die Prüfung funktioniert, solange die App in einem Browser-Tab geöffnet ist.
