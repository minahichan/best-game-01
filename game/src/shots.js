// Staged scenes for screenshots: ?shot=start|play|surge|end (with &seed=N) puts
// the game into a fixed, readable state and paints it, instead of running the
// loop. The same renderer paints live play, so a screenshot is the real game.
// The title drifts gently; play and surge run the simulation forward a fixed
// number of steps with a scripted pilot; end stages a wrecked run.
import { STEP } from './config.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

export function stageShot(name, world) {
  const state = world.state;

  if (name === 'start') {
    // Fresh field, ship parked centre, title overlay on top.
    world.reset();
    return { screen: SCREEN_TITLE, best: 1250 };
  }

  if (name === 'play' || name === 'surge') {
    world.reset();
    // A scripted pilot: thrust toward the nearest shard, tractor held, dash
    // whenever it is ready. Fixed steps, fixed seed: the frame is identical
    // every time it is staged.
    const steps = name === 'play' ? 60 * 9 : 60 * 26;
    for (let i = 0; i < steps; i++) {
      const ship = state.ship;
      let target = state.shards[0];
      let nearest = Infinity;
      for (const shard of state.shards) {
        const d = Math.hypot(shard.x - ship.x, shard.y - ship.y);
        if (d < nearest) {
          nearest = d;
          target = shard;
        }
      }
      let direction = [0, 0];
      if (target) {
        const d = Math.max(Math.hypot(target.x - ship.x, target.y - ship.y), 1);
        direction = [(target.x - ship.x) / d, (target.y - ship.y) / d];
      }
      if (ship.dashCooldown <= 0 && nearest > 180) {
        ship.dash = 0.16;
        ship.dashCooldown = 2.4;
      }
      world.step(STEP, direction, true, false);
      if (state.hull <= 0) break;
    }
    if (name === 'surge') {
      // Make the late-game frame read at a glance: a live combo, a wave banner,
      // and the ship mid-dash through a minefield.
      state.combo = 4;
      state.comboTimer = 2.4;
      state.banner = 'WAVE 3 CLEAR  +150';
      state.bannerTimer = 1.8;
      state.ship.dash = 0.1;
    }
    return { screen: SCREEN_PLAY, best: 1250 };
  }

  if (name === 'end') {
    world.reset();
    // Fly the ship straight into the rocks until the hull gives out.
    for (let i = 0; i < 60 * 40 && state.hull > 0; i++) {
      world.step(STEP, [0.4, 0.9], false, false);
      // Ram the nearest asteroid on purpose: steer at it, not away.
      const ship = state.ship;
      const rock = state.asteroids[0];
      if (rock) {
        const d = Math.max(Math.hypot(rock.x - ship.x, rock.y - ship.y), 1);
        world.step(STEP, [(rock.x - ship.x) / d, (rock.y - ship.y) / d], false, false);
      }
    }
    state.hull = 0;
    state.score = 840;
    state.wave = 2;
    state.quota = 12;
    state.collected = 5;
    return { screen: SCREEN_OVER, best: 1250 };
  }

  return { screen: SCREEN_TITLE, best: 1250 };
}
