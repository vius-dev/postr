
type Listener = (...args: any[]) => void;

export class EventEmitter {
  private listeners: { [event: string]: Listener[] } = {};

  public on(event: string, listener: Listener) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(listener);
  }

  public off(event: string, listener: Listener) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(
        (l) => l !== listener
      );
    }
  }

  public emit(event: string, ...args: any[]) {
    if (this.listeners[event]) {
      this.listeners[event].forEach((listener) => listener(...args));
    }
  }
}

export const eventEmitter = new EventEmitter();
