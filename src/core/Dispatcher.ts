export interface Action<T = unknown> {
  type: string;
  payload?: T;
}

type DispatchCallback = (action: Action) => void;

class Dispatcher {
  private callbacks: DispatchCallback[] =[];

  register(callback: DispatchCallback): void {
    this.callbacks.push(callback);
  }

  dispatch<T = unknown>(action: Action<T>): void {
    this.callbacks.forEach((cb) => cb(action as Action));
  }
}

export const appDispatcher = new Dispatcher();
