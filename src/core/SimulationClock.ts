/**
 * SimulationClock - Independent tick system for game simulation
 * Decoupled from React rendering - runs at fixed 60 Hz
 */

export type Tick = number;
export const TICK_RATE = 60; // ticks per second
export const DELTA_TIME = 1 / TICK_RATE; // ~0.0167 seconds per tick

export class SimulationClock {
  private tick: Tick = 0;
  private isPaused = false;
  private subscribers: ((tick: Tick) => void)[] = [];
  private lastTimestamp: number = Date.now();

  /**
   * Advance clock by one tick
   */
  advanceTick(): Tick {
    if (!this.isPaused) {
      this.tick += 1;
      this.notifySubscribers();
    }
    return this.tick;
  }

  /**
   * Get current tick number
   */
  getCurrentTick(): Tick {
    return this.tick;
  }

  /**
   * Get elapsed time in seconds since clock start
   */
  getElapsedSeconds(): number {
    return this.tick * DELTA_TIME;
  }

  /**
   * Set pause state
   */
  setPaused(paused: boolean): void {
    this.isPaused = paused;
  }

  /**
   * Check if currently paused
   */
  isPausedNow(): boolean {
    return this.isPaused;
  }

  /**
   * Subscribe to tick events
   * Returns unsubscribe function
   */
  subscribe(fn: (tick: Tick) => void): () => void {
    this.subscribers.push(fn);
    return () => {
      this.subscribers = this.subscribers.filter(s => s !== fn);
    };
  }

  /**
   * Notify all subscribers of tick change
   */
  private notifySubscribers(): void {
    for (const fn of this.subscribers) {
      fn(this.tick);
    }
  }

  /**
   * Reset clock to 0
   */
  reset(): void {
    this.tick = 0;
    this.lastTimestamp = Date.now();
  }

  /**
   * Get frame-independent delta time for physics
   */
  static getDeltaTime(): number {
    return DELTA_TIME;
  }
}

/**
 * Global singleton instance
 */
export const simulationClock = new SimulationClock();
