# Project state

## Current milestone

Make TTQ safe and pleasant to maintain without changing its userscript behavior.

## Completed

- Established `src/` as the editable source tree.
- Added a dependency-free build and watch workflow.
- Kept the Tampermonkey deliverable as a single checked-in file.
- Blocked scheduling and dispatching attacks that contain only one Tier-1 unit.
- Added an always-visible control that restores a lost task queue to the viewport center.

## Next opportunities

1. Add focused tests for pure scheduling and coordinate helpers.
2. Introduce explicit state objects for one task family at a time.
3. Extract browser and Travian adapters behind narrow seams once they have more than one caller or test implementation.

## Decisions

- **Concatenation before ES modules:** preserving the existing closure keeps every legacy global available and avoids an all-at-once rewrite.
- **Committed distribution artifact:** it gives Tampermonkey a ready-to-install, reviewable file and keeps source changes paired with the exact deployed output.
