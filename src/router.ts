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
import { boardsApi } from "./api";
import { Toast } from "./utils/toast";

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

  if (path.startsWith("/invite/")) {
    const inviteLink = path.replace("/invite/", "").trim();
    if (inviteLink) {
      if (!isAuth) {
        localStorage.setItem("pendingInvite", inviteLink);
        Toast.info("Войдите в систему, чтобы принять приглашение на доску");
        return navigateTo("/login");
      } else {
        boardsApi
          .acceptInvite(inviteLink)
          .then((res) => {
            Toast.success("Вы успешно добавлены на доску!");
            navigateTo(`/board?id=${res.data.board_link}`);
          })
          .catch((err: any) => {
            const msg =
              err.data?.message ||
              err.data?.error ||
              "Приглашение недействительно или истекло";
            Toast.error(msg);
            navigateTo("/boards");
          });
        return;
      }
    }
  }

  if (isAuth && localStorage.getItem("pendingInvite")) {
    const pendingInvite = localStorage.getItem("pendingInvite")!;
    localStorage.removeItem("pendingInvite");

    boardsApi
      .acceptInvite(pendingInvite)
      .then((res) => {
        Toast.success("Вы успешно добавлены на доску!");
        navigateTo(`/board?id=${res.data.board_link}`);
      })
      .catch((err: any) => {
        const msg =
          err.data?.message ||
          err.data?.error ||
          "Приглашение недействительно или истекло";
        Toast.error(msg);
        navigateTo("/boards");
      });
    return;
  }

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
