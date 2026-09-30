# Travian Task Queue

## Purpose

TTQ is a Tampermonkey userscript for Travian 4 that schedules delayed constructions, upgrades, troop actions, research, celebrations, demolitions, and merchant transfers.

## Product constraints

- The installed artifact must be one standalone userscript: `dist/ttq.user.js`.
- It runs in Travian pages, where DOM structure and internal endpoints are external dependencies that can change without notice.
- Existing saved Tampermonkey values and scheduled tasks are user data. Preserve their keys and serialized shapes unless a migration is explicitly implemented.
- The code is legacy browser JavaScript. Improve it incrementally, with compatibility and observable behavior ahead of stylistic modernization.

## Definition of done

A change is done when its source is split into the appropriate area, `npm run check` passes, the distribution artifact is regenerated, and the relevant in-game path has been manually verified when behavior changed.
