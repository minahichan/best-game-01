// All sound is synthesized with WebAudio — no audio files, no network. Every
// effect is a short oscillator or noise burst, so the game stays self-contained.
// The context is created lazily on the first player gesture (browsers block
// audio before one), and M toggles mute.
export function createAudio() {
  let context = null;
  let muted = false;
  let padNodes = null;

  function ensure() {
    if (!context) {
      const AC = window.AudioContext ?? window.webkitAudioContext;
      if (!AC) return null;
      context = new AC();
      startPad();
    }
    if (context.state === 'suspended') void context.resume();
    return context;
  }

  // A quiet two-note drone underneath everything, so the field never feels silent.
  function startPad() {
    if (!context || padNodes) return;
    const gain = context.createGain();
    gain.gain.value = 0.035;
    gain.connect(context.destination);
    const notes = [110, 164.81];
    const oscillators = notes.map((freq) => {
      const osc = context.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      osc.connect(gain);
      osc.start();
      return osc;
    });
    padNodes = { gain, oscillators };
  }

  function tone({ freq, endFreq = null, type = 'sine', dur = 0.12, vol = 0.16, delay = 0 }) {
    if (muted) return;
    const ctx = ensure();
    if (!ctx) return;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (endFreq !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(endFreq, 1), t0 + dur);
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(vol, t0 + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  function noise({ dur = 0.25, vol = 0.2, delay = 0 }) {
    if (muted) return;
    const ctx = ensure();
    if (!ctx) return;
    const t0 = ctx.currentTime + delay;
    const length = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 900;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start(t0);
  }

  return {
    unlock() {
      ensure();
    },
    toggleMute() {
      muted = !muted;
      if (padNodes) padNodes.gain.gain.value = muted ? 0 : 0.035;
      return muted;
    },
    isMuted() {
      return muted;
    },
    pickup(combo) {
      // The blip climbs with the combo, so a long chain sounds like a ladder.
      const base = 520 * Math.pow(1.122, Math.min(combo, 8));
      tone({ freq: base, endFreq: base * 1.5, type: 'sine', dur: 0.14, vol: 0.18 });
      tone({ freq: base * 2, type: 'triangle', dur: 0.08, vol: 0.06, delay: 0.02 });
    },
    dash() {
      noise({ dur: 0.18, vol: 0.12 });
      tone({ freq: 220, endFreq: 660, type: 'sawtooth', dur: 0.16, vol: 0.05 });
    },
    hit() {
      noise({ dur: 0.3, vol: 0.25 });
      tone({ freq: 160, endFreq: 40, type: 'square', dur: 0.3, vol: 0.14 });
    },
    explosion() {
      noise({ dur: 0.5, vol: 0.3 });
      tone({ freq: 90, endFreq: 28, type: 'sine', dur: 0.45, vol: 0.22 });
    },
    repair() {
      tone({ freq: 392, dur: 0.12, vol: 0.14 });
      tone({ freq: 523.25, dur: 0.16, vol: 0.14, delay: 0.09 });
    },
    overdrive() {
      [523.25, 659.25, 783.99].forEach((freq, i) => tone({ freq, dur: 0.14, vol: 0.12, delay: i * 0.07 }));
    },
    waveClear() {
      [392, 523.25, 659.25, 783.99].forEach((freq, i) => tone({ freq, dur: 0.2, vol: 0.14, delay: i * 0.1 }));
    },
    gameOver() {
      [330, 262, 196, 131].forEach((freq, i) => tone({ freq, type: 'triangle', dur: 0.28, vol: 0.14, delay: i * 0.16 }));
    },
    victory() {
      [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((freq, i) =>
        tone({ freq, dur: 0.3, vol: 0.14, delay: i * 0.12 }),
      );
    },
    click() {
      tone({ freq: 700, dur: 0.05, vol: 0.08 });
    },
  };
}
