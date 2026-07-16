type AudioContextConstructor = new () => AudioContext;

interface AudioGraph {
  context: AudioContext;
  master: GainNode;
}

interface ToneStep {
  readonly offset: number;
  readonly duration: number;
  readonly frequency: number;
  readonly endFrequency?: number;
  readonly type?: OscillatorType;
  readonly volume?: number;
}

const MASTER_VOLUME = 0.28;
const SILENCE = 0.0001;

/**
 * Tiny, dependency-free Web Audio synthesizer for the game's sound effects.
 *
 * The audio graph is created only after `unlock` or the first sound request.
 * Unsupported/restricted Web Audio environments intentionally turn every
 * operation into a no-op so gameplay never depends on audio availability.
 */
export class RetroAudio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private muted = false;

  public get isMuted(): boolean {
    return this.muted;
  }

  /** Call from a pointer/touch event to satisfy browser autoplay policies. */
  public async unlock(): Promise<void> {
    const graph = this.ensureGraph();

    if (graph === null) {
      return;
    }

    try {
      if (graph.context.state === 'suspended') {
        await graph.context.resume();
      }

      // A silent one-sample source helps unlock Web Audio on older iOS builds.
      if (graph.context.state === 'running') {
        const buffer = graph.context.createBuffer(
          1,
          1,
          graph.context.sampleRate,
        );
        const source = graph.context.createBufferSource();
        source.buffer = buffer;
        source.connect(graph.master);
        source.start();
      }
    } catch {
      // Audio is an enhancement; a blocked context must never break the game.
    }
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;

    if (
      this.context === null ||
      this.master === null ||
      this.context.state === 'closed'
    ) {
      return;
    }

    try {
      const gain = this.master.gain;
      const now = this.context.currentTime;
      gain.cancelScheduledValues(now);
      gain.setTargetAtTime(muted ? 0 : MASTER_VOLUME, now, 0.008);
    } catch {
      // Some browsers can invalidate the graph while a tab is being closed.
    }
  }

  public playKick(): void {
    this.playPattern([
      {
        offset: 0,
        duration: 0.105,
        frequency: 145,
        endFrequency: 48,
        type: 'square',
        volume: 0.52,
      },
      {
        offset: 0.006,
        duration: 0.055,
        frequency: 72,
        endFrequency: 42,
        type: 'triangle',
        volume: 0.42,
      },
    ]);
  }

  public playGoal(): void {
    this.playPattern([
      { offset: 0, duration: 0.075, frequency: 523.25, volume: 0.3 },
      { offset: 0.075, duration: 0.075, frequency: 659.25, volume: 0.3 },
      { offset: 0.15, duration: 0.075, frequency: 783.99, volume: 0.3 },
      {
        offset: 0.225,
        duration: 0.15,
        frequency: 1046.5,
        type: 'square',
        volume: 0.36,
      },
    ]);
  }

  public playSave(): void {
    this.playPattern([
      {
        offset: 0,
        duration: 0.12,
        frequency: 310,
        endFrequency: 155,
        type: 'sawtooth',
        volume: 0.28,
      },
      {
        offset: 0.095,
        duration: 0.13,
        frequency: 185,
        endFrequency: 92,
        type: 'square',
        volume: 0.3,
      },
    ]);
  }

  public playPost(): void {
    this.playPattern([
      {
        offset: 0,
        duration: 0.055,
        frequency: 1244.51,
        type: 'square',
        volume: 0.34,
      },
      {
        offset: 0.06,
        duration: 0.11,
        frequency: 932.33,
        endFrequency: 1174.66,
        type: 'triangle',
        volume: 0.3,
      },
    ]);
  }

  public playOut(): void {
    this.playPattern([
      {
        offset: 0,
        duration: 0.13,
        frequency: 246.94,
        endFrequency: 185,
        type: 'square',
        volume: 0.25,
      },
      {
        offset: 0.13,
        duration: 0.18,
        frequency: 164.81,
        endFrequency: 82.41,
        type: 'square',
        volume: 0.25,
      },
    ]);
  }

  /** Releases the graph. A later call can lazily create a fresh one. */
  public async close(): Promise<void> {
    const context = this.context;
    this.context = null;
    this.master = null;

    if (context === null || context.state === 'closed') {
      return;
    }

    try {
      await context.close();
    } catch {
      // Closing is best effort and may race with browser/tab teardown.
    }
  }

  private ensureGraph(): AudioGraph | null {
    if (this.context !== null && this.master !== null) {
      if (this.context.state !== 'closed') {
        return { context: this.context, master: this.master };
      }

      this.context = null;
      this.master = null;
    }

    const AudioContextClass = this.getAudioContextConstructor();

    if (AudioContextClass === null) {
      return null;
    }

    try {
      const context = new AudioContextClass();
      const master = context.createGain();
      master.gain.value = this.muted ? 0 : MASTER_VOLUME;
      master.connect(context.destination);
      this.context = context;
      this.master = master;
      return { context, master };
    } catch {
      this.context = null;
      this.master = null;
      return null;
    }
  }

  private getAudioContextConstructor(): AudioContextConstructor | null {
    const audioGlobal = globalThis as typeof globalThis & {
      AudioContext?: AudioContextConstructor;
      webkitAudioContext?: AudioContextConstructor;
    };

    return audioGlobal.AudioContext ?? audioGlobal.webkitAudioContext ?? null;
  }

  private playPattern(pattern: readonly ToneStep[]): void {
    if (this.muted) {
      return;
    }

    const graph = this.ensureGraph();

    if (graph === null) {
      return;
    }

    const schedule = (): void => {
      if (this.muted || graph.context.state === 'closed') {
        return;
      }

      try {
        const baseTime = graph.context.currentTime + 0.005;

        for (const step of pattern) {
          this.scheduleTone(graph, baseTime, step);
        }
      } catch {
        // Scheduling can fail if the browser closes the context mid-frame.
      }
    };

    if (graph.context.state === 'suspended') {
      void graph.context.resume().then(schedule).catch(() => undefined);
      return;
    }

    schedule();
  }

  private scheduleTone(
    graph: AudioGraph,
    baseTime: number,
    step: ToneStep,
  ): void {
    const start = baseTime + step.offset;
    const end = start + step.duration;
    const oscillator = graph.context.createOscillator();
    const envelope = graph.context.createGain();

    oscillator.type = step.type ?? 'square';
    oscillator.frequency.setValueAtTime(Math.max(1, step.frequency), start);

    if (step.endFrequency !== undefined) {
      oscillator.frequency.exponentialRampToValueAtTime(
        Math.max(1, step.endFrequency),
        end,
      );
    }

    envelope.gain.setValueAtTime(SILENCE, start);
    envelope.gain.exponentialRampToValueAtTime(
      Math.max(SILENCE, step.volume ?? 0.3),
      start + Math.min(0.008, step.duration * 0.2),
    );
    envelope.gain.exponentialRampToValueAtTime(SILENCE, end);

    oscillator.connect(envelope);
    envelope.connect(graph.master);
    oscillator.onended = (): void => {
      oscillator.disconnect();
      envelope.disconnect();
    };
    oscillator.start(start);
    oscillator.stop(end + 0.01);
  }
}
