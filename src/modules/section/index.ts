import { SectionView } from './SectionView';

let currentView: SectionView | null = null;

export const renderSectionModule = async (appDiv: HTMLElement): Promise<void> => {
  if (currentView) {
    currentView.unmount();
  }
  currentView = new SectionView(appDiv);
  await currentView.mount();
};
