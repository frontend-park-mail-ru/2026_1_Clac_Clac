import { boardsApi } from "./api";
import { Toast } from "./utils/toast";

export const routes: Record<string, (appDiv: HTMLElement) => Promise<void>> = {
  "/login": async (appDiv) => {
    const { renderLoginModule } = await import("./modules/login");
    renderLoginModule(appDiv);
  },
  "/register": async (appDiv) => {
    const { renderRegisterModule } = await import("./modules/register");
    renderRegisterModule(appDiv);
  },
  "/forgot-password": async (appDiv) => {
    const { renderPasswordRecoveryModule } =
      await import("./modules/passwordRecovery");
    renderPasswordRecoveryModule(appDiv);
  },
  "/boards": async (appDiv) => {
    const { renderBoardsModule } = await import("./modules/boards");
    await renderBoardsModule(appDiv);
  },
  "/profile": async (appDiv) => {
    const { renderProfileModule } = await import("./modules/profile");
    renderProfileModule(appDiv);
  },
  "/board": async (appDiv) => {
    const { renderKanbanModule } = await import("./modules/kanban");
    await renderKanbanModule(appDiv);
  },
  "/task": async (appDiv) => {
    const { renderTaskModule } = await import("./modules/task");
    await renderTaskModule(appDiv);
  },
  "/section": async (appDiv) => {
    const { renderSectionModule } = await import("./modules/section");
    await renderSectionModule(appDiv);
  },
  "/support-widget": async (appDiv) => {
    const { renderSupportWidgetModule } =
      await import("./modules/supportWidget");
    renderSupportWidgetModule(appDiv);
  },
  "/support-admin": async (appDiv) => {
    const { renderSupportAdminModule } = await import("./modules/supportAdmin");
    renderSupportAdminModule(appDiv);
  },
  "/auth/callback": async (_appDiv) => {
    const { LoginActions } = await import("./modules/login/LoginActions");
    await LoginActions.handleVkCallback();
  },
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

export const handleRoute = async (): Promise<void> => {
  const appDiv = document.getElementById("app") as HTMLDivElement | null;
  if (!appDiv) {
    return;
  }

  const path = window.location.pathname;
  const isAuth = getIsAuth();

  const publicRoutes = ["/login", "/register", "/forgot-password", "/auth/callback"];

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
  await routeHandler(appDiv);
};

window.addEventListener("popstate", handleRoute);
