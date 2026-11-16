// Lumen Drift — tuning constants. One place for every number the game balances on,
// so difficulty, pacing and feel can be tuned without touching the simulation.
export const VIEW_W = 960;
export const VIEW_H = 540;
export const BEST_KEY = 'lumen-drift-best';
export const STEP = 1 / 60;

// The ship.
export const SHIP_RADIUS = 13;
export const THRUST = 560; // acceleration, px/s^2
export const MAX_SPEED = 330;
export const DRAG = 0.9; // velocity retained per second when not thrusting
export const DASH_SPEED = 640;
export const DASH_TIME = 0.16; // seconds of dash burst
export const DASH_COOLDOWN = 2.4; // seconds before the next dash
export const HIT_INVULN = 1.6; // seconds of protection after taking a hit
export const MAX_HULL = 3;

// The tractor beam.
export const TRACTOR_RADIUS = 170;
export const TRACTOR_PULL = 420; // acceleration applied to shards in range
export const OVERDRIVE_TRACTOR_RADIUS = 260;

// Shards, combo and scoring.
export const SHARD_RADIUS = 8;
export const SHARD_SCORE = 10;
export const COMBO_WINDOW = 3.0; // seconds between pickups to keep the chain
export const COMBO_MAX = 5;
export const WAVE_QUOTA_BASE = 8; // shards to clear wave 1
export const WAVE_QUOTA_STEP = 4; // extra shards per later wave
export const WAVE_CLEAR_BONUS = 150;
export const VICTORY_WAVE = 6; // clearing this wave wins the contract

// Hazards.
export const ASTEROID_SPEED_MIN = 24;
export const ASTEROID_SPEED_MAX = 90;
export const MINE_RADIUS = 12;
export const MINE_TRIGGER = 74; // px: closer than this and the mine arms
export const MINE_FUSE = 0.7; // seconds from arming to detonation
export const BLAST_RADIUS = 96;

// Pickups.
export const REPAIR_CHANCE = 0.06; // of shard spawns, a repair cell instead
export const OVERDRIVE_CHANCE = 0.05;
export const OVERDRIVE_TIME = 8; // seconds of overdrive

// Spawning.
export const SHARD_TARGET = 6; // shards kept drifting at once
export const SPAWN_MARGIN = 40; // keep spawns this far inside the edges
