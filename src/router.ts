import { renderLogin } from "./pages/login";
import { renderRegister } from "./pages/register";
import { renderBoards } from "./pages/boards";
import { renderPasswordRecovery } from "./pages/passwordRecovery";
import { renderProfile } from "./pages/profile";
import { renderKanbanModule } from "./modules/kanban";
import { renderTask } from "./pages/task";
import { renderSection } from "./pages/section";

export const routes: Record<string, (appDiv: HTMLElement) => void> = {
  "/login": renderLogin,
  "/register": renderRegister,
  "/forgot-password": renderPasswordRecovery,
  "/boards": renderBoards,
  "/profile": renderProfile,
  "/board": renderKanbanModule,
  "/task": renderTask,
  "/section": renderSection,
};

export const navigateTo = (path: string): void => {
  window.history.pushState({}, "", path);
  handleRoute();
};

export const handleRoute = (): void => {
  const appDiv = document.getElementById("app") as HTMLDivElement | null;
  if (!appDiv) {
    return;
  }

  const path = window.location.pathname;
  const isAuth = localStorage.getItem("isAuth") === "true";

  if (path === "/" || (path === "/login" && isAuth)) {
    return navigateTo(isAuth ? "/boards" : "/login");
  }

  const routeHandler = routes[path] || routes["/login"];
  routeHandler(appDiv);
};

window.addEventListener("popstate", handleRoute);
