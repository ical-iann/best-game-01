// Nova Harvest — every sound is synthesized with WebAudio; no audio files exist.
// The context starts on the first user gesture (a browser rule), so all calls before
// that are silent no-ops. A mute toggle (M) is read by the caller through `muted`.
export function createAudio() {
  let context = null;
  let master = null;
  let muted = false;

  function ensure() {
    if (context) return true;
    try {
      const AudioContext = window.AudioContext ?? window.webkitAudioContext;
      if (!AudioContext) return false;
      context = new AudioContext();
      master = context.createGain();
      master.gain.value = 0.35;
      master.connect(context.destination);
      return true;
    } catch {
      return false;
    }
  }

  function tone(freq, dur, type, gain, slideTo) {
    if (muted || !ensure() || context.state === 'suspended') return;
    try {
      const osc = context.createOscillator();
      const amp = context.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, context.currentTime);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, context.currentTime + dur);
      amp.gain.setValueAtTime(gain, context.currentTime);
      amp.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + dur);
      osc.connect(amp);
      amp.connect(master);
      osc.start();
      osc.stop(context.currentTime + dur);
    } catch {
      // Sound is garnish: never let it break the game.
    }
  }

  return {
    get muted() {
      return muted;
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    unlock() {
      ensure();
      if (context && context.state === 'suspended') context.resume().catch(() => {});
    },
    collect(combo) {
      const step = Math.min(combo, 12);
      tone(520 * Math.pow(1.0595, step), 0.14, 'sine', 0.5);
      tone(780 * Math.pow(1.0595, step), 0.1, 'triangle', 0.25);
    },
    pulse() {
      tone(320, 0.22, 'sawtooth', 0.3, 60);
      tone(640, 0.12, 'square', 0.12, 120);
    },
    denied() {
      tone(140, 0.09, 'square', 0.2);
    },
    hit() {
      tone(180, 0.35, 'sawtooth', 0.5, 40);
      tone(90, 0.3, 'sine', 0.5, 30);
    },
    droneDown() {
      tone(440, 0.1, 'square', 0.25, 880);
    },
    wave() {
      tone(523, 0.12, 'sine', 0.35);
      setTimeout(() => tone(659, 0.12, 'sine', 0.35), 110);
      setTimeout(() => tone(784, 0.2, 'sine', 0.35), 220);
    },
    win() {
      [523, 659, 784, 1046].forEach((freq, index) => {
        setTimeout(() => tone(freq, 0.22, 'triangle', 0.4), index * 130);
      });
    },
    over() {
      [392, 330, 262, 196].forEach((freq, index) => {
        setTimeout(() => tone(freq, 0.25, 'sawtooth', 0.3), index * 160);
      });
    },
  };
}
