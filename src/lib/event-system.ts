type EventMap = Record<string, any[]>;

class EventSystem<T extends EventMap = EventMap> {
  private listeners: { [K in keyof T]?: ((...args: T[K]) => void)[] } = {};

  on<K extends keyof T>(event: K, listener: (...args: T[K]) => void): this {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event]!.push(listener);
    return this;
  }

  once<K extends keyof T>(event: K, listener: (...args: T[K]) => void): this {
    const onceWrapper = (...args: T[K]) => {
      listener(...args);
      this.off(event, onceWrapper);
    };
    return this.on(event, onceWrapper);
  }

  off<K extends keyof T>(event: K, listener: (...args: T[K]) => void): this {
    const listeners = this.listeners[event];
    if (!listeners) return this;

    this.listeners[event] = listeners.filter((l) => l !== listener);
    return this;
  }

  emit<K extends keyof T>(event: K, ...args: T[K]): boolean {
    const listeners = this.listeners[event];
    if (!listeners || listeners.length === 0) return false;

    listeners.forEach((listener) => listener(...args));
    return true;
  }

  listenerCount<K extends keyof T>(event: K): number {
    return this.listeners[event]?.length ?? 0;
  }

  rawListeners<K extends keyof T>(event: K): ((...args: T[K]) => void)[] | undefined {
    return this.listeners[event];
  }
}

export default EventSystem;

