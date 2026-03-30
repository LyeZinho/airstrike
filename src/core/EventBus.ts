import { Tick } from './SimulationClock';

export type EventHandler<T = any> = (event: T) => void;

export interface GameEvent {
  type: string;
  timestamp: Tick;
  data: any;
}

export class EventBus {
  private listeners: Map<string, EventHandler[]> = new Map();

  on<T extends GameEvent>(type: T['type'], handler: EventHandler<T>): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }
    this.listeners.get(type)!.push(handler as EventHandler);

    return () => {
      const handlers = this.listeners.get(type);
      if (handlers) {
        const idx = handlers.indexOf(handler as EventHandler);
        if (idx > -1) handlers.splice(idx, 1);
      }
    };
  }

  emit<T extends GameEvent>(event: T): void {
    const handlers = this.listeners.get(event.type) || [];
    for (const handler of handlers) {
      handler(event);
    }
  }

  clear(type?: string): void {
    if (type) {
      this.listeners.delete(type);
    } else {
      this.listeners.clear();
    }
  }

  hasListeners(type: string): boolean {
    return (this.listeners.get(type) || []).length > 0;
  }
}

export const eventBus = new EventBus();
