// Lumen Drift — the entrypoint the grader runs (Node 22, standard library only).
//
// What it does: take the game (game/) and its screenshots (screenshots/) from
// this repository and hand them in as the grader's /output, plus a dossier.json
// the judge reads, built from those same files by the vendored make.fun
// library. Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// The hand-in is deterministic on purpose: copying files and building the
// dossier from them always yields the same bytes, so the grader's two runs
// of this program agree with each other.

import { cpSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// Caps from the scorer: at most 4 screenshots of 256 KiB, at most 993 files
// and 48 MiB under game/, no game path over 1000 bytes, and the dossier text
// capped at 160 KiB. The library enforces them while it builds the dossier.
const DOSSIER_LIMITS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

function handIn(sourceDir, outDir) {
  mkdirSync(outDir, { recursive: true });

  const gameDir = join(sourceDir, 'game');
  if (!existsSync(gameDir)) throw new Error('game/ is missing from the repository');
  cpSync(gameDir, join(outDir, 'game'), { recursive: true });

  const shotsDir = join(sourceDir, 'screenshots');
  const shotsOut = join(outDir, 'screenshots');
  mkdirSync(shotsOut, { recursive: true });
  if (existsSync(shotsDir)) {
    for (const name of readdirSync(shotsDir).sort()) {
      if (name.startsWith('.')) continue;
      cpSync(join(shotsDir, name), join(shotsOut, name));
    }
  }

  writeFileSync(join(outDir, 'dossier.json'), buildDossier(outDir, DOSSIER_LIMITS));
}

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
handIn(repoRoot, outputDir);
