# Travian Task Queue

TTQ is a Tampermonkey userscript for scheduling Travian 4 actions.

## Install or update

Open [dist/ttq.user.js](dist/ttq.user.js) in Tampermonkey and install or save it. This is the only file Tampermonkey needs.

## Develop

```sh
npm run watch
```

Edit the relevant file in `src/`. The watcher regenerates `dist/ttq.user.js` on every saved change. Use `npm run check` before installing an update; it rebuilds the artifact and checks its syntax.

The source layout and its ordered build are documented in [docs/architecture.md](docs/architecture.md). Project context and the active maintenance plan live in [PROJECT.md](PROJECT.md) and [STATE.md](STATE.md).
