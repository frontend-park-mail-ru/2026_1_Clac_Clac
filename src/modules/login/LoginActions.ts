import { appDispatcher } from "../../core/Dispatcher";
import { authApi } from "../../api";
import { navigateTo, setIsAuth } from "../../router";
import { Toast } from "../../utils/toast";
import { setCurrentUser } from "../../main";
import config from "../../config";
import { generateRandomString, generateCodeChallenge } from "../../utils/pkce";

export const LoginActions = {

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

  async loginWithVK(): Promise<void> {
    const codeVerifier = generateRandomString(64);
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    const state = generateRandomString(32);

    sessionStorage.setItem("vk_code_verifier", codeVerifier);
    sessionStorage.setItem("vk_state", state);

    const authUrl = new URL(config.vkAuthorizeUrl);
    authUrl.searchParams.set("client_id", config.vkClientId);
    authUrl.searchParams.set("redirect_uri", config.vkRedirectUri);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", config.vkScope);
    authUrl.searchParams.set("code_challenge", codeChallenge);
    authUrl.searchParams.set("code_challenge_method", "S256");
    authUrl.searchParams.set("state", state);

    window.location.href = authUrl.toString();
  },

  async handleVkCallback(): Promise<void> {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");
    const state = urlParams.get("state");
    const deviceId = urlParams.get("device_id");

    const savedState = sessionStorage.getItem("vk_state");
    if (!savedState || state !== savedState) {
      Toast.error("Ошибка авторизации. Попробуйте снова.");
      sessionStorage.removeItem("vk_state");
      sessionStorage.removeItem("vk_code_verifier");
      window.history.replaceState({}, "", "/login");
      navigateTo("/login");
      return;
    }

    if (!code) {
      Toast.error("Ошибка авторизации. Попробуйте снова.");
      sessionStorage.removeItem("vk_state");
      sessionStorage.removeItem("vk_code_verifier");
      window.history.replaceState({}, "", "/login");
      navigateTo("/login");
      return;
    }

    const codeVerifier = sessionStorage.getItem("vk_code_verifier");
    if (!codeVerifier) {
      Toast.error("Сессия истекла. Попробуйте снова.");
      window.history.replaceState({}, "", "/login");
      navigateTo("/login");
      return;
    }

    try {
      const res = await authApi.vkAuth({
        code,
        code_verifier: codeVerifier,
        state,
        device_id: deviceId || undefined,
      });

      if (res.data.success) {
        sessionStorage.removeItem("vk_code_verifier");
        sessionStorage.removeItem("vk_state");

        setIsAuth(true);
        try {
          const meRes = await authApi.checkAuth();
          setCurrentUser(meRes.data.profile);
        } catch (err) {
          console.error("Failed to load user profile after VK auth", err);
        }

        window.history.replaceState({}, "", "/boards");
        navigateTo("/boards");
      } else {
        Toast.error("Ошибка авторизации через VK.");
        sessionStorage.removeItem("vk_state");
        sessionStorage.removeItem("vk_code_verifier");
        window.history.replaceState({}, "", "/login");
        navigateTo("/login");
      }
    } catch (err: any) {
      const msg =
        err?.data?.message ||
        err?.data?.error ||
        "Ошибка авторизации через VK";
      Toast.error(msg);
      sessionStorage.removeItem("vk_state");
      sessionStorage.removeItem("vk_code_verifier");
      window.history.replaceState({}, "", "/login");
      navigateTo("/login");
    }
  },
};
