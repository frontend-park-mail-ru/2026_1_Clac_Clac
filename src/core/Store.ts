type StoreListener = (...args: unknown[]) => void;

export class Store {
  private listeners: Record<string, StoreListener[]> = {};

  on(event: string, listener: StoreListener): void {
    if (!this.listeners[event]) {
      this.listeners[event] =[];
    }
    this.listeners[event].push(listener);
  }

  off(event: string, listener: StoreListener): void {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter((l) => l !== listener);
  }

  emit(event: string, ...args: unknown[]): void {
    if (!this.listeners[event]) return;
    this.listeners[event].forEach((l) => l(...args));
  }
}
