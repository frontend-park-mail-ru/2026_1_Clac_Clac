import { RegisterView } from './RegisterView';

let currentView: RegisterView | null = null;

export const renderRegisterModule = (appDiv: HTMLElement): void => {
  if (currentView) {
    currentView.unmount();
  }
  currentView = new RegisterView(appDiv);
  currentView.mount();
};
