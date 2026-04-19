import { renderLoginModule } from "./modules/login";
import { renderRegister } from "./pages/register";
import { renderBoards } from "./pages/boards";
import { renderPasswordRecovery } from "./pages/passwordRecovery";
import { renderProfile } from "./pages/profile";
import { renderKanban } from "./pages/kanban";
import { renderTask } from "./pages/task";
import { renderSection } from "./pages/section";

export const routes: Record<string, (appDiv: HTMLElement) => void> = {
  "/login": renderLoginModule,
  "/register": renderRegister,
  "/forgot-password": renderPasswordRecovery,
  "/boards": renderBoards,
  "/profile": renderProfile,
  "/board": renderKanban,
  "/task": renderTask,
  "/section": renderSection,
};

let isAuthenticated = false;

export const setIsAuth = (value: boolean) => {
  isAuthenticated = value;
};

export const getIsAuth = () => isAuthenticated;

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
  const isAuth = getIsAuth();

  const publicRoutes = ["/login", "/register", "/forgot-password"];

  if (path === "/") {
    return navigateTo(isAuth ? "/boards" : "/login");
  }

  if (isAuth && publicRoutes.includes(path)) {
    return navigateTo("/boards");
  }

  if (!isAuth && !publicRoutes.includes(path)) {
    return navigateTo("/login");
  }

  const routeHandler = routes[path] || routes["/login"];
  routeHandler(appDiv);
};

window.addEventListener("popstate", handleRoute);
