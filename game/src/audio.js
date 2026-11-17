// Nova Harvest — every sound is synthesized with WebAudio; no audio files exist.
// The context starts on the first user gesture (a browser rule), so all calls before
// that are silent no-ops. A mute toggle (M) is read by the caller through `muted`.
export function createAudio() {
  let context = null;
  let master = null;
  let muted = false;
  let musicTimer = null;
  let musicStep = 0;
  let musicNext = 0;

  // A slow A-minor bass walk, one note a beat at 100 bpm, quiet under the play.
  const BASS = [110.0, 87.31, 130.81, 98.0, 110.0, 87.31, 146.83, 98.0];
  const BEAT = 60 / 100;

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

  function startMusic() {
    if (musicTimer || !ensure()) return;
    musicStep = 0;
    musicNext = context.currentTime + 0.1;
    musicTimer = setInterval(() => {
      if (muted || context.state === 'suspended') {
        musicNext = Math.max(musicNext, context.currentTime + 0.1);
        return;
      }
      while (musicNext < context.currentTime + 0.4) {
        const freq = BASS[musicStep % BASS.length];
        const osc = context.createOscillator();
        const amp = context.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, musicNext);
        amp.gain.setValueAtTime(0.0001, musicNext);
        amp.gain.exponentialRampToValueAtTime(0.11, musicNext + 0.05);
        amp.gain.exponentialRampToValueAtTime(0.0001, musicNext + BEAT * 0.95);
        osc.connect(amp);
        amp.connect(master);
        osc.start(musicNext);
        osc.stop(musicNext + BEAT);
        if (musicStep % 8 === 4) {
          const fifth = context.createOscillator();
          const fifthAmp = context.createGain();
          fifth.type = 'sine';
          fifth.frequency.setValueAtTime(freq * 1.5, musicNext);
          fifthAmp.gain.setValueAtTime(0.0001, musicNext);
          fifthAmp.gain.exponentialRampToValueAtTime(0.05, musicNext + 0.05);
          fifthAmp.gain.exponentialRampToValueAtTime(0.0001, musicNext + BEAT * 0.9);
          fifth.connect(fifthAmp);
          fifthAmp.connect(master);
          fifth.start(musicNext);
          fifth.stop(musicNext + BEAT);
        }
        musicNext += BEAT;
        musicStep += 1;
      }
    }, 200);
  }

  function stopMusic() {
    if (musicTimer) {
      clearInterval(musicTimer);
      musicTimer = null;
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
      startMusic();
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
    shield() {
      tone(660, 0.12, 'sine', 0.35, 990);
      tone(880, 0.16, 'sine', 0.25, 1320);
    },
    bossDown() {
      [220, 277, 330, 440, 554].forEach((freq, index) => {
        setTimeout(() => tone(freq, 0.2, 'square', 0.3), index * 110);
      });
    },
    upgrade() {
      tone(523, 0.1, 'triangle', 0.35);
      setTimeout(() => tone(784, 0.16, 'triangle', 0.35), 100);
    },
    cell() {
      tone(880, 0.1, 'sine', 0.3, 1174);
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
