import "./styles/auth.scss";
import "./styles/boards.scss";

import Handlebars from "handlebars";
import { initGlobalListeners } from "./utils";
import { handleRoute } from "./router";
import inputPartial from "/src/templates/partials/input.hbs?raw";
import sidebarPartial from "/src/templates/partials/sidebar.hbs?raw";
import colorPickerPartial from "/src/templates/partials/colorPicker.hbs?raw";

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

const urlParams = new URLSearchParams(window.location.search);
const vkCode = urlParams.get("code");
if (vkCode) {
  if (vkCode === "200") {
    localStorage.setItem("isAuth", "true");
  }
  window.history.replaceState({}, "", "/boards");
}

handleRoute();
