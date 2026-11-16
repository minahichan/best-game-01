// The simulation: the ship, the drifting field, and everything that happens in it.
// It knows nothing about the screen or the keyboard — main.js feeds it input and
// reads back events, so the world can be stepped deterministically from any seed.
import {
  ASTEROID_SPEED_MAX,
  ASTEROID_SPEED_MIN,
  BLAST_RADIUS,
  COMBO_MAX,
  COMBO_WINDOW,
  DASH_COOLDOWN,
  DASH_SPEED,
  DASH_TIME,
  DRAG,
  HIT_INVULN,
  MAX_HULL,
  MAX_SPEED,
  MINE_FUSE,
  MINE_RADIUS,
  MINE_TRIGGER,
  OVERDRIVE_CHANCE,
  OVERDRIVE_TIME,
  OVERDRIVE_TRACTOR_RADIUS,
  REPAIR_CHANCE,
  SHARD_RADIUS,
  SHARD_SCORE,
  SHARD_TARGET,
  SHIP_RADIUS,
  SPAWN_MARGIN,
  THRUST,
  TRACTOR_PULL,
  TRACTOR_RADIUS,
  VICTORY_WAVE,
  VIEW_H,
  VIEW_W,
  WAVE_CLEAR_BONUS,
  WAVE_QUOTA_BASE,
  WAVE_QUOTA_STEP,
} from './config.js';

export const EVENT_NONE = 0;
export const EVENT_PICKUP = 1;
export const EVENT_HIT = 2;
export const EVENT_OVER = 4;
export const EVENT_WAVE = 8;
export const EVENT_VICTORY = 16;
export const EVENT_DASH = 32;
export const EVENT_REPAIR = 64;
export const EVENT_OVERDRIVE = 128;
export const EVENT_EXPLOSION = 256;

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function createWorld(random) {
  const state = {
    time: 0,
    score: 0,
    best: 0,
    wave: 1,
    hull: MAX_HULL,
    combo: 0,
    comboTimer: 0,
    quota: WAVE_QUOTA_BASE,
    collected: 0,
    overdrive: 0,
    banner: '',
    bannerTimer: 0,
    shake: 0,
    ship: { x: VIEW_W / 2, y: VIEW_H / 2, vx: 0, vy: 0, angle: -Math.PI / 2, dash: 0, dashCooldown: 0, invuln: 0 },
    shards: [],
    asteroids: [],
    mines: [],
    pickups: [],
    particles: [],
    stars: [],
  };

  for (let i = 0; i < 90; i++) {
    state.stars.push({
      x: random.range(0, VIEW_W),
      y: random.range(0, VIEW_H),
      size: random.range(0.6, 2.2),
      twinkle: random.range(0, Math.PI * 2),
    });
  }

  function quotaFor(wave) {
    return WAVE_QUOTA_BASE + (wave - 1) * WAVE_QUOTA_STEP;
  }

  function randomEdgePoint(margin) {
    const side = random.int(0, 3);
    if (side === 0) return { x: random.range(margin, VIEW_W - margin), y: margin };
    if (side === 1) return { x: random.range(margin, VIEW_W - margin), y: VIEW_H - margin };
    if (side === 2) return { x: margin, y: random.range(margin, VIEW_H - margin) };
    return { x: VIEW_W - margin, y: random.range(margin, VIEW_H - margin) };
  }

  function spawnShard() {
    const roll = random.next();
    const kind = roll < REPAIR_CHANCE ? 'repair' : roll < REPAIR_CHANCE + OVERDRIVE_CHANCE ? 'overdrive' : 'shard';
    const point = {
      x: random.range(SPAWN_MARGIN, VIEW_W - SPAWN_MARGIN),
      y: random.range(SPAWN_MARGIN, VIEW_H - SPAWN_MARGIN),
    };
    const target = kind === 'shard' ? state.shards : state.pickups;
    target.push({
      kind,
      ...point,
      vx: random.range(-14, 14),
      vy: random.range(-14, 14),
      phase: random.range(0, Math.PI * 2),
    });
  }

  function spawnAsteroid() {
    const point = randomEdgePoint(SPAWN_MARGIN);
    const angle = Math.atan2(VIEW_H / 2 - point.y, VIEW_W / 2 - point.x) + random.range(-0.6, 0.6);
    const speed = random.range(ASTEROID_SPEED_MIN, ASTEROID_SPEED_MAX) * (1 + (state.wave - 1) * 0.12);
    const radius = random.pick([14, 20, 28]);
    state.asteroids.push({
      ...point,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius,
      spin: random.range(-1.4, 1.4),
      angle: random.range(0, Math.PI * 2),
      crags: Array.from({ length: 7 }, () => random.range(0.75, 1.15)),
    });
  }

  function spawnMine() {
    const point = randomEdgePoint(SPAWN_MARGIN + 30);
    state.mines.push({ ...point, vx: random.range(-10, 10), vy: random.range(-10, 10), fuse: -1, pulse: random.range(0, Math.PI * 2) });
  }

  function burst(x, y, color, count, speed) {
    for (let i = 0; i < count; i++) {
      const angle = random.range(0, Math.PI * 2);
      const velocity = random.range(speed * 0.3, speed);
      state.particles.push({
        x,
        y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        life: random.range(0.3, 0.8),
        maxLife: 0.8,
        size: random.range(1.5, 3.5),
        color,
      });
    }
  }

  function topUpField() {
    while (state.shards.length + state.pickups.length < SHARD_TARGET) spawnShard();
    const asteroidTarget = 3 + state.wave;
    while (state.asteroids.length < asteroidTarget) spawnAsteroid();
    const mineTarget = state.wave >= 2 ? Math.min(1 + Math.floor(state.wave / 2), 4) : 0;
    while (state.mines.length < mineTarget) spawnMine();
  }

  function reset() {
    state.time = 0;
    state.score = 0;
    state.wave = 1;
    state.hull = MAX_HULL;
    state.combo = 0;
    state.comboTimer = 0;
    state.quota = quotaFor(1);
    state.collected = 0;
    state.overdrive = 0;
    state.banner = '';
    state.bannerTimer = 0;
    state.shake = 0;
    state.ship = { x: VIEW_W / 2, y: VIEW_H / 2, vx: 0, vy: 0, angle: -Math.PI / 2, dash: 0, dashCooldown: 0, invuln: 0 };
    state.shards = [];
    state.asteroids = [];
    state.mines = [];
    state.pickups = [];
    state.particles = [];
    topUpField();
  }

  function damageShip(events) {
    if (state.ship.invuln > 0 || state.overdrive > 0) return events;
    state.hull -= 1;
    state.combo = 0;
    state.comboTimer = 0;
    state.ship.invuln = HIT_INVULN;
    state.shake = 0.45;
    burst(state.ship.x, state.ship.y, '#ff6b5e', 26, 260);
    if (state.hull <= 0) return events | EVENT_HIT | EVENT_OVER;
    return events | EVENT_HIT;
  }

  function step(dt, input, tractor, titleDrift) {
    const ship = state.ship;
    state.time += dt;
    if (state.bannerTimer > 0) state.bannerTimer -= dt;
    if (state.shake > 0) state.shake -= dt;
    if (state.comboTimer > 0) {
      state.comboTimer -= dt;
      if (state.comboTimer <= 0) state.combo = 0;
    }
    if (state.overdrive > 0) state.overdrive -= dt;
    if (ship.invuln > 0) ship.invuln -= dt;
    if (ship.dashCooldown > 0) ship.dashCooldown -= dt;

    // The title screen idles the field: shards drift, nothing can hurt the ship.
    if (titleDrift) {
      for (const shard of state.shards) {
        shard.x += shard.vx * dt;
        shard.y += shard.vy * dt;
        shard.phase += dt * 2;
      }
      for (const star of state.stars) star.twinkle += dt;
      return EVENT_NONE;
    }

    let events = EVENT_NONE;

    // Steering: thrust accelerates, drag bleeds speed, and the nose follows motion.
    const [tx, ty] = input;
    if (tx !== 0 || ty !== 0) {
      ship.vx += tx * THRUST * dt;
      ship.vy += ty * THRUST * dt;
      ship.angle = Math.atan2(ty, tx);
    }
    const drag = Math.pow(DRAG, dt * 60);
    ship.vx *= drag;
    ship.vy *= drag;
    const speed = Math.hypot(ship.vx, ship.vy);
    if (speed > MAX_SPEED) {
      ship.vx = (ship.vx / speed) * MAX_SPEED;
      ship.vy = (ship.vy / speed) * MAX_SPEED;
    }

    // Dash: a short burst along the current heading (or the nose, when still),
    // with a cooldown and a flicker of invulnerability while it lasts.
    if (ship.dash > 0) {
      ship.dash -= dt;
      const heading = speed > 40 ? Math.atan2(ship.vy, ship.vx) : ship.angle;
      ship.vx = Math.cos(heading) * DASH_SPEED;
      ship.vy = Math.sin(heading) * DASH_SPEED;
      ship.invuln = Math.max(ship.invuln, 0.12);
    }

    ship.x += ship.vx * dt;
    ship.y += ship.vy * dt;
    // The field wraps: flying off one edge returns on the other.
    if (ship.x < -SHIP_RADIUS) ship.x = VIEW_W + SHIP_RADIUS;
    if (ship.x > VIEW_W + SHIP_RADIUS) ship.x = -SHIP_RADIUS;
    if (ship.y < -SHIP_RADIUS) ship.y = VIEW_H + SHIP_RADIUS;
    if (ship.y > VIEW_H + SHIP_RADIUS) ship.y = -SHIP_RADIUS;

    const tractorRadius = state.overdrive > 0 ? OVERDRIVE_TRACTOR_RADIUS : TRACTOR_RADIUS;

    // Shards: drift, glow, and get reeled in by the tractor beam.
    for (let i = state.shards.length - 1; i >= 0; i--) {
      const shard = state.shards[i];
      shard.phase += dt * 2;
      if (tractor) {
        const d = distance(shard, ship);
        if (d < tractorRadius && d > 1) {
          const pull = TRACTOR_PULL * (1 - d / tractorRadius) + 120;
          shard.vx += ((ship.x - shard.x) / d) * pull * dt;
          shard.vy += ((ship.y - shard.y) / d) * pull * dt;
        }
      }
      shard.vx *= Math.pow(0.98, dt * 60);
      shard.vy *= Math.pow(0.98, dt * 60);
      shard.x += shard.vx * dt;
      shard.y += shard.vy * dt;
      if (distance(shard, ship) < SHIP_RADIUS + SHARD_RADIUS) {
        state.shards.splice(i, 1);
        state.combo = Math.min(state.combo + 1, COMBO_MAX);
        state.comboTimer = COMBO_WINDOW;
        const gained = SHARD_SCORE * state.combo * (state.overdrive > 0 ? 2 : 1);
        state.score += gained;
        state.collected += 1;
        burst(shard.x, shard.y, '#7fe7ff', 10, 140);
        events |= EVENT_PICKUP;
        if (state.collected >= state.quota) {
          if (state.wave >= VICTORY_WAVE) {
            events |= EVENT_VICTORY;
          } else {
            state.score += WAVE_CLEAR_BONUS;
            state.wave += 1;
            state.quota = quotaFor(state.wave);
            state.collected = 0;
            state.banner = `WAVE ${state.wave - 1} CLEAR  +${WAVE_CLEAR_BONUS}`;
            state.bannerTimer = 2.2;
            events |= EVENT_WAVE;
          }
        }
      }
    }

    // Pickups: repair cells mend the hull, overdrive doubles scoring for a while.
    for (let i = state.pickups.length - 1; i >= 0; i--) {
      const pickup = state.pickups[i];
      pickup.phase += dt * 2;
      pickup.x += pickup.vx * dt;
      pickup.y += pickup.vy * dt;
      if (distance(pickup, ship) < SHIP_RADIUS + SHARD_RADIUS + 2) {
        state.pickups.splice(i, 1);
        if (pickup.kind === 'repair') {
          state.hull = Math.min(state.hull + 1, MAX_HULL);
          burst(pickup.x, pickup.y, '#7dff9b', 14, 160);
          events |= EVENT_REPAIR;
        } else {
          state.overdrive = OVERDRIVE_TIME;
          burst(pickup.x, pickup.y, '#ffb347', 16, 180);
          events |= EVENT_OVERDRIVE;
        }
      }
    }

    // Asteroids: drift, spin, wrap, and hurt on contact.
    for (const rock of state.asteroids) {
      rock.x += rock.vx * dt;
      rock.y += rock.vy * dt;
      rock.angle += rock.spin * dt;
      if (rock.x < -rock.radius) rock.x = VIEW_W + rock.radius;
      if (rock.x > VIEW_W + rock.radius) rock.x = -rock.radius;
      if (rock.y < -rock.radius) rock.y = VIEW_H + rock.radius;
      if (rock.y > VIEW_H + rock.radius) rock.y = -rock.radius;
      if (distance(rock, ship) < rock.radius + SHIP_RADIUS - 3) {
        const before = events;
        events = damageShip(events);
        // Shove the ship away so one rock cannot hit twice in the same pass.
        const d = Math.max(distance(rock, ship), 1);
        ship.vx = ((ship.x - rock.x) / d) * 320;
        ship.vy = ((ship.y - rock.y) / d) * 320;
        if (events !== before) break;
      }
    }
    if (events & EVENT_OVER) return events;

    // Mines: arm when the ship comes close, then detonate after a short fuse.
    for (let i = state.mines.length - 1; i >= 0; i--) {
      const mine = state.mines[i];
      mine.pulse += dt * 6;
      mine.x += mine.vx * dt;
      mine.y += mine.vy * dt;
      if (mine.x < 0 || mine.x > VIEW_W) mine.vx *= -1;
      if (mine.y < 0 || mine.y > VIEW_H) mine.vy *= -1;
      const d = distance(mine, ship);
      if (mine.fuse < 0 && d < MINE_TRIGGER) mine.fuse = MINE_FUSE;
      if (mine.fuse >= 0) {
        mine.fuse -= dt;
        if (mine.fuse <= 0) {
          state.mines.splice(i, 1);
          burst(mine.x, mine.y, '#ff9d5c', 30, 320);
          state.shake = Math.max(state.shake, 0.35);
          events |= EVENT_EXPLOSION;
          if (d < BLAST_RADIUS + SHIP_RADIUS) {
            events = damageShip(events);
            const push = Math.max(d, 1);
            ship.vx = ((ship.x - mine.x) / push) * 420;
            ship.vy = ((ship.y - mine.y) / push) * 420;
            if (events & EVENT_OVER) return events;
          }
        }
      }
    }

    // Particles fade out.
    for (let i = state.particles.length - 1; i >= 0; i--) {
      const p = state.particles[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.life <= 0) state.particles.splice(i, 1);
    }
    for (const star of state.stars) star.twinkle += dt;

    topUpField();
    return events;
  }

  reset();
  return { state, step, reset, quotaFor };
}
