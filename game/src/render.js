// Everything the player sees: the field, the ship, the HUD and the screens. The
// renderer only reads world state — it never changes it — so a staged scene and a
// live game paint through the same code.
import {
  BLAST_RADIUS,
  COMBO_WINDOW,
  DASH_COOLDOWN,
  MAX_HULL,
  MAX_SPEED,
  MINE_RADIUS,
  MINE_TRIGGER,
  SHARD_RADIUS,
  SHIP_RADIUS,
  TRACTOR_RADIUS,
  VIEW_H,
  VIEW_W,
  VICTORY_WAVE,
} from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_VICTORY = 'victory';

const FONT = '"Trebuchet MS", "Segoe UI", sans-serif';

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');

  function drawBackground(state) {
    const gradient = ctx.createLinearGradient(0, 0, 0, VIEW_H);
    gradient.addColorStop(0, '#0b1026');
    gradient.addColorStop(0.55, '#131a3a');
    gradient.addColorStop(1, '#0a0f22');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    // Two soft nebulae, fixed in place so the backdrop never distracts.
    const nebulae = [
      { x: 180, y: 120, r: 220, color: 'rgba(64, 90, 180, 0.16)' },
      { x: 780, y: 420, r: 260, color: 'rgba(120, 60, 160, 0.14)' },
      { x: 700, y: 90, r: 160, color: 'rgba(40, 140, 160, 0.12)' },
    ];
    for (const nebula of nebulae) {
      const glow = ctx.createRadialGradient(nebula.x, nebula.y, 0, nebula.x, nebula.y, nebula.r);
      glow.addColorStop(0, nebula.color);
      glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(nebula.x - nebula.r, nebula.y - nebula.r, nebula.r * 2, nebula.r * 2);
    }

    for (const star of state.stars) {
      const alpha = 0.35 + 0.35 * Math.sin(star.twinkle * 2);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#dfe8ff';
      ctx.fillRect(star.x, star.y, star.size, star.size);
    }
    ctx.globalAlpha = 1;
  }

  function drawShard(shard) {
    const pulse = 1 + 0.18 * Math.sin(shard.phase);
    const radius = SHARD_RADIUS * pulse;
    const glow = ctx.createRadialGradient(shard.x, shard.y, 0, shard.x, shard.y, radius * 3);
    glow.addColorStop(0, 'rgba(127, 231, 255, 0.55)');
    glow.addColorStop(1, 'rgba(127, 231, 255, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(shard.x, shard.y, radius * 3, 0, Math.PI * 2);
    ctx.fill();
    // A four-point star: two crossed diamonds, brighter at the core.
    ctx.save();
    ctx.translate(shard.x, shard.y);
    ctx.rotate(shard.phase * 0.4);
    ctx.fillStyle = '#bff3ff';
    ctx.beginPath();
    ctx.moveTo(0, -radius);
    ctx.lineTo(radius * 0.45, -radius * 0.45);
    ctx.lineTo(radius, 0);
    ctx.lineTo(radius * 0.45, radius * 0.45);
    ctx.lineTo(0, radius);
    ctx.lineTo(-radius * 0.45, radius * 0.45);
    ctx.lineTo(-radius, 0);
    ctx.lineTo(-radius * 0.45, -radius * 0.45);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.28, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawPickup(pickup) {
    const pulse = 1 + 0.15 * Math.sin(pickup.phase);
    const radius = (SHARD_RADIUS + 3) * pulse;
    const color = pickup.kind === 'repair' ? '#7dff9b' : '#ffb347';
    const glowColor = pickup.kind === 'repair' ? 'rgba(125, 255, 155, 0.5)' : 'rgba(255, 179, 71, 0.5)';
    const glow = ctx.createRadialGradient(pickup.x, pickup.y, 0, pickup.x, pickup.y, radius * 3);
    glow.addColorStop(0, glowColor);
    glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(pickup.x, pickup.y, radius * 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.translate(pickup.x, pickup.y);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.font = `bold ${Math.round(radius + 2)}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(pickup.kind === 'repair' ? '+' : '×2', 0, 1);
    ctx.restore();
  }

  function drawAsteroid(rock) {
    ctx.save();
    ctx.translate(rock.x, rock.y);
    ctx.rotate(rock.angle);
    ctx.beginPath();
    const points = rock.crags.length;
    for (let i = 0; i < points; i++) {
      const angle = (i / points) * Math.PI * 2;
      const radius = rock.radius * rock.crags[i];
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = '#5a5470';
    ctx.fill();
    ctx.strokeStyle = '#8d86a8';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.beginPath();
    ctx.arc(-rock.radius * 0.25, -rock.radius * 0.3, rock.radius * 0.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawMine(mine) {
    const arming = mine.fuse >= 0;
    const blink = arming ? (Math.sin(mine.pulse * 3) > 0 ? 1 : 0.25) : 0.6 + 0.4 * Math.sin(mine.pulse);
    const radius = MINE_RADIUS * (arming ? 1.15 : 1);
    if (!arming) {
      ctx.strokeStyle = 'rgba(255, 120, 90, 0.18)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(mine.x, mine.y, MINE_TRIGGER, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.strokeStyle = `rgba(255, 90, 60, ${0.25 + 0.35 * blink})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(mine.x, mine.y, BLAST_RADIUS, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.save();
    ctx.translate(mine.x, mine.y);
    ctx.globalAlpha = blink;
    ctx.fillStyle = '#ff5a3c';
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1a0d0d';
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(Math.cos(angle) * radius, Math.sin(angle) * radius, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#ffd9d0';
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function drawShip(ship, overdrive, tractor) {
    ctx.save();
    ctx.translate(ship.x, ship.y);
    if (tractor) {
      ctx.strokeStyle = 'rgba(127, 231, 255, 0.35)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 8]);
      ctx.beginPath();
      ctx.arc(0, 0, TRACTOR_RADIUS, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    // Flicker while invulnerable after a hit.
    if (ship.invuln > 0 && Math.floor(ship.invuln * 12) % 2 === 0) ctx.globalAlpha = 0.35;
    // Engine flame, longer while thrusting hard.
    const speed = Math.hypot(ship.vx, ship.vy);
    const flame = ship.dash > 0 ? 26 : 8 + Math.min(speed / MAX_SPEED, 1) * 14;
    ctx.rotate(ship.angle);
    ctx.fillStyle = ship.dash > 0 ? '#ffb347' : '#ff9d5c';
    ctx.beginPath();
    ctx.moveTo(-SHIP_RADIUS * 0.7, 5);
    ctx.lineTo(-SHIP_RADIUS * 0.7 - flame, 0);
    ctx.lineTo(-SHIP_RADIUS * 0.7, -5);
    ctx.closePath();
    ctx.fill();
    // The skiff: a swept dart with a lit canopy.
    ctx.fillStyle = overdrive > 0 ? '#ffd166' : '#7fe7ff';
    ctx.beginPath();
    ctx.moveTo(SHIP_RADIUS + 6, 0);
    ctx.lineTo(-SHIP_RADIUS * 0.8, SHIP_RADIUS * 0.75);
    ctx.lineTo(-SHIP_RADIUS * 0.35, 0);
    ctx.lineTo(-SHIP_RADIUS * 0.8, -SHIP_RADIUS * 0.75);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#eafcff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#0b1026';
    ctx.beginPath();
    ctx.arc(2, 0, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(3, -1, 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function drawParticles(state) {
    for (const p of state.particles) {
      ctx.globalAlpha = Math.max(p.life / p.maxLife, 0);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawHud(state, screen, best) {
    ctx.textBaseline = 'alphabetic';
    // Score, top left; best beneath it.
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold 26px ${FONT}`;
    ctx.fillText(`SCORE ${state.score}`, 18, 36);
    ctx.fillStyle = 'rgba(223, 232, 255, 0.75)';
    ctx.font = `15px ${FONT}`;
    ctx.fillText(`BEST ${Math.max(best, state.score)}`, 18, 58);

    // Wave and quota, top centre.
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold 20px ${FONT}`;
    ctx.fillText(`WAVE ${state.wave} / ${VICTORY_WAVE}`, VIEW_W / 2, 32);
    const barW = 190;
    const barX = VIEW_W / 2 - barW / 2;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.fillRect(barX, 42, barW, 9);
    ctx.fillStyle = '#7fe7ff';
    ctx.fillRect(barX, 42, barW * Math.min(state.collected / state.quota, 1), 9);
    ctx.fillStyle = 'rgba(223, 232, 255, 0.85)';
    ctx.font = `13px ${FONT}`;
    ctx.fillText(`SHARDS ${Math.min(state.collected, state.quota)} / ${state.quota}`, VIEW_W / 2, 68);

    // Hull hearts, top right.
    ctx.textAlign = 'right';
    for (let i = 0; i < MAX_HULL; i++) {
      const x = VIEW_W - 24 - i * 30;
      const y = 28;
      ctx.fillStyle = i < state.hull ? '#ff6b7a' : 'rgba(255, 255, 255, 0.2)';
      ctx.beginPath();
      ctx.moveTo(x, y + 7);
      ctx.bezierCurveTo(x - 9, y - 2, x - 5, y - 10, x, y - 4);
      ctx.bezierCurveTo(x + 5, y - 10, x + 9, y - 2, x, y + 7);
      ctx.fill();
    }

    // Combo meter, under the hull.
    if (state.combo > 1) {
      ctx.textAlign = 'right';
      ctx.fillStyle = '#ffd166';
      ctx.font = `bold 20px ${FONT}`;
      ctx.fillText(`COMBO ×${state.combo}`, VIEW_W - 18, 66);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
      ctx.fillRect(VIEW_W - 118, 74, 100, 6);
      ctx.fillStyle = '#ffd166';
      ctx.fillRect(VIEW_W - 118, 74, 100 * Math.max(state.comboTimer / COMBO_WINDOW, 0), 6);
    }

    // Dash cooldown and overdrive, bottom left.
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(223, 232, 255, 0.85)';
    ctx.font = `14px ${FONT}`;
    if (state.ship.dashCooldown > 0) {
      ctx.fillText(`DASH ${state.ship.dashCooldown.toFixed(1)}s`, 18, VIEW_H - 18);
    } else {
      ctx.fillStyle = '#7fe7ff';
      ctx.fillText('DASH READY  [Shift]', 18, VIEW_H - 18);
    }
    if (state.overdrive > 0) {
      ctx.fillStyle = '#ffb347';
      ctx.font = `bold 15px ${FONT}`;
      ctx.fillText(`OVERDRIVE ${state.overdrive.toFixed(0)}s — 2× SCORE`, 18, VIEW_H - 42);
    }

    // Controls reminder, bottom right.
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(223, 232, 255, 0.6)';
    ctx.font = `13px ${FONT}`;
    ctx.fillText('WASD / arrows — fly · hold Space — tractor · Shift — dash · P — pause · M — mute', VIEW_W - 18, VIEW_H - 18);

    // Wave-clear banner, centre.
    if (state.bannerTimer > 0 && state.banner) {
      ctx.textAlign = 'center';
      ctx.globalAlpha = Math.min(state.bannerTimer, 1);
      ctx.fillStyle = '#7fe7ff';
      ctx.font = `bold 34px ${FONT}`;
      ctx.fillText(state.banner, VIEW_W / 2, 150);
      ctx.globalAlpha = 1;
    }

    if (screen === SCREEN_PAUSED) {
      ctx.fillStyle = 'rgba(5, 8, 20, 0.55)';
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold 44px ${FONT}`;
      ctx.fillText('PAUSED', VIEW_W / 2, VIEW_H / 2 - 8);
      ctx.fillStyle = 'rgba(223, 232, 255, 0.85)';
      ctx.font = `17px ${FONT}`;
      ctx.fillText('Press P or Space to keep flying', VIEW_W / 2, VIEW_H / 2 + 30);
    }
  }

  function panel(title, lines, accent) {
    ctx.fillStyle = 'rgba(5, 8, 20, 0.62)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.textAlign = 'center';
    ctx.fillStyle = accent;
    ctx.font = `bold 52px ${FONT}`;
    ctx.fillText(title, VIEW_W / 2, 158);
    ctx.fillStyle = '#ffffff';
    let y = 214;
    for (const line of lines) {
      ctx.font = line.big ? `bold 24px ${FONT}` : `17px ${FONT}`;
      ctx.fillStyle = line.dim ? 'rgba(223, 232, 255, 0.8)' : '#ffffff';
      ctx.fillText(line.text, VIEW_W / 2, y);
      y += line.big ? 40 : 30;
    }
    return y;
  }

  function drawTitle(state, best) {
    panel('LUMEN DRIFT', [
      { text: 'Salvage the drifting shards. Dodge the rocks. Mind the mines.', big: true },
      { text: `Clear ${VICTORY_WAVE} waves to complete the contract — every shard counts.`, dim: true },
      { text: 'WASD / arrows — fly      hold Space — tractor beam      Shift — dash', dim: true },
      { text: 'Chain shards quickly for a combo up to ×5. Grab + cells to mend hull, ×2 for overdrive.', dim: true },
      { text: `BEST  ${best}`, big: true },
      { text: 'Press Space or click to launch', dim: true },
    ], '#7fe7ff');
  }

  function drawOver(state, best) {
    const y = panel('CONTRACT LOST', [
      { text: `The skiff broke apart on wave ${state.wave}.`, big: true },
      { text: `SCORE  ${state.score}      BEST  ${best}`, big: true },
      { text: 'Press Space or click to fly again', dim: true },
    ], '#ff6b7a');
    void y;
  }

  function drawVictory(state, best) {
    panel('CONTRACT COMPLETE', [
      { text: `All ${VICTORY_WAVE} waves cleared — the field is yours, salvager.`, big: true },
      { text: `SCORE  ${state.score}      BEST  ${best}`, big: true },
      { text: 'Press Space or click to run it back for a bigger score', dim: true },
    ], '#ffd166');
  }

  return {
    draw(state, screen, best, tractor) {
      ctx.save();
      if (state.shake > 0) {
        const magnitude = state.shake * 14;
        ctx.translate((Math.random() - 0.5) * magnitude, (Math.random() - 0.5) * magnitude);
      }
      drawBackground(state);
      for (const shard of state.shards) drawShard(shard);
      for (const pickup of state.pickups) drawPickup(pickup);
      for (const rock of state.asteroids) drawAsteroid(rock);
      for (const mine of state.mines) drawMine(mine);
      drawParticles(state);
      if (screen === SCREEN_PLAY || screen === SCREEN_PAUSED) drawShip(state.ship, state.overdrive, tractor && screen === SCREEN_PLAY);
      drawHud(state, screen, best);
      if (screen === SCREEN_TITLE) drawTitle(state, best);
      else if (screen === SCREEN_OVER) drawOver(state, best);
      else if (screen === SCREEN_VICTORY) drawVictory(state, best);
      ctx.restore();
    },
  };
}
