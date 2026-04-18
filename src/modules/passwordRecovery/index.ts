import { PasswordRecoveryView } from './PasswordRecoveryView';

let currentView: PasswordRecoveryView | null = null;

export const renderPasswordRecoveryModule = (appDiv: HTMLElement): void => {
  if (currentView) {
    currentView.unmount();
  }
  currentView = new PasswordRecoveryView(appDiv);
  currentView.mount();
};
