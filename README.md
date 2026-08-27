# Preflop Rarity Trainer

A tiny web app for building **intuition about how rare each poker starting hand is**.
Set the table to 2–10 players, hit **Deal** over and over (or turn on **Auto-deal**),
and watch every player's hole cards land on the classic 13×13 starting-hand chart.
A heat overlay builds up as you deal — so you *see* the premium corner stay cold while
the junk lights up constantly.

**Live:** _(GitHub Pages link goes here once enabled)_

## Use it
- **Players** — slider or +/− stepper, 2 to 10.
- **Deal** — button, or press **space**.
- **Auto-deal** — deals on a loop; the **Speed** slider sets the pace.
- **Reset counts** — clears the accumulated heat/counts to start a fresh sample.
- The 13×13 grid is colored by hand strength (5 tiers). Dealt hands flash white;
  the red overlay + corner counts show how often each hand has come up.

## How strength is scored
Coloring uses the **[Chen formula](https://www.thepokerbank.com/strategy/basic/starting-hand-selection/chen-formula/)** —
a simple, transparent preflop heuristic. It's for *feel*, **not** GTO/solver precision.

True per-deal odds of a specific starting hand: pocket pair **0.45%**, suited **0.30%**,
offsuit **0.90%** (6, 4, and 12 combos out of 1326).

## Run locally
No build step, no dependencies. Because it uses ES modules, open it over HTTP (not `file://`):

```bash
node dev-server.js
# then open http://127.0.0.1:8017
```

## Test
Pure poker logic lives in `poker.js` and is covered by unit tests:

```bash
node --test
```

## Files
- `index.html` — the whole UI (inline CSS + JS).
- `poker.js` — pure, testable logic: deck, shuffle, deal, canonical hand, grid mapping, Chen score.
- `poker.test.js` — unit tests (Node built-in test runner).
- `dev-server.js` — dev-only static server; **not** needed for GitHub Pages.
