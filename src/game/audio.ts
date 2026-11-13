// Procedural Web Audio API Gothic Horror & 3D Spatial Sound Synthesizer
import {
  computeSpatialSoundProfile,
  selectSpatialCueForWeather,
} from './rules';
import { DayPhase, SpatialCueKind, SpatialCueSpec, WeatherKind } from './types';

export interface SpatialUpdateParams {
  weather: WeatherKind;
  dayPhase: DayPhase;
  listenerX: number;
  listenerY: number;
  listenerZ: number;
  forwardX: number;
  forwardY: number;
  forwardZ: number;
  playerX: number;
  playerZ: number;
  enemyPositions: Array<{ x: number; z: number }>;
}

export class SpatialAudioManager {
  private ctx: AudioContext | null = null;
  private ambientBus: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private windFilter: BiquadFilterNode | null = null;
  private windGain: GainNode | null = null;
  private rainGain: GainNode | null = null;

  private active = false;
  private muted = false;

  // Countdown timers (seconds) for weather-reactive spatial cues
  private ruinWindTimer = 2.8;
  private bellTimer = 8.5;
  private whisperTimer = 5.2;
  private rainGustTimer = 4.0;
  private lastWeather: WeatherKind = 'fog';

  public attach(
    ctx: AudioContext,
    masterGain: GainNode,
    noiseBuffer: AudioBuffer,
    windFilter: BiquadFilterNode,
    windGain: GainNode,
    rainGain: GainNode,
  ): void {
    this.ctx = ctx;
    this.noiseBuffer = noiseBuffer;
    this.windFilter = windFilter;
    this.windGain = windGain;
    this.rainGain = rainGain;

    this.ambientBus = ctx.createGain();
    this.ambientBus.gain.value = 1.0;
    this.ambientBus.connect(masterGain);
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
  }

  public setActive(
    active: boolean,
    weather: WeatherKind = this.lastWeather,
    dayPhase: DayPhase = 'night',
  ): void {
    this.active = active;
    this.lastWeather = weather;
    if (!this.ctx || !this.windGain) return;

    const now = this.ctx.currentTime;
    const profile = computeSpatialSoundProfile(weather, dayPhase);

    if (this.ambientBus) {
      this.ambientBus.gain.setTargetAtTime(active ? 1.0 : 0.0, now, 0.25);
    }
    this.windGain.gain.setTargetAtTime(active ? profile.windBedGain : 0.0, now, 0.45);
    if (this.windFilter) {
      this.windFilter.frequency.setTargetAtTime(profile.windFilterHz, now, 0.6);
    }
    if (this.rainGain) {
      this.rainGain.gain.setTargetAtTime(active ? profile.rainBedGain : 0.0, now, 0.45);
    }
  }

  public updateListener(
    x: number,
    y: number,
    z: number,
    fx: number,
    fy: number,
    fz: number,
  ): void {
    if (!this.ctx) return;
    const listener = this.ctx.listener;
    const now = this.ctx.currentTime;

    if ('positionX' in listener && listener.positionX) {
      listener.positionX.setTargetAtTime(x, now, 0.03);
      listener.positionY.setTargetAtTime(y, now, 0.03);
      listener.positionZ.setTargetAtTime(z, now, 0.03);
      listener.forwardX.setTargetAtTime(fx, now, 0.03);
      listener.forwardY.setTargetAtTime(fy, now, 0.03);
      listener.forwardZ.setTargetAtTime(fz, now, 0.03);
      listener.upX.setValueAtTime(0, now);
      listener.upY.setValueAtTime(1, now);
      listener.upZ.setValueAtTime(0, now);
    } else if (typeof (listener as AudioListener & { setPosition?: (...args: number[]) => void }).setPosition === 'function') {
      const legacy = listener as AudioListener & {
        setPosition: (x: number, y: number, z: number) => void;
        setOrientation: (fx: number, fy: number, fz: number, ux: number, uy: number, uz: number) => void;
      };
      legacy.setPosition(x, y, z);
      legacy.setOrientation(fx, fy, fz, 0, 1, 0);
    }
  }

  private createSpatialPanner(x: number, y: number, z: number, refDistance = 8, maxDistance = 76): PannerNode {
    const ctx = this.ctx!;
    const panner = ctx.createPanner();
    panner.panningModel = 'HRTF';
    panner.distanceModel = 'inverse';
    panner.refDistance = refDistance;
    panner.maxDistance = maxDistance;
    panner.rolloffFactor = 1.15;
    panner.coneInnerAngle = 360;
    panner.coneOuterAngle = 360;

    const now = ctx.currentTime;
    if ('positionX' in panner && panner.positionX) {
      panner.positionX.setValueAtTime(x, now);
      panner.positionY.setValueAtTime(y, now);
      panner.positionZ.setValueAtTime(z, now);
    } else {
      panner.setPosition(x, y, z);
    }

    panner.connect(this.ambientBus!);
    return panner;
  }

  private nextInterval([min, max]: [number, number]): number {
    return min + Math.random() * (max - min);
  }

  public onWeatherChanged(
    weather: WeatherKind,
    dayPhase: DayPhase,
    playerX: number,
    playerZ: number,
    enemyPositions: Array<{ x: number; z: number }>,
  ): void {
    this.lastWeather = weather;
    this.setActive(this.active, weather, dayPhase);

    if (!this.active || this.muted || !this.ctx || !this.ambientBus) return;

    // Immediately play a signature spatial cue for the incoming weather state
    const primaryKind: SpatialCueKind =
      weather === 'fog'
        ? 'creature_whisper'
        : weather === 'storm'
        ? 'ruin_wind'
        : weather === 'rain'
        ? 'rain_gust'
        : 'distant_bell';

    const spec = selectSpatialCueForWeather(
      primaryKind,
      weather,
      dayPhase,
      playerX,
      playerZ,
      enemyPositions,
      Math.random(),
    );
    this.playCueSpec(spec, weather);

    // Accelerate follow-up timers slightly so new weather feels alive
    const profile = computeSpatialSoundProfile(weather, dayPhase);
    this.ruinWindTimer = Math.min(this.ruinWindTimer, profile.ruinWindInterval[0] * 0.7);
    this.whisperTimer = Math.min(this.whisperTimer, profile.whisperInterval[0] * 0.7);
    if (profile.rainGustInterval) {
      this.rainGustTimer = Math.min(this.rainGustTimer, profile.rainGustInterval[0] * 0.65);
    }
  }

  public update(dt: number, params: SpatialUpdateParams): void {
    if (!this.ctx || !this.ambientBus) return;

    this.updateListener(
      params.listenerX,
      params.listenerY,
      params.listenerZ,
      params.forwardX,
      params.forwardY,
      params.forwardZ,
    );

    if (!this.active) return;

    const profile = computeSpatialSoundProfile(params.weather, params.dayPhase);
    const now = this.ctx.currentTime;
    this.windGain?.gain.setTargetAtTime(profile.windBedGain, now, 0.5);
    this.windFilter?.frequency.setTargetAtTime(profile.windFilterHz, now, 0.7);
    this.rainGain?.gain.setTargetAtTime(profile.rainBedGain, now, 0.5);

    if (this.muted) return;

    this.ruinWindTimer -= dt;
    if (this.ruinWindTimer <= 0) {
      this.ruinWindTimer = this.nextInterval(profile.ruinWindInterval);
      const spec = selectSpatialCueForWeather(
        'ruin_wind',
        params.weather,
        params.dayPhase,
        params.playerX,
        params.playerZ,
        params.enemyPositions,
        Math.random(),
      );
      this.playCueSpec(spec, params.weather);
    }

    this.bellTimer -= dt;
    if (this.bellTimer <= 0) {
      this.bellTimer = this.nextInterval(profile.bellInterval);
      const spec = selectSpatialCueForWeather(
        'distant_bell',
        params.weather,
        params.dayPhase,
        params.playerX,
        params.playerZ,
        params.enemyPositions,
        Math.random(),
      );
      this.playCueSpec(spec, params.weather);
    }

    this.whisperTimer -= dt;
    if (this.whisperTimer <= 0) {
      this.whisperTimer = this.nextInterval(profile.whisperInterval);
      const spec = selectSpatialCueForWeather(
        'creature_whisper',
        params.weather,
        params.dayPhase,
        params.playerX,
        params.playerZ,
        params.enemyPositions,
        Math.random(),
      );
      this.playCueSpec(spec, params.weather);
    }

    if (profile.rainGustInterval) {
      this.rainGustTimer -= dt;
      if (this.rainGustTimer <= 0) {
        this.rainGustTimer = this.nextInterval(profile.rainGustInterval);
        const spec = selectSpatialCueForWeather(
          'rain_gust',
          params.weather,
          params.dayPhase,
          params.playerX,
          params.playerZ,
          params.enemyPositions,
          Math.random(),
        );
        this.playCueSpec(spec, params.weather);
      }
    }
  }

  public playCueSpec(spec: SpatialCueSpec, weather: WeatherKind = 'fog'): void {
    if (this.muted || !this.ctx || !this.ambientBus) return;
    if (spec.kind === 'ruin_wind') {
      this.playRuinWind(spec.x, spec.y, spec.z, spec.gain, spec.pitch);
    } else if (spec.kind === 'distant_bell') {
      this.playDistantBell(spec.x, spec.y, spec.z, spec.gain, spec.pitch, weather);
    } else if (spec.kind === 'creature_whisper') {
      this.playCreatureWhisper(spec.x, spec.y, spec.z, spec.gain, spec.pitch);
    } else if (spec.kind === 'rain_gust') {
      this.playRainGust(spec.x, spec.y, spec.z, spec.gain, spec.pitch);
    } else if (spec.kind === 'thunder_clap') {
      this.playSpatialThunder(spec.x, spec.y, spec.z, spec.gain, spec.pitch);
    }
  }

  public playRuinWind(x: number, y: number, z: number, gainLevel = 0.24, pitch = 1.0): void {
    if (this.muted || !this.ctx || !this.ambientBus || !this.noiseBuffer) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const dur = 2.8;

    const panner = this.createSpatialPanner(x, y, z, 11, 80);

    // Resonant whistling wind through stone arches
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;

    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 6.8;
    bp.frequency.setValueAtTime(260 * pitch, now);
    bp.frequency.exponentialRampToValueAtTime(560 * pitch, now + 1.15);
    bp.frequency.exponentialRampToValueAtTime(210 * pitch, now + dur);

    // Subtle eerie overtone whistle
    const whistle = ctx.createOscillator();
    whistle.type = 'sine';
    whistle.frequency.setValueAtTime(390 * pitch, now);
    whistle.frequency.exponentialRampToValueAtTime(520 * pitch, now + 1.1);
    whistle.frequency.exponentialRampToValueAtTime(310 * pitch, now + dur);

    const whistleGain = ctx.createGain();
    whistleGain.gain.setValueAtTime(0.0001, now);
    whistleGain.gain.linearRampToValueAtTime(gainLevel * 0.14, now + 0.85);
    whistleGain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, now);
    env.gain.linearRampToValueAtTime(gainLevel, now + 0.9);
    env.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    src.connect(bp);
    bp.connect(env);
    whistle.connect(whistleGain);
    whistleGain.connect(panner);
    env.connect(panner);

    src.start(now);
    whistle.start(now);
    src.stop(now + dur + 0.05);
    whistle.stop(now + dur + 0.05);
  }

  public playDistantBell(
    x: number,
    y: number,
    z: number,
    gainLevel = 0.28,
    pitch = 1.0,
    weather: WeatherKind = 'fog',
  ): void {
    if (this.muted || !this.ctx || !this.ambientBus) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    const panner = this.createSpatialPanner(x, y, z, 12, 85);
    const muffle = ctx.createBiquadFilter();
    muffle.type = 'lowpass';
    muffle.frequency.value = weather === 'fog' || weather === 'storm' ? 920 : 1450;
    muffle.connect(panner);

    const partials = [110, 164.81, 220, 277.18, 330];
    partials.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = i === 0 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq * pitch, now);
      // Slight pitch sway in storm winds
      if (weather === 'storm') {
        osc.frequency.linearRampToValueAtTime(freq * pitch * 0.992, now + 1.8);
      }
      const amp = (gainLevel * 0.36) / (i + 1);
      const decay = 3.1 - i * 0.35;
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(amp, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + decay);

      osc.connect(gain);
      gain.connect(muffle);
      osc.start(now);
      osc.stop(now + decay + 0.06);
    });
  }

  public playCreatureWhisper(
    x: number,
    y: number,
    z: number,
    gainLevel = 0.26,
    pitch = 1.0,
  ): void {
    if (this.muted || !this.ctx || !this.ambientBus || !this.noiseBuffer) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const dur = 1.75;

    const panner = this.createSpatialPanner(x, y, z, 7, 64);

    // Breathy vocal formant bursts (3 hushed ghostly syllables)
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;

    const formant1 = ctx.createBiquadFilter();
    formant1.type = 'bandpass';
    formant1.frequency.setValueAtTime(1180 * pitch, now);
    formant1.frequency.linearRampToValueAtTime(860 * pitch, now + dur);
    formant1.Q.value = 5.2;

    const formant2 = ctx.createBiquadFilter();
    formant2.type = 'bandpass';
    formant2.frequency.setValueAtTime(2320 * pitch, now);
    formant2.frequency.linearRampToValueAtTime(1780 * pitch, now + dur);
    formant2.Q.value = 6.0;

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, now);
    // Syllable 1
    env.gain.linearRampToValueAtTime(gainLevel * 0.9, now + 0.16);
    env.gain.exponentialRampToValueAtTime(gainLevel * 0.14, now + 0.45);
    // Syllable 2
    env.gain.linearRampToValueAtTime(gainLevel, now + 0.68);
    env.gain.exponentialRampToValueAtTime(gainLevel * 0.12, now + 1.05);
    // Syllable 3 trailing off
    env.gain.linearRampToValueAtTime(gainLevel * 0.72, now + 1.25);
    env.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    // Subtle spectral dissonant murmur underneath
    const murmur = ctx.createOscillator();
    murmur.type = 'triangle';
    murmur.frequency.setValueAtTime(146 * pitch, now);
    murmur.frequency.exponentialRampToValueAtTime(122 * pitch, now + dur);
    const murmurGain = ctx.createGain();
    murmurGain.gain.setValueAtTime(0.0001, now);
    murmurGain.gain.linearRampToValueAtTime(gainLevel * 0.18, now + 0.4);
    murmurGain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    src.connect(formant1);
    src.connect(formant2);
    formant1.connect(env);
    formant2.connect(env);
    env.connect(panner);

    murmur.connect(murmurGain);
    murmurGain.connect(panner);

    src.start(now);
    murmur.start(now);
    src.stop(now + dur + 0.05);
    murmur.stop(now + dur + 0.05);
  }

  public playRainGust(
    x: number,
    y: number,
    z: number,
    gainLevel = 0.24,
    pitch = 1.0,
  ): void {
    if (this.muted || !this.ctx || !this.ambientBus || !this.noiseBuffer) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const dur = 2.0;

    const panner = this.createSpatialPanner(x, y, z, 9, 60);
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;

    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 1.8;
    bp.frequency.setValueAtTime(850 * pitch, now);
    bp.frequency.exponentialRampToValueAtTime(2200 * pitch, now + 0.65);
    bp.frequency.exponentialRampToValueAtTime(720 * pitch, now + dur);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, now);
    env.gain.linearRampToValueAtTime(gainLevel, now + 0.45);
    env.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    src.connect(bp);
    bp.connect(env);
    env.connect(panner);
    src.start(now);
    src.stop(now + dur + 0.05);
  }

  public playSpatialThunder(
    x: number,
    y: number,
    z: number,
    gainLevel = 0.42,
    pitch = 1.0,
  ): void {
    if (this.muted || !this.ctx || !this.ambientBus) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    const panner = this.createSpatialPanner(x, y, z, 18, 95);

    // Sharp lightning crack transient if noise buffer is available
    if (this.noiseBuffer) {
      const crack = ctx.createBufferSource();
      crack.buffer = this.noiseBuffer;
      const hp = ctx.createBiquadFilter();
      hp.type = 'bandpass';
      hp.frequency.setValueAtTime(1100 * pitch, now);
      hp.frequency.exponentialRampToValueAtTime(220, now + 0.35);
      hp.Q.value = 0.9;

      const crackGain = ctx.createGain();
      crackGain.gain.setValueAtTime(gainLevel * 0.75, now);
      crackGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);

      crack.connect(hp);
      hp.connect(crackGain);
      crackGain.connect(panner);
      crack.start(now);
      crack.stop(now + 0.48);
    }

    // Rolling sub-bass thunder rumble
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(82 * pitch, now);
    osc.frequency.exponentialRampToValueAtTime(27, now + 1.55);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(260, now);
    filter.frequency.exponentialRampToValueAtTime(80, now + 1.55);

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(gainLevel, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.75);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(panner);
    osc.start(now);
    osc.stop(now + 1.8);
  }
}

export class GothicAudio {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private windFilter: BiquadFilterNode | null = null;
  private windGain: GainNode | null = null;
  private rainGain: GainNode | null = null;
  private spatial = new SpatialAudioManager();
  private muted = false;
  private initialized = false;

  public isMuted(): boolean {
    return this.muted;
  }

  public setMuted(mute: boolean): void {
    this.muted = mute;
    this.spatial.setMuted(mute);
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(mute ? 0 : 0.48, this.ctx.currentTime, 0.04);
    }
  }

  public toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  public unlock(): void {
    if (this.initialized) {
      if (this.ctx && this.ctx.state === 'suspended') {
        void this.ctx.resume();
      }
      return;
    }
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    this.ctx = new AudioCtx();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.muted ? 0 : 0.48;
    this.masterGain.connect(this.ctx.destination);

    // Subtle eerie howling wind ambient bed (muted when paused)
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      lastOut = (lastOut + 0.02 * white) / 1.02;
      data[i] = lastOut * 2.5;
    }
    const windSrc = this.ctx.createBufferSource();
    windSrc.buffer = noiseBuffer;
    windSrc.loop = true;

    this.windFilter = this.ctx.createBiquadFilter();
    this.windFilter.type = 'bandpass';
    this.windFilter.frequency.value = 310;
    this.windFilter.Q.value = 1.6;

    this.windGain = this.ctx.createGain();
    this.windGain.gain.value = 0.0;

    windSrc.connect(this.windFilter);
    this.windFilter.connect(this.windGain);
    this.windGain.connect(this.masterGain);
    windSrc.start();

    // Soft filtered rain patter bed
    const rainBuf = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const rData = rainBuf.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      rData[i] = (Math.random() * 2 - 1) * 0.65;
    }
    const rainSrc = this.ctx.createBufferSource();
    rainSrc.buffer = rainBuf;
    rainSrc.loop = true;

    const rainFilter = this.ctx.createBiquadFilter();
    rainFilter.type = 'highpass';
    rainFilter.frequency.value = 1400;

    this.rainGain = this.ctx.createGain();
    this.rainGain.gain.value = 0.0;

    rainSrc.connect(rainFilter);
    rainFilter.connect(this.rainGain);
    this.rainGain.connect(this.masterGain);
    rainSrc.start();

    this.spatial.attach(
      this.ctx,
      this.masterGain,
      rainBuf,
      this.windFilter,
      this.windGain,
      this.rainGain,
    );
    this.spatial.setMuted(this.muted);

    this.initialized = true;
  }

  public setAmbienceActive(
    active: boolean,
    weather: WeatherKind = 'clear',
    dayPhase: DayPhase = 'night',
  ): void {
    this.spatial.setActive(active, weather, dayPhase);
  }

  public updateSpatialAudio(dt: number, params: SpatialUpdateParams): void {
    this.spatial.update(dt, params);
  }

  public triggerWeatherTransitionCue(
    weather: WeatherKind,
    dayPhase: DayPhase,
    playerX: number,
    playerZ: number,
    enemyPositions: Array<{ x: number; z: number }>,
  ): void {
    this.spatial.onWeatherChanged(weather, dayPhase, playerX, playerZ, enemyPositions);
  }

  public playSpatialThunder(x: number, y: number, z: number): void {
    this.spatial.playSpatialThunder(x, y, z, 0.42, this.randPitch(0.1));
  }

  private randPitch(spread = 0.08): number {
    return 1 + (Math.random() * 2 - 1) * spread;
  }

  public playFootstep(onRoad = false): void {
    if (this.muted || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    const baseFreq = onRoad ? 115 : 82;
    osc.frequency.setValueAtTime(baseFreq * this.randPitch(0.1), now);
    osc.frequency.exponentialRampToValueAtTime(34, now + 0.075);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.09);
  }

  public playSlash(comboIdx = 0): void {
    if (this.muted || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    // Metallic blade whistle + air swipe
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    const startF = (360 + comboIdx * 55) * this.randPitch(0.08);
    osc.frequency.setValueAtTime(startF, now);
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.14);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 950;
    filter.Q.value = 1.2;

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.17);
  }

  public playHit(heavy = false): void {
    if (this.muted || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = heavy ? 'sawtooth' : 'square';
    osc.frequency.setValueAtTime((heavy ? 180 : 250) * this.randPitch(0.08), now);
    osc.frequency.exponentialRampToValueAtTime(42, now + (heavy ? 0.18 : 0.11));

    gain.gain.setValueAtTime(heavy ? 0.34 : 0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + (heavy ? 0.2 : 0.12));

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.22);
  }

  public playLanternFlare(): void {
    if (this.muted || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sine';
    osc2.type = 'triangle';
    osc1.frequency.setValueAtTime(220, now);
    osc1.frequency.exponentialRampToValueAtTime(520, now + 0.18);
    osc1.frequency.exponentialRampToValueAtTime(180, now + 0.55);

    osc2.frequency.setValueAtTime(440, now);
    osc2.frequency.exponentialRampToValueAtTime(760, now + 0.22);

    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.58);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.masterGain);
    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.6);
    osc2.stop(now + 0.6);
  }

  public playDash(): void {
    if (this.muted || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(190 * this.randPitch(0.06), now);
    osc.frequency.exponentialRampToValueAtTime(70, now + 0.16);
    gain.gain.setValueAtTime(0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.17);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.18);
  }

  public playTelegraph(): void {
    if (this.muted || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(420, now + 0.34);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 900;

    gain.gain.setValueAtTime(0.02, now);
    gain.gain.linearRampToValueAtTime(0.16, now + 0.28);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.4);
  }

  public playPlayerHurt(): void {
    if (this.muted || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(46, now + 0.26);
    gain.gain.setValueAtTime(0.32, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  public playIgnite(): void {
    if (this.muted || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const freqs = [293.66, 440, 587.33];
    freqs.forEach((f, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, now + idx * 0.06);
      gain.gain.setValueAtTime(0.18, now + idx * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.45);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now + idx * 0.06);
      osc.stop(now + idx * 0.06 + 0.46);
    });
  }

  public playPickup(): void {
    if (this.muted || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const freqs = [392, 523.25, 659.25];
    freqs.forEach((f, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now + idx * 0.055);
      gain.gain.setValueAtTime(0.16, now + idx * 0.055);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.055 + 0.32);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now + idx * 0.055);
      osc.stop(now + idx * 0.055 + 0.35);
    });
  }

  public playGreatBell(): void {
    if (this.muted || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    // Deep gothic cathedral bell harmonics
    const partials = [110, 220, 277.18, 329.63, 440];
    partials.forEach((freq, i) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = i === 0 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, now);
      const amp = 0.28 / (i + 1);
      gain.gain.setValueAtTime(amp, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 2.4 - i * 0.25);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 2.5);
    });
  }

  public playDefeatSting(): void {
    if (this.muted || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    [220, 196, 155.56, 110].forEach((f, i) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f, now + i * 0.16);
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 500;
      gain.gain.setValueAtTime(0.16, now + i * 0.16);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.16 + 0.45);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now + i * 0.16);
      osc.stop(now + i * 0.16 + 0.48);
    });
  }

  public playThunder(): void {
    if (this.muted || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(78, now);
    osc.frequency.exponentialRampToValueAtTime(28, now + 1.4);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(240, now);
    filter.frequency.exponentialRampToValueAtTime(85, now + 1.4);

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.36, now + 0.09);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.55);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 1.6);
  }

  public playGather(): void {
    if (this.muted || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(310 * this.randPitch(0.08), now);
    osc.frequency.exponentialRampToValueAtTime(520, now + 0.12);
    gain.gain.setValueAtTime(0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.16);
  }

  public playCraft(isEquipment = false): void {
    if (this.muted || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const freqs = isEquipment ? [440, 659.25, 880] : [330, 440, 523.25];
    freqs.forEach((f, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = isEquipment ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(f, now + idx * 0.06);
      gain.gain.setValueAtTime(0.18, now + idx * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.34);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now + idx * 0.06);
      osc.stop(now + idx * 0.06 + 0.36);
    });
  }

  public playPotionUse(): void {
    if (this.muted || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(280, now);
    osc.frequency.exponentialRampToValueAtTime(620, now + 0.22);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.26);
  }

  public playDoorToggle(opening: boolean): void {
    if (this.muted || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    // 1. Iron latch clunk
    const latch = this.ctx.createOscillator();
    const latchGain = this.ctx.createGain();
    latch.type = 'triangle';
    latch.frequency.setValueAtTime(opening ? 210 : 155, now);
    latch.frequency.exponentialRampToValueAtTime(opening ? 320 : 88, now + 0.08);
    latchGain.gain.setValueAtTime(0.22, now);
    latchGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    latch.connect(latchGain);
    latchGain.connect(this.masterGain);
    latch.start(now);
    latch.stop(now + 0.11);

    // 2. Heavy oak hinge creak
    const creak = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const creakGain = this.ctx.createGain();
    creak.type = 'sawtooth';
    creak.frequency.setValueAtTime(opening ? 96 : 128, now + 0.03);
    creak.frequency.linearRampToValueAtTime(opening ? 138 : 82, now + 0.34);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(520, now + 0.03);
    filter.Q.value = 5.5;

    creakGain.gain.setValueAtTime(0.001, now + 0.03);
    creakGain.gain.linearRampToValueAtTime(0.14, now + 0.11);
    creakGain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

    creak.connect(filter);
    filter.connect(creakGain);
    creakGain.connect(this.masterGain);
    creak.start(now + 0.03);
    creak.stop(now + 0.4);
  }
}
