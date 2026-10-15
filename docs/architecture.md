# Architecture

TTQ runs as one userscript closure. Source fragments are concatenated by `scripts/build.mjs` into `dist/ttq.user.js`; they are deliberately not runtime ES modules yet.

## Source map

| Area | Source file | Responsibility |
| --- | --- | --- |
| Install metadata and initialization | `00-metadata.js`, `01-bootstrap.js` | Tampermonkey directives, configuration, storage, translations, styles, and shared globals |
| Queue and history | `10-task-queue.js`, `11-history.js` | Task coordination, rendering, persistence, and history |
| Scheduled actions | `20-*.js` | Build, research, party, troops, training, demolish, and merchant task lifecycles |
| Shared UI and game interaction | `30-*.js`, `40-*.js`, `41-ui-helpers.js`, `42-menu.js` | Scheduling form, drag interactions, game data lookup, common UI, and menu actions |
| Startup and shutdown | `99-runtime.js` | Page listeners, intervals, load flow, and userscript bootstrapping |

## Source-order rule

All fragments share variables and functions from the surrounding closure. A fragment may use declarations from earlier fragments and may be used by later fragments. Keep bootstrapping first and runtime last. When extracting a new area, keep its functions together and update the ordered list in `scripts/build.mjs`.

## Deepening plan

The current split establishes locality. Future changes can make modules deeper by moving one stable responsibility behind a small interface—for example task storage, time calculations, or Travian request handling—while keeping adapters for the browser and game page at the seam. Do this one behavior-preserving slice at a time.
