import { appDispatcher } from "../../core/Dispatcher";
import { authApi } from "../../api";
import { navigateTo, setIsAuth } from "../../router";
import { Toast } from "../../utils/toast";
import { setCurrentUser } from "../../main";

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
      await authApi.login({ email, password });

      setIsAuth(true);
      try {
        const meRes = await authApi.checkAuth();
        setCurrentUser(meRes.data.profile);
      } catch (err) {
        console.error("Failed to load user profile on login", err);
      }

      appDispatcher.dispatch({ type: "LOGIN_SUCCESS" });
      navigateTo("/boards");
    } catch (err: unknown) {
      const e = err as any;
      const httpStatus = e?.status;
      const bodyCode = e?.data?.code;
      const isCredentialsError =
        [400, 401, 403, 404].includes(httpStatus) ||
        [400, 401, 403, 404].includes(bodyCode);

      if (isCredentialsError) {
        appDispatcher.dispatch({
          type: "LOGIN_ERROR",
          payload: {
            globalError: "Неверный email или пароль",
            fieldErrors: { email: true, password: true },
          },
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
