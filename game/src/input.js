// Nova Harvest — keyboard (and pointer) input, read once a frame.
// WASD or arrows thrust the skiff; Space fires the pulse blast; Enter or Space
// confirms on menus; P or Escape pauses; M mutes; R restarts from the end screens.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_PULSE = 4;
export const ACTION_RESTART = 8;
export const ACTION_MUTE = 16;
export const ACTION_CONTINUE = 32;
export const ACTION_CHOICE_1 = 64;
export const ACTION_CHOICE_2 = 128;
export const ACTION_CHOICE_3 = 256;

const THRUST_KEYS = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight']);

export function createInput(canvas) {
  const down = new Set();
  let actions = 0;
  let pointerConfirm = false;
  let pointerAt = null;

  function onKeyDown(event) {
    if (event.repeat) return;
    down.add(event.code);
    if (event.code === 'Space' || event.code === 'Enter') {
      actions |= ACTION_CONFIRM | ACTION_PULSE;
      event.preventDefault();
    } else if (event.code === 'KeyP' || event.code === 'Escape') {
      actions |= ACTION_PAUSE;
    } else if (event.code === 'KeyR') {
      actions |= ACTION_RESTART;
    } else if (event.code === 'KeyC') {
      actions |= ACTION_CONTINUE;
    } else if (event.code === 'KeyM') {
      actions |= ACTION_MUTE;
    } else if (event.code === 'Digit1') {
      actions |= ACTION_CHOICE_1;
    } else if (event.code === 'Digit2') {
      actions |= ACTION_CHOICE_2;
    } else if (event.code === 'Digit3') {
      actions |= ACTION_CHOICE_3;
    }
    if (THRUST_KEYS.has(event.code)) event.preventDefault();
  }

  function onKeyUp(event) {
    down.delete(event.code);
  }

  function onPointerDown(event) {
    pointerConfirm = true;
    const rect = canvas.getBoundingClientRect();
    pointerAt = {
      x: (event.clientX - rect.left) * (1280 / rect.width),
      y: (event.clientY - rect.top) * (720 / rect.height),
    };
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('pointerdown', onPointerDown);

  return {
    /** The thrust direction from held keys, as {x, y} in [-1, 1] (normalised). */
    direction() {
      let x = 0;
      let y = 0;
      if (down.has('KeyA') || down.has('ArrowLeft')) x -= 1;
      if (down.has('KeyD') || down.has('ArrowRight')) x += 1;
      if (down.has('KeyW') || down.has('ArrowUp')) y -= 1;
      if (down.has('KeyS') || down.has('ArrowDown')) y += 1;
      if (x !== 0 && y !== 0) {
        const inv = 1 / Math.SQRT2;
        x *= inv;
        y *= inv;
      }
      return { x, y };
    },
    /** Actions queued since the last read; reading clears them. */
    takeActions() {
      if (pointerConfirm) {
        actions |= ACTION_CONFIRM;
        pointerConfirm = false;
      }
      const taken = actions;
      actions = 0;
      return taken;
    },
    /** The last pointer-down in logical field coordinates, or null. */
    takePointer() {
      const at = pointerAt;
      pointerAt = null;
      return at;
    },
    /** Held keys, for the autopilot's screenshots and tests. */
    setKey(code, held) {
      if (held) down.add(code);
      else down.delete(code);
    },
  };
}
