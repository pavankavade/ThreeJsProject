import { EventBus } from '../core/EventBus';

export class AudioSystem {
  private ctx: AudioContext | null = null;

  constructor() {
    const initAudio = () => {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    };

    window.addEventListener('click', initAudio, { once: true });
    window.addEventListener('keydown', initAudio, { once: true });
    window.addEventListener('mousedown', initAudio, { once: true });

    this.registerEvents();
  }

  private registerEvents(): void {
    EventBus.on('PLAYER_ATTACK_SWING', () => this.playSwordSwing());
    EventBus.on('PLAYER_BLOCK_TOGGLE', (blocking: boolean) => {
      if (blocking) this.playShieldBlock();
    });
    EventBus.on('ENEMY_HIT', () => this.playSwordHit());
    EventBus.on('PLAYER_HIT', () => this.playPlayerHurt());
    EventBus.on('ENEMY_DIED', () => this.playSkeletonDeath());
    EventBus.on('CHEST_OPENED', () => this.playChestOpen());
    EventBus.on('LOOT_ACQUIRED', () => this.playLootPickup());
    EventBus.on('DRINK_POTION', () => this.playDrinkPotion());
    EventBus.on('APPLY_BANDAGE', () => this.playBandage());
  }

  /**
   * Helper: Generate a White/Pink Noise Buffer for realistic wind/impacts/cloth
   */
  private createNoiseBuffer(duration: number): AudioBuffer | null {
    if (!this.ctx) return null;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  /**
   * Realistic Steel Blade Air Slice / Whoosh
   */
  private playSwordSwing(): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const duration = 0.22;

    const noiseBuffer = this.createNoiseBuffer(duration);
    if (!noiseBuffer) return;

    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    // Filter bandpass sweep for whooshing air velocity
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.setValueAtTime(3.0, now);
    filter.frequency.setValueAtTime(200, now);
    filter.frequency.exponentialRampToValueAtTime(1600, now + 0.08);
    filter.frequency.exponentialRampToValueAtTime(250, now + duration);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.55, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start(now);
    noise.stop(now + duration);
  }

  /**
   * Realistic Sword Slashing Steel/Bone Impact (Inharmonic Ring + Noise Crunch)
   */
  private playSwordHit(): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // 1. Bone / Armor Flesh Impact Noise Burst
    const noiseBuf = this.createNoiseBuffer(0.12);
    if (noiseBuf) {
      const noise = this.ctx.createBufferSource();
      noise.buffer = noiseBuf;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, now);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.6, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      noise.start(now);
    }

    // 2. Metallic Blade Clang Inharmonic Resonators (Steel Ring Out)
    [1420, 2150, 3800].forEach((freq) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.85, now + 0.18);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.start(now);
      osc.stop(now + 0.18);
    });
  }

  /**
   * Heavy Iron Shield Boss Impact Thud
   */
  private playShieldBlock(): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // 1. Deep Bass Body Impact
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(35, now + 0.2);

    gain.gain.setValueAtTime(0.7, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.2);

    // 2. Shield Metal Rim Impact Click
    const rimOsc = this.ctx.createOscillator();
    const rimGain = this.ctx.createGain();

    rimOsc.type = 'triangle';
    rimOsc.frequency.setValueAtTime(650, now);
    rimOsc.frequency.exponentialRampToValueAtTime(180, now + 0.1);

    rimGain.gain.setValueAtTime(0.4, now);
    rimGain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

    rimOsc.connect(rimGain);
    rimGain.connect(this.ctx.destination);
    rimOsc.start(now);
    rimOsc.stop(now + 0.1);
  }

  /**
   * Player Pain / Hurt Grunt
   */
  private playPlayerHurt(): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(110, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.25);

    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600, now);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.25);
  }

  /**
   * Skeleton Bones Collapsing & Rattling
   */
  private playSkeletonDeath(): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // Trigger 4 rapid bone impact crackles
    for (let i = 0; i < 4; i++) {
      const delay = now + i * 0.08;
      const noiseBuf = this.createNoiseBuffer(0.08);
      if (noiseBuf) {
        const noise = this.ctx.createBufferSource();
        noise.buffer = noiseBuf;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.Q.setValueAtTime(4.0, delay);
        filter.frequency.setValueAtTime(1200 + Math.random() * 800, delay);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.4, delay);
        gain.gain.exponentialRampToValueAtTime(0.01, delay + 0.08);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        noise.start(delay);
        noise.stop(delay + 0.08);
      }
    }
  }

  /**
   * Heavy Wooden Chest Creak & Metal Latch
   */
  private playChestOpen(): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // Wood Hinge Creak
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(110, now);
    osc.frequency.linearRampToValueAtTime(320, now + 0.4);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(500, now);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.4);
  }

  /**
   * Real Gold Coins Loot Chime
   */
  private playLootPickup(): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    [2200, 2800, 3400].forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.06);

      gain.gain.setValueAtTime(0.25, now + idx * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.25);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.start(now + idx * 0.06);
      osc.stop(now + idx * 0.06 + 0.25);
    });
  }

  /**
   * Liquid Gulping / Drinking Potion Glug Sound
   */
  private playDrinkPotion(): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // 4 Liquid Gulp Bursts
    for (let i = 0; i < 4; i++) {
      const delay = now + i * 0.14;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(260 + i * 40, delay);
      osc.frequency.exponentialRampToValueAtTime(480 + i * 60, delay + 0.1);

      gain.gain.setValueAtTime(0.35, delay);
      gain.gain.exponentialRampToValueAtTime(0.01, delay + 0.1);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(700, delay);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(delay);
      osc.stop(delay + 0.1);
    }
  }

  /**
   * Linen Bandage Wrapping / Fabric Rustle
   */
  private playBandage(): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const noiseBuf = this.createNoiseBuffer(0.35);
    if (!noiseBuf) return;

    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuf;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.setValueAtTime(2.5, now);
    filter.frequency.setValueAtTime(1200, now);
    filter.frequency.linearRampToValueAtTime(600, now + 0.35);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.35, now + 0.15);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start(now);
    noise.stop(now + 0.35);
  }
}
