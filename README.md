# best-game-01

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/Minahichan/best-game-01/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/Minahichan/best-game-01/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

Lumen Drift — a salvage arcade game. Pilot a light-skiff through a drifting asteroid field, reel in glowing lumen shards with your tractor beam, chain them into combos, dodge rocks and mines, and clear 6 waves to complete the contract. One hit costs hull; three hits ends the run.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser. No build step, no network — the game is static files under `game/`.

Or hand in the entry exactly as the grader does:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## How to play

- **WASD / arrow keys** — thrust (the ship has inertia; it drifts)
- **Hold Space (or mouse button)** — tractor beam, reels nearby shards in
- **Shift (or right-click)** — dash, with a short cooldown
- **P** — pause · **M** — mute

Collect shards to fill the wave quota. Chaining shards within 3 seconds builds a combo up to ×5. Green **+** cells repair 1 hull, gold **×2** cells trigger 8 seconds of overdrive (double score, wider tractor). Mines arm when you get close and detonate after a short fuse — dash away. Clearing wave 6 wins the contract; losing all 3 hull ends it. Your best score is kept in the browser.

## Structure

- `game/index.html` — the page and its canvas
- `game/src/main.js` — boot and the fixed-step game loop
- `game/src/world.js` — the simulation: ship, shards, asteroids, mines, waves, scoring
- `game/src/render.js` — everything drawn: field, ship, HUD, title / pause / game-over / victory screens
- `game/src/input.js` — keyboard and mouse
- `game/src/audio.js` — synthesized WebAudio sound effects and ambient drone (no audio files)
- `game/src/config.js` — every tuning number in one place
- `game/src/random.js` — seeded RNG, so `?seed=N` replays a field exactly
- `game/src/shots.js` — staged scenes for the screenshots (`?shot=start|play|surge|end`)
- `main.ts` — the entrypoint: copies `game/` and `screenshots/` to the output and writes `dossier.json`
- `serve.ts` — tiny local static server for play-testing
- `vendor/makefun-game.ts` — the make.fun dossier library, unchanged

Screenshots in `screenshots/` are real renders of the game's own code in a browser: the title screen, early play, a late-wave surge with a ×4 combo, and the game-over screen.

---

Entered on [make.fun](https://make.fun/?ref=60xrk087&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards
