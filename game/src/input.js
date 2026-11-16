// Keyboard and mouse, read once per frame. Keys are tracked as a set so diagonal
// thrust works, and one-shot actions (confirm, pause, dash, mute) are consumed
// exactly once per press through takeActions().
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_DASH = 4;
export const ACTION_MUTE = 8;

const CONFIRM_KEYS = new Set(['Space', 'Enter']);
const PAUSE_KEYS = new Set(['KeyP', 'Escape']);
const DASH_KEYS = new Set(['ShiftLeft', 'ShiftRight']);
const MUTE_KEYS = new Set(['KeyM']);
const THRUST_KEYS = {
  ArrowUp: [0, -1],
  KeyW: [0, -1],
  ArrowDown: [0, 1],
  KeyS: [0, 1],
  ArrowLeft: [-1, 0],
  KeyA: [-1, 0],
  ArrowRight: [1, 0],
  KeyD: [1, 0],
};

export function createInput(canvas) {
  const held = new Set();
  let queued = 0;
  let tractorHeld = false;

  function onKeyDown(event) {
    if (event.code === 'Space') event.preventDefault(); // keep the page from scrolling
    if (event.repeat) return;
    held.add(event.code);
    if (CONFIRM_KEYS.has(event.code)) queued |= ACTION_CONFIRM;
    else if (PAUSE_KEYS.has(event.code)) queued |= ACTION_PAUSE;
    else if (DASH_KEYS.has(event.code)) queued |= ACTION_DASH;
    else if (MUTE_KEYS.has(event.code)) queued |= ACTION_MUTE;
  }

  function onKeyUp(event) {
    held.delete(event.code);
  }

  function onBlur() {
    held.clear();
    tractorHeld = false;
  }

  function onPointerDown(event) {
    // A click is a confirm on menus; during play the held button runs the tractor.
    queued |= ACTION_CONFIRM;
    tractorHeld = true;
    canvas.setPointerCapture?.(event.pointerId);
  }

  function onPointerUp() {
    tractorHeld = false;
  }

  function onContextMenu(event) {
    event.preventDefault(); // right-click is a dash, not a menu
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  canvas.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('contextmenu', onContextMenu);

  return {
    // Normalised thrust vector from the keys currently held, or [0, 0].
    direction() {
      let x = 0;
      let y = 0;
      for (const code of held) {
        const vector = THRUST_KEYS[code];
        if (vector) {
          x += vector[0];
          y += vector[1];
        }
      }
      if (x === 0 && y === 0) return [0, 0];
      const length = Math.hypot(x, y);
      return [x / length, y / length];
    },
    tractor() {
      return tractorHeld || held.has('Space');
    },
    takeActions() {
      const actions = queued;
      queued = 0;
      return actions;
    },
  };
}
