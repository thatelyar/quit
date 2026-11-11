# Quit

A dark, minimal app for quitting bad habits. Set a habit, a number of days and a photo of the goal you earn. The photo starts dark and colourless and fills with colour for every clean day.

## Install

Open the app link on your phone, then:

- **iPhone (Safari):** Share → Add to Home Screen
- **Android (Chrome):** menu → Install app / Add to Home screen
- **Desktop (Chrome, Edge):** install icon in the address bar

Habits and photos are stored on the device, in that browser only.

## Develop

`quit.html` is the single source of the app. `node build.mjs` writes the installable site (page, manifest, service worker, icons) to `docs/`, which GitHub Pages serves.
