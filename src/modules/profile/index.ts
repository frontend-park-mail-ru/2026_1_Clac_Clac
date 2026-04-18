import { ProfileView } from './ProfileView';

let currentView: ProfileView | null = null;

export const renderProfileModule = (appDiv: HTMLElement): void => {
  if (currentView) {
    currentView.unmount();
  }
  currentView = new ProfileView(appDiv);
  currentView.mount();
};
