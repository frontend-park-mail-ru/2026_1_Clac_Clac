import { loginStore } from "./LoginStore";
import { LoginView } from "./LoginView";

let view: LoginView | null = null;

const handleStoreChange = (): void => {
  view?.updateUI(loginStore.getState());
};

export const renderLoginModule = (appDiv: HTMLElement): void => {
  if (!view) {
    view = new LoginView(appDiv);
  } else {
    view.setAppDiv(appDiv);
  }

  view.mount();

  loginStore.off("change", handleStoreChange);
  loginStore.on("change", handleStoreChange);

  view.updateUI(loginStore.getState());
};
