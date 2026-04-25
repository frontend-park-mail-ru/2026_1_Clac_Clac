import { renderLoginModule } from "./modules/login";
import { renderRegisterModule } from "./modules/register";
import { renderBoardsModule } from "./modules/boards";
import { renderPasswordRecoveryModule } from "./modules/passwordRecovery";
import { renderProfileModule } from "./modules/profile";
import { renderKanbanModule } from "./modules/kanban";
import { renderTaskModule } from "./modules/task";
import { renderSectionModule } from "./modules/section";
import { renderSupportWidgetModule } from "./modules/supportWidget";
import { renderSupportAdminModule } from "./modules/supportAdmin";

export const routes: Record<string, (appDiv: HTMLElement) => void> = {
  "/login": renderLoginModule,
  "/register": renderRegisterModule,
  "/forgot-password": renderPasswordRecoveryModule,
  "/boards": renderBoardsModule,
  "/profile": renderProfileModule,
  "/board": renderKanbanModule,
  "/task": renderTaskModule,
  "/section": renderSectionModule,
  "/support-widget": renderSupportWidgetModule,
  "/support-admin": renderSupportAdminModule,
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
