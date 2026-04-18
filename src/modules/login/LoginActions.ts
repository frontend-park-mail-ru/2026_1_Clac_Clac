import { appDispatcher } from "../../core/Dispatcher";
import { apiClient } from "../../api";
import { navigateTo } from "../../router";
import { Toast } from "../../utils/toast";
import { ApiError } from "./login.types";

export const LoginActions = {

  checkVkAuthErrors(): void {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");
    const message = urlParams.get("message");

    if (code === "502" && message?.includes("oauth_no_email")) {
      Toast.error("Для входа через VK необходимо привязать Email к вашему аккаунту.");
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    const vkError = localStorage.getItem("vkError");
    if (vkError) {
      let errorMsg = `Ошибка авторизации: ${vkError}`;

      switch (vkError) {
        case "vk_oauth_error":
          errorMsg = "Ошибка авторизации через VK";
          break;
        case "no_valid_email":
          errorMsg = "К вашему VK не привязан Email";
          break;
        case "cannot_request_data":
          errorMsg = "Не удалось получить данные из VK";
          break;
        case "something_went_wrong":
          errorMsg = "Что-то пошло не так. Попробуйте снова";
          break;
      }

      appDispatcher.dispatch({
        type: "SET_GLOBAL_ERROR",
        payload: { error: errorMsg },
      });
      localStorage.removeItem("vkError");
    }
  },

  clearError(): void {
    appDispatcher.dispatch({
      type: "SET_GLOBAL_ERROR",
      payload: { error: null },
    });
  },

  async login(email: string, password: string): Promise<void> {
    appDispatcher.dispatch({ type: "LOGIN_START" });

    try {
      await apiClient.post("/login", { email, password });

      localStorage.setItem("isAuth", "true");
      appDispatcher.dispatch({ type: "LOGIN_SUCCESS" });
      navigateTo("/boards");
    } catch (err: unknown) {
      const error = err as ApiError;
      const errMsg = error.data?.message || error.data?.error;

      if (
        error.status === 401 ||
        (errMsg && (errMsg.includes("wrong") || errMsg.includes("exist") || errMsg.includes("invalid")))
      ) {
        appDispatcher.dispatch({
          type: "LOGIN_ERROR",
          payload: {
            globalError: "Неверный email или пароль",
            fieldErrors: { email: true, password: true },
          },
        });
      } else if (errMsg) {
        appDispatcher.dispatch({
          type: "LOGIN_ERROR",
          payload: { globalError: errMsg },
        });
      } else {
        appDispatcher.dispatch({
          type: "LOGIN_ERROR",
          payload: { globalError: "Проверьте подключение и попробуйте снова" },
        });
      }
    }
  },
};
