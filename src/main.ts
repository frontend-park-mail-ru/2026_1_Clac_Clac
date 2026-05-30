import "./styles/auth.scss";
import "./styles/boards.scss";

import Handlebars from "handlebars";
import { initGlobalListeners } from "./utils";
import { handleRoute, setIsAuth } from "./router";
import inputPartial from "/src/templates/partials/input.hbs?raw";
import sidebarPartial from "/src/templates/partials/sidebar.hbs?raw";
import colorPickerPartial from "/src/templates/partials/colorPicker.hbs?raw";
import { authApi } from "./api";

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").then(
      (registration) => {
        console.log(
          "ServiceWorker registration successful with scope: ",
          registration.scope,
        );
      },
      (err) => {
        console.error("ServiceWorker registration failed: ", err);
      },
    );
  });
}

Handlebars.registerPartial("input", inputPartial);
Handlebars.registerPartial("sidebar", sidebarPartial);
Handlebars.registerPartial("colorPicker", colorPickerPartial);

Handlebars.registerHelper("eq", function (a, b) {
  return a === b;
});

initGlobalListeners();

export let currentUser: any = null;

export const getCurrentUser = () => currentUser;

export const setCurrentUser = (val: any) => {
  currentUser = val;
};

const initApp = async () => {
  if (window.location.pathname !== "/auth/callback") {
    try {
      const res = await authApi.checkAuth();
      currentUser = res.data.profile;
      setIsAuth(true);
    } catch (err) {
      setIsAuth(false);
    }
  }

  if (document.readyState === "loading") {
    await new Promise<void>((resolve) => {
      document.addEventListener("DOMContentLoaded", () => resolve());
    });
  }

  handleRoute();
};

initApp();
