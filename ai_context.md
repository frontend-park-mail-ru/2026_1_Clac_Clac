index.html:
```html
<!DOCTYPE html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="manifest" href="/manifest.json" />
    <script type="importmap">
      {
        "imports": {
          "handlebars": "https://esm.sh/handlebars@4.7.8"
        }
      }
    </script>
    <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap" rel="stylesheet" />
    <link rel="stylesheet" href="/src/style.scss" />
    <link rel="stylesheet" href="/src/styles/auth.scss" />
    <link rel="stylesheet" href="/src/styles/boards.scss" />
    <link rel="icon" type="image/x-icon" href="/logo.svg"/>
    <title>NeXuS</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

package.json:
```json
{
  "name": "frontend",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "handlebars": "^4.7.8"
  },
  "devDependencies": {
    "@eslint/js": "^10.0.1",
    "@types/node": "^25.9.1",
    "autoprefixer": "^10.4.27",
    "eslint": "^10.0.3",
    "globals": "^17.4.0",
    "jsdoc": "^4.0.5",
    "postcss": "^8.5.8",
    "sass": "^1.99.0",
    "typescript": "^5.9.3",
    "vite": "^8.0.14"
  }
}
```

vite-env.d.ts:
```typescript
/// <reference types="vite/client" />
```

manifest.json:
```json
{
  "name": "NeXus SPA",
  "short_name": "NeXus",
  "theme_color": "#0a0a0a",
  "background_color": "#0a0a0a",
  "display": "standalone",
  "icons": [
    {
      "src": "/favicon.ico",
      "sizes": "192x192",
      "type": "image/x-icon"
    }
  ]
}
```

tsconfig.json:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "lib":["ES2022", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "types": ["vite/client"]
  },
  "include": ["src"]
}
```

eslint.config.js:
```javascript
import js from "@eslint/js";
import globals from "globals";
import { defineConfig } from "eslint/config";

export default defineConfig([
  { files: ["**/*.{js,mjs,cjs}"], plugins: { js }, extends: ["js/recommended"], languageOptions: { globals: globals.browser } },
]);
```

vite.config.ts:
```typescript
import { defineConfig, Plugin } from "vite";
import {
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
  existsSync,
} from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";

function swPlugin(): Plugin {
  return {
    name: "sw-inject-manifest",
    apply: "build",
    closeBundle() {
      const distDir = join(process.cwd(), "dist");
      const assetsDir = join(distDir, "assets");

      const rootFiles = [
        "/",
        ...readdirSync(distDir)
          .filter((f) => statSync(join(distDir, f)).isFile() && f !== "sw.js")
          .map((f) => `/${f}`),
      ];

      const assetFiles = existsSync(assetsDir)
        ? readdirSync(assetsDir).map((f) => `/assets/${f}`)
        : [];

      const manifest = [...rootFiles, ...assetFiles];
      const version = createHash("md5")
        .update(manifest.join(","))
        .digest("hex")
        .slice(0, 8);

      const swPath = join(distDir, "sw.js");
      let sw = readFileSync(swPath, "utf-8");
      sw = sw
        .replace("__CACHE_VERSION__", version)
        .replace("__PRECACHE_MANIFEST__", JSON.stringify(manifest, null, 2));
      writeFileSync(swPath, sw);
    },
  };
}

export default defineConfig({
  server: {
    port: 3000,
    open: true,
  },
  build: {
    target: "esnext",
    outDir: "dist",
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            return "vendor";
          }
        },
      },
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        api: "modern-compiler",
      },
    },
  },
  plugins: [swPlugin()],
});
```

postcss.config.js:
```javascript
export default {
  plugins: {
    autoprefixer: {},
  },
}
```

src/main.ts:
```typescript
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

const initApp = async () => {
  try {
    const res = await authApi.checkAuth() as any;
    currentUser = res?.data || res;
    setIsAuth(true);
  } catch (err) {
    setIsAuth(false);
  }

  const urlParams = new URLSearchParams(window.location.search);
  const vkCode = urlParams.get("code");
  if (vkCode) {
    if (vkCode === "200") {
      setIsAuth(true);
    }
    window.history.replaceState({}, "", "/boards");
  }

  handleRoute();
};

initApp();
```

src/router.ts:
```typescript
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
  await routeHandler(appDiv);
};

window.addEventListener("popstate", handleRoute);
```

src/utils.ts:
```typescript
import { supportApi } from './api';
import { SupportIframeManager } from './modules/supportWidget/SupportIframeManager';
import { navigateTo } from './router';

/**
 * Устанавливает или снимает состояние ошибки для конкретного поля ввода.
 *
 * @param {string} id - Уникальный идентификатор элемента input.
 * @param {string|null} message - Текст ошибки. Если передано null, ошибка скрывается.
 */
export const setInputError = (id: string, message: string | null): void => {
  const input = document.getElementById(id);
  const errorMsg = document.getElementById(`${id}-error`);

  if (!input || !errorMsg) {
    return;
  }

  if (message) {
    input.classList.add('input-group__field--error');
    errorMsg.textContent = message;
    errorMsg.classList.add('input-group__error-msg--visible');
  } else {
    input.classList.remove('input-group__field--error');
    errorMsg.classList.remove('input-group__error-msg--visible');
  }
};

/**
 * Устанавливает или снимает глобальную ошибку формы.
 *
 * @param {string|null} message - Текст глобальной ошибки. Если передано null, баннер скрывается.
 */
export const setGlobalError = (message: string | null): void => {
  const globalError = document.getElementById('global-error');
  const globalErrorText = document.getElementById('global-error-text');

  if (!globalError || !globalErrorText) {
    return;
  }

  if (message) {
    globalErrorText.textContent = message;
    globalError.classList.remove('hidden');
  } else {
    globalError.classList.add('hidden');
    globalErrorText.textContent = '';
  }
};

/**
 * Проверяет адрес электронной почты на соответствие минимальным требованиям.
 *
 * @param {string} email - Адрес электронной почты.
 * @returns {boolean} `true`, если email имеет валидный формат, иначе `false`.
 */
export const validateEmail = (email: string): boolean => {
  if (email.length > 128) {
    return false;
  }

  for (const char of email) {
    if (char.trim() === '') {
      return false;
    }
  }

  const parts = email.split('@');
  if (parts.length !== 2) {
    return false;
  }

  const [local, domain] = parts;
  if (local.length === 0) {
    return false;
  }

  if (!domain.slice(1, -1).includes('.')) {
    return false;
  }

  return true;
};

/**
 * Проверяет введенный пароль на соответствие требованиям.
 *
 * @param {string} password - Пароль.
 * @returns {string|null} Строка с описанием ошибки, если пароль невалиден. `null`, если пароль прошел проверку.
 */
export const validatePassword = (password: string): string | null => {
  if (password.length < 8) {
    return 'Минимум 8 символов';
  }
  if (password.length > 128) {
    return 'Максимум 128 символов';
  }
  for (let i = 0; i < password.length; i++) {
    if (password.charCodeAt(i) > 127) {
      return 'Разрешены только латинские буквы, цифры и спецсимволы';
    }
  }
  return null;
};

/**
 * Определяет логику перехода на основе роли пользователя
 */
const routeSupportUser = (role?: string): void => {
  if (role === 'admin' || role === 'support') {
    navigateTo('/support-admin');
  } else {
    SupportIframeManager.toggle();
  }
};

/**
 * Обрабатывает клик по кнопке поддержки
 */
const handleSupportClick = async (): Promise<void> => {
  try {
    const res = await supportApi.getTickets();
    routeSupportUser(res.data.role);
  } catch (error) {
    routeSupportUser();
  }
};

/**
 * Обрабатывает переключение видимости пароля
 */
const togglePasswordVisibility = (btn: Element): void => {
  const inputId = btn.getAttribute('data-target');
  if (!inputId) return;

  const input = document.getElementById(inputId) as HTMLInputElement | null;
  if (!input) return;

  const eyeSlash = btn.querySelector('.icon-eye-slash');
  const eye = btn.querySelector('.icon-eye');
  const isPassword = input.type === 'password';

  input.type = isPassword ? 'text' : 'password';

  if (isPassword) {
    eyeSlash?.classList.add('hidden');
    eye?.classList.remove('hidden');
  } else {
    eyeSlash?.classList.remove('hidden');
    eye?.classList.add('hidden');
  }
};

/**
 * Инициализирует глобальные слушатели событий.
 */
export const initGlobalListeners = (): void => {
  document.body.addEventListener('click', (e: MouseEvent) => {
    const target = e.target as HTMLElement;

    if (target.closest('#nav-support')) {
      handleSupportClick();
      return;
    }

    const toggleBtn = target.closest('.input-group__toggle-btn');
    if (toggleBtn) {
      togglePasswordVisibility(toggleBtn);
      return;
    }
  });
};
```

src/style.scss:
```scss
:root {
    --bg-main: #0a0a0a;
    --bg-secondary: #111111;
    --bg-input: #1e1e1e;
    --text-main: #ffffff;
    --text-muted: #9ca3af;
    --text-error: #ff5c5c;
    --primary: #8b5cf6;
    --primary-hover: #7c3aed;
    --vk-color: #366af3;
    --vk-hover: #4777f4;
    --border-default: transparent;
    --border-hover: #3b3b3d;
    --border-error: #ff5c5c;

    --color-picker-white: #ffffff;
    --color-picker-grey: #515151;
    --color-picker-red: #ff607c;
    --color-picker-orange: #ffb55d;
    --color-picker-blue: #35aaff;
    --color-picker-green: #66caa0;
    --color-picker-purple: #aabbf5;
    --color-picker-pink: #ffc2ee;
}

input[type="number"]::-webkit-inner-spin-button,
input[type="number"]::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
}

input[type="number"] {
    -moz-appearance: textfield;
}

* {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
    font-family: "Roboto", sans-serif;
    -webkit-tap-highlight-color: transparent;
}

html,
body {
    height: 100%;
    margin: 0;
    padding: 0;
    overflow: hidden;
}

body {
    background-color: var(--bg-main);
    color: var(--text-main);
}

a {
    color: var(--primary);
    text-decoration: none;

    &:hover {
        text-decoration: underline;
    }
}

#app .hidden,
.hidden {
    display: none !important;
}

.color-white {
    color: #ffffff;
}

.color-grey {
    color: #9ca3af;
}

.color-red {
    color: #f87171;
}

.color-orange {
    color: #fb923c;
}

.color-blue {
    color: #60a5fa;
}

.color-green {
    color: #4ade80;
}

.color-purple {
    color: #a5b4fc;
}

.color-pink {
    color: #f9a8d4;
}

.bg-white {
    background-color: #ffffff;
}

.bg-grey {
    background-color: #9ca3af;
}

.bg-red {
    background-color: #f87171;
}

.bg-orange {
    background-color: #fb923c;
}

.bg-blue {
    background-color: #60a5fa;
}

.bg-green {
    background-color: #4ade80;
}

.bg-purple {
    background-color: #a5b4fc;
}

.bg-pink {
    background-color: #f9a8d4;
}

.fw-bold {
    font-weight: bold;
}

.w-100 {
    width: 100%;
}

.mt-05 {
    margin-top: 0.5rem;
}

.mt-1 {
    margin-top: 1rem;
}

.mb-1 {
    margin-bottom: 1rem;
}

.mb-2 {
    margin-bottom: 2rem;
}

.sw-flex-between {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.sw-no-tickets {
    color: #888;
    text-align: center;
    margin-top: 2rem;
}

.sw-mb-08 {
    margin-bottom: 0.8rem;
}

.sw-mb-15 {
    margin-bottom: 1.5rem;
}

.sw-flex-gap-05 {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
}

.sw-attachment-btn {
    margin: 0;
    width: auto;
    flex: 1;
}

.sw-flex-shrink-0 {
    flex-shrink: 0;
}

.sw-icon-remove {
    color: #ff5c5c;
    padding: 4px;
}

.sw-btn-back-wrap {
    margin-bottom: 0;
}

.sw-title-margin {
    margin: 0 0 1rem 0;
}

.sw-msg-img-wrap {
    padding: 0.5rem;
    overflow: hidden;
}

.sw-msg-img {
    max-width: 100%;
    border-radius: 4px;
}

.sa-title-margin {
    margin-top: 0;
}

.sa-ticket-flex {
    display: flex;
    justify-content: space-between;
    margin-top: 0.5rem;
    align-items: center;
}

.sa-ticket-cat {
    font-size: 0.8rem;
    color: #888;
}

.sa-ticket-item--active {
    border-color: #8b5cf6 !important;
}

.sa-empty {
    color: #888;
}

.sa-detail-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 1rem;
}

.sa-detail-title {
    margin: 0;
}

.sa-detail-actions {
    display: flex;
    gap: 0.5rem;
    align-items: center;
}

.sa-status-select {
    width: auto;
    padding: 0.4rem;
}

.sa-meta {
    color: #aaa;
    margin-top: 0;
}

.sa-messages {
    background: #1e1e20;
    padding: 1rem;
    border-radius: 8px;
}

.sa-msg-user {
    background: #444;
    align-self: flex-start;
}

.sa-msg-img-wrap {
    padding: 0.5rem;
    overflow: hidden;
    align-self: flex-start;
    background: #444;
}

.sa-msg-img {
    max-width: 100%;
    border-radius: 4px;
}

.sa-empty-detail {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: #888;
}

/* Support Iframe Form Modals */
.sw-close-modal {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.85);
    z-index: 10000;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    padding: 2rem;
    text-align: center;
    backdrop-filter: blur(4px);

    &.hidden {
        display: none !important;
    }

    &__title {
        color: white;
        margin-bottom: 1rem;
        font-size: 1.25rem;
    }

    &__desc {
        color: #ccc;
        margin-bottom: 2rem;
        font-size: 0.95rem;
    }

    &__actions {
        display: flex;
        gap: 1rem;
        width: 100%;
    }

    &__btn {
        flex: 1;
        padding: 0.8rem;
        border-radius: 8px;
        cursor: pointer;
        font-weight: 500;
        transition: background 0.2s;

        &--danger {
            background: #ff5c5c;
            color: white;
            border: none;

            &:hover {
                background: #e53e3e;
            }
        }

        &--cancel {
            background: transparent;
            border: 1px solid #666;
            color: white;

            &:hover {
                background: #333;
            }
        }
    }
}

/* Custom Toasts Element */
.toast-container {
    position: fixed;
    top: 24px;
    right: 24px;
    z-index: 10000;
    display: flex;
    flex-direction: column;
    gap: 12px;
    pointer-events: none;
}

.toast {
    background: #1e1e20;
    color: #fff;
    padding: 14px 20px;
    border-radius: 10px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
    font-size: 14px;
    font-weight: 500;
    min-width: 280px;
    max-width: 400px;
    pointer-events: auto;
    display: flex;
    justify-content: space-between;
    align-items: center;
    transition: all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
    transform: translateX(120%);
    opacity: 0;

    &--success {
        border-left: 4px solid #10b981;
    }

    &--error {
        border-left: 4px solid #ef4444;
    }

    &--info {
        border-left: 4px solid #3b82f6;
    }

    &--visible {
        transform: translateX(0);
        opacity: 1;
    }

    &__msg {
        flex: 1;
        margin-right: 12px;
        line-height: 1.4;
    }

    &__close {
        background: none;
        border: none;
        color: #777;
        cursor: pointer;
        font-size: 18px;
        padding: 0;
        display: flex;
        align-items: center;

        &:hover {
            color: #fff;
        }
    }
}

.input-group {
    display: flex;
    flex-direction: column;
    margin-bottom: 1.2rem;

    &__header {
        display: flex;
        justify-content: space-between;
        margin-bottom: 0.5rem;
    }

    &__label {
        font-size: 0.875rem;
        color: #e5e5e5;
    }

    &__wrapper {
        position: relative;
        display: flex;
        align-items: center;
    }

    &__field {
        width: 100%;
        background-color: var(--bg-input);
        color: var(--text-main);
        padding: 0.85rem 1rem;
        padding-right: 2.5rem;
        border-radius: 6px;
        border: 1px solid var(--border-default);
        outline: none;
        transition: all 0.2s ease;
        font-size: 0.95rem;

        &:hover {
            border-color: var(--border-hover);
        }

        &:focus {
            border-color: #444;
        }

        &--error {
            border-color: var(--border-error) !important;
            color: var(--text-error) !important;
            box-shadow: none;

            &::placeholder {
                color: var(--text-error);
                opacity: 0.7;
            }
        }

        &:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
    }

    &__toggle-btn {
        position: absolute;
        right: 1rem;
        background-color: transparent;
        border: none;
        color: #6b7280;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        z-index: 2;

        &:hover {
            color: #9ca3af;
        }
    }

    &__error-msg {
        color: var(--text-error);
        font-size: 0.75rem;
        margin-top: 0.4rem;
        display: none;

        &--visible {
            display: block;
        }
    }
}

.btn {
    width: 100%;
    padding: 0.9rem;
    border-radius: 8px;
    border: none;
    font-weight: 500;
    font-size: 1rem;
    cursor: pointer;
    transition: 0.2s;

    &--primary {
        background-color: var(--primary);
        color: white;

        &:hover:not(:disabled) {
            background-color: var(--primary-hover);
        }

        &:disabled {
            background-color: #666668;
            color: #a1a1a1;
            cursor: not-allowed;
        }
    }

    &--secondary {
        background: #2a2a2c;
        color: white;
        padding: 0.5rem 1rem;
        display: flex;
        align-items: center;
        gap: 0.5rem;

        &:hover {
            background: #3b3b3d;
        }
    }

    &--vk {
        background-color: var(--vk-color);
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        text-decoration: none;
        text-align: center;

        &:hover {
            background-color: var(--vk-hover);
            text-decoration: none;
        }
    }
}

.icon-btn {
    background: transparent;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.5rem;
    border-radius: 8px;
    transition: background 0.2s;

    &:hover {
        background: #2a2a2c;
    }
}

.toggle {
    position: relative;
    display: inline-block;
    width: 40px;
    height: 20px;

    input {
        opacity: 0;
        width: 0;
        height: 0;
    }

    .slider {
        position: absolute;
        cursor: pointer;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: #333;
        transition: 0.4s;
        border-radius: 20px;

        &:before {
            position: absolute;
            content: "";
            height: 14px;
            width: 14px;
            left: 3px;
            bottom: 3px;
            background-color: white;
            transition: 0.4s;
            border-radius: 50%;
        }
    }

    input:checked+.slider {
        background-color: var(--primary);
    }

    input:checked+.slider:before {
        transform: translateX(20px);
    }
}

.manage-columns {
    width: 600px;
    background: #252527;
    border-radius: 24px;
    padding: 2rem;
    color: white;

    &__header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 2rem;
    }

    &__title {
        font-size: 2rem;
        font-weight: bold;
        margin: 0;
    }

    &__list {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        margin-bottom: 2rem;
        max-height: 400px;
        overflow-y: auto;
        padding-right: 0.5rem;

        &::-webkit-scrollbar {
            width: 6px;
        }

        &::-webkit-scrollbar-track {
            background: transparent;
        }

        &::-webkit-scrollbar-thumb {
            background: #444;
            border-radius: 4px;
        }
    }

    &__item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: #1a1a1c;
        padding: 0.75rem 1.25rem;
        border-radius: 12px;
        gap: 1rem;
    }

    &__left {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        flex: 1;
    }

    &__dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        flex-shrink: 0;
    }

    &__color-trigger {
        width: 16px;
        height: 16px;
        border-radius: 4px !important;
        cursor: pointer;
        transition: transform 0.2s;

        &:hover {
            transform: scale(1.1);
        }
    }

    &__name {
        flex: 1;
        background: transparent;
        border: none;
        color: white;
        font-size: 1rem;
        font-weight: 500;
        outline: none;
        width: 100%;

        &::placeholder {
            color: #666;
        }
    }

    &__actions {
        display: flex;
        align-items: center;
        gap: 1rem;
    }

    &__delete {
        color: #ff5c5c;
        padding: 0;
        cursor: pointer;
        display: flex;
        align-items: center;
        transition: opacity 0.2s;

        &:hover {
            opacity: 0.8;
            color: #ff5c5c;
        }
    }

    &__drag {
        color: #666;
        cursor: grab;
        display: flex;
        align-items: center;
    }

    &__add-btn {
        width: 100%;
        background: transparent;
        border: 1px solid #8b5cf6;
        color: white;
        padding: 1rem;
        border-radius: 12px;
        margin-bottom: 1rem;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        font-size: 1rem;
        transition: background 0.2s;

        &:hover {
            background: rgba(139, 92, 246, 0.1);
        }
    }

    &__footer-btn {
        width: 100%;
        background: var(--primary);
        color: white;
        padding: 1rem;
        border-radius: 12px;
        border: none;
        font-size: 1.1rem;
        cursor: pointer;
        transition: background 0.2s;

        &:hover {
            background: var(--primary-hover);
        }
    }
}

.color-picker-bubble {
    width: 280px;
    background: #1e1e20;
    border: 1px solid #333;
    border-radius: 16px;
    padding: 1.25rem;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
    display: flex;
    flex-direction: column;
    gap: 1rem;

    &__title {
        font-size: 1rem;
        color: white;
        margin-bottom: 0.5rem;
    }

    &__grid {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
    }

    &__dot {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        cursor: pointer;
        border: 2px solid transparent;
        transition: border-color 0.15s, transform 0.15s;

        &:hover {
            transform: scale(1.15);
        }

        &.active {
            border-color: white;
            transform: scale(1.15);
        }
    }

    &__footer {
        display: flex;
        gap: 0.75rem;
        margin-top: 0.5rem;
    }

    &__btn {
        flex: 1;
        padding: 0.6rem;
        border-radius: 12px;
        border: none;
        font-size: 0.95rem;
        cursor: pointer;

        &--cancel {
            background: #555;
            color: #aaa;

            &:hover {
                background: #666;
                color: white;
            }
        }

        &--save {
            background: var(--primary);
            color: white;

            &:hover {
                background: var(--primary-hover);
            }
        }
    }
}

/* Task Side Panel */
.task__page-container {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: 1000;
    display: flex;
    justify-content: flex-end;
    background-color: rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(2px);
    padding: 0 !important;
}

.task__panel {
    width: 500px;
    height: 100%;
    background-color: #1a1a1c;
    box-shadow: -10px 0 30px rgba(0, 0, 0, 0.5);
    display: flex;
    flex-direction: column;
    animation: slide-in-right 0.3s ease-out;
}

@keyframes slide-in-right {
    from {
        transform: translateX(100%);
    }

    to {
        transform: translateX(0);
    }
}

.task__header-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem 2rem;
}

.task__header-right {
    display: flex;
    align-items: center;
    gap: 1rem;
}

.task__save-btn {
    width: auto !important;
    padding: 0.5rem 1.5rem !important;
    font-size: 0.9rem !important;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.task__close-btn,
.task__options-btn,
.task__share-btn {
    color: #ccc;

    &:hover {
        color: white;
    }
}

.task__content {
    padding: 0 2rem;
    flex: 1;
    overflow-y: auto;
}

.task__board-title {
    color: #888;
    font-size: 0.9rem;
    margin-bottom: 0.5rem;
}

.task__title-input {
    background: transparent;
    border: none;
    color: white;
    font-size: 2rem;
    font-weight: bold;
    width: 100%;
    padding: 0.5rem 0;
    margin-bottom: 1.5rem;
    outline: none;

    &:focus {
        border-bottom: 1px solid #444;
    }
}

.task__meta-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-bottom: 3rem;
}

.task__meta-item {
    display: flex;
    align-items: center;
    gap: 1rem;
    color: #888;
    font-size: 0.95rem;
}

.task__meta-label {
    min-width: 40px;
}

.color-picker-list {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
}

.color-square {
    width: 24px;
    height: 24px;
    border-radius: 4px;
    border: 1px solid transparent;
    cursor: pointer;
    padding: 0;
    transition:
        transform 0.2s,
        border-color 0.2s;

    &:hover {
        transform: scale(1.1);
    }

    &.active {
        border-color: white;
    }

    &.white {
        background-color: var(--color-picker-white);
    }

    &.grey {
        background-color: var(--color-picker-grey);
    }

    &.red {
        background-color: var(--color-picker-red);
    }

    &.orange {
        background-color: var(--color-picker-orange);
    }

    &.blue {
        background-color: var(--color-picker-blue);
    }

    &.green {
        background-color: var(--color-picker-green);
    }

    &.purple {
        background-color: var(--color-picker-purple);
    }

    &.pink {
        background-color: var(--color-picker-pink);
    }
}

.task__meta-value-btn {
    background: transparent;
    border: none;
    color: #ccc;
    cursor: pointer;
    padding: 0.2rem 0.5rem;
    border-radius: 4px;
    font-size: 0.95rem;

    &:hover {
        background-color: #2a2a2c;
        color: white;
    }
}

.task__meta-date-input,
.task__meta-time-input {
    background: transparent;
    border: none;
    color: #ccc;
    font-size: 0.95rem;
    font-family: inherit;
    outline: none;
    cursor: pointer;

    &::-webkit-calendar-picker-indicator {
        filter: invert(1);
        cursor: pointer;
    }
}

.task__description-section {
    margin-top: 2rem;
    margin-bottom: 2.5rem;
}

.task__description-textarea {
    background: #2a2a2c;
    border: 1px solid #333;
    border-radius: 12px;
    color: #ccc;
    width: 100%;
    min-height: 180px;
    padding: 1.5rem;
    font-size: 1rem;
    line-height: 1.6;
    resize: vertical;
    outline: none;

    &:focus {
        border-color: #8b5cf6;
    }
}

.custom-checkbox {
    display: flex;
    align-items: center;
    gap: 1rem;
    cursor: pointer;
    user-select: none;
    color: #ccc;
    font-size: 1rem;

    & > input[type="checkbox"] {
        position: absolute;
        opacity: 0;
        cursor: pointer;
        height: 0;
        width: 0;
    }

    .checkmark {
        width: 20px;
        height: 20px;
        background-color: #2a2a2c;
        border: 1px solid #444;
        border-radius: 4px;
        position: relative;
        flex-shrink: 0;
    }

    &:hover > input[type="checkbox"] ~ .checkmark {
        background-color: #333;
    }

& > input[type="checkbox"]:checked ~ .checkmark {
        background-color: var(--primary);
        border-color: var(--primary);
    }

    .checkmark:after {
        content: "";
        position: absolute;
        display: none;
        left: 6px;
        top: 2px;
        width: 5px;
        height: 10px;
        border: solid white;
        border-width: 0 2px 2px 0;
        transform: rotate(45deg);
    }

    > input[type="checkbox"]:checked ~ .checkmark:after {
        display: block;
    }
}

.create-column-form {
    &__label {
        font-size: 0.95rem;
        color: white;
        margin-bottom: 0.8rem;
        display: block;
    }

    &__colors {
        display: flex;
        gap: 0.6rem;
        margin-bottom: 1.5rem;
    }

    &__color-btn {
        width: 28px;
        height: 28px;
        border-radius: 4px;
        border: 2px solid transparent;
        cursor: pointer;
        padding: 0;
        transition: transform 0.2s, border-color 0.2s;

        &.active {
            border-color: white;
            transform: scale(1.15);
        }
    }

    &__row {
        display: flex;
        align-items: center;
        gap: 0.8rem;
        margin-bottom: 1.5rem;
    }

    &__label-inline {
        color: white;
        font-size: 0.95rem;
    }

    &__max-input {
        width: 80px;
        background: #1a1a1c;
        border: 1px solid transparent;
        border-radius: 8px;
        padding: 0.6rem 1rem;
        color: white;
        font-size: 1rem;
        outline: none;

        &::placeholder {
            color: #555;
        }

        &:focus {
            border-color: #444;
        }
    }

    &__input-wrap {
        margin-bottom: 1.5rem;
    }
}

.support-iframe-container {
    position: fixed;
    bottom: 20px;
    left: 90px;
    width: 360px;
    height: 560px;
    border-radius: 16px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
    z-index: 9999;
    transform: translateY(120%) scale(0.9);
    opacity: 0;
    transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.3s ease;
    overflow: hidden;
    background: #1a1a1c;
    border: 1px solid #333;
    display: flex;
    flex-direction: column;

    &.visible {
        transform: translateY(0) scale(1);
        opacity: 1;
    }

    .support-iframe__header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 16px;
        background: #252527;
        border-bottom: 1px solid #333;

        h3 {
            margin: 0;
            font-size: 1rem;
            color: white;
        }

        button {
            background: none;
            border: none;
            color: #aaa;
            font-size: 1.5rem;
            cursor: pointer;
            line-height: 1;
            padding: 0;

            &:hover {
                color: white;
            }
        }
    }

    iframe {
        width: 100%;
        flex: 1;
        border: none;
        background: #1a1a1c;
    }
}

@media (max-width: 768px) {
    .support-iframe-container {
        top: 0;
        left: 0;
        bottom: 0;
        right: auto;
        width: 100vw;
        height: 100dvh;
        border-radius: 0;
        border: none;
    }
}

.support-widget {
    height: 100vh;
    display: flex;
    flex-direction: column;
    color: white;
    background: #1a1a1c;
    padding: 1rem;
    overflow-y: auto;

    &__list,
    &__create,
    &__chat {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        height: 100%;
    }

    &__create {
        overflow-y: auto;
        padding-right: 4px;

        &::-webkit-scrollbar {
            width: 4px;
        }

        &::-webkit-scrollbar-thumb {
            background: #333;
            border-radius: 4px;
        }

        textarea {
            resize: vertical;
            min-height: 100px;
        }
    }

    &__select-btn {
        text-align: left;
        display: flex;
        justify-content: space-between;
        align-items: center;
        cursor: pointer;
        padding: 0.85rem 1rem !important;

        span {
            margin: 0;
            padding: 0;
            line-height: 1;
        }
    }

    &__preview-box {
        width: 32px;
        height: 32px;
        border-radius: 6px;
        overflow: hidden;
        flex-shrink: 0;

        img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
    }

    &__back-btn {
        background: transparent;
        border: none;
        color: #ccc;
        font-size: 1rem;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0;
        margin-bottom: 1.5rem;
        transition: color 0.2s;
        align-self: flex-start;

        &:hover {
            color: white;
        }
    }

    &__attachment-btn {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        color: #8b5cf6;
        cursor: pointer;
        font-size: 0.95rem;
        width: 100%;
        transition: opacity 0.2s;
        overflow: hidden;

        &:hover {
            opacity: 0.8;
        }
    }

    &__attachment-text {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    &__attachment-hint {
        color: #666;
        white-space: nowrap;
    }

    &__dropdown {
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        background: #1e1e20;
        border: 1px solid #444;
        border-radius: 8px;
        margin-top: 4px;
        z-index: 100;
        overflow: hidden;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);

        &-item {
            padding: 10px 16px;
            cursor: pointer;
            transition: background 0.2s;
            font-size: 0.95rem;

            &:hover {
                background: #2a2a2c;
                color: white;
            }
        }
    }

    &__ticket {
        background: #252527;
        padding: 1rem;
        border-radius: 8px;
        cursor: pointer;
        border: 1px solid transparent;
        transition: border-color 0.2s;

        &:hover {
            border-color: #8b5cf6;
        }

        h4 {
            margin: 0 0 0.5rem 0;
            font-size: 1rem;
        }

        .status {
            font-size: 0.75rem;
            padding: 2px 6px;
            border-radius: 4px;
            font-weight: bold;
        }

        .status-new {
            background: #3b82f6;
        }

        .status-in_progress {
            background: #f59e0b;
        }

        .status-closed {
            background: #10b981;
        }
    }

    &__messages {
        flex: 1;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 0.8rem;
        padding-right: 0.5rem;

        .msg {
            padding: 0.8rem;
            border-radius: 8px;
            max-width: 85%;
            font-size: 0.95rem;
        }

        .msg-user {
            background: #8b5cf6;
            align-self: flex-end;
        }

        .msg-support {
            background: #333;
            align-self: flex-start;
        }
    }

    &__rating {
        display: flex;
        gap: 0.5rem;
        justify-content: center;
        margin-top: 1rem;

        .star {
            cursor: pointer;
            color: #555;
            font-size: 1.8rem;
            transition: color 0.2s;
        }

        .star:hover,
        .star.active {
            color: #f59e0b;
        }
    }
}

.support-admin {
    display: flex;
    flex-direction: column;
    gap: 2rem;

    &__stats {
        display: flex;
        gap: 1.5rem;

        .stat-card {
            background: #252527;
            padding: 1.5rem;
            border-radius: 12px;
            flex: 1;

            h3 {
                margin: 0;
                color: #888;
                font-size: 0.9rem;
            }

            .val {
                font-size: 2rem;
                font-weight: bold;
                color: white;
                margin-top: 0.5rem;
            }
        }
    }

    &__layout {
        display: flex;
        gap: 2rem;
        height: calc(100vh - 250px);
        min-height: 400px;
    }

    &__list {
        flex: 1;
        background: #252527;
        border-radius: 12px;
        padding: 1.5rem;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    &__detail {
        flex: 2;
        background: #252527;
        border-radius: 12px;
        padding: 1.5rem;
        display: flex;
        flex-direction: column;
    }
}

.status-new {
    background: #3b82f6;
}

.status-in_progress {
    background: #f59e0b;
}

.status-closed {
    background: #10b981;
}

.status {
    font-size: 0.75rem;
    padding: 2px 6px;
    border-radius: 4px;
    font-weight: bold;
}

#global-error {
    display: flex;
    gap: 10px;
    justify-content: center;
    align-items: center;
    margin-top: 20px;
}
```

src/config.ts:
```typescript
export default {
  vkAuthUrl: `https://oauth.vk.com/authorize?client_id=7051184&redirect_uri=https://clac-clac.mooo.com/api/oauth/vk&response_type=code&scope=email`,
};
```

src/modules/login/LoginStore.ts:
```typescript
import { Store } from "../../core/Store";
import { appDispatcher, Action } from "../../core/Dispatcher";
import { LoginState, LoginErrorPayload, SetGlobalErrorPayload } from "./login.types";

class LoginStore extends Store {
  private state: LoginState = {
    isLoading: false,
    globalError: null,
    fieldErrors: {},
  };

  public getState(): LoginState {
    return this.state;
  }

  private handleAction(action: Action): void {
    switch (action.type) {
      case "LOGIN_START":
        this.state.isLoading = true;
        this.state.globalError = null;
        this.state.fieldErrors = {};
        this.emit("change");
        break;

      case "LOGIN_SUCCESS":
        this.state.isLoading = false;
        this.emit("change");
        break;

      case "LOGIN_ERROR": {
        const payload = action.payload as LoginErrorPayload;
        this.state.isLoading = false;
        this.state.globalError = payload.globalError;
        this.state.fieldErrors = payload.fieldErrors || {};
        this.emit("change");
        break;
      }

      case "SET_GLOBAL_ERROR": {
        const payload = action.payload as SetGlobalErrorPayload;
        this.state.globalError = payload.error;
        this.emit("change");
        break;
      }
    }
  }

  constructor() {
    super();
    appDispatcher.register(this.handleAction.bind(this));
  }
}

export const loginStore = new LoginStore();
```

src/modules/login/LoginView.ts:
```typescript
import Handlebars from "handlebars";
import loginTpl from "../../templates/login.hbs?raw";
import config from "../../config";
import { setGlobalError, validateEmail, setInputError, } from "../../utils";
import { FormValidator, ValidationSchema } from "../../utils/validator";
import { navigateTo } from "../../router";
import { LoginActions } from "./LoginActions";
import { LoginState } from "./login.types";

const template = Handlebars.compile(loginTpl);

export class LoginView {
  private appDiv: HTMLElement;
  private submitBtn: HTMLButtonElement | null = null;
  private emailInput: HTMLInputElement | null = null;
  private passwordInput: HTMLInputElement | null = null;
  private formValidator: FormValidator | null = null;
  private isSubmitted = false;

  constructor(appDiv: HTMLElement) {
    this.appDiv = appDiv;
  }

  public setAppDiv(appDiv: HTMLElement): void {
    this.appDiv = appDiv;
  }

  public mount(): void {
    this.appDiv.innerHTML = template({
      vkAuthUrl: config.vkAuthUrl,
    });

    this.submitBtn = this.appDiv.querySelector<HTMLButtonElement>("#login-submit");
    this.emailInput = this.appDiv.querySelector<HTMLInputElement>("#email");
    this.passwordInput = this.appDiv.querySelector<HTMLInputElement>("#password");

    this.initValidation();
    this.attachEventListeners();
  }

  public updateUI(state: LoginState): void {
    if (this.submitBtn) {
      this.submitBtn.disabled = state.isLoading;
      this.submitBtn.textContent = state.isLoading ? "Вход..." : "Войти";
    }

    const hasFieldErrors = state.fieldErrors.email || state.fieldErrors.password;

    if (hasFieldErrors) {
      setGlobalError(null);
      setInputError("email", state.globalError ?? null);
      setInputError("password", state.globalError ?? null);
    } else {
      setGlobalError(state.globalError);
      setInputError("email", null);
      setInputError("password", null);
    }
  }

  private initValidation(): void {
    const loginSchema: ValidationSchema = {
      email: [
        { required: true, message: "Введите адрес электронной почты" },
        {
          customValidator: (value: string) =>
            validateEmail(value) ? null : "Неверный формат email",
          message: "Неверный формат email",
        },
      ],
      password: [{ required: true, message: "Введите пароль" }],
    };

    this.formValidator = new FormValidator(
      loginSchema,
      (fieldId: string, message: string | null) => {
        if (this.isSubmitted) {
          setInputError(fieldId, message);
        }
      },
      (_: boolean) => { }
    );

    this.formValidator.attachLiveValidation();
  }

  private attachEventListeners(): void {
    const form = this.appDiv.querySelector<HTMLFormElement>("#login-form");
    const linkRegister = this.appDiv.querySelector<HTMLElement>("#link-register");
    const forgotLink = this.appDiv.querySelector<HTMLElement>(".forgot-link");

    this.emailInput?.addEventListener("input", () => LoginActions.clearError());
    this.passwordInput?.addEventListener("input", () => LoginActions.clearError());

    linkRegister?.addEventListener("click", (e: MouseEvent) => {
      e.preventDefault();
      navigateTo("/register");
    });

    forgotLink?.addEventListener("click", (e: MouseEvent) => {
      e.preventDefault();
      navigateTo("/forgot-password");
    });

    form?.addEventListener("submit", (e: SubmitEvent) => {
      e.preventDefault();
      this.isSubmitted = true;

      if (!this.formValidator?.validate()) {
        return;
      }

      const email = this.emailInput?.value.trim() || "";
      const password = this.passwordInput?.value.trim() || "";

      LoginActions.login(email, password);
    });
  }
}
```

src/modules/login/index.ts:
```typescript
import { loginStore } from "./LoginStore";
import { LoginActions } from "./LoginActions";
import { LoginView } from "./LoginView";

let view: LoginView | null = null;

const handleStoreChange = (): void => {
  view?.updateUI(loginStore.getState());
};

export const renderLoginModule = (appDiv: HTMLElement): void => {
  if (!view) {
    view = new LoginView(appDiv);
  } else {
    view.setAppDiv(appDiv);
  }

  view.mount();

  loginStore.off("change", handleStoreChange);
  loginStore.on("change", handleStoreChange);

  LoginActions.checkVkAuthErrors();

  view.updateUI(loginStore.getState());
};
```

src/modules/login/LoginActions.ts:
```typescript
import { appDispatcher } from "../../core/Dispatcher";
import { authApi } from "../../api";
import { navigateTo, setIsAuth } from "../../router";
import { Toast } from "../../utils/toast";

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
      appDispatcher.dispatch({ type: "LOGIN_SUCCESS" });
      navigateTo("/boards");
    } catch (err: unknown) {
      const e = err as any;
      const httpStatus = e?.status;
      const bodyCode = e?.data?.code;
      const isCredentialsError = httpStatus === 404 || bodyCode === 404;

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
```

src/modules/login/login.types.ts:
```typescript
export interface LoginState {
  isLoading: boolean;
  globalError: string | null;
  fieldErrors: {
    email?: boolean;
    password?: boolean;
  };
}

export interface ApiError {
  status: number;
  data: any;
}

export interface LoginErrorPayload {
  globalError: string;
  fieldErrors?: {
    email: boolean;
    password: boolean;
  };
}

export interface SetGlobalErrorPayload {
  error: string | null;
}
```

src/modules/supportWidget/index.ts:
```typescript
import { appDispatcher } from "../../core/Dispatcher";
import { supportApi } from "../../api";
import Handlebars from "handlebars";
import widgetTpl from "../../templates/support_widget.hbs?raw";
import { Store } from "../../core/Store";
import { currentUser } from "../../main";
import { validateEmail } from "../../utils";
import { Toast } from "../../utils/toast";

const template = Handlebars.compile(widgetTpl);

class SupportWidgetStore extends Store {
  public state: any = { view: 'list', tickets: [], role: 'user', currentTicket: null };
  constructor() {
    super();
    appDispatcher.register((action) => {
      if (action.type === 'SW_SET_STATE') {
        this.state = { ...this.state, ...(action.payload as any) };
        this.emit('change');
        if (window.parent && window.parent !== window) {
          window.parent.postMessage({ type: 'SUPPORT_WIDGET_STATE', view: this.state.view }, '*');
        }
      }
    });
  }

  public getState() {
    return this.state;
  }
}

const store = new SupportWidgetStore();

export const SupportWidgetActions = {
  async fetchTickets() {
    try {
      const res = await supportApi.getTickets();
      const tickets = res.data.appeals;

      appDispatcher.dispatch({ type: 'SW_SET_STATE', payload: { tickets, role: res.data.role } });
    } catch (e) {
      console.error("Failed to fetch tickets", e);
    }
  },

  async createTicket(data: { email: string, name: string, category: string, description: string, title: string, file: File | null }) {
    try {
      const res = await supportApi.createTicket({
        email: data.email,
        display_name: data.title,
        category: data.category,
        description: data.description
      });

      let newTicketId = res.data.appeal_link;

      if (typeof newTicketId === 'string' && newTicketId.startsWith('"') && newTicketId.endsWith('"')) {
        newTicketId = newTicketId.slice(1, -1);
      }

      if (data.file && newTicketId && typeof newTicketId === 'string') {
        const fd = new FormData();
        fd.append('attachment', data.file);
        await supportApi.uploadAttachment(newTicketId, fd);
      }

      appDispatcher.dispatch({ type: 'SW_SET_STATE', payload: { view: 'list' } });
      this.fetchTickets();
      Toast.success("Обращение отправлено");
    } catch (e: any) {
      console.error("Ошибка при создании тикета:", e);
      const msg = e.data?.message || e.data?.error || "Ошибка при отправке";
      Toast.error(msg);
      throw e;
    }
  },

  async openTicket(id: string) {
    const state = store.getState();
    const ticket = state.tickets.find((t: any) => t.appeal_link === id || t.id === id);
    if (ticket) {
      appDispatcher.dispatch({ type: 'SW_SET_STATE', payload: { currentTicket: ticket, view: 'chat' } });
    }
  }
};

let boundRender: (() => void) | null = null;

document.addEventListener('click', (e) => {
  const catDropdown = document.getElementById('sw-category-dropdown');
  const catBtn = document.getElementById('sw-category-btn');
  if (catDropdown && catBtn && !catBtn.contains(e.target as Node)) {
    catDropdown.classList.add('hidden');
  }
});

export const renderSupportWidgetModule = (appDiv: HTMLElement): void => {
  const render = () => {
    appDiv.innerHTML = template({ ...store.getState(), user: currentUser });

    appDiv.querySelector('#sw-btn-create')?.addEventListener('click', () => {
      appDispatcher.dispatch({ type: 'SW_SET_STATE', payload: { view: 'create' } });
    });

    appDiv.querySelector('#sw-btn-back')?.addEventListener('click', () => {
      appDispatcher.dispatch({ type: 'SW_SET_STATE', payload: { view: 'list' } });
    });

    if (store.getState().view === 'create') {
      const catBtn = appDiv.querySelector('#sw-category-btn');
      const catText = appDiv.querySelector('#sw-category-text');
      const catDropdown = appDiv.querySelector('#sw-category-dropdown');
      const submitBtn = appDiv.querySelector('#sw-btn-submit') as HTMLButtonElement;
      let selectedCategory = 'Баг';

      catBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        catDropdown?.classList.toggle('hidden');
      });

      appDiv.querySelectorAll('.support-widget__dropdown-item').forEach(item => {
        item.addEventListener('click', (e) => {
          selectedCategory = (e.target as HTMLElement).textContent || 'Баг';
          if (catText) catText.textContent = selectedCategory;
        });
      });

      const fileInput = appDiv.querySelector('#sw-attachment') as HTMLInputElement;
      const fileName = appDiv.querySelector('#sw-attachment-name');
      const fileHint = appDiv.querySelector('#sw-attachment-hint');
      const fileIcon = appDiv.querySelector('#sw-attachment-icon') as HTMLElement;
      const previewContainer = appDiv.querySelector('#sw-attachment-preview-container');
      const previewImg = appDiv.querySelector('#sw-attachment-preview') as HTMLImageElement;
      const removeBtn = appDiv.querySelector('#sw-attachment-remove');
      let selectedFile: File | null = null;

      fileInput?.addEventListener('change', (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          selectedFile = file;

          if (fileName) fileName.textContent = file.name;
          if (fileHint) (fileHint as HTMLElement).classList.add('hidden');
          if (fileIcon) fileIcon.classList.add('hidden');
          if (removeBtn) removeBtn.classList.remove('hidden');

          if (previewContainer && previewImg) {
            const reader = new FileReader();
            reader.onload = (event) => {
              if (event.target?.result) {
                previewImg.src = event.target.result as string;
                previewContainer.classList.remove('hidden');
              }
            };
            reader.readAsDataURL(file);
          }
        }
      });

      removeBtn?.addEventListener('click', (e) => {
        e.stopPropagation();

        selectedFile = null;
        if (fileInput) fileInput.value = '';

        if (fileName) fileName.textContent = 'Прикрепить фото';
        if (fileHint) (fileHint as HTMLElement).classList.remove('hidden');
        if (fileIcon) fileIcon.classList.remove('hidden');
        if (removeBtn) removeBtn.classList.add('hidden');

        if (previewContainer && previewImg) {
          previewContainer.classList.add('hidden');
          previewImg.src = '';
        }
      });

      const validateForm = () => {
        const email = (appDiv.querySelector('#sw-email') as HTMLInputElement)?.value.trim();
        const name = (appDiv.querySelector('#sw-name') as HTMLInputElement)?.value.trim();
        const desc = (appDiv.querySelector('#sw-desc') as HTMLTextAreaElement)?.value.trim();

        const isEmailValid = validateEmail(email);

        if (submitBtn) {
          submitBtn.disabled = !(isEmailValid && name && desc);
        }
      };['sw-email', 'sw-name', 'sw-desc'].forEach(id => {
        appDiv.querySelector(`#${id}`)?.addEventListener('input', (e) => {
          (e.target as HTMLElement).classList.remove('input-group__field--error');
          validateForm();
        });
      });

      validateForm();

      submitBtn?.addEventListener('click', async () => {
        const email = (appDiv.querySelector('#sw-email') as HTMLInputElement).value.trim();
        const name = (appDiv.querySelector('#sw-name') as HTMLInputElement).value.trim();
        const desc = (appDiv.querySelector('#sw-desc') as HTMLTextAreaElement).value.trim();

        if (validateEmail(email) && name && desc) {
          submitBtn.disabled = true;
          submitBtn.textContent = 'Отправка...';

          try {
            await SupportWidgetActions.createTicket({
              email,
              name,
              category: selectedCategory,
              description: desc,
              title: `[${selectedCategory}] Обращение от ${name}`,
              file: selectedFile
            });
          } catch (e) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Отправить';
          }
        }
      });
    }

    appDiv.querySelectorAll('.support-widget__ticket').forEach(el => {
      el.addEventListener('click', () => {
        const id = el.getAttribute('data-id');
        if (id) SupportWidgetActions.openTicket(id);
      });
    });
  };

  if (boundRender) {
    store.off('change', boundRender);
  }
  boundRender = render;
  store.on('change', boundRender);

  render();
  SupportWidgetActions.fetchTickets();
};
```

src/modules/supportWidget/SupportIframeManager.ts:
```typescript
import supportIframeTemplate from '../../templates/support_iframe.hbs?raw';

export class SupportIframeManager {
  private static container: HTMLElement | null = null;
  private static isCreateView: boolean = false;

  static init() {
    if (this.container) return;
    this.container = document.createElement('div');
    this.container.className = 'support-iframe-container';
    this.container.innerHTML = supportIframeTemplate;
    document.body.appendChild(this.container);

    window.addEventListener('message', (e) => {
      if (e.data?.type === 'SUPPORT_WIDGET_STATE') {
        this.isCreateView = e.data.view === 'create';
      }
    });

    document.addEventListener('mousedown', (e) => {
      if (!this.container?.classList.contains('visible')) return;
      const target = e.target as HTMLElement;
      if (target.closest('#nav-support')) return;
      if (!this.container.contains(target)) {
        this.attemptClose();
      }
    });

    document.getElementById('close-support-iframe')?.addEventListener('click', () => {
      this.attemptClose();
    });

    document.getElementById('sw-btn-confirm-close')?.addEventListener('click', () => {
      document.getElementById('sw-close-modal')!.classList.add('hidden');
      this.hide();
    });

    document.getElementById('sw-btn-cancel-close')?.addEventListener('click', () => {
      document.getElementById('sw-close-modal')!.classList.add('hidden');
    });
  }

  static attemptClose() {
    if (this.isCreateView) {
      document.getElementById('sw-close-modal')!.classList.remove('hidden');
    } else {
      this.hide();
    }
  }

  static toggle() {
    this.init();
    if (this.container?.classList.contains('visible')) {
      this.attemptClose();
    } else {
      this.show();
    }
  }

  static show() {
    this.init();
    this.container?.classList.add('visible');
  }

  static hide() {
    const modal = document.getElementById('sw-close-modal');
    if (modal) modal.classList.add('hidden');
    this.container?.classList.remove('visible');
  }
}
```

src/modules/task/TaskActions.ts:
```typescript
import { appDispatcher } from "../../core/Dispatcher";
import {
  boardsApi,
  CommentResponse,
  kanbanApi,
  profileApi,
  API_URL,
} from "../../api";
import { TaskActionTypes, User } from "./task.types";
import { taskStore } from "./TaskStore";
import { Toast } from "../../utils/toast";
import { profileCache } from "../kanban/KanbanActions";
import { clearKanbanCache } from "../kanban";

interface ExtendedCommentResponse extends CommentResponse {
  author_name?: string;
  author_avatar?: string;
  author_fallback?: string;
  created_time?: string;
  is_mine?: boolean;
  show_date_header?: boolean;
  date_header?: string;
}

const months = [
  "января",
  "февраля",
  "марта",
  "апреля",
  "мая",
  "июня",
  "июля",
  "августа",
  "сентября",
  "октября",
  "ноября",
  "декабря",
];

let currentUserLink: string | null = null;
const commentsCache = new Map<string, ExtendedCommentResponse[]>();

let eventSource: EventSource | null = null;
let currentTaskId: string | null = null;

const parseCreatedAt = (createdAt?: string): Date | null => {
  if (!createdAt) return null;
  const date = new Date(createdAt);
  if (!isNaN(date.getTime())) return date;

  const ts = parseFloat(createdAt);
  if (!isNaN(ts)) {
    return new Date(ts < 1e10 ? ts * 1000 : ts);
  }
  return null;
};

const formatTime = (date: Date): string => {
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
};

const formatDateWithComma = (date: Date): string => {
  return `${date.getDate()} ${months[date.getMonth()]}, ${date.getFullYear()}`;
};

const formatDateWithSpace = (date: Date): string => {
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
};

const enrichComment = (
  c: ExtendedCommentResponse,
  users: User[],
): ExtendedCommentResponse => {
  const u = users.find((user: User) => user.id === c.author_link);
  if (u) {
    c.author_name = u.name;
    c.author_avatar = u.avatarUrl;
    c.author_fallback = u.name.charAt(0).toUpperCase();
  } else {
    c.author_name = "Пользователь";
    c.author_fallback = "U";
  }

  const date = parseCreatedAt(c.created_at);
  c.created_time = date ? formatTime(date) : "";
  c.is_mine = c.author_link === currentUserLink;

  return c;
};

const fetchAndProcessComments = async (
  taskId: string,
  users: User[],
): Promise<ExtendedCommentResponse[]> => {
  const cached = commentsCache.get(taskId);
  if (cached) return cached;

  try {
    const commentsRes = await kanbanApi.getComments(taskId);
    const comments: ExtendedCommentResponse[] = commentsRes.data.comments;
    let lastDate = "";

    comments.forEach((c) => {
      enrichComment(c, users);
      const d = parseCreatedAt(c.created_at);
      if (d) {
        const dateStr = formatDateWithComma(d);
        if (dateStr !== lastDate) {
          c.show_date_header = true;
          c.date_header = dateStr;
          lastDate = dateStr;
        }
      }
    });

    commentsCache.set(taskId, comments);
    return comments;
  } catch (e) {
    console.error("Failed to load comments", e);
    return [];
  }
};

const updateCachedComments = (
  taskId: string,
  updater: (comments: ExtendedCommentResponse[]) => ExtendedCommentResponse[],
): void => {
  const cached = commentsCache.get(taskId) ?? [];
  commentsCache.set(taskId, updater(cached));
};

export const TaskActions = {
  async loadTaskData(boardId: string, taskId: string) {
    appDispatcher.dispatch({ type: TaskActionTypes.LOAD_DATA_START });

    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }

    currentTaskId = taskId;

    const sseUrl = `${API_URL}/events/${boardId}`;
    eventSource = new EventSource(sseUrl, { withCredentials: true });

    eventSource.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        if (parsed.type === "new_comment" && parsed.payload) {
          const { user_link, data } = parsed.payload;
          if (!data) return;

          if (user_link && currentUserLink && user_link === currentUserLink) {
            return;
          }

          const commentTaskLink =
            data.card_link || data.parent_link || data.task_link;
          if (
            commentTaskLink &&
            currentTaskId &&
            commentTaskLink !== currentTaskId
          ) {
            return;
          }

          const state = taskStore.getState();
          const exists = state.comments.some(
            (c) => c.comment_link === data.link,
          );
          if (exists) return;

          const created_at = data.created_at || new Date().toISOString();

          const comment: ExtendedCommentResponse = {
            comment_link: data.link,
            author_link: user_link ?? "",
            parent_link: "",
            text: data.text,
            created_at: created_at,
            author_name: "Пользователь",
            author_fallback: "U",
            created_time: "",
            is_mine: false,
            show_date_header: false,
            date_header: "",
          };

          enrichComment(comment, state.usersList);

          const now = new Date(created_at);
          const dateStr = formatDateWithSpace(now);
          let show_date_header = false;
          let date_header = "";

          const lastComment = state.comments[state.comments.length - 1];
          if (lastComment?.created_at) {
            const lastD = parseCreatedAt(lastComment.created_at);
            const lastDateStr = lastD ? formatDateWithSpace(lastD) : "";

            if (dateStr !== lastDateStr) {
              show_date_header = true;
              date_header = formatDateWithComma(now);
            }
          } else {
            show_date_header = true;
            date_header = formatDateWithComma(now);
          }

          comment.show_date_header = show_date_header;
          comment.date_header = date_header;

          if (currentTaskId) {
            updateCachedComments(currentTaskId, (cached) => [
              ...cached,
              comment,
            ]);
          }

          appDispatcher.dispatch({
            type: TaskActionTypes.APPEND_COMMENT,
            payload: { comment },
          });
        }
      } catch (err) {
        console.error("Failed to parse SSE event data", err);
      }
    };

    eventSource.onerror = (err) => {
      console.error("SSE connection error", err);
    };

    try {
      const boardRes = await boardsApi.getBoard(boardId);
      const boardName = boardRes.data.name || "Без названия";

      const usersRes = await boardsApi.getBoardUsers(boardId);

      const usersList: User[] = usersRes.data.members.map((m) => {
        const user: User = {
          id: m.link,
          name: m.display_name || "Без имени",
          email: m.email || "",
          avatarUrl: m.avatar_url,
        };
        profileCache.set(m.link, user);
        return user;
      });

      const [taskRes, meRes] = await Promise.all([
        kanbanApi.getTask(taskId),
        profileApi.getProfile().catch(() => null),
      ]);
      const taskData = taskRes.data;

      if (!taskData) {
        throw new Error("Задача не найдена");
      }

      if (meRes?.data?.link) {
        currentUserLink = meRes.data.link;
      }

      const comments = await fetchAndProcessComments(taskId, usersList);

      appDispatcher.dispatch({
        type: TaskActionTypes.LOAD_DATA_SUCCESS,
        payload: { boardId, taskId, boardName, usersList, taskData, comments },
      });
    } catch (err: any) {
      console.error("Fetch error", err);
      appDispatcher.dispatch({
        type: TaskActionTypes.LOAD_DATA_ERROR,
        payload: { error: "Ошибка при загрузке данных" },
      });
    }
  },

  async saveTask(taskId: string, payload: any) {
    appDispatcher.dispatch({ type: TaskActionTypes.SAVE_TASK_START });
    try {
      await kanbanApi.updateTask(taskId, payload);
      appDispatcher.dispatch({ type: TaskActionTypes.SAVE_TASK_SUCCESS });
    } catch (err: any) {
      console.error("Save task error", err);
      appDispatcher.dispatch({
        type: TaskActionTypes.SAVE_TASK_ERROR,
        payload: { error: "Ошибка при сохранении" },
      });
    }
  },

  async deleteTask(taskId: string) {
    appDispatcher.dispatch({ type: TaskActionTypes.DELETE_TASK_START });
    try {
      await kanbanApi.deleteTask(taskId);
      appDispatcher.dispatch({ type: TaskActionTypes.DELETE_TASK_SUCCESS });
    } catch (err: any) {
      console.error("Delete task error", err);
      appDispatcher.dispatch({
        type: TaskActionTypes.DELETE_TASK_ERROR,
        payload: { error: "Ошибка при удалении" },
      });
    }
  },

  clearStore() {
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }
    currentTaskId = null;
    commentsCache.clear();
    currentUserLink = null;
    appDispatcher.dispatch({ type: TaskActionTypes.CLEAR_STORE });
  },

  async addComment(taskId: string, text: string) {
    try {
      const res = await kanbanApi.createComment(taskId, { text });
      const commentLink = res.data.comment_link;

      const { usersList, comments } = taskStore.getState();
      const me = usersList.find((u) => u.id === currentUserLink);

      const now = new Date();
      const created_time = formatTime(now);
      const dateStr = formatDateWithSpace(now);

      let show_date_header = false;
      let date_header = "";

      const lastComment = comments[comments.length - 1];
      if (lastComment?.created_at) {
        const lastD = parseCreatedAt(lastComment.created_at);
        const lastDateStr = lastD ? formatDateWithSpace(lastD) : "";

        if (dateStr !== lastDateStr) {
          show_date_header = true;
          date_header = formatDateWithComma(now);
        }
      } else {
        show_date_header = true;
        date_header = formatDateWithComma(now);
      }

      const comment: ExtendedCommentResponse = {
        comment_link: commentLink,
        author_link: currentUserLink ?? "",
        parent_link: "",
        text,
        created_at: now.toISOString(),
        author_name: me?.name ?? "Пользователь",
        author_avatar: me?.avatarUrl,
        author_fallback: (me?.name ?? "U").charAt(0).toUpperCase(),
        created_time,
        is_mine: true,
        show_date_header,
        date_header,
      };

      updateCachedComments(taskId, (cached) => [...cached, comment]);

      appDispatcher.dispatch({
        type: TaskActionTypes.APPEND_COMMENT,
        payload: { comment },
      });
    } catch (e) {
      console.error("Add comment error", e);
      Toast.error("Ошибка при отправке комментария");
    }
  },

  async deleteComment(commentLink: string, taskId: string) {
    try {
      await kanbanApi.deleteComment(commentLink);
      updateCachedComments(taskId, (cached) =>
        cached.filter((c) => c.comment_link !== commentLink),
      );
      appDispatcher.dispatch({
        type: TaskActionTypes.DELETE_COMMENT,
        payload: { commentLink },
      });
    } catch (e) {
      console.error("Delete comment error", e);
      Toast.error("Ошибка при удалении комментария");
    }
  },

  async updateComment(commentLink: string, text: string, taskId: string) {
    try {
      await kanbanApi.updateComment(commentLink, { text });
      updateCachedComments(taskId, (cached) =>
        cached.map((c) =>
          c.comment_link === commentLink ? { ...c, text } : c,
        ),
      );
      appDispatcher.dispatch({
        type: TaskActionTypes.UPDATE_COMMENT,
        payload: { commentLink, text },
      });
    } catch (e) {
      console.error("Update comment error", e);
      Toast.error("Ошибка при редактировании комментария");
    }
  },

  async createSubtask(taskId: string, description: string) {
    try {
      const res = await kanbanApi.createSubtask(taskId, { description });
      appDispatcher.dispatch({
        type: TaskActionTypes.ADD_SUBTASK_SUCCESS,
        payload: { subtask: res.data },
      });
    } catch (e) {
      console.error("Create subtask error", e);
    }
  },

  async toggleSubtask(subtaskId: string, isDone: boolean, description: string) {
    try {
      await kanbanApi.updateSubtask(subtaskId, {
        is_done: isDone,
        description,
      });
      appDispatcher.dispatch({
        type: TaskActionTypes.UPDATE_SUBTASK_SUCCESS,
        payload: {
          id: subtaskId,
          subtask: {
            id: subtaskId,
            description,
            is_done: isDone,
          },
        },
      });
    } catch (e) {
      console.error("Update subtask error", e);
    }
  },

  async deleteSubtask(subtaskId: string) {
    try {
      await kanbanApi.deleteSubtask(subtaskId);
      appDispatcher.dispatch({
        type: TaskActionTypes.DELETE_SUBTASK_SUCCESS,
        payload: { id: subtaskId },
      });
    } catch (e) {
      console.error("Delete subtask error", e);
    }
  },

  async uploadAttachment(taskId: string, file: File) {
    try {
      const formData = new FormData();
      formData.append("attachment", file);

      const res = await kanbanApi.uploadAttachment(taskId, formData);

      appDispatcher.dispatch({
        type: TaskActionTypes.ADD_ATTACHMENT_SUCCESS,
        payload: { attachment: res.data },
      });
      Toast.success(`Файл ${file.name} загружен`);
    } catch (e: any) {
      console.error("Upload attachment error", e);
      if (e?.status === 413) {
        Toast.error("Файл слишком большой");
      } else {
        Toast.error(`Ошибка при загрузке ${file.name}`);
      }
    }
  },

  async deleteAttachment(attachmentLink: string) {
    try {
      await kanbanApi.deleteAttachment(attachmentLink);
      appDispatcher.dispatch({
        type: TaskActionTypes.DELETE_ATTACHMENT_SUCCESS,
        payload: { link: attachmentLink },
      });
      Toast.success("Файл удален");
    } catch (e) {
      console.error("Delete attachment error", e);
      Toast.error("Ошибка при удалении файла");
    }
  },

  async toggleTaskStatus(taskId: string, isDone: boolean) {
    appDispatcher.dispatch({ type: TaskActionTypes.SAVE_TASK_START });
    try {
      await kanbanApi.updateTaskStatus(taskId, { done: isDone });

      appDispatcher.dispatch({
        type: "TASK_UPDATE_STATUS_SUCCESS",
        payload: { is_done: isDone },
      });

      clearKanbanCache();
      Toast.success(isDone ? "Задача выполнена" : "Статус задачи изменен");
    } catch (err) {
      console.error("Failed to update status", err);
      Toast.error("Ошибка при обновлении статуса");
      appDispatcher.dispatch({
        type: TaskActionTypes.SAVE_TASK_ERROR,
        payload: { error: "Ошибка при изменении статуса" },
      });
    }
  },
};
```

src/modules/task/task.types.ts:
```typescript
export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

export interface TaskState {
  boardId: string | null;
  taskId: string | null;
  boardName: string;
  usersList: User[];
  taskData: any;
  comments: any[];
  error: string | null;
  isLoading: boolean;
  isSaving: boolean;
  attachments: any[];
}

export const TaskActionTypes = {
  LOAD_DATA_START: "TASK_LOAD_DATA_START",
  LOAD_DATA_SUCCESS: "TASK_LOAD_DATA_SUCCESS",
  LOAD_DATA_ERROR: "TASK_LOAD_DATA_ERROR",
  SAVE_TASK_START: "TASK_SAVE_TASK_START",
  SAVE_TASK_SUCCESS: "TASK_SAVE_TASK_SUCCESS",
  SAVE_TASK_ERROR: "TASK_SAVE_TASK_ERROR",
  DELETE_TASK_START: "TASK_DELETE_TASK_START",
  DELETE_TASK_SUCCESS: "TASK_DELETE_TASK_SUCCESS",
  DELETE_TASK_ERROR: "TASK_DELETE_TASK_ERROR",
  CLEAR_STORE: "TASK_CLEAR_STORE",
  APPEND_COMMENT: "TASK_APPEND_COMMENT",
  DELETE_COMMENT: "TASK_DELETE_COMMENT",
  UPDATE_COMMENT: "TASK_UPDATE_COMMENT",
  ADD_SUBTASK_SUCCESS: "TASK_ADD_SUBTASK_SUCCESS",
  UPDATE_SUBTASK_SUCCESS: "TASK_UPDATE_SUBTASK_SUCCESS",
  DELETE_SUBTASK_SUCCESS: "TASK_DELETE_SUBTASK_SUCCESS",
  ADD_ATTACHMENT_SUCCESS: "TASK_ADD_ATTACHMENT_SUCCESS",
  DELETE_ATTACHMENT_SUCCESS: "TASK_DELETE_ATTACHMENT_SUCCESS",
};
```

src/modules/task/TaskStore.ts:
```typescript
import { Store } from "../../core/Store";
import { appDispatcher, Action } from "../../core/Dispatcher";
import { TaskState, TaskActionTypes } from "./task.types";

class TaskStore extends Store {
  private state: TaskState = {
    boardId: null,
    taskId: null,
    boardName: "Без названия",
    usersList: [],
    taskData: null,
    comments: [],
    attachments: [],
    error: null,
    isLoading: false,
    isSaving: false,
  };

  constructor() {
    super();
    appDispatcher.register(this.handleActions.bind(this));
  }

  public getState(): TaskState {
    return this.state;
  }

  private handleActions(action: Action<any>): void {
    switch (action.type) {
      case TaskActionTypes.LOAD_DATA_START:
        this.state.isLoading = true;
        this.state.error = null;
        this.emit("change");
        break;
      case TaskActionTypes.LOAD_DATA_SUCCESS:
        this.state.isLoading = false;
        this.state.boardId = action.payload.boardId;
        this.state.taskId = action.payload.taskId;
        this.state.boardName = action.payload.boardName;
        this.state.usersList = action.payload.usersList;
        this.state.taskData = action.payload.taskData;
        this.state.comments = action.payload.comments || [];
        this.state.attachments = action.payload.taskData?.attachments || [];
        this.emit("change");
        break;
      case TaskActionTypes.LOAD_DATA_ERROR:
        this.state.isLoading = false;
        this.state.error = action.payload.error;
        this.emit("change");
        break;
      case TaskActionTypes.SAVE_TASK_START:
      case TaskActionTypes.DELETE_TASK_START:
        this.state.isSaving = true;
        this.state.error = null;
        this.emit("change");
        break;
      case TaskActionTypes.SAVE_TASK_SUCCESS:
        this.state.isSaving = false;
        this.emit("success", "Карточка сохранена");
        break;
      case TaskActionTypes.DELETE_TASK_SUCCESS:
        this.state.isSaving = false;
        this.emit("success", "Карточка удалена");
        break;
      case TaskActionTypes.SAVE_TASK_ERROR:
      case TaskActionTypes.DELETE_TASK_ERROR:
        this.state.isSaving = false;
        this.state.error = action.payload.error;
        this.emit("error");
        this.emit("change");
        break;
      case TaskActionTypes.APPEND_COMMENT:
        this.state.comments = [...this.state.comments, action.payload.comment];
        this.emit("change");
        break;
      case TaskActionTypes.DELETE_COMMENT:
        this.state.comments = this.state.comments.filter(
          (c: any) => c.comment_link !== action.payload.commentLink,
        );
        this.emit("change");
        break;
      case TaskActionTypes.UPDATE_COMMENT:
        this.state.comments = this.state.comments.map((c: any) =>
          c.comment_link === action.payload.commentLink
            ? { ...c, text: action.payload.text }
            : c,
        );
        this.emit("change");
        break;
      case TaskActionTypes.ADD_SUBTASK_SUCCESS:
        if (this.state.taskData) {
          const newSt = action.payload.subtask;
          this.state.taskData.subtasks = [
            ...(this.state.taskData.subtasks || []),
            newSt,
          ];
          this.emit("change");
        }
        break;
      case TaskActionTypes.UPDATE_SUBTASK_SUCCESS:
        if (this.state.taskData) {
          const updated = action.payload.subtask;
          this.state.taskData.subtasks = (
            this.state.taskData.subtasks || []
          ).map((st: any) =>
            (st.link || st.subtask_link || st.link_subtask || st.id) ===
            action.payload.id
              ? updated
              : st,
          );
          this.emit("change");
        }
        break;
      case TaskActionTypes.DELETE_SUBTASK_SUCCESS:
        if (this.state.taskData) {
          this.state.taskData.subtasks = (
            this.state.taskData.subtasks || []
          ).filter(
            (st: any) =>
              (st.link || st.subtask_link || st.link_subtask || st.id) !==
              action.payload.id,
          );
          this.emit("change");
        }
        break;

      case TaskActionTypes.ADD_ATTACHMENT_SUCCESS:
        this.state.attachments = [
          ...this.state.attachments,
          action.payload.attachment,
        ];
        if (this.state.taskData) {
          this.state.taskData.attachments = [
            ...(this.state.taskData.attachments || []),
            action.payload.attachment,
          ];
        }
        this.emit("change");
        break;

      case TaskActionTypes.DELETE_ATTACHMENT_SUCCESS:
        this.state.attachments = this.state.attachments.filter(
          (a: any) => a.attachment_link !== action.payload.link,
        );
        if (this.state.taskData) {
          this.state.taskData.attachments = (
            this.state.taskData.attachments || []
          ).filter((att: any) => att.attachment_link !== action.payload.link);
        }
        this.emit("change");
        break;

      case "TASK_UPDATE_STATUS_SUCCESS":
        this.state.isSaving = false;
        if (this.state.taskData) {
          this.state.taskData.status = action.payload.is_done;
          this.state.taskData.done = action.payload.is_done;
        }
        this.emit("change");
        break;

      case TaskActionTypes.CLEAR_STORE:
        this.state = {
          boardId: null,
          taskId: null,
          boardName: "Без названия",
          usersList: [],
          taskData: null,
          comments: [],
          attachments: [],
          error: null,
          isLoading: false,
          isSaving: false,
        };
        this.emit("change");
        break;
    }
  }
}

export const taskStore = new TaskStore();
```

src/modules/task/index.ts:
```typescript
import { renderKanbanModule } from "../../modules/kanban";
import { navigateTo } from "../../router";
import { TaskActions } from "./TaskActions";
import { TaskView } from "./TaskView";

let currentTaskView: TaskView | null = null;

export const renderTaskModule = async (appDiv: HTMLElement): Promise<void> => {
  const urlParams = new URLSearchParams(window.location.search);
  const taskId = urlParams.get("taskId");
  const boardId = urlParams.get("boardId");

  if (!taskId || taskId === "null" || !boardId || boardId === "null") {
    return navigateTo("/boards");
  }

  try {
    await renderKanbanModule(appDiv);
  } catch (err) {
    console.error("Board render error", err);
  }

  if (currentTaskView) {
    currentTaskView.destroy();
  }

  TaskActions.clearStore();

  currentTaskView = new TaskView(appDiv);
  currentTaskView.render();

  TaskActions.loadTaskData(boardId, taskId);
};
```

src/modules/task/TaskView.ts:
```typescript
import Handlebars from "handlebars";
import taskTpl from "../../templates/task.hbs?raw";
import { taskStore } from "./TaskStore";
import { kanbanStore } from "../kanban/KanbanStore";
import { TaskActions } from "./TaskActions";
import { navigateTo } from "../../router";
import { Toast } from "../../utils/toast";
import { clearKanbanCache } from "../../modules/kanban";
import { showConfirmModal } from "../../utils/confirmModal";

const template = Handlebars.compile(taskTpl);

const openLightbox = (url: string, name: string) => {
  const overlay = document.createElement("div");
  overlay.className = "lightbox-overlay";
  overlay.innerHTML = `
    <div class="lightbox-container">
      <button class="lightbox-close">&times;</button>
      <img src="${url}" alt="${name}" class="lightbox-img">
      <div class="lightbox-caption">${name}</div>
    </div>
  `;
  document.body.appendChild(overlay);

  requestAnimationFrame(() => {
    overlay.classList.add("lightbox-overlay--visible");
  });

  const close = () => {
    overlay.classList.remove("lightbox-overlay--visible");
    setTimeout(() => overlay.remove(), 250);
  };

  overlay.querySelector(".lightbox-close")?.addEventListener("click", close);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });
};

export class TaskView {
  private appDiv: HTMLElement;
  private taskNode: HTMLElement | null = null;
  private currentExecuterId: string = "";
  private isFirstRender: boolean = true;
  private scrollToNewComment: boolean = false;

  private onStoreChangeBound = this.onStoreChange.bind(this);
  private onStoreSuccessBound = this.onStoreSuccess.bind(this);
  private onStoreErrorBound = this.onStoreError.bind(this);
  private globalClickHandlerBound = this.globalClickHandler.bind(this);

  constructor(appDiv: HTMLElement) {
    this.appDiv = appDiv;
  }

  public render() {
    this.isFirstRender = true;
    taskStore.on("change", this.onStoreChangeBound);
    taskStore.on("success", this.onStoreSuccessBound);
    taskStore.on("error", this.onStoreErrorBound);
    document.addEventListener("click", this.globalClickHandlerBound);

    this.onStoreChange();
  }

  public destroy() {
    taskStore.off("change", this.onStoreChangeBound);
    taskStore.off("success", this.onStoreSuccessBound);
    taskStore.off("error", this.onStoreErrorBound);
    document.removeEventListener("click", this.globalClickHandlerBound);

    if (this.taskNode && this.appDiv.contains(this.taskNode)) {
      this.appDiv.removeChild(this.taskNode);
    }

    TaskActions.clearStore();
  }

  private globalClickHandler(e: MouseEvent) {
    document.querySelector(".context-menu")?.remove();
    document.querySelector(".assignee__dropdown")?.remove();
    if (!(e.target as HTMLElement).closest(".task__comment-menu-wrap")) {
      this.taskNode
        ?.querySelectorAll(".task__comment-dropdown")
        .forEach((d) => d.classList.add("hidden"));
    }
  }

  private onStoreChange() {
    const state = taskStore.getState();

    if (state.isLoading) {
      return;
    }

    if (state.isSaving) {
      const btnSave = this.taskNode?.querySelector(
        "#btn-save-task",
      ) as HTMLButtonElement;
      if (btnSave) {
        btnSave.disabled = true;
        btnSave.textContent = "Сохранение...";
      }
      return;
    }

    if (state.error && !state.taskData) {
      Toast.error("Ошибка при загрузке данных");
      if (state.boardId) {
        navigateTo(`/board?id=${state.boardId}`);
      } else {
        navigateTo("/boards");
      }
      return;
    }

    if (state.taskData) {
      this.renderTemplate();
      this.isFirstRender = false;
    }
  }

  private onStoreSuccess(...args: unknown[]) {
    const message = args[0] as string | undefined;

    const state = taskStore.getState();
    clearKanbanCache();
    Toast.success(message || "Операция успешна");
    this.destroy();
    navigateTo(`/board?id=${state.boardId}`);
  }

  private onStoreError() {
    const state = taskStore.getState();
    Toast.error(state.error || "Произошла ошибка");

    const btnSave = this.taskNode?.querySelector(
      "#btn-save-task",
    ) as HTMLButtonElement;
    if (btnSave) {
      btnSave.disabled = false;
      btnSave.textContent = "Сохранить";
    }
  }

  private renderTemplate() {
    const state = taskStore.getState();
    const taskData = state.taskData;
    const usersList = state.usersList;

    if (!taskData) return;

    const kanbanState = kanbanStore.getState();
    const isViewer = kanbanState.myRole === "viewer";

    const isDone = taskData.status === true || taskData.done === true || false;

    const contentEl = this.taskNode?.querySelector(
      ".task__content",
    ) as HTMLElement;
    const currentScrollTop = contentEl ? contentEl.scrollTop : 0;

    const currentSubtasks: Record<string, string> = {};
    this.taskNode
      ?.querySelectorAll(".task__subtask-text-input")
      .forEach((input) => {
        const id = input.getAttribute("data-id");
        if (id) {
          currentSubtasks[id] = (input as HTMLInputElement).value;
        }
      });

    const currentValues = {
      title: (
        this.taskNode?.querySelector("#task-title-input") as HTMLInputElement
      )?.value,
      desc: (
        this.taskNode?.querySelector("#task-desc-input") as HTMLTextAreaElement
      )?.value,
      date: (
        this.taskNode?.querySelector("#task-date-input") as HTMLInputElement
      )?.value,
      time: (
        this.taskNode?.querySelector("#task-time-input") as HTMLInputElement
      )?.value,
      subtask: (
        this.taskNode?.querySelector("#new-subtask-input") as HTMLInputElement
      )?.value,
      comment: (
        this.taskNode?.querySelector(".task__comment-input") as HTMLInputElement
      )?.value,
    };

    const activeEl = document.activeElement as HTMLElement;
    const activeId = activeEl?.id;
    const activeClass = activeEl?.className;
    let activeSelector = activeId ? `#${activeId}` : null;

    if (
      !activeSelector &&
      activeClass &&
      activeClass.includes("task__comment-input")
    ) {
      activeSelector = ".task__comment-input";
    } else if (
      !activeSelector &&
      activeClass &&
      activeClass.includes("task__subtask-text-input")
    ) {
      const id = activeEl.getAttribute("data-id");
      if (id) activeSelector = `.task__subtask-text-input[data-id="${id}"]`;
    }

    let selectionStart = 0;
    let selectionEnd = 0;
    if (
      activeEl &&
      (activeEl instanceof HTMLInputElement ||
        activeEl instanceof HTMLTextAreaElement)
    ) {
      selectionStart = activeEl.selectionStart || 0;
      selectionEnd = activeEl.selectionEnd || 0;
    }

    const deadline =
      taskData.dead_line || taskData.data_dead_line || taskData.deadline;
    let rawDate = "";
    let rawTime = "";
    let formattedDate = "";
    let formattedTime = "";

    if (deadline) {
      const d = new Date(deadline);
      if (!isNaN(d.getTime())) {
        const months = [
          "января",
          "февраля",
          "марта",
          "апреля",
          "мая",
          "июня",
          "июля",
          "августа",
          "сентября",
          "октября",
          "ноября",
          "декабря",
        ];
        rawDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        rawTime = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
        formattedDate = `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
        formattedTime = rawTime;
      }
    }

    let executorName = "Не назначен";
    let executorAvatar = "";
    let executorFallback = "";
    let currentExecuterId =
      taskData.link_executer ||
      taskData.executer_link ||
      taskData.link_executor ||
      taskData.executor_link ||
      "";

    if (currentExecuterId) {
      const found = usersList.find((u) => u.id === currentExecuterId);
      if (found) {
        executorName = found.name;
        executorAvatar = found.avatarUrl || "";
        executorFallback = found.name.charAt(0).toUpperCase();
      } else {
        executorName = "Пользователь";
        executorFallback = "U";
      }
    }

    this.currentExecuterId = currentExecuterId;

    if (!this.taskNode) {
      this.taskNode = document.createElement("div");
      this.taskNode.id = "task-overlay-container";
      this.appDiv.appendChild(this.taskNode);
    }

    const formattedSubtasks = taskData.subtasks
      .map((st: any) => {
        const validId =
          st.link || st.subtask_link || st.link_subtask || st.id || "";
        const validDesc =
          st.description || st.name || st.title || st.resolved_desc || "";
        return {
          ...st,
          id: validId,
          description: validDesc,
        };
      })
      .sort((a: any, b: any) => {
        if (a.position !== b.position)
          return (a.position || 0) - (b.position || 0);
        return String(a.id).localeCompare(String(b.id));
      });

    const formattedAttachments = (state.attachments || []).map((att: any) => {
      const name = att.display_name || "";
      const isImage = /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(name);
      return {
        ...att,
        isImage,
      };
    });

    this.taskNode.innerHTML = template({
      noAnimation: !this.isFirstRender,
      board_name: state.boardName,
      isViewer: isViewer,
      task: {
        title: taskData.title || "Без названия",
        description: taskData.description || "",
        due_date: formattedDate,
        time: formattedTime,
        raw_date: rawDate,
        raw_time: rawTime,
        executor: executorName,
        executor_avatar: executorAvatar,
        executor_fallback: executorFallback,
        executor_id: this.currentExecuterId,
        subtasks: formattedSubtasks,
        is_done: isDone,
      },
      comments: state.comments,
      attachments: formattedAttachments,
      attachmentsCount: formattedAttachments.length,
      isAttachmentsFull: formattedAttachments.length >= 100,
    });

    if (currentValues.title !== undefined)
      (
        this.taskNode.querySelector("#task-title-input") as HTMLInputElement
      ).value = currentValues.title;
    if (currentValues.desc !== undefined)
      (
        this.taskNode.querySelector("#task-desc-input") as HTMLTextAreaElement
      ).value = currentValues.desc;
    if (currentValues.date !== undefined) {
      (
        this.taskNode.querySelector("#task-date-input") as HTMLInputElement
      ).value = currentValues.date;
      this.updateDateBtn(currentValues.date);
    }
    if (currentValues.time !== undefined) {
      (
        this.taskNode.querySelector("#task-time-input") as HTMLInputElement
      ).value = currentValues.time;
      this.updateTimeBtn(currentValues.time);
    }
    if (currentValues.subtask !== undefined)
      (
        this.taskNode.querySelector("#new-subtask-input") as HTMLInputElement
      ).value = currentValues.subtask;
    if (currentValues.comment !== undefined)
      (
        this.taskNode.querySelector(".task__comment-input") as HTMLInputElement
      ).value = currentValues.comment;

    const newContentEl = this.taskNode?.querySelector(
      ".task__content",
    ) as HTMLElement;
    if (this.scrollToNewComment) {
      this.scrollToNewComment = false;
      if (newContentEl) newContentEl.scrollTop = currentScrollTop;
      requestAnimationFrame(() => {
        if (newContentEl)
          newContentEl.scrollTo({
            top: newContentEl.scrollHeight,
            behavior: "smooth",
          });
      });
    } else {
      if (newContentEl) newContentEl.scrollTop = currentScrollTop;
    }

    if (activeSelector) {
      const elToFocus = this.taskNode.querySelector(
        activeSelector,
      ) as HTMLInputElement;
      if (elToFocus) {
        elToFocus.focus();
        if (elToFocus.setSelectionRange)
          elToFocus.setSelectionRange(selectionStart, selectionEnd);
      }
    }

    Object.entries(currentSubtasks).forEach(([id, val]) => {
      const el = this.taskNode?.querySelector(
        `.task__subtask-text-input[data-id="${id}"]`,
      ) as HTMLInputElement;
      if (el) el.value = val;
    });

    this.attachListeners();
  }

  private updateDateBtn(dateVal: string) {
    const btn = this.taskNode?.querySelector(
      "#task-date-btn",
    ) as HTMLButtonElement;
    if (!btn) return;
    if (dateVal) {
      const d = new Date(`${dateVal}T00:00:00`);
      if (!isNaN(d.getTime())) {
        const months = [
          "января",
          "февраля",
          "марта",
          "апреля",
          "мая",
          "июня",
          "июля",
          "августа",
          "сентября",
          "октября",
          "ноября",
          "декабря",
        ];
        btn.textContent = `${d.getDate()} ${months[d.getMonth()]}, ${d.getFullYear()}`;
        return;
      }
    }
    btn.textContent = "Не задана";
  }

  private updateTimeBtn(timeVal: string) {
    const btn = this.taskNode?.querySelector(
      "#task-time-btn",
    ) as HTMLButtonElement;
    if (!btn) return;
    btn.textContent = timeVal || "Не задано";
  }

  private buildDatePicker(
    currentDate: string,
    onSelect?: (dateStr: string) => void,
  ): HTMLElement {
    const MONTHS = [
      "Январь",
      "Февраль",
      "Март",
      "Апрель",
      "Май",
      "Июнь",
      "Июль",
      "Август",
      "Сентябрь",
      "Октябрь",
      "Ноябрь",
      "Декабрь",
    ];
    const DAYS = ["ПН", "ВТ", "СР", "ЧТ", "ПТ", "СБ", "ВС"];

    const sel = currentDate ? new Date(currentDate + "T00:00:00Z") : null;
    let viewYear = sel ? sel.getUTCFullYear() : new Date().getFullYear();
    let viewMonth = sel ? sel.getUTCMonth() : new Date().getMonth();

    const todayUtc = new Date();
    const todayStr = `${todayUtc.getFullYear()}-${String(todayUtc.getMonth() + 1).padStart(2, "0")}-${String(todayUtc.getDate()).padStart(2, "0")}`;
    let selectedStr = currentDate || "";

    const picker = document.createElement("div");
    picker.className = "date-picker";
    picker.dataset.selectedDate = selectedStr;

    const render = () => {
      picker.innerHTML = "";

      const header = document.createElement("div");
      header.className = "date-picker__header";

      const prev = document.createElement("button");
      prev.className = "date-picker__nav-btn";
      prev.type = "button";
      prev.textContent = "‹";
      prev.addEventListener("click", (e) => {
        e.stopPropagation();
        viewMonth--;
        if (viewMonth < 0) {
          viewMonth = 11;
          viewYear--;
        }
        render();
      });

      const title = document.createElement("span");
      title.textContent = `${MONTHS[viewMonth]} ${viewYear}`;

      const next = document.createElement("button");
      next.className = "date-picker__nav-btn";
      next.type = "button";
      next.textContent = "›";
      next.addEventListener("click", (e) => {
        e.stopPropagation();
        viewMonth++;
        if (viewMonth > 11) {
          viewMonth = 0;
          viewYear++;
        }
        render();
      });

      header.appendChild(prev);
      header.appendChild(title);
      header.appendChild(next);
      picker.appendChild(header);

      const grid = document.createElement("div");
      grid.className = "date-picker__grid";

      DAYS.forEach((d) => {
        const el = document.createElement("div");
        el.className = "date-picker__day-name";
        el.textContent = d;
        grid.appendChild(el);
      });

      let dow = new Date(Date.UTC(viewYear, viewMonth, 1)).getUTCDay();
      if (dow === 0) dow = 7;
      dow--;

      const prevLast = new Date(Date.UTC(viewYear, viewMonth, 0)).getUTCDate();
      for (let i = dow - 1; i >= 0; i--) {
        const el = document.createElement("div");
        el.className = "date-picker__day date-picker__day--other-month";
        el.textContent = String(prevLast - i);
        grid.appendChild(el);
      }

      const daysInMonth = new Date(
        Date.UTC(viewYear, viewMonth + 1, 0),
      ).getUTCDate();
      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        const el = document.createElement("div");
        el.className = "date-picker__day";
        if (dateStr === todayStr) el.classList.add("date-picker__day--today");
        if (dateStr === selectedStr)
          el.classList.add("date-picker__day--selected");
        el.textContent = String(d);
        el.addEventListener("click", (e) => {
          e.stopPropagation();
          selectedStr = dateStr;
          picker.dataset.selectedDate = dateStr;
          render();
          if (onSelect) onSelect(dateStr);
        });
        grid.appendChild(el);
      }

      const total = Math.ceil((dow + daysInMonth) / 7) * 7;
      for (let d = 1; d <= total - dow - daysInMonth; d++) {
        const el = document.createElement("div");
        el.className = "date-picker__day date-picker__day--other-month";
        el.textContent = String(d);
        grid.appendChild(el);
      }

      picker.appendChild(grid);
    };

    render();
    return picker;
  }

  private buildTimePicker(currentTime: string): HTMLElement {
    const [h, m] = currentTime ? currentTime.split(":").map(Number) : [0, 0];
    const picker = document.createElement("div");
    picker.className = "time-picker";

    const updateSelectedByScroll = (scroll: HTMLElement) => {
      const scrollRect = scroll.getBoundingClientRect();
      const center = scrollRect.top + scrollRect.height / 2;
      let closest: HTMLElement | null = null;
      let minDist = Infinity;
      scroll
        .querySelectorAll<HTMLElement>(".time-picker__num")
        .forEach((el) => {
          const rect = el.getBoundingClientRect();
          const dist = Math.abs(rect.top + rect.height / 2 - center);
          if (dist < minDist) {
            minDist = dist;
            closest = el;
          }
        });
      scroll
        .querySelectorAll(".time-picker__num")
        .forEach((el) => el.classList.remove("time-picker__num--selected"));
      (closest as HTMLElement | null)?.classList.add(
        "time-picker__num--selected",
      );
    };

    const createCol = (label: string, count: number, selected: number) => {
      const col = document.createElement("div");
      col.className = "time-picker__col";
      const labelEl = document.createElement("div");
      labelEl.className = "time-picker__col-label";
      labelEl.textContent = label;
      col.appendChild(labelEl);
      const scroll = document.createElement("div");
      scroll.className = "time-picker__scroll";
      for (let i = 0; i < count; i++) {
        const num = document.createElement("div");
        num.className =
          "time-picker__num" +
          (i === selected ? " time-picker__num--selected" : "");
        num.textContent = String(i).padStart(2, "0");
        num.dataset.value = String(i);
        num.addEventListener("click", () => {
          scroll
            .querySelectorAll(".time-picker__num")
            .forEach((el) => el.classList.remove("time-picker__num--selected"));
          num.classList.add("time-picker__num--selected");
          num.scrollIntoView({ block: "center", behavior: "smooth" });
        });
        scroll.appendChild(num);
      }
      let scrollTimer: ReturnType<typeof setTimeout>;
      scroll.addEventListener("scroll", () => {
        clearTimeout(scrollTimer);
        scrollTimer = setTimeout(() => updateSelectedByScroll(scroll), 200);
      });
      col.appendChild(scroll);
      return { col, scroll };
    };

    const { col: hourCol, scroll: hourScroll } = createCol("Часы", 24, h);
    const { col: minCol, scroll: minScroll } = createCol("Минуты", 60, m);
    picker.appendChild(hourCol);
    picker.appendChild(minCol);

    setTimeout(() => {
      hourScroll
        .querySelector(".time-picker__num--selected")
        ?.scrollIntoView({ block: "center" });
      minScroll
        .querySelector(".time-picker__num--selected")
        ?.scrollIntoView({ block: "center" });
    }, 0);

    return picker;
  }

  private attachListeners() {
    const state = taskStore.getState();

    this.taskNode
      ?.querySelector("#btn-toggle-task-status")
      ?.addEventListener("click", () => {
        const state = taskStore.getState();
        if (state.taskId && state.taskData) {
          const currentDone =
            state.taskData.status === true ||
            state.taskData.done === true ||
            false;
          TaskActions.toggleTaskStatus(state.taskId, !currentDone);
        }
      });

    const fileInput = this.taskNode?.querySelector(
      "#task-file-input",
    ) as HTMLInputElement;
    if (fileInput) {
      fileInput.addEventListener("change", async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          const state = taskStore.getState();
          if (state.attachments.length >= 5) {
            Toast.error("Максимум 5 файлов на задачу");
            fileInput.value = "";
            return;
          }
          if (state.taskId) {
            await TaskActions.uploadAttachment(state.taskId, file);
          }
        }
        fileInput.value = "";
      });
    }

    this.taskNode
      ?.querySelectorAll(".task__attachment-delete-btn")
      .forEach((btn) => {
        btn.addEventListener("click", (e) => {
          const link = (e.currentTarget as HTMLElement).getAttribute(
            "data-link",
          );
          if (link) {
            showConfirmModal({
              title: "Удалить файл",
              text: "Вы уверены, что хотите удалить этот файл?",
              confirmLabel: "Удалить",
              onConfirm: () => TaskActions.deleteAttachment(link),
            });
          }
        });
      });

    this.taskNode
      ?.querySelectorAll(".task__attachment-link")
      .forEach((link) => {
        link.addEventListener("click", (e) => {
          const isImage = link.getAttribute("data-is-image") === "true";
          if (isImage) {
            e.preventDefault();
            const path = link.getAttribute("href") || "";
            const name = link.getAttribute("title") || "";
            openLightbox(path, name);
          }
        });
      });

    this.taskNode
      ?.querySelector("#btn-save-task")
      ?.addEventListener("click", () => {
        const title = (
          this.taskNode?.querySelector("#task-title-input") as HTMLInputElement
        ).value.trim();
        const description = (
          this.taskNode?.querySelector(
            "#task-desc-input",
          ) as HTMLTextAreaElement
        ).value.trim();
        const dateVal = (
          this.taskNode?.querySelector("#task-date-input") as HTMLInputElement
        ).value;
        const timeVal = (
          this.taskNode?.querySelector("#task-time-input") as HTMLInputElement
        ).value;

        let finalDeadline =
          state.taskData.dead_line ||
          state.taskData.data_dead_line ||
          state.taskData.deadline;
        if (dateVal) {
          const d = new Date(`${dateVal}T${timeVal || "00:00"}`);
          finalDeadline = d.toISOString();
        }

        const payload = {
          link_card: state.taskId,
          title: title || "Без названия",
          description: description,
          executor_link: this.currentExecuterId || null,
          deadline: finalDeadline,
          max_tasks: state.taskData?.max_tasks || 100,
        };

        if (state.taskId) {
          TaskActions.saveTask(state.taskId, payload);
        }
      });

    const dateInput = this.taskNode?.querySelector(
      "#task-date-input",
    ) as HTMLInputElement;
    const dateBtn = this.taskNode?.querySelector(
      "#task-date-btn",
    ) as HTMLButtonElement;
    dateBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      const existing = this.taskNode?.querySelector(".date-picker");
      if (existing) {
        existing.remove();
        return;
      }

      const timeInput = this.taskNode?.querySelector(
        "#task-time-input",
      ) as HTMLInputElement;

      const picker = this.buildDatePicker(dateInput.value, (dateStr) => {
        dateInput.value = dateStr;
        this.updateDateBtn(dateStr);

        if (!timeInput.value) {
          const now = new Date();
          const target = new Date(
            parseInt(dateStr.split("-")[0]),
            parseInt(dateStr.split("-")[1]) - 1,
            parseInt(dateStr.split("-")[2]),
            now.getHours() + 1,
            now.getMinutes(),
          );

          const finalDate = `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, "0")}-${String(target.getDate()).padStart(2, "0")}`;
          const finalTime = `${String(target.getHours()).padStart(2, "0")}:${String(target.getMinutes()).padStart(2, "0")}`;

          dateInput.value = finalDate;
          this.updateDateBtn(finalDate);
          timeInput.value = finalTime;
          this.updateTimeBtn(finalTime);
        }

        picker.remove();
        cleanup();
      });
      picker.addEventListener("click", (ev) => ev.stopPropagation());
      dateBtn.parentElement?.appendChild(picker);

      const cleanup = () => {
        document.removeEventListener("keydown", onKey);
        document.removeEventListener("click", onOutside);
      };
      const onKey = (ev: KeyboardEvent) => {
        if (ev.key === "Enter") {
          const dateStr = picker.dataset.selectedDate;
          if (dateStr) {
            dateInput.value = dateStr;
            this.updateDateBtn(dateStr);
          }
          picker.remove();
          cleanup();
        } else if (ev.key === "Escape") {
          picker.remove();
          cleanup();
        }
      };
      const onOutside = () => {
        picker.remove();
        cleanup();
      };
      setTimeout(() => {
        document.addEventListener("keydown", onKey);
        document.addEventListener("click", onOutside);
      }, 0);
    });

    const commitTimePicker = (picker: Element, timeInput: HTMLInputElement) => {
      const sel = picker.querySelectorAll(".time-picker__num--selected");
      const h = (sel[0] as HTMLElement)?.dataset.value ?? "0";
      const m = (sel[1] as HTMLElement)?.dataset.value ?? "0";
      const val = `${h.padStart(2, "0")}:${m.padStart(2, "0")}`;
      timeInput.value = val;
      this.updateTimeBtn(val);

      if (!dateInput.value) {
        const now = new Date();
        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
        dateInput.value = todayStr;
        this.updateDateBtn(todayStr);
      }

      picker.remove();
    };

    const timeBtn = this.taskNode?.querySelector(
      "#task-time-btn",
    ) as HTMLButtonElement;
    timeBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      const timeInput = this.taskNode?.querySelector(
        "#task-time-input",
      ) as HTMLInputElement;
      const existing = this.taskNode?.querySelector(".time-picker");
      if (existing) {
        commitTimePicker(existing, timeInput);
        return;
      }
      const picker = this.buildTimePicker(timeInput.value);
      picker.addEventListener("click", (ev) => ev.stopPropagation());
      timeBtn.parentElement?.appendChild(picker);

      const onKey = (e: KeyboardEvent) => {
        if (e.key === "Enter") {
          commitTimePicker(picker, timeInput);
          document.removeEventListener("keydown", onKey);
          document.removeEventListener("click", onOutside);
        }
      };
      const onOutside = () => {
        commitTimePicker(picker, timeInput);
        document.removeEventListener("click", onOutside);
        document.removeEventListener("keydown", onKey);
      };
      setTimeout(() => {
        document.addEventListener("click", onOutside);
        document.addEventListener("keydown", onKey);
      }, 0);
    });

    const saveBtn = this.taskNode?.querySelector(
      "#btn-save-task",
    ) as HTMLButtonElement;
    const titleInput = this.taskNode?.querySelector(
      "#task-title-input",
    ) as HTMLInputElement;
    if (saveBtn && titleInput) {
      saveBtn.disabled = !titleInput.value.trim();
      titleInput.addEventListener("input", () => {
        saveBtn.disabled = !titleInput.value.trim();
      });
    }

    this.taskNode?.querySelector("#btn-back")?.addEventListener("click", () => {
      this.destroy();
      navigateTo(`/board?id=${state.boardId}`);
    });

    this.taskNode
      ?.querySelector("#task-overlay")
      ?.addEventListener("click", (e) => {
        if (e.target === e.currentTarget) {
          this.destroy();
          navigateTo(`/board?id=${state.boardId}`);
        }
      });

    const execBtn = this.taskNode?.querySelector(
      "#task-executor-btn",
    ) as HTMLButtonElement;
    execBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      this.taskNode
        ?.querySelectorAll(".assignee__dropdown")
        .forEach((dd) => dd.remove());

      const dropdown = document.createElement("div");
      dropdown.className = "assignee__dropdown";

      const searchContainer = document.createElement("div");
      searchContainer.className = "assignee__search-container";
      const searchInput = document.createElement("input");
      searchInput.type = "text";
      searchInput.placeholder = "Поиск...";
      searchInput.className = "assignee__search-input";
      searchContainer.appendChild(searchInput);
      dropdown.appendChild(searchContainer);

      const listContainer = document.createElement("div");
      listContainer.className = "assignee__list-container";
      dropdown.appendChild(listContainer);

      const renderList = (filter = "") => {
        listContainer.innerHTML = "";

        if ("Не назначен".toLowerCase().includes(filter.toLowerCase())) {
          const clearItem = document.createElement("div");
          clearItem.className =
            "assignee__dropdown-item assignee__dropdown-item--clear";
          clearItem.innerHTML = `<div class="assignee__avatar assignee__avatar--clear">?</div><div class="assignee__info"><span class="assignee__name">Не назначен</span></div>`;
          clearItem.addEventListener("click", () => {
            execBtn.innerHTML = `Не назначен`;
            this.currentExecuterId = "";
            dropdown.remove();
          });
          listContainer.appendChild(clearItem);
        }

        state.usersList
          .filter((u) => u.name.toLowerCase().includes(filter.toLowerCase()))
          .forEach((user) => {
            const item = document.createElement("div");
            item.className = "assignee__dropdown-item";
            item.innerHTML = `
            ${user.avatarUrl ? `<img src="${user.avatarUrl}" class="assignee__avatar assignee__avatar--img">` : `<div class="assignee__avatar">${user.name.charAt(0).toUpperCase()}</div>`}
            <div class="assignee__info">
              <span class="assignee__name">${user.name}</span>
              <span class="assignee__email">${user.email}</span>
            </div>
          `;
            item.addEventListener("click", () => {
              execBtn.innerHTML = `
              ${user.avatarUrl ? `<img src="${user.avatarUrl}" class="assignee__avatar-small">` : `<div class="assignee__avatar-fallback-small">${user.name.charAt(0).toUpperCase()}</div>`}
              ${user.name}
            `;
              this.currentExecuterId = user.id;
              dropdown.remove();
            });
            listContainer.appendChild(item);
          });
      };

      renderList();
      searchInput.addEventListener("input", (e) =>
        renderList((e.target as HTMLInputElement).value),
      );

      if (!execBtn.parentElement) return;
      execBtn.parentElement.appendChild(dropdown);
      searchInput.focus();
    });

    const optionsBtn = this.taskNode?.querySelector("#btn-task-options");
    optionsBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      document.querySelector(".context-menu")?.remove();

      const menu = document.createElement("div");
      menu.className = "context-menu";
      menu.innerHTML = `<div class="context-menu__item context-menu__item--danger" id="ctx-delete-task">Удалить карточку</div>`;

      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      menu.style.top = `${rect.bottom + window.scrollY + 8}px`;
      menu.style.left = `${rect.left + window.scrollX - 150}px`;

      document.body.appendChild(menu);

      menu.querySelector("#ctx-delete-task")?.addEventListener("click", () => {
        const modalOverlay = this.taskNode?.querySelector(
          "#modal-overlay",
        ) as HTMLElement;
        const modalDelete = this.taskNode?.querySelector(
          "#modal-delete-task",
        ) as HTMLElement;
        const titleInput = this.taskNode?.querySelector(
          "#task-title-input",
        ) as HTMLInputElement;

        (
          this.taskNode?.querySelector("#delete-task-name") as HTMLElement
        ).textContent = titleInput.value;

        modalOverlay.classList.remove("hidden");
        modalDelete.classList.remove("hidden");

        (
          this.taskNode?.querySelector(
            "#btn-confirm-delete-task",
          ) as HTMLElement
        ).onclick = () => {
          if (state.taskId) {
            TaskActions.deleteTask(state.taskId);
          }
        };
        menu.remove();
      });
    });

    this.taskNode?.querySelectorAll(".modal__close-btn").forEach((btn) =>
      btn.addEventListener("click", () => {
        this.taskNode?.querySelector("#modal-overlay")?.classList.add("hidden");
        this.taskNode
          ?.querySelector("#modal-delete-task")
          ?.classList.add("hidden");
      }),
    );

    const commentInput = this.taskNode?.querySelector(
      ".task__comment-input",
    ) as HTMLInputElement;
    const commentBtn = this.taskNode?.querySelector(
      ".task__comment-send-btn",
    ) as HTMLButtonElement;

    const submitComment = () => {
      const text = commentInput?.value.trim();
      if (text && state.taskId) {
        this.scrollToNewComment = true;
        commentInput.value = "";
        TaskActions.addComment(state.taskId, text);
      }
    };

    commentBtn?.addEventListener("click", submitComment);
    commentInput?.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        submitComment();
      }
    });

    const subtaskInput = this.taskNode?.querySelector(
      "#new-subtask-input",
    ) as HTMLInputElement;
    const subtaskAddBtn = this.taskNode?.querySelector(
      "#subtask-add-btn",
    ) as HTMLButtonElement;

    const submitSubtask = () => {
      const desc = subtaskInput.value.trim();
      if (desc && state.taskId) {
        subtaskInput.value = "";
        TaskActions.createSubtask(state.taskId, desc);
      }
    };

    subtaskAddBtn?.addEventListener("click", submitSubtask);
    subtaskInput?.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        submitSubtask();
      }
    });

    this.taskNode?.querySelectorAll(".subtask-checkbox").forEach((cb) => {
      cb.addEventListener("change", (e) => {
        const target = e.target as HTMLInputElement;
        const id = target.getAttribute("data-id");
        const desc = target.getAttribute("data-desc");

        const textInput = target.parentElement?.querySelector(
          ".task__subtask-text-input",
        );
        if (target.checked) {
          textInput?.classList.add("task__subtask-text-input--done");
        } else {
          textInput?.classList.remove("task__subtask-text-input--done");
        }

        if (id && desc) {
          TaskActions.toggleSubtask(id, target.checked, desc);
        }
      });
    });

    this.taskNode
      ?.querySelectorAll(".task__subtask-text-input")
      .forEach((input) => {
        const updateSubtask = (e: Event) => {
          const target = e.target as HTMLInputElement;
          const id = target.getAttribute("data-id");
          const isDone = target.getAttribute("data-done") === "true";
          const desc = target.value.trim();
          if (id && desc) {
            TaskActions.toggleSubtask(id, isDone, desc);
          }
        };
        input.addEventListener("blur", updateSubtask);
        input.addEventListener("keydown", (e: Event) => {
          const keyEvent = e as KeyboardEvent;
          if (keyEvent.key === "Enter") {
            keyEvent.preventDefault();
            (keyEvent.target as HTMLElement).blur();
          }
        });
      });

    this.taskNode
      ?.querySelectorAll(".task__comment-menu-btn")
      .forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          const dropdown = (e.currentTarget as HTMLElement)
            .closest(".task__comment-menu-wrap")
            ?.querySelector(".task__comment-dropdown");
          this.taskNode
            ?.querySelectorAll(".task__comment-dropdown")
            .forEach((d) => {
              if (d !== dropdown) d.classList.add("hidden");
            });
          dropdown?.classList.toggle("hidden");
        });
      });

    this.taskNode
      ?.querySelectorAll(".task__comment-delete-btn")
      .forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          const commentEl = (e.currentTarget as HTMLElement).closest(
            ".task__comment",
          );
          const commentId = commentEl?.getAttribute("data-id");
          const taskId = state.taskId;
          if (!commentId || !taskId) return;
          (e.currentTarget as HTMLElement)
            .closest(".task__comment-dropdown")
            ?.classList.add("hidden");
          showConfirmModal({
            title: "Удалить комментарий",
            text: "Вы уверены, что хотите удалить комментарий?",
            confirmLabel: "Удалить",
            onConfirm: () => TaskActions.deleteComment(commentId, taskId),
          });
        });
      });

    this.taskNode
      ?.querySelectorAll(".task__comment-edit-btn")
      .forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          const commentEl = (e.currentTarget as HTMLElement).closest(
            ".task__comment",
          ) as HTMLElement;
          const commentId = commentEl?.getAttribute("data-id");
          const taskId = state.taskId;
          const bubble = commentEl?.querySelector(
            ".task__comment-bubble",
          ) as HTMLElement;
          const commentTextEl = commentEl?.querySelector(
            ".task__comment-text",
          ) as HTMLElement;
          if (!commentId || !taskId || !bubble || !commentTextEl) return;
          (e.currentTarget as HTMLElement)
            .closest(".task__comment-dropdown")
            ?.classList.add("hidden");

          const originalText = commentTextEl.textContent ?? "";

          const textarea = document.createElement("textarea");
          textarea.className = "task__comment-edit-input";
          textarea.value = originalText;

          const actionsDiv = document.createElement("div");
          actionsDiv.className = "task__comment-edit-actions";

          const btnSave = document.createElement("button");
          btnSave.className = "btn btn--primary task__comment-edit-save";
          btnSave.textContent = "Сохранить";

          const btnCancel = document.createElement("button");
          btnCancel.className = "btn btn--cancel task__comment-edit-cancel";
          btnCancel.textContent = "Отмена";

          actionsDiv.appendChild(btnSave);
          actionsDiv.appendChild(btnCancel);
          commentTextEl.replaceWith(textarea);
          textarea.after(actionsDiv);
          textarea.focus();
          textarea.selectionStart = textarea.value.length;

          const cancelEdit = () => {
            textarea.replaceWith(commentTextEl);
            actionsDiv.remove();
          };

          const saveEdit = () => {
            const newText = textarea.value.trim();
            if (!newText || newText === originalText) {
              cancelEdit();
              return;
            }
            TaskActions.updateComment(commentId, newText, taskId);
          };

          btnSave.addEventListener("click", saveEdit);
          btnCancel.addEventListener("click", cancelEdit);
          textarea.addEventListener("keydown", (ev) => {
            if (ev.key === "Escape") {
              cancelEdit();
            } else if (ev.key === "Enter" && !ev.shiftKey) {
              ev.preventDefault();
              saveEdit();
            }
          });
        });
      });

    this.taskNode
      ?.querySelectorAll(".task__subtask-delete-btn")
      .forEach((btn) => {
        btn.addEventListener("click", (e) => {
          const id = (e.currentTarget as HTMLElement).getAttribute("data-id");
          if (id) {
            showConfirmModal({
              title: "Удалить подзадачу",
              text: "Вы уверены, что хотите удалить подзадачу?",
              confirmLabel: "Удалить",
              onConfirm: () => TaskActions.deleteSubtask(id),
            });
          }
        });
      });
  }
}
```

src/modules/boards/BoardsView.ts:
```typescript
import Handlebars from "handlebars";
import boardsTpl from "../../templates/boards.hbs?raw";
import { BoardsState } from "./boards.types";
import { navigateTo } from "../../router";
import { BoardsActions } from "./BoardsActions";
import { showConfirmModal } from "../../utils/confirmModal";

const template = Handlebars.compile(boardsTpl);

export class BoardsView {
  private appDiv: HTMLElement;
  private abortController: AbortController | null = null;
  private currentBoardId: string | null = null;
  private currentBoardName: string | null = null;

  constructor(appDiv: HTMLElement) {
    this.appDiv = appDiv;
  }

  setAppDiv(appDiv: HTMLElement): void {
    this.appDiv = appDiv;
  }

  render(state: BoardsState): void {
    if (state.isLoading) {
      return;
    }

    if (this.abortController) {
      this.abortController.abort();
    }
    this.abortController = new AbortController();

    this.appDiv.innerHTML = template({
      boards: state.boards,
      user: state.user,
    });
    this.attachEventListeners(this.abortController.signal);
  }

  private attachEventListeners(signal: AbortSignal): void {
    const modalOverlay = this.appDiv.querySelector<HTMLElement>("#modal-overlay");
    const modalCreate = this.appDiv.querySelector<HTMLElement>("#modal-create-board");
    const modalEdit = this.appDiv.querySelector<HTMLElement>("#modal-edit-board");
    const modalDelete = this.appDiv.querySelector<HTMLElement>("#modal-delete-board");

    const closeModals = (): void => {
      [modalOverlay, modalCreate, modalEdit, modalDelete].forEach((m) =>
        m?.classList.add("hidden")
      );
    };

    document.getElementById("nav-profile")?.addEventListener("click", () => navigateTo("/profile"), { signal });
    document.getElementById("logout-btn")?.addEventListener("click", () => {
      showConfirmModal({
        title: "Выход",
        text: "Вы уверены, что хотите выйти из аккаунта?",
        confirmLabel: "Выйти",
        onConfirm: () => BoardsActions.logout(),
      });
    }, { signal });

    this.appDiv.querySelectorAll(".modal__close-btn").forEach((btn) =>
      btn.addEventListener("click", (e: Event) => {
        e.preventDefault();
        closeModals();
      }, { signal })
    );

    if (modalOverlay) {
      modalOverlay.addEventListener("click", (e: MouseEvent) => {
        if (e.target === modalOverlay) closeModals();
      }, { signal });
    }

    const btnConfirmCreate = this.appDiv.querySelector<HTMLButtonElement>("#btn-confirm-create");
    const inputNewBoard = this.appDiv.querySelector<HTMLInputElement>("#new-board-name");
    const errorNewBoard = this.appDiv.querySelector<HTMLElement>("#new-board-name-error");
    const createImgInput = this.appDiv.querySelector<HTMLInputElement>("#create-board-image");
    const createImgName = this.appDiv.querySelector<HTMLElement>("#create-board-image-name");

    const openCreateModal = (): void => {
      modalOverlay?.classList.remove("hidden");
      modalCreate?.classList.remove("hidden");
      if (inputNewBoard) inputNewBoard.value = "";
      if (createImgInput) createImgInput.value = "";
      if (createImgName) createImgName.textContent = "Изображение доски";
      if (btnConfirmCreate) btnConfirmCreate.disabled = true;
    };

    this.appDiv.querySelector("#btn-create-board")?.addEventListener("click", openCreateModal, { signal });
    this.appDiv.querySelector("#btn-create-board-empty")?.addEventListener("click", openCreateModal, { signal });

    createImgInput?.addEventListener("change", (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file && createImgName) createImgName.textContent = file.name;
    }, { signal });

    inputNewBoard?.addEventListener("input", () => {
      const val = inputNewBoard.value.trim();
      if (val) {
        errorNewBoard?.classList.remove("modal__input-error--visible");
        inputNewBoard.classList.remove("modal__input-field--error");
        if (btnConfirmCreate) btnConfirmCreate.disabled = false;
      } else {
        errorNewBoard?.classList.add("modal__input-error--visible");
        inputNewBoard.classList.add("modal__input-field--error");
        if (btnConfirmCreate) btnConfirmCreate.disabled = true;
      }
    }, { signal });

    btnConfirmCreate?.addEventListener("click", async () => {
      const name = inputNewBoard?.value.trim();
      if (!name) return;

      btnConfirmCreate.disabled = true;
      const file = createImgInput?.files?.[0];

      await BoardsActions.createBoard(name, "Создаём аналог Trello", file);
      closeModals();
    }, { signal });

    const editBoardNameInput = this.appDiv.querySelector<HTMLInputElement>("#edit-board-name");
    const btnConfirmEdit = this.appDiv.querySelector<HTMLButtonElement>("#btn-confirm-edit");
    const editImgInput = this.appDiv.querySelector<HTMLInputElement>("#edit-board-image");
    const editImgName = this.appDiv.querySelector<HTMLElement>("#edit-board-image-name");

    const checkEditChanges = (): void => {
      if (!btnConfirmEdit) return;
      const nameChanged = editBoardNameInput?.value.trim() !== this.currentBoardName;
      const imageSelected = !!editImgInput?.files?.length;
      const nameEmpty = !editBoardNameInput?.value.trim();
      btnConfirmEdit.disabled = nameEmpty || (!nameChanged && !imageSelected);
    };

    editImgInput?.addEventListener("change", (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file && editImgName) editImgName.textContent = file.name;
      checkEditChanges();
    }, { signal });

    editBoardNameInput?.addEventListener("input", checkEditChanges, { signal });

    this.appDiv.querySelectorAll(".board-card__options-btn").forEach((btn) => {
      btn.addEventListener("click", (e: Event) => {
        e.stopPropagation();
        const target = e.currentTarget as HTMLElement;
        this.currentBoardId = target.getAttribute("data-id");
        this.currentBoardName = target.getAttribute("data-name");

        if (editBoardNameInput) editBoardNameInput.value = this.currentBoardName || "";
        if (editImgInput) editImgInput.value = "";
        if (editImgName) editImgName.textContent = "Изображение доски";
        if (btnConfirmEdit) btnConfirmEdit.disabled = true;

        modalOverlay?.classList.remove("hidden");
        modalEdit?.classList.remove("hidden");
      }, { signal });
    });

    btnConfirmEdit?.addEventListener("click", async () => {
      const name = editBoardNameInput?.value.trim();
      if (!this.currentBoardId || !name) return;

      btnConfirmEdit.disabled = true;
      const file = editImgInput?.files?.[0];

      await BoardsActions.updateBoard(this.currentBoardId, name, "Создаём аналог Trello", file);
      closeModals();
    }, { signal });

    const btnOpenDelete = this.appDiv.querySelector<HTMLButtonElement>("#btn-open-delete");
    const btnConfirmDelete = this.appDiv.querySelector<HTMLButtonElement>("#btn-confirm-delete");

    btnOpenDelete?.addEventListener("click", () => {
      modalEdit?.classList.add("hidden");
      modalDelete?.classList.remove("hidden");
      const deleteBoardName = this.appDiv.querySelector("#delete-board-name");
      if (deleteBoardName && this.currentBoardName) {
        deleteBoardName.textContent = this.currentBoardName;
      }
    }, { signal });

    btnConfirmDelete?.addEventListener("click", async () => {
      if (!this.currentBoardId) return;
      btnConfirmDelete.disabled = true;

      await BoardsActions.deleteBoard(this.currentBoardId);
      closeModals();
    }, { signal });

    this.appDiv.querySelectorAll(".board-card[data-id]").forEach((card) => {
      card.addEventListener("click", (e: Event) => {
        const target = e.target as HTMLElement;
        if (target.closest(".board-card__options-btn")) return;
        
        const id = card.getAttribute("data-id");
        if (id) navigateTo(`/board?id=${id}`);
      }, { signal });
    });
  }
}
```

src/modules/boards/index.ts:
```typescript
import { boardsStore } from "./BoardsStore";
import { BoardsActions } from "./BoardsActions";
import { BoardsView } from "./BoardsView";

let view: BoardsView | null = null;

const handleStoreChange = (): void => {
  view?.render(boardsStore.getState());
};

export const renderBoardsModule = async (appDiv: HTMLElement): Promise<void> => {
  if (!view) {
    view = new BoardsView(appDiv);
  } else {
    view.setAppDiv(appDiv);
  }

  boardsStore.off("change", handleStoreChange);
  boardsStore.on("change", handleStoreChange);

  await BoardsActions.fetchBoards();
};
```

src/modules/boards/boards.types.ts:
```typescript
export interface Board {
  id: string;
  board_name: string;
  description: string;
  background: string;
  backlog: number;
  hot: number;
  members: number;
}

export interface User {
  id: string;
  username: string;
  email: string;
  avatar: string;
}

export interface BoardsState {
  boards: Board[];
  user: User | null;
  isLoading: boolean;
  error: string | null;
}

export interface RawBoard {
  id: string;
  link: string;
  name: string;
  board_name: string;
  title: string;
  description: string;
  background: string;
  backlog: number;
  hot: number;
  members: number;
}

export interface BoardsResponse {
  data?: RawBoard | RawBoard[];
}

export interface CreateBoardResponse {
  data?: {
    link: string;
  };
}

export interface ApiError extends Error {
  status: number;
}

export interface FetchBoardsSuccessPayload {
  boards: Board[];
}

export interface FetchBoardsErrorPayload {
  error: string;
}
```

src/modules/boards/BoardsActions.ts:
```typescript
import { appDispatcher } from "../../core/Dispatcher";
import { boardsApi, authApi, kanbanApi } from "../../api";
import { navigateTo, setIsAuth } from "../../router";
import { ApiError } from "./boards.types";
import { Toast } from "../../utils/toast";

interface BoardRaw {
  link: string;
  name?: string;
  description?: string;
  background?: string;
}

interface SectionRaw {
  link: string;
  name?: string;
}

interface TaskRaw {
  deadline?: string | Date;
}

const bgUploadErrorMessage = (status: number): string => {
  if (status === 413) return "Изображение слишком большое";
  if (status === 415) return "Неверный формат изображения";
  return "Неверный формат изображения";
};

const handleLogoutAndRedirect = (): void => {
  setIsAuth(false);
  localStorage.removeItem("isAuth");
  navigateTo("/login");
};

const uploadBoardBackground = async (
  boardId: string,
  file: File,
): Promise<void> => {
  const fd = new FormData();
  fd.append("background", file);
  try {
    await boardsApi.updateBoardBackground(boardId, fd);
  } catch (bgErr: unknown) {
    Toast.error(bgUploadErrorMessage((bgErr as ApiError).status));
  }
};

const isDoneSection = (name?: string): boolean => {
  if (!name) return false;
  const lowerName = name.toLowerCase();
  return lowerName.includes("готово") || lowerName.includes("done");
};

const getHotTasksCount = (tasks: TaskRaw[]): number => {
  const now = Date.now();
  const oneDayMs = 24 * 60 * 60 * 1000;
  let count = 0;

  tasks.forEach((t) => {
    const dl = t.deadline;
    if (dl) {
      const dlTime = new Date(dl).getTime();
      if (!isNaN(dlTime) && dlTime < now + oneDayMs) {
        count++;
      }
    }
  });

  return count;
};

const fetchBoardMembersCount = async (boardLink: string): Promise<number> => {
  try {
    const res = await boardsApi.getBoardUsers(boardLink);
    return res.data.members?.length || 0;
  } catch (err) {
    console.error(`Failed to fetch members for board ${boardLink}`, err);
    return 0;
  }
};

const fetchSectionStats = async (
  sec: SectionRaw,
  isFirst: boolean,
): Promise<{ backlogCount: number; hotCount: number }> => {
  try {
    const tasksRes = await kanbanApi.getTasks(sec.link);
    const tasks: TaskRaw[] = tasksRes.data.cards || [];

    const backlogCount = isFirst ? tasks.length : 0;
    const hotCount = !isDoneSection(sec.name) ? getHotTasksCount(tasks) : 0;

    return { backlogCount, hotCount };
  } catch (err) {
    console.error(`Failed to fetch tasks for section ${sec.link}`, err);
    return { backlogCount: 0, hotCount: 0 };
  }
};

const fetchBoardTasksStats = async (
  boardLink: string,
): Promise<{ backlogCount: number; hotCount: number }> => {
  try {
    const sectionsRes = await kanbanApi.getSections(boardLink);
    const sections: SectionRaw[] = sectionsRes.data || [];

    if (sections.length === 0) {
      return { backlogCount: 0, hotCount: 0 };
    }

    const statsPromises = sections.map((sec, idx) =>
      fetchSectionStats(sec, idx === 0),
    );

    const statsResults = await Promise.all(statsPromises);

    return statsResults.reduce(
      (acc, curr) => {
        acc.backlogCount += curr.backlogCount;
        acc.hotCount += curr.hotCount;
        return acc;
      },
      { backlogCount: 0, hotCount: 0 },
    );
  } catch (err) {
    console.error(`Failed to fetch sections for board ${boardLink}`, err);
    return { backlogCount: 0, hotCount: 0 };
  }
};

export const BoardsActions = {
  async fetchBoards(): Promise<void> {
    appDispatcher.dispatch({ type: "FETCH_BOARDS_START" });

    try {
      const res = await boardsApi.getBoards();
      const rawBoards: BoardRaw[] = res.data;

      const boardsWithStatsPromises = rawBoards.map(async (board) => {
        const [membersCount, taskStats] = await Promise.all([
          fetchBoardMembersCount(board.link),
          fetchBoardTasksStats(board.link),
        ]);

        return {
          id: board.link,
          board_name: board.name || "Без названия",
          description: board.description || "Без описания",
          background: board.background || "",
          backlog: taskStats.backlogCount,
          hot: taskStats.hotCount,
          members: membersCount,
        };
      });

      const boards = await Promise.all(boardsWithStatsPromises);

      appDispatcher.dispatch({
        type: "FETCH_BOARDS_SUCCESS",
        payload: { boards },
      });
    } catch (err: unknown) {
      const error = err as ApiError;
      appDispatcher.dispatch({
        type: "FETCH_BOARDS_ERROR",
        payload: { error: error.message || "Ошибка загрузки досок" },
      });

      if (error.status === 401) {
        handleLogoutAndRedirect();
      }
    }
  },

  async createBoard(
    name: string,
    description: string,
    file?: File,
  ): Promise<void> {
    try {
      const res = await boardsApi.createBoard({ name, description });
      const newBoardId = res.data.link;

      if (file && newBoardId) {
        await uploadBoardBackground(newBoardId, file);
      }
      await this.fetchBoards();
    } catch (err: unknown) {
      console.error("Create board error", err);
    }
  },

  async updateBoard(
    id: string,
    name: string,
    description: string,
    file?: File,
  ): Promise<void> {
    try {
      await boardsApi.updateBoard(id, { name, description, board_link: id });

      if (file) {
        await uploadBoardBackground(id, file);
      }
      await this.fetchBoards();
    } catch (err: unknown) {
      console.error("Update board error", err);
    }
  },

  async deleteBoard(id: string): Promise<void> {
    try {
      await boardsApi.deleteBoard(id);
      await this.fetchBoards();
    } catch (err: unknown) {
      console.error("Delete board error", err);
    }
  },

  async logout(): Promise<void> {
    try {
      await authApi.logout();
    } catch (err: unknown) {
      console.error("Logout error", err);
    }

    handleLogoutAndRedirect();
  },
};
```

src/modules/boards/BoardsStore.ts:
```typescript
import { Store } from "../../core/Store";
import { appDispatcher, Action } from "../../core/Dispatcher";
import { 
  BoardsState, 
  FetchBoardsSuccessPayload, 
  FetchBoardsErrorPayload 
} from "./boards.types";

class BoardsStore extends Store {
  private state: BoardsState = {
    boards: [],
    user: null,
    isLoading: false,
    error: null,
  };

  public getState(): BoardsState {
    return this.state;
  }

  private handleAction(action: Action): void {
    switch (action.type) {
      case "FETCH_BOARDS_START":
        this.state.isLoading = true;
        this.state.error = null;
        this.emit("change");
        break;

      case "FETCH_BOARDS_SUCCESS": {
        const payload = action.payload as FetchBoardsSuccessPayload;
        this.state.boards = payload.boards;
        this.state.isLoading = false;
        this.emit("change");
        break;
      }

      case "FETCH_BOARDS_ERROR": {
        const payload = action.payload as FetchBoardsErrorPayload;
        this.state.error = payload.error;
        this.state.isLoading = false;
        this.emit("change");
        break;
      }
    }
  }

  constructor() {
    super();
    appDispatcher.register(this.handleAction.bind(this));
  }
}

export const boardsStore = new BoardsStore();
```

src/modules/kanban/KanbanActions.ts:
```typescript
import { appDispatcher } from "../../core/Dispatcher";
import { boardsApi, kanbanApi, profileApi, SectionInfo } from "../../api";
import { navigateTo } from "../../router";
import { Toast } from "../../utils/toast";
import { kanbanStore } from "./KanbanStore";
import { currentUser } from "../../main";
import {
  BoardUser,
  Section,
  Task,
  KANBAN_COLORS,
  ApiError,
} from "./kanban.types";

export const profileCache = new Map<string, BoardUser>();

let cachedMyEmail: string | null = null;

export const KanbanActions = {
  async fetchKanban(boardId: string, forceFetch = false): Promise<void> {
    const currentState = kanbanStore.getState();

    if (
      currentState.boardId === boardId &&
      !forceFetch &&
      currentState.sections.length > 0
    ) {
      kanbanStore.emit("change");
      return;
    }

    appDispatcher.dispatch({ type: "FETCH_KANBAN_START" });

    try {
      const boardRes = await boardsApi.getBoard(boardId);
      const boardName = boardRes.data.name;

      const usersRes = await boardsApi.getBoardUsers(boardId);

      let myEmail =
        cachedMyEmail || (currentUser?.email || "").toLowerCase().trim();
      if (!myEmail) {
        try {
          const profileRes = await profileApi.getProfile();
          myEmail = (profileRes.data.email || "").toLowerCase().trim();
          cachedMyEmail = myEmail;
        } catch (err) {
          console.error("Failed to load profile for role check", err);
        }
      }

      const myMember = usersRes.data.members.find(
        (m) => m.email.toLowerCase().trim() === myEmail,
      );
      const myRole = myMember?.role || "viewer";

      const users: BoardUser[] = usersRes.data.members.map((m) => {
        const userObj: BoardUser = {
          id: m.link,
          name: m.display_name || "Пользователь",
          email: m.email || "",
          avatarUrl: m.avatar_url,
        };
        profileCache.set(m.link, userObj);
        return userObj;
      });

      const sectionsRes = await kanbanApi.getSections(boardId);
      const fetchedSections = sectionsRes.data;

      const colors = Object.keys(KANBAN_COLORS);
      const sectionPromises = fetchedSections.map(async (sec, i) => {
        const secId = sec.link;
        const secColor = sec.color || colors[i % colors.length];

        const section: Section = {
          id: secId,
          section_name: sec.name || "Без названия",
          color: secColor,
          colorHex: KANBAN_COLORS[secColor] || secColor,
          max_tasks: sec.max_tasks,
          is_mandatory: sec.is_mandatory,
          position: sec.position,
          tasks: [],
        };

        try {
          const tasksRes = await kanbanApi.getTasks(secId);
          const tasksList = tasksRes.data.cards;

          section.tasks = tasksList
            .map((t) => {
              const exId = t.executor_link;
              const exUser = users.find((u) => u.id === exId);
              const dl = t.deadline;

              const isDone =
                (t as any).status === true || (t as any).done === true || false;

              let formattedDate = null;
              let formattedTime = null;

              if (dl) {
                const dlDate = new Date(dl);
                const months = [
                  "января",
                  "февраля",
                  "марта",
                  "апреля",
                  "мая",
                  "июня",
                  "июля",
                  "августа",
                  "сентября",
                  "октября",
                  "ноября",
                  "декабря",
                ];
                formattedDate = `${dlDate.getDate()} ${months[dlDate.getMonth()]}, ${dlDate.getFullYear()}`;
                formattedTime = `${String(dlDate.getHours()).padStart(2, "0")}:${String(dlDate.getMinutes()).padStart(2, "0")}`;
              }

              let subtasks = Array.isArray(t.subtasks) ? t.subtasks : [];
              const subtasksCount = subtasks.length;
              const subtasksDone = subtasks.filter(
                (st: any) => st.is_done,
              ).length;
              const progressPercent =
                subtasksCount > 0
                  ? Math.round((subtasksDone / subtasksCount) * 100)
                  : 0;
              const subtasksProgressText =
                subtasksCount > 0
                  ? `Подзадачи ${subtasksDone}/${subtasksCount}`
                  : "";
              const progressPercentStyle =
                subtasksCount > 0 ? `width: ${progressPercent}%` : "width: 0%";
              const hasSubtasks = subtasksCount > 0;

              subtasks = subtasks
                .map((st: any) => {
                  const validId =
                    st.subtask_link ||
                    st.link_subtask ||
                    st.id ||
                    st.link ||
                    "";
                  const validDesc =
                    st.description ||
                    st.name ||
                    st.title ||
                    st.resolved_desc ||
                    "";
                  return {
                    ...st,
                    id: validId,
                    description: validDesc,
                  };
                })
                .sort((a: any, b: any) => {
                  if (a.position !== b.position)
                    return (a.position || 0) - (b.position || 0);
                  return String(a.id).localeCompare(String(b.id));
                });

              return {
                id: t.link,
                title: t.title || "Без названия",
                due_date: formattedDate,
                time: formattedTime,
                executor: exUser ? exUser.name : "",
                executor_id: exId,
                subtasks,
                subtasksCount,
                subtasksDone,
                progressPercent,
                subtasksProgressText,
                progressPercentStyle,
                hasSubtasks,
                position: t.position,
                is_done: isDone,
                start: (t as any).Start || null,
                deadline: dl || null,
              };
            })
            .sort((a, b) => a.position - b.position);
        } catch {
          section.tasks = [];
        }
        return section;
      });

      const sections = await Promise.all(sectionPromises);

      appDispatcher.dispatch({
        type: "FETCH_KANBAN_SUCCESS",
        payload: { boardId, boardName, users, sections, myRole },
      });
    } catch (err: unknown) {
      appDispatcher.dispatch({
        type: "FETCH_KANBAN_ERROR",
        payload: { error: "Ошибка загрузки канбан-доски" },
      });
      navigateTo("/boards");
    }
  },

  async createSection(
    boardId: string,
    name: string,
    maxTasks: number,
    isMandatory: boolean,
    color: string,
  ): Promise<void> {
    try {
      const res = await kanbanApi.createSection({
        board_link: boardId,
        name: name,
        max_tasks: maxTasks,
        is_mandatory: isMandatory,
        color,
      });
      const secData = res.data;
      const newSection: Section = {
        id: secData.link,
        section_name: secData.name,
        color: secData.color || color,
        colorHex:
          KANBAN_COLORS[secData.color || color] || secData.color || color,
        max_tasks: secData.max_tasks,
        is_mandatory: secData.is_mandatory,
        position: secData.position,
        tasks: [],
      };
      appDispatcher.dispatch({
        type: "KANBAN_ADD_SECTION_SUCCESS",
        payload: { section: newSection },
      });
    } catch {
      Toast.error("Ошибка при создании колонки");
    }
  },

  async updateSection(
    sectionId: string,
    data: Partial<SectionInfo>,
  ): Promise<void> {
    try {
      await kanbanApi.updateSection(sectionId, data);
      appDispatcher.dispatch({
        type: "KANBAN_UPDATE_SECTION_SUCCESS",
        payload: { sectionId, data },
      });
    } catch {
      Toast.error("Ошибка при обновлении колонки");
      throw new Error("Update section failed");
    }
  },

  async deleteSection(_boardId: string, sectionId: string): Promise<void> {
    try {
      await kanbanApi.deleteSection(sectionId);
      appDispatcher.dispatch({
        type: "KANBAN_DELETE_SECTION_SUCCESS",
        payload: { sectionId },
      });
    } catch {
      Toast.error("Ошибка при удалении колонки");
    }
  },

  async reorderSections(boardId: string, newOrder: string[]): Promise<void> {
    const snapshot = JSON.parse(
      JSON.stringify(kanbanStore.getState().sections),
    );
    appDispatcher.dispatch({
      type: "KANBAN_REORDER_SECTIONS",
      payload: { newOrder },
    });
    try {
      await kanbanApi.reorderSections(boardId, { list_links: newOrder });
    } catch {
      appDispatcher.dispatch({
        type: "KANBAN_REVERT_SECTIONS",
        payload: { sections: snapshot },
      });
      Toast.error("Ошибка при сохранении порядка");
    }
  },

  async createTask(
    _boardId: string,
    sectionId: string,
    title: string,
    executerId?: string,
  ): Promise<void> {
    try {
      const res = await kanbanApi.createTask({
        title,
        section_link: sectionId,
        description: "",
        executor_link: executerId,
      });
      const taskResponse = res.data;

      let executorName: string | null = null;
      if (executerId) {
        const found = profileCache.get(executerId);
        executorName = found ? found.name : "Пользователь";
      }

      const newTask: Task = {
        id: taskResponse.card_link,
        title: title,
        executor: executorName,
        executor_id: executerId || null,
        due_date: null,
        time: null,
        position: taskResponse.position,
        subtasks: [],
        subtasksCount: 0,
        subtasksDone: 0,
        subtasksProgressText: "",
        progressPercentStyle: "width: 0%",
        hasSubtasks: false,
      };

      appDispatcher.dispatch({
        type: "KANBAN_ADD_TASK_SUCCESS",
        payload: { sectionId, task: newTask },
      });
    } catch (err) {
      const error = err as ApiError;
      if (error?.data?.message === "task limit reached") {
        Toast.error("Достигнуто максимальное количество задач");
      } else {
        Toast.error("Ошибка создания карточки");
      }
    }
  },

  async deleteTask(_boardId: string, taskId: string): Promise<void> {
    try {
      await kanbanApi.deleteTask(taskId);
      appDispatcher.dispatch({
        type: "KANBAN_DELETE_TASK_SUCCESS",
        payload: { taskId },
      });
    } catch {
      Toast.error("Ошибка при удалении");
    }
  },

  async moveTask(
    _boardId: string,
    taskId: string,
    sourceSectionId: string,
    targetSectionId: string,
    position: number,
  ): Promise<void> {
    const snapshot = JSON.parse(
      JSON.stringify(kanbanStore.getState().sections),
    );
    appDispatcher.dispatch({
      type: "KANBAN_MOVE_TASK",
      payload: { taskId, sourceSectionId, targetSectionId, position },
    });
    try {
      await kanbanApi.reorderTask(taskId, {
        section_link: targetSectionId,
        position: position + 1,
      });
    } catch (err: unknown) {
      appDispatcher.dispatch({
        type: "KANBAN_REVERT_SECTIONS",
        payload: { sections: snapshot },
      });
      const error = err as ApiError;
      const msg = error?.data?.message;
      if (msg === "task limit reached") {
        Toast.error("Превышен лимит задач");
      } else if (
        msg === "can not skip mandatory section" ||
        msg === "miss mandatory section" ||
        msg === "invalid input"
      ) {
        Toast.error("Пропущена обязательная секция");
      } else {
        Toast.error("Ошибка при переносе");
      }
    }
  },
};
```

src/modules/kanban/index.ts:
```typescript
import { kanbanStore } from "./KanbanStore";
import { KanbanActions } from "./KanbanActions";
import { KanbanView } from "./KanbanView";
import { navigateTo } from "../../router";

let view: KanbanView | null = null;

const handleStoreChange = (): void => {
  view?.render(kanbanStore.getState());
};

export const clearKanbanCache = (): void => {
  kanbanStore.clearCache();
};

export const renderKanbanModule = async (appDiv: HTMLElement, forceFetch = false): Promise<void> => {
  const urlParams = new URLSearchParams(window.location.search);
  const boardId = urlParams.get("id") || urlParams.get("boardId");

  if (!boardId || boardId === "null") {
    navigateTo("/boards");
    return;
  }

  if (!view) {
    view = new KanbanView(appDiv);
  } else {
    view.setAppDiv(appDiv);
  }

  kanbanStore.off("change", handleStoreChange);
  kanbanStore.on("change", handleStoreChange);

  await KanbanActions.fetchKanban(boardId, forceFetch);
};
```

src/modules/kanban/KanbanStore.ts:
```typescript
import { Store } from "../../core/Store";
import { appDispatcher, Action } from "../../core/Dispatcher";
import {
  KanbanState,
  FetchKanbanSuccessPayload,
  FetchKanbanErrorPayload,
  Section,
  Task,
  KANBAN_COLORS,
} from "./kanban.types";
import { SectionInfo } from "../../api";

class KanbanStore extends Store {
  private state: KanbanState = {
    boardId: null,
    boardName: "Без названия",
    users: [],
    sections: [],
    isLoading: true,
    error: null,
    myRole: "viewer",
  };

  public getState(): KanbanState {
    return this.state;
  }

  public clearCache(): void {
    this.state.boardId = null;
    this.state.sections = [];
    this.state.users = [];
    this.state.myRole = "viewer";
  }

  public updateSubtaskSilently(
    taskId: string,
    subtaskId: string,
    isDone: boolean,
    description: string,
  ): void {
    for (const section of this.state.sections) {
      const task = section.tasks.find((t) => t.id === taskId);
      if (!task || !task.subtasks) continue;

      const subtask = task.subtasks.find((st) => {
        const id =
          (st as any).id || (st as any).subtask_link || (st as any).link || "";
        return String(id) === String(subtaskId);
      });

      if (!subtask) continue;

      (subtask as any).is_done = isDone;
      (subtask as any).description = description;

      const done = task.subtasks.filter((st: any) => st.is_done).length;
      task.subtasksDone = done;
      const count = task.subtasksCount || 0;
      const pct = count > 0 ? Math.round((done / count) * 100) : 0;
      task.progressPercent = pct;
      task.subtasksProgressText = count > 0 ? `Подзадачи ${done}/${count}` : "";
      task.progressPercentStyle = count > 0 ? `width: ${pct}%` : "width: 0%";
      task.hasSubtasks = count > 0;
      return;
    }
  }

  private handleAction(action: Action): void {
    switch (action.type) {
      case "FETCH_KANBAN_START":
        this.state.isLoading = true;
        this.state.error = null;
        this.emit("change");
        break;

      case "FETCH_KANBAN_SUCCESS": {
        const payload = action.payload as FetchKanbanSuccessPayload;
        this.state.boardId = payload.boardId;
        this.state.boardName = payload.boardName;
        this.state.users = payload.users;
        this.state.sections = payload.sections;
        this.state.myRole = payload.myRole || "viewer";
        this.state.isLoading = false;
        this.emit("change");
        break;
      }

      case "FETCH_KANBAN_ERROR": {
        const payload = action.payload as FetchKanbanErrorPayload;
        this.state.error = payload.error;
        this.state.isLoading = false;
        this.emit("change");
        break;
      }

      case "KANBAN_MOVE_TASK": {
        const { taskId, sourceSectionId, targetSectionId, position } =
          action.payload as {
            taskId: string;
            sourceSectionId: string;
            targetSectionId: string;
            position: number;
          };
        const sections = this.state.sections;
        const srcSection = sections.find((s) => s.id === sourceSectionId);
        const tgtSection = sections.find((s) => s.id === targetSectionId);
        if (!srcSection || !tgtSection) break;

        const taskIdx = srcSection.tasks.findIndex((t) => t.id === taskId);
        if (taskIdx === -1) break;
        const [task] = srcSection.tasks.splice(taskIdx, 1);
        tgtSection.tasks.splice(position, 0, task);
        tgtSection.tasks.forEach((t, i) => {
          t.position = i;
        });
        if (sourceSectionId !== targetSectionId) {
          srcSection.tasks.forEach((t, i) => {
            t.position = i;
          });
        }
        this.emit("change");
        break;
      }

      case "KANBAN_REORDER_SECTIONS": {
        const { newOrder } = action.payload as { newOrder: string[] };
        const sectionMap = new Map(this.state.sections.map((s) => [s.id, s]));
        this.state.sections = newOrder
          .map((id) => sectionMap.get(id))
          .filter(Boolean) as Section[];
        this.emit("change");
        break;
      }

      case "KANBAN_REVERT_SECTIONS": {
        const payload = action.payload as { sections: Section[] };
        this.state.sections = payload.sections;
        this.emit("change");
        break;
      }

      case "KANBAN_ADD_SECTION_SUCCESS": {
        const payload = action.payload as { section: Section };
        this.state.sections = [...this.state.sections, payload.section];
        this.emit("change");
        break;
      }

      case "KANBAN_DELETE_SECTION_SUCCESS": {
        const payload = action.payload as { sectionId: string };
        this.state.sections = this.state.sections.filter(
          (s) => s.id !== payload.sectionId,
        );
        this.emit("change");
        break;
      }

      case "KANBAN_ADD_TASK_SUCCESS": {
        const { sectionId, task } = action.payload as {
          sectionId: string;
          task: Task;
        };
        const section = this.state.sections.find((s) => s.id === sectionId);
        if (section) {
          section.tasks = [...section.tasks, task];
          this.emit("change");
        }
        break;
      }

      case "KANBAN_DELETE_TASK_SUCCESS": {
        const { taskId } = action.payload as { taskId: string };
        this.state.sections.forEach((s) => {
          s.tasks = s.tasks.filter((t) => t.id !== taskId);
        });
        this.emit("change");
        break;
      }

      case "KANBAN_UPDATE_SECTION_SUCCESS": {
        const { sectionId, data } = action.payload as {
          sectionId: string;
          data: Partial<SectionInfo>;
        };
        const section = this.state.sections.find((s) => s.id === sectionId);
        if (section) {
          if (data.name) section.section_name = data.name;
          if (data.color) {
            section.color = data.color;
            section.colorHex = KANBAN_COLORS[data.color] || data.color;
          }
          if (data.max_tasks) section.max_tasks = data.max_tasks;
          if (data.is_mandatory) section.is_mandatory = data.is_mandatory;
          this.emit("change");
        }
        break;
      }
    }
  }

  constructor() {
    super();
    appDispatcher.register(this.handleAction.bind(this));
  }
}

export const kanbanStore = new KanbanStore();
```

src/modules/kanban/kanban.types.ts:
```typescript
import { SubtaskInfo } from "../../api";

export interface BoardUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

export interface Task {
  id: string;
  title: string;
  due_date: string | null;
  time: string | null;
  executor: string | null;
  executor_id?: string | null;
  subtasks?: SubtaskInfo[];
  subtasksCount?: number;
  subtasksDone?: number;
  progressPercent?: number;
  subtasksProgressText?: string;
  progressPercentStyle?: string;
  hasSubtasks?: boolean;
  position: number;
}

export interface Section {
  id: string;
  section_name: string;
  color: string;
  colorHex: string;
  tasks: Task[];
  max_tasks?: number;
  is_mandatory?: boolean;
  position?: number;
}

export interface KanbanState {
  boardId: string | null;
  boardName: string;
  users: BoardUser[];
  sections: Section[];
  isLoading: boolean;
  error: string | null;
  myRole?: string;
}

export const KANBAN_COLORS: Record<string, string> = {
  white: "#ffffff",
  grey: "#9ca3af",
  red: "#f87171",
  orange: "#fb923c",
  blue: "#60a5fa",
  green: "#4ade80",
  purple: "#a5b4fc",
  pink: "#f9a8d4",
};

export interface ApiError extends Error {
  status: number;
  data: { message: string; error: string };
}

export interface RawUser {
  id: string;
  user_link: string;
  display_name: string;
  email: string;
  avatar_url?: string;
  name: string;
}

export interface RawSection {
  id: string;
  link: string;
  name: string;
  color?: string;
  position: number;
  max_tasks?: number;
  is_mandatory?: boolean;
}

export interface RawTask {
  id: string;
  card_link: string;
  link_card: string;
  link?: string;
  title: string;
  link_executer: string;
  executer_link: string;
  executor_link?: string;
  executer_name: string;
  name_executer: string;
  dead_line: string;
  data_dead_line: string;
  deadline?: string;
  subtasks?: SubtaskInfo[];
}

export interface FetchKanbanSuccessPayload {
  boardId: string;
  boardName: string;
  users: BoardUser[];
  sections: Section[];
  myRole?: string;
}

export interface FetchKanbanErrorPayload {
  error: string;
}
```

src/modules/kanban/KanbanView.ts:
```typescript
import Handlebars from "handlebars";
import kanbanTpl from "../../templates/kanban.hbs?raw";
import { KanbanState } from "./kanban.types";
import { navigateTo } from "../../router";
import { authApi, boardsApi, kanbanApi, profileApi } from "../../api";
import { currentUser } from "../../main";

import { KanbanDragAndDrop } from "./components/KanbanDragAndDrop";
import { KanbanContextMenus } from "./components/KanbanContextMenus";
import { KanbanTaskCreation } from "./components/KanbanTaskCreation";
import { KanbanColumnManager } from "./components/KanbanColumnManager";
import { showConfirmModal } from "../../utils/confirmModal";
import { Toast } from "../../utils/toast";
import { KanbanActions } from "./KanbanActions";

const template = Handlebars.compile(kanbanTpl);

export class KanbanView {
  private appDiv: HTMLElement;
  private abortController: AbortController | null = null;

  private currentView: "kanban" | "gantt" = "kanban";

  private collapsedSections = new Set<string>();

  private ganttFilterEnabled = false;
  private ganttFilterStartDate: Date | null = null;
  private ganttFilterEndDate: Date | null = null;
  private ganttFilterWithTime = false;
  private ganttFilterWithStart = false;

  private tempGanttFilterStartDate: Date | null = null;
  private tempGanttFilterEndDate: Date | null = null;

  constructor(appDiv: HTMLElement) {
    this.appDiv = appDiv;
  }

  public setAppDiv(appDiv: HTMLElement): void {
    this.appDiv = appDiv;
  }

  public render(state: KanbanState): void {
    if (state.isLoading) return;

    if (this.abortController) {
      this.abortController.abort();
    }
    this.abortController = new AbortController();

    const scrollMap = new Map<string, number>();
    const expandedTasks = new Set<string>();

    const wrapper = this.appDiv.querySelector(".kanban__columns-container");
    const wrapperScrollLeft = wrapper ? wrapper.scrollLeft : 0;

    this.appDiv
      .querySelectorAll<HTMLElement>(".kanban__column-cards")
      .forEach((el) => {
        const id = el.getAttribute("data-section-id");
        if (id) scrollMap.set(id, el.scrollTop);
      });

    this.appDiv.querySelectorAll<HTMLElement>(".kanban-card").forEach((el) => {
      const id = el.getAttribute("data-id");
      const list = el.querySelector(".kanban-card__subtasks-list");
      if (id && list && !list.classList.contains("hidden")) {
        expandedTasks.add(id);
      }
    });

    const isViewer = state.myRole === "viewer";

    this.appDiv.innerHTML = template({
      board_name: state.boardName,
      sections: state.sections,
      isViewer: isViewer,
    });

    const tabKanban = this.appDiv.querySelector("#tab-view-kanban");
    const tabGantt = this.appDiv.querySelector("#tab-view-gantt");
    const kanbanWrapper = this.appDiv.querySelector(
      ".kanban__columns-wrapper",
    ) as HTMLElement;
    const ganttContainer = this.appDiv.querySelector(
      "#gantt-chart-container",
    ) as HTMLElement;
    const filterContainer = this.appDiv.querySelector(
      "#gantt-filter-container",
    ) as HTMLElement;

    if (this.currentView === "gantt") {
      kanbanWrapper?.classList.add("hidden");
      ganttContainer?.classList.remove("hidden");
      filterContainer?.classList.remove("hidden");
      tabGantt?.classList.add("active");
      tabKanban?.classList.remove("active");
      this.renderGanttChart(state);
    } else {
      kanbanWrapper?.classList.remove("hidden");
      ganttContainer?.classList.add("hidden");
      filterContainer?.classList.add("hidden");
      tabKanban?.classList.add("active");
      tabGantt?.classList.remove("active");
    }

    tabKanban?.addEventListener("click", () => {
      this.currentView = "kanban";
      kanbanWrapper?.classList.remove("hidden");
      ganttContainer?.classList.add("hidden");
      filterContainer?.classList.add("hidden");
      tabKanban.classList.add("active");
      tabGantt?.classList.remove("active");
    });

    tabGantt?.addEventListener("click", () => {
      this.currentView = "gantt";
      kanbanWrapper?.classList.add("hidden");
      ganttContainer?.classList.remove("hidden");
      filterContainer?.classList.remove("hidden");
      tabGantt.classList.add("active");
      tabKanban?.classList.remove("active");
      this.renderGanttChart(state);
    });

    const newWrapper = this.appDiv.querySelector(".kanban__columns-container");
    if (newWrapper) newWrapper.scrollLeft = wrapperScrollLeft;

    this.appDiv
      .querySelectorAll<HTMLElement>(".kanban__column-cards")
      .forEach((el) => {
        const id = el.getAttribute("data-section-id");
        if (id && scrollMap.has(id)) el.scrollTop = scrollMap.get(id)!;
      });

    this.appDiv.querySelectorAll<HTMLElement>(".kanban-card").forEach((el) => {
      const id = el.getAttribute("data-id");
      if (id && expandedTasks.has(id)) {
        const list = el.querySelector(".kanban-card__subtasks-list");
        if (list) list.classList.remove("hidden");
        const svg = el.querySelector(
          ".kanban-card__subtasks-header svg",
        ) as HTMLElement;
        if (svg) svg.classList.add("kanban-card__subtasks-icon--expanded");
      }
    });

    this.attachEventListeners(state, this.abortController.signal);
  }

  private buildFilterCalendar(
    currentDate: Date | null,
    onSelect: (d: Date) => void,
  ): HTMLElement {
    const MONTHS = [
      "Январь",
      "Февраль",
      "Март",
      "Апрель",
      "Май",
      "Июнь",
      "Июль",
      "Август",
      "Сентябрь",
      "Октябрь",
      "Ноябрь",
      "Декабрь",
    ];
    const DAYS = ["ПН", "ВТ", "СР", "ЧТ", "ПТ", "СБ", "ВС"];

    let viewYear = currentDate
      ? currentDate.getFullYear()
      : new Date().getFullYear();
    let viewMonth = currentDate
      ? currentDate.getMonth()
      : new Date().getMonth();

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
    const selectedStr = currentDate
      ? `${currentDate.getFullYear()}-${currentDate.getMonth()}-${currentDate.getDate()}`
      : "";

    const cal = document.createElement("div");
    cal.className = "gantt-filter-calendar";

    const render = () => {
      cal.innerHTML = "";

      const header = document.createElement("div");
      header.className = "date-picker__header";

      const prev = document.createElement("button");
      prev.className = "date-picker__nav-btn";
      prev.textContent = "‹";
      prev.type = "button";
      prev.addEventListener("click", (e) => {
        e.stopPropagation();
        viewMonth--;
        if (viewMonth < 0) {
          viewMonth = 11;
          viewYear--;
        }
        render();
      });

      const title = document.createElement("span");
      title.textContent = `${MONTHS[viewMonth]} ${viewYear}`;

      const next = document.createElement("button");
      next.className = "date-picker__nav-btn";
      next.textContent = "›";
      next.type = "button";
      next.addEventListener("click", (e) => {
        e.stopPropagation();
        viewMonth++;
        if (viewMonth > 11) {
          viewMonth = 0;
          viewYear++;
        }
        render();
      });

      header.appendChild(prev);
      header.appendChild(title);
      header.appendChild(next);
      cal.appendChild(header);

      const grid = document.createElement("div");
      grid.className = "date-picker__grid";

      DAYS.forEach((d) => {
        const el = document.createElement("div");
        el.className = "date-picker__day-name";
        el.textContent = d;
        grid.appendChild(el);
      });

      let dow = new Date(viewYear, viewMonth, 1).getDay();
      if (dow === 0) dow = 7;
      dow--;

      const prevLast = new Date(viewYear, viewMonth, 0).getDate();
      for (let i = dow - 1; i >= 0; i--) {
        const el = document.createElement("div");
        el.className = "date-picker__day date-picker__day--other-month";
        el.textContent = String(prevLast - i);
        grid.appendChild(el);
      }

      const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${viewYear}-${viewMonth}-${d}`;
        const el = document.createElement("div");
        el.className = "date-picker__day";
        if (dateStr === todayStr) el.classList.add("date-picker__day--today");
        if (dateStr === selectedStr)
          el.classList.add("date-picker__day--selected");
        el.textContent = String(d);
        el.addEventListener("click", (e) => {
          e.stopPropagation();
          onSelect(new Date(viewYear, viewMonth, d));
        });
        grid.appendChild(el);
      }

      const total = Math.ceil((dow + daysInMonth) / 7) * 7;
      for (let d = 1; d <= total - dow - daysInMonth; d++) {
        const el = document.createElement("div");
        el.className = "date-picker__day date-picker__day--other-month";
        el.textContent = String(d);
        grid.appendChild(el);
      }

      cal.appendChild(grid);
    };

    render();
    return cal;
  }

  private renderGanttFilterPopover(state: KanbanState) {
    const popover = this.appDiv.querySelector(
      "#gantt-filter-popover",
    ) as HTMLElement;
    if (!popover) return;

    popover.innerHTML = "";

    if (this.ganttFilterWithStart) {
      popover.className = "gantt-filter-popover gantt-filter-popover--double";
    } else {
      popover.className = "gantt-filter-popover";
    }

    if (!this.tempGanttFilterStartDate) {
      this.tempGanttFilterStartDate = this.ganttFilterStartDate
        ? new Date(this.ganttFilterStartDate)
        : new Date(Date.now() - 3 * 86400000);
    }
    if (!this.tempGanttFilterEndDate) {
      this.tempGanttFilterEndDate = this.ganttFilterEndDate
        ? new Date(this.ganttFilterEndDate)
        : new Date(Date.now() + 3 * 86400000);
    }

    const formatDateToInput = (d: Date | null): string => {
      if (!d) return "";
      return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
    };

    const formatTimeToInput = (d: Date | null): string => {
      if (!d) return "00:00";
      return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    };

    const buildInputsRow = () => {
      const row = document.createElement("div");
      row.className = "gantt-filter-inputs-row";

      if (this.ganttFilterWithStart) {
        row.innerHTML = `
          <div class="gantt-filter-input-group">
            <span>с</span>
            <input type="text" id="gantt-val-date-from" class="gantt-filter-field" value="${formatDateToInput(this.tempGanttFilterStartDate)}" readonly>
            ${this.ganttFilterWithTime ? `<input type="text" class="gantt-filter-field gantt-filter-field--time" value="${formatTimeToInput(this.tempGanttFilterStartDate)}" readonly>` : ""}
          </div>
          <div class="gantt-filter-input-group">
            <span>до</span>
            <input type="text" id="gantt-val-date-to" class="gantt-filter-field" value="${formatDateToInput(this.tempGanttFilterEndDate)}" readonly>
            ${this.ganttFilterWithTime ? `<input type="text" class="gantt-filter-field gantt-filter-field--time" value="${formatTimeToInput(this.tempGanttFilterEndDate)}" readonly>` : ""}
          </div>
        `;
      } else {
        row.innerHTML = `
          <div class="gantt-filter-input-group">
            <input type="text" id="gantt-val-date-to" class="gantt-filter-field" value="${formatDateToInput(this.tempGanttFilterEndDate)}" readonly>
            ${this.ganttFilterWithTime ? `<input type="text" class="gantt-filter-field gantt-filter-field--time" value="${formatTimeToInput(this.tempGanttFilterEndDate)}" readonly>` : ""}
          </div>
        `;
      }
      return row;
    };

    popover.appendChild(buildInputsRow());

    const calendarsContainer = document.createElement("div");
    calendarsContainer.className = "gantt-filter-calendars";

    if (this.ganttFilterWithStart) {
      const calFrom = this.buildFilterCalendar(
        this.tempGanttFilterStartDate,
        (d) => {
          this.tempGanttFilterStartDate = d;
          if (this.tempGanttFilterEndDate && d > this.tempGanttFilterEndDate) {
            this.tempGanttFilterEndDate = new Date(d);
          }
          refreshPopover();
        },
      );
      calendarsContainer.appendChild(calFrom);
    }

    const calTo = this.buildFilterCalendar(this.tempGanttFilterEndDate, (d) => {
      this.tempGanttFilterEndDate = d;
      if (this.tempGanttFilterStartDate && d < this.tempGanttFilterStartDate) {
        this.tempGanttFilterStartDate = new Date(d);
      }
      refreshPopover();
    });
    calendarsContainer.appendChild(calTo);

    popover.appendChild(calendarsContainer);

    const togglesContainer = document.createElement("div");
    togglesContainer.className = "gantt-filter-toggles";

    togglesContainer.innerHTML = `
      <div class="gantt-filter-toggle-item">
        <span>Добавить время</span>
        <label class="toggle">
          <input type="checkbox" id="gantt-toggle-time" ${this.ganttFilterWithTime ? "checked" : ""}>
          <span class="slider"></span>
        </label>
      </div>
      <div class="gantt-filter-toggle-item">
        <span>Добавить дату начала</span>
        <label class="toggle">
          <input type="checkbox" id="gantt-toggle-start" ${this.ganttFilterWithStart ? "checked" : ""}>
          <span class="slider"></span>
        </label>
      </div>
    `;

    popover.appendChild(togglesContainer);

    const actionsContainer = document.createElement("div");
    actionsContainer.className = "gantt-filter-actions";

    const btnReset = document.createElement("button");
    btnReset.className = "gantt-filter-btn gantt-filter-btn--cancel";
    btnReset.textContent = "Сбросить";
    btnReset.addEventListener("click", (ev) => {
      ev.stopPropagation();
      this.ganttFilterEnabled = false;
      this.ganttFilterStartDate = null;
      this.ganttFilterEndDate = null;
      this.tempGanttFilterStartDate = null;
      this.tempGanttFilterEndDate = null;
      popover.classList.add("hidden");
      const label = this.appDiv.querySelector(
        "#gantt-filter-label",
      ) as HTMLElement;
      if (label) label.textContent = "Период: Все";
      this.renderGanttChart(state);
    });

    const btnApply = document.createElement("button");
    btnApply.className = "gantt-filter-btn gantt-filter-btn--apply";
    btnApply.textContent = "Применить";
    btnApply.addEventListener("click", (ev) => {
      ev.stopPropagation();
      this.ganttFilterEnabled = true;
      this.ganttFilterStartDate = this.ganttFilterWithStart
        ? this.tempGanttFilterStartDate
        : null;
      this.ganttFilterEndDate = this.tempGanttFilterEndDate;

      popover.classList.add("hidden");
      const label = this.appDiv.querySelector(
        "#gantt-filter-label",
      ) as HTMLElement;
      if (label) {
        if (this.ganttFilterWithStart) {
          label.textContent = `Период: ${formatDateToInput(this.tempGanttFilterStartDate)} - ${formatDateToInput(this.tempGanttFilterEndDate)}`;
        } else {
          label.textContent = `День: ${formatDateToInput(this.tempGanttFilterEndDate)}`;
        }
      }
      this.renderGanttChart(state);
    });

    actionsContainer.appendChild(btnReset);
    actionsContainer.appendChild(btnApply);
    popover.appendChild(actionsContainer);

    popover
      .querySelector("#gantt-toggle-time")
      ?.addEventListener("change", (ev) => {
        this.ganttFilterWithTime = (ev.target as HTMLInputElement).checked;
        refreshPopover();
      });

    popover
      .querySelector("#gantt-toggle-start")
      ?.addEventListener("change", (ev) => {
        this.ganttFilterWithStart = (ev.target as HTMLInputElement).checked;
        refreshPopover();
      });

    const refreshPopover = () => {
      this.renderGanttFilterPopover(state);
    };
  }

  private renderGanttChart(state: KanbanState) {
    const container = this.appDiv.querySelector(
      "#gantt-chart-container",
    ) as HTMLElement;
    if (!container) return;

    container.innerHTML = "";

    const flatItems: any[] = [];
    const parseDate = (dateStr: string | null): Date | null => {
      if (!dateStr) return null;
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? null : d;
    };

    const filterActive = this.ganttFilterEnabled;
    let tStart = 0;
    let tEnd = 0;

    if (filterActive) {
      if (this.ganttFilterStartDate) {
        tStart = this.ganttFilterStartDate.getTime();
        tEnd = this.ganttFilterEndDate
          ? this.ganttFilterEndDate.getTime()
          : Infinity;
      } else if (this.ganttFilterEndDate) {
        const dayStart = new Date(this.ganttFilterEndDate);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(this.ganttFilterEndDate);
        dayEnd.setHours(23, 59, 59, 999);
        tStart = dayStart.getTime();
        tEnd = dayEnd.getTime();
      }
    }

    const isViewer = state.myRole === "viewer";

    state.sections.forEach((sec) => {
      const matchingTasks: any[] = [];

      sec.tasks.forEach((task) => {
        const rawStart = parseDate((task as any).start);
        const rawEnd = parseDate((task as any).deadline);

        const end = rawEnd || rawStart || new Date();
        const start = rawStart || new Date(end.getTime() - 4 * 86400000);

        const taskOverlaps =
          !filterActive || (start.getTime() < tEnd && end.getTime() > tStart);

        if (taskOverlaps) {
          matchingTasks.push({
            type: "task",
            id: task.id,
            sectionId: sec.id,
            name: task.title,
            start,
            end,
            due_date: task.due_date,
            is_done: (task as any).is_done === true,
            isExpanded: false,
            subtasks: [],
            subsRenderList: [],
          });
        }
      });

      if (!filterActive || matchingTasks.length > 0) {
        flatItems.push({
          type: "section",
          id: sec.id,
          name: sec.section_name,
          color: sec.color,
          isExpanded: !this.collapsedSections.has(sec.id),
        });

        if (!this.collapsedSections.has(sec.id)) {
          matchingTasks.forEach((task) => {
            flatItems.push(task);
          });
        }
      }
    });

    let minTime = Infinity;
    let maxTime = -Infinity;
    flatItems.forEach((item) => {
      if (item.start && item.end) {
        minTime = Math.min(minTime, item.start.getTime());
        maxTime = Math.max(maxTime, item.end.getTime());
      }
    });

    if (minTime === Infinity || maxTime === -Infinity) {
      minTime = Date.now() - 3 * 86400000;
      maxTime = Date.now() + 3 * 86400000;
    }

    let timelineStart = minTime - 3 * 86400000;
    let timelineEnd = maxTime + 3 * 86400000;

    if (this.ganttFilterEnabled) {
      if (this.ganttFilterStartDate) {
        timelineStart = this.ganttFilterStartDate.getTime();
        timelineEnd = this.ganttFilterEndDate?.getTime() || Infinity;
      } else if (this.ganttFilterEndDate) {
        timelineStart = this.ganttFilterEndDate.getTime() - 2 * 86400000;
        timelineEnd = this.ganttFilterEndDate.getTime() + 2 * 86400000;
      }
    }

    const timelineDuration = timelineEnd - timelineStart;
    const totalDays = Math.round(timelineDuration / 86400000);

    container.innerHTML = `
        <div class="gantt-chart__left-pane">
          <div class="gantt-chart__header-row">
            <span>Название</span>
            <span>Диапазон дат</span>
          </div>
          <div class="gantt-chart__list"></div>
        </div>
        <div class="gantt-chart__right-pane">
          <div class="gantt-chart__timeline-header">
            <div class="gantt-chart__months-row"></div>
            <div class="gantt-chart__days-row"></div>
          </div>
          <div class="gantt-chart__grid-body"></div>
        </div>
      `;

    const leftList = container.querySelector(
      ".gantt-chart__list",
    ) as HTMLElement;
    const monthsRow = container.querySelector(
      ".gantt-chart__months-row",
    ) as HTMLElement;
    const daysRow = container.querySelector(
      ".gantt-chart__days-row",
    ) as HTMLElement;
    const gridBody = container.querySelector(
      ".gantt-chart__grid-body",
    ) as HTMLElement;

    const monthNames = [
      "Январь",
      "Февраль",
      "Март",
      "Апрель",
      "Май",
      "Июнь",
      "Июль",
      "Август",
      "Сентябрь",
      "Октябрь",
      "Ноябрь",
      "Декабрь",
    ];
    const cellWidth = 60;

    monthsRow.style.width = `${totalDays * cellWidth}px`;
    daysRow.style.width = `${totalDays * cellWidth}px`;
    gridBody.style.width = `${totalDays * cellWidth}px`;

    let currentMonthKey = "";
    let currentMonthWidth = 0;
    let currentMonthLabel = "";

    for (let d = 0; d < totalDays; d++) {
      const date = new Date(timelineStart + d * 86400000);
      const monthKey = `${date.getFullYear()}-${date.getMonth()}`;

      if (monthKey !== currentMonthKey) {
        if (currentMonthWidth > 0) {
          const mCell = document.createElement("div");
          mCell.className = "gantt-chart__month-cell";
          mCell.style.width = `${currentMonthWidth}px`;
          mCell.textContent = currentMonthLabel;
          monthsRow.appendChild(mCell);
        }
        currentMonthKey = monthKey;
        currentMonthWidth = cellWidth;
        currentMonthLabel = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
      } else {
        currentMonthWidth += cellWidth;
      }

      const dayCell = document.createElement("div");
      dayCell.className = "gantt-chart__timeline-cell";
      dayCell.style.width = `${cellWidth}px`;
      dayCell.textContent = `${date.getDate()}`;
      dayCell.title = `${date.getDate()} ${monthNames[date.getMonth()]} ${date.getFullYear()}`;
      daysRow.appendChild(dayCell);
    }

    if (currentMonthWidth > 0) {
      const mCell = document.createElement("div");
      mCell.className = "gantt-chart__month-cell";
      mCell.style.width = `${currentMonthWidth}px`;
      mCell.textContent = currentMonthLabel;
      monthsRow.appendChild(mCell);
    }

    leftList.addEventListener("scroll", () => {
      gridBody.scrollTop = leftList.scrollTop;
    });
    gridBody.addEventListener("scroll", () => {
      leftList.scrollTop = gridBody.scrollTop;
    });

    flatItems.forEach((item) => {
      const leftRow = document.createElement("div");
      leftRow.className = `gantt-chart__row gantt-chart__row--${item.type}`;

      let iconHtml = "";
      let dateRangeHtml = "";

      const formatDateRange = (s: Date, e: Date) => {
        const mNames = [
          "января",
          "февраля",
          "марта",
          "апреля",
          "мая",
          "июня",
          "июля",
          "августа",
          "сентября",
          "октября",
          "ноября",
          "декабря",
        ];
        return `${s.getDate()} ${mNames[s.getMonth()]}, ${s.getFullYear()} - ${e.getDate()} ${mNames[e.getMonth()]}, ${e.getFullYear()}`;
      };

      if (item.type === "section") {
        const chevronClass = item.isExpanded
          ? "gantt-chart__chevron--expanded"
          : "";
        iconHtml = `
            <span class="gantt-chart__chevron ${chevronClass}">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </span>
            <span class="gantt-chart__col-dot bg-${item.color}"></span>
          `;
        leftRow.addEventListener("click", () => {
          if (this.collapsedSections.has(item.id)) {
            this.collapsedSections.delete(item.id);
          } else {
            this.collapsedSections.add(item.id);
          }
          this.renderGanttChart(state);
        });
      } else if (item.type === "task") {
        const isTaskDone = item.is_done === true;
        if (isTaskDone) {
          leftRow.classList.add("gantt-chart__row--done");
        }

        iconHtml = isViewer
          ? ""
          : `
            <button class="kanban-card__status-checkmark gantt-chart__task-status-btn ${isTaskDone ? "kanban-card__status-checkmark--active" : ""}" title="Изменить статус задачи" type="button">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </button>
          `;
        dateRangeHtml = `<span class="gantt-chart__item-date">${formatDateRange(item.start, item.end)}</span>`;

        leftRow.addEventListener("click", (e) => {
          const target = e.target as HTMLElement;
          if (target.closest(".gantt-chart__task-status-btn")) return;

          const isDetailsBtn = target.closest(".gantt-chart__open-details-btn");
          if (isDetailsBtn) {
            e.stopPropagation();
            navigateTo(
              `/task?boardId=${state.boardId}&taskId=${item.id}&title=${encodeURIComponent(item.name)}`,
            );
          }
        });
      }

      if (item.type === "task") {
        const isTaskDone = item.is_done === true;
        leftRow.innerHTML = `
            <div class="gantt-chart__item-title">
              ${iconHtml}
              <span class="${isTaskDone ? "kanban-card__title--done" : ""}">${item.name}</span>
            </div>
            <button class="gantt-chart__open-details-btn" title="Открыть карточку">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                <polyline points="15 3 21 3 21 9"></polyline>
                <line x1="10" y1="14" x2="21" y2="3"></line>
              </svg>
            </button>
            ${dateRangeHtml}
          `;

        const statusBtn = leftRow.querySelector(
          ".gantt-chart__task-status-btn",
        );
        statusBtn?.addEventListener("click", async (ev) => {
          ev.stopPropagation();
          if (isViewer) return;
          const nextDone = !isTaskDone;
          try {
            await kanbanApi.updateTaskStatus(item.id, { done: nextDone });
            await KanbanActions.fetchKanban(state.boardId!, true);
          } catch {
            Toast.error("Не удалось обновить статус задачи");
          }
        });
      } else {
        leftRow.innerHTML = `
            <div class="gantt-chart__item-title">
              ${iconHtml}
              <span>${item.name}</span>
            </div>
            ${dateRangeHtml}
          `;
      }

      leftList.appendChild(leftRow);

      const rightRow = document.createElement("div");
      rightRow.className = `gantt-chart__grid-row gantt-chart__grid-row--${item.type}`;

      for (let d = 0; d < totalDays; d++) {
        const line = document.createElement("div");
        line.className = "gantt-chart__grid-line";
        line.style.width = `${cellWidth}px`;
        rightRow.appendChild(line);
      }

      if (item.start && item.end) {
        const barContainer = document.createElement("div");
        barContainer.className = "gantt-chart__bar-container";

        const offsetLeft =
          ((item.start.getTime() - timelineStart) / timelineDuration) * 100;
        const barWidth =
          ((item.end.getTime() - item.start.getTime()) / timelineDuration) *
          100;

        const isTaskDone = item.is_done === true;
        const barColorClass = isTaskDone
          ? "gantt-chart__bar--purple"
          : "gantt-chart__bar--white";

        const bar = document.createElement("div");
        bar.className = `gantt-chart__bar ${barColorClass}`;
        if (isTaskDone) {
          bar.classList.add("gantt-chart__bar--done");
        }
        bar.style.left = `${offsetLeft}%`;
        bar.style.width = `${barWidth}%`;

        bar.style.cursor = isTaskDone ? "default" : "grab";
        bar.title = `${item.name}: ${formatDateRange(item.start, item.end)}`;

        if (!isTaskDone && !isViewer) {
          const leftHandle = document.createElement("div");
          leftHandle.className =
            "gantt-chart__bar-handle gantt-chart__bar-handle--left";
          leftHandle.title = "Изменить дату начала";

          const rightHandle = document.createElement("div");
          rightHandle.className =
            "gantt-chart__bar-handle gantt-chart__bar-handle--right";
          rightHandle.title = "Изменить дедлайн";

          bar.appendChild(leftHandle);
          bar.appendChild(rightHandle);

          const msPerPixel = 86400000 / cellWidth;

          leftHandle.addEventListener("mousedown", (e: MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();

            const startX = e.clientX;
            const originalLeftPercent = parseFloat(bar.style.left);
            const originalWidthPercent = parseFloat(bar.style.width);
            const parentWidth = (
              bar.parentElement as HTMLElement
            ).getBoundingClientRect().width;

            document.body.style.cursor = "ew-resize";

            const onMouseMove = (moveEv: MouseEvent) => {
              const deltaX = moveEv.clientX - startX;
              const deltaPercent = (deltaX / parentWidth) * 100;

              let newLeft = originalLeftPercent + deltaPercent;
              let newWidth = originalWidthPercent - deltaPercent;

              const minWidthPercent = (cellWidth / parentWidth) * 100;

              if (newLeft < 0) {
                newLeft = 0;
                newWidth = originalLeftPercent + originalWidthPercent;
              }
              if (newWidth < minWidthPercent) {
                newWidth = minWidthPercent;
                newLeft =
                  originalLeftPercent + originalWidthPercent - minWidthPercent;
              }

              bar.style.left = `${newLeft}%`;
              bar.style.width = `${newWidth}%`;
            };

            const onMouseUp = async (upEv: MouseEvent) => {
              document.removeEventListener("mousemove", onMouseMove);
              document.removeEventListener("mouseup", onMouseUp);
              document.body.style.cursor = "";

              const deltaX = upEv.clientX - startX;
              const deltaTimeMs = deltaX * msPerPixel;

              let newStartTime = item.start.getTime() + deltaTimeMs;
              if (newStartTime >= item.end.getTime()) {
                newStartTime = item.end.getTime() - 86400000;
              }

              try {
                await kanbanApi.updateTaskTimeline(item.id, {
                  start: new Date(newStartTime).toISOString(),
                  deadline: item.end.toISOString(),
                });
                Toast.success(`Дата начала задачи "${item.name}" обновлена`);
                await KanbanActions.fetchKanban(state.boardId!, true);
              } catch {
                Toast.error("Не удалось изменить дату начала");
                this.renderGanttChart(state);
              }
            };

            document.addEventListener("mousemove", onMouseMove);
            document.addEventListener("mouseup", onMouseUp);
          });

          rightHandle.addEventListener("mousedown", (e: MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();

            const startX = e.clientX;
            const originalLeftPercent = parseFloat(bar.style.left);
            const originalWidthPercent = parseFloat(bar.style.width);
            const parentWidth = (
              bar.parentElement as HTMLElement
            ).getBoundingClientRect().width;

            document.body.style.cursor = "ew-resize";

            const onMouseMove = (moveEv: MouseEvent) => {
              const deltaX = moveEv.clientX - startX;
              const deltaPercent = (deltaX / parentWidth) * 100;

              let newWidth = originalWidthPercent + deltaPercent;
              const minWidthPercent = (cellWidth / parentWidth) * 100;

              if (newWidth < minWidthPercent) {
                newWidth = minWidthPercent;
              }
              if (originalLeftPercent + newWidth > 100) {
                newWidth = 100 - originalLeftPercent;
              }

              bar.style.width = `${newWidth}%`;
            };

            const onMouseUp = async (upEv: MouseEvent) => {
              document.removeEventListener("mousemove", onMouseMove);
              document.removeEventListener("mouseup", onMouseUp);
              document.body.style.cursor = "";

              const deltaX = upEv.clientX - startX;
              const deltaTimeMs = deltaX * msPerPixel;

              let newEndTime = item.end.getTime() + deltaTimeMs;
              if (newEndTime <= item.start.getTime()) {
                newEndTime = item.start.getTime() + 86400000;
              }

              try {
                await kanbanApi.updateTaskTimeline(item.id, {
                  start: item.start.toISOString(),
                  deadline: new Date(newEndTime).toISOString(),
                });
                Toast.success(`Дедлайн задачи "${item.name}" обновлен`);
                await KanbanActions.fetchKanban(state.boardId!, true);
              } catch {
                Toast.error("Не удалось изменить дедлайн");
                this.renderGanttChart(state);
              }
            };

            document.addEventListener("mousemove", onMouseMove);
            document.addEventListener("mouseup", onMouseUp);
          });

          bar.addEventListener("mousedown", (e: MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();

            const startX = e.clientX;
            const originalLeftPercent = parseFloat(bar.style.left);
            const parentWidth = (
              bar.parentElement as HTMLElement
            ).getBoundingClientRect().width;
            const msPerPixel = 86400000 / cellWidth;

            bar.style.cursor = "grabbing";

            const onMouseMove = (moveEv: MouseEvent) => {
              const deltaX = moveEv.clientX - startX;
              const deltaPercent = (deltaX / parentWidth) * 100;
              let newLeft = originalLeftPercent + deltaPercent;

              if (newLeft < 0) newLeft = 0;
              if (newLeft + barWidth > 100) newLeft = 100 - barWidth;

              bar.style.left = `${newLeft}%`;
            };

            const onMouseUp = async (upEv: MouseEvent) => {
              document.removeEventListener("mousemove", onMouseMove);
              document.removeEventListener("mouseup", onMouseUp);
              bar.style.cursor = "grab";

              const deltaX = upEv.clientX - startX;
              const deltaTimeMs = deltaX * msPerPixel;

              const newStartTime = item.start.getTime() + deltaTimeMs;
              const newEndTime = item.end.getTime() + deltaTimeMs;

              const newStart = new Date(newStartTime);
              const newEnd = new Date(newEndTime);

              try {
                await kanbanApi.updateTaskTimeline(item.id, {
                  start: newStart.toISOString(),
                  deadline: newEnd.toISOString(),
                });
                Toast.success(`Период задачи "${item.name}" обновлен`);
                await KanbanActions.fetchKanban(state.boardId!, true);
              } catch {
                Toast.error("Не удалось обновить отрезок задачи");
                this.renderGanttChart(state);
              }
            };

            document.addEventListener("mousemove", onMouseMove);
            document.addEventListener("mouseup", onMouseUp);
          });
        }

        barContainer.appendChild(bar);
        rightRow.appendChild(barContainer);
      }

      gridBody.appendChild(rightRow);
    });
  }

  private attachEventListeners(state: KanbanState, signal: AbortSignal): void {
    const closeModals = (): void => {
      this.appDiv
        .querySelectorAll(".modal, .manage-columns")
        .forEach((m) => m.classList.add("hidden"));
      this.appDiv.querySelector("#modal-overlay")?.classList.add("hidden");
      this.appDiv
        .querySelector("#gantt-filter-popover")
        ?.classList.add("hidden");
      document
        .querySelectorAll(".assignee-dropdown")
        .forEach((dd) => dd.remove());
      KanbanContextMenus.closeMenu();
    };

    document
      .getElementById("nav-boards")
      ?.addEventListener("click", () => navigateTo("/boards"), { signal });
    document
      .getElementById("nav-logo")
      ?.addEventListener("click", () => navigateTo("/boards"), { signal });
    document
      .getElementById("nav-profile")
      ?.addEventListener("click", () => navigateTo("/profile"), { signal });
    document.getElementById("logout-btn")?.addEventListener(
      "click",
      () => {
        showConfirmModal({
          title: "Выход",
          text: "Вы уверены, что хотите выйти из аккаунта?",
          confirmLabel: "Выйти",
          onConfirm: async () => {
            try {
              await authApi.logout();
            } catch (err) {
              console.error("Logout error", err);
            } finally {
              localStorage.removeItem("isAuth");
              navigateTo("/login");
            }
          },
        });
      },
      { signal },
    );

    this.appDiv.querySelector("#modal-overlay")?.addEventListener(
      "click",
      (e: Event) => {
        if (e.target === e.currentTarget) closeModals();
      },
      { signal },
    );

    this.appDiv
      .querySelectorAll(".modal__close-btn, #btn-close-manage")
      .forEach((btn) => btn.addEventListener("click", closeModals, { signal }));

    this.appDiv.querySelector("#btn-share-board")?.addEventListener(
      "click",
      async () => {
        closeModals();
        this.appDiv.querySelector("#modal-overlay")?.classList.remove("hidden");

        const inviteModal = this.appDiv.querySelector(
          "#modal-invite-board",
        ) as HTMLElement;
        if (!inviteModal) return;

        const newInviteModal = inviteModal.cloneNode(true) as HTMLElement;
        inviteModal.replaceWith(newInviteModal);

        newInviteModal.classList.remove("hidden");

        const linkInput = newInviteModal.querySelector(
          "#invite-link-input",
        ) as HTMLInputElement;
        const emailInput = newInviteModal.querySelector(
          "#invite-email-input",
        ) as HTMLInputElement;
        const confirmBtn = newInviteModal.querySelector(
          "#btn-confirm-invite",
        ) as HTMLButtonElement;
        const roleBtn = newInviteModal.querySelector(
          "#invite-role-btn",
        ) as HTMLButtonElement;
        const roleText = newInviteModal.querySelector(
          "#invite-role-text",
        ) as HTMLElement;
        const roleDropdown = newInviteModal.querySelector(
          "#invite-role-dropdown",
        ) as HTMLElement;
        const roleContainer = newInviteModal.querySelector(
          "#invite-role-select-container",
        ) as HTMLElement;

        const tabMember = newInviteModal.querySelector(
          "#tab-invite-member",
        ) as HTMLButtonElement;
        const tabGuest = newInviteModal.querySelector(
          "#tab-invite-guest",
        ) as HTMLButtonElement;

        if (linkInput) linkInput.value = "Загрузка ссылки...";
        if (emailInput) emailInput.value = "";
        if (confirmBtn) {
          confirmBtn.disabled = true;
          confirmBtn.textContent = "Пригласить";
        }

        let currentRole = "editor";

        const generateLink = async (role: string) => {
          if (!state.boardId) return;
          try {
            const res = await boardsApi.createInvite(state.boardId, {
              default_role: role,
              expire_seconds: 86400 * 7,
            });
            if (linkInput) {
              linkInput.value = `${window.location.origin}/invite/${res.data.invite_link}`;
            }
          } catch {
            if (linkInput) linkInput.value = "Ошибка при генерации ссылки";
          }
        };

        generateLink(currentRole);

        let cachedMembers: any[] = [];
        let myEmail = "";

        const renderMembersList = (filter = "") => {
          const listContainer = newInviteModal.querySelector(
            "#invite-members-list",
          );
          if (!listContainer) return;

          const filtered = cachedMembers.filter((m) => {
            const name = (m.display_name || "").toLowerCase();
            const email = (m.email || "").toLowerCase();
            const term = filter.toLowerCase().trim();
            return name.includes(term) || email.includes(term);
          });

          listContainer.innerHTML = "";

          if (filtered.length === 0) {
            listContainer.innerHTML = `<div style="text-align: center; color: #666; padding: 1.5rem; font-size: 0.9rem;">Ничего не найдено</div>`;
            return;
          }

          const myMember = cachedMembers.find(
            (m) => m.email.toLowerCase().trim() === myEmail,
          );
          const myRole = myMember?.role || "";

          const canManage =
            myRole === "admin" || myRole === "owner" || myRole === "creator";

          const roleLabels: Record<string, string> = {
            admin: "Админ",
            editor: "Участник",
            viewer: "Гость",
            owner: "Владелец",
            creator: "Владелец",
          };

          filtered.forEach((m) => {
            const item = document.createElement("div");
            item.className = "invite-modal__member-item";

            const avatarHtml = m.avatar_url
              ? `<img src="${m.avatar_url}" class="invite-modal__member-avatar" alt="Avatar">`
              : `<div class="invite-modal__member-avatar-fallback">${(m.display_name || "U").charAt(0).toUpperCase()}</div>`;

            const isSelf = m.email.toLowerCase().trim() === myEmail;
            const isOwner = m.role === "owner" || m.role === "creator";

            const canDeleteThisMember = canManage && !isSelf && !isOwner;
            const canEditThisMemberRole = canManage && !isSelf && !isOwner;

            const roleLabel = roleLabels[m.role] || m.role || "Участник";

            const roleSelectorHtml = canEditThisMemberRole
              ? `
              <div class="invite-modal__member-role-dropdown-container">
                <button type="button" class="invite-modal__member-role-trigger">
                  <span class="invite-modal__member-role-text">${roleLabel}</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ccc" stroke-width="2">
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </button>
              </div>`
              : `<span class="invite-modal__member-role-static">${roleLabel}</span>`;

            const deleteButtonHtml = canDeleteThisMember
              ? `
              <button class="invite-modal__member-delete-btn" title="Удалить участника">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
              </button>`
              : "";

            item.innerHTML = `
              <div class="invite-modal__member-left">
                ${avatarHtml}
                <div class="invite-modal__member-info">
                  <span class="invite-modal__member-name" title="${m.display_name || "Без имени"}">${m.display_name || "Без имени"}</span>
                  <span class="invite-modal__member-email" title="${m.email}">${m.email}</span>
                </div>
              </div>
              <div class="invite-modal__member-right">
                ${roleSelectorHtml}
                ${deleteButtonHtml}
              </div>
            `;

            if (canEditThisMemberRole) {
              const trigger = item.querySelector(
                ".invite-modal__member-role-trigger",
              ) as HTMLButtonElement;

              trigger?.addEventListener("click", (e) => {
                e.stopPropagation();
                document
                  .querySelectorAll(".invite-modal__active-role-dropdown")
                  .forEach((el) => el.remove());

                const dropdown = document.createElement("div");
                dropdown.className =
                  "invite-modal__member-role-dropdown invite-modal__active-role-dropdown";
                dropdown.innerHTML = `
                  <div class="invite-modal__member-role-option" data-role="viewer">Гость</div>
                  <div class="invite-modal__member-role-option" data-role="editor">Участник</div>
                  <div class="invite-modal__member-role-option" data-role="admin">Админ</div>
                `;

                const rect = trigger.getBoundingClientRect();
                dropdown.style.position = "fixed";
                dropdown.style.top = `${rect.bottom + 4}px`;
                dropdown.style.left = `${rect.left}px`;
                dropdown.style.width = `${rect.width}px`;
                dropdown.style.zIndex = "10005";

                document.body.appendChild(dropdown);

                const options = dropdown.querySelectorAll(
                  ".invite-modal__member-role-option",
                );
                options.forEach((opt) => {
                  opt.addEventListener("click", async (ev) => {
                    ev.stopPropagation();
                    const nextRole = opt.getAttribute("data-role") || "editor";
                    dropdown.remove();

                    try {
                      await boardsApi.updateMemberRole(state.boardId!, m.link, {
                        new_role: nextRole,
                      });
                      Toast.success("Роль участника обновлена");
                      m.role = nextRole;
                      renderMembersList(searchInput?.value.trim() || "");
                      KanbanActions.fetchKanban(state.boardId!, true);
                    } catch (err: any) {
                      const msg =
                        err?.data?.message ||
                        err?.data?.error ||
                        "Не удалось обновить роль";
                      Toast.error(msg);
                    }
                  });
                });
              });
            }

            if (canDeleteThisMember) {
              const deleteBtn = item.querySelector(
                ".invite-modal__member-delete-btn",
              ) as HTMLButtonElement;
              deleteBtn?.addEventListener("click", () => {
                showConfirmModal({
                  title: "Удалить участника",
                  text: `Вы уверены, что хотите удалить участника "${m.display_name || m.email}" с этой доски?`,
                  confirmLabel: "Удалить",
                  onConfirm: async () => {
                    try {
                      await boardsApi.removeMember(state.boardId!, m.link);
                      Toast.success("Участник удален с доски");
                      KanbanActions.fetchKanban(state.boardId!, true);

                      cachedMembers = cachedMembers.filter(
                        (member) => member.link !== m.link,
                      );
                      renderMembersList(searchInput?.value.trim() || "");
                    } catch (err: any) {
                      const msg =
                        err?.data?.message ||
                        err?.data?.error ||
                        "Не удалось удалить участника";
                      Toast.error(msg);
                    }
                  },
                });
              });
            }

            listContainer.appendChild(item);
          });
        };

        const loadMembersAndRender = async () => {
          const listContainer = newInviteModal.querySelector(
            "#invite-members-list",
          );
          if (listContainer) {
            listContainer.innerHTML = `<div style="text-align: center; color: #888; padding: 1.5rem; font-size: 0.9rem;">Загрузка участников...</div>`;
          }
          try {
            myEmail = (currentUser?.email || "").toLowerCase().trim();
            if (!myEmail) {
              try {
                const profileRes = await profileApi.getProfile();
                myEmail = (profileRes.data.email || "").toLowerCase().trim();
              } catch {}
            }

            const res = await boardsApi.getBoardUsers(state.boardId!);
            cachedMembers = res.data.members;

            const activeSearchInput = newInviteModal.querySelector(
              "#invite-members-search",
            ) as HTMLInputElement;
            renderMembersList(
              activeSearchInput ? activeSearchInput.value.trim() : "",
            );
          } catch {
            if (listContainer) {
              listContainer.innerHTML = `<div style="text-align: center; color: #ff5c5c; padding: 1.5rem; font-size: 0.9rem;">Ошибка при загрузке участников</div>`;
            }
          }
        };

        const searchInput = newInviteModal.querySelector(
          "#invite-members-search",
        ) as HTMLInputElement;
        if (searchInput) {
          searchInput.value = "";
          const newSearchInput = searchInput.cloneNode(
            true,
          ) as HTMLInputElement;
          searchInput.replaceWith(newSearchInput);

          newSearchInput.addEventListener("input", (e) => {
            const target = e.target as HTMLInputElement;
            renderMembersList(target.value.trim());
          });
        }

        loadMembersAndRender();

        document.addEventListener("click", () => {
          document
            .querySelectorAll(".invite-modal__active-role-dropdown")
            .forEach((el) => el.remove());
        });

        newInviteModal
          .querySelector("#invite-members-list")
          ?.addEventListener("scroll", () => {
            document
              .querySelectorAll(".invite-modal__active-role-dropdown")
              .forEach((el) => el.remove());
          });
        newInviteModal.addEventListener("scroll", () => {
          document
            .querySelectorAll(".invite-modal__active-role-dropdown")
            .forEach((el) => el.remove());
        });

        tabMember?.addEventListener("click", () => {
          tabMember.classList.add("active");
          tabGuest.classList.remove("active");
          roleContainer.classList.remove("hidden");
          currentRole = "editor";
          if (roleText) roleText.textContent = "Участник";
          generateLink(currentRole);
        });

        tabGuest?.addEventListener("click", () => {
          tabGuest.classList.add("active");
          tabMember.classList.remove("active");
          roleContainer.classList.add("hidden");
          currentRole = "viewer";
          generateLink(currentRole);
        });

        roleBtn?.addEventListener("click", (ev) => {
          ev.stopPropagation();
          roleDropdown?.classList.toggle("hidden");
        });

        roleDropdown
          ?.querySelectorAll(".invite-modal__dropdown-item")
          .forEach((item) => {
            item.addEventListener("click", (ev) => {
              ev.stopPropagation();
              const role = item.getAttribute("data-role") || "editor";
              const visibleName = item.textContent?.trim() || "Участник";
              currentRole = role;
              if (roleText) roleText.textContent = visibleName;
              roleDropdown.classList.add("hidden");
              generateLink(currentRole);
            });
          });

        const closeDropdown = () => {
          roleDropdown?.classList.add("hidden");
        };
        document.addEventListener("click", closeDropdown);

        emailInput?.addEventListener("input", () => {
          const val = emailInput.value.trim();
          const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
          if (confirmBtn) {
            confirmBtn.disabled = !isValid;
          }
        });

        newInviteModal
          .querySelector("#btn-copy-invite-link")
          ?.addEventListener("click", () => {
            if (
              linkInput &&
              linkInput.value &&
              !linkInput.value.startsWith("Загрузка")
            ) {
              navigator.clipboard.writeText(linkInput.value).then(() => {
                Toast.success("Ссылка скопирована!");
              });
            }
          });

        newInviteModal
          .querySelector("#btn-cancel-invite")
          ?.addEventListener("click", closeModals);
        newInviteModal
          .querySelector("#btn-close-invite")
          ?.addEventListener("click", closeModals);

        confirmBtn?.addEventListener("click", async () => {
          const email = emailInput.value.trim();
          if (!email) return;

          confirmBtn.disabled = true;
          confirmBtn.textContent = "Отправка...";

          try {
            await boardsApi.createInvite(state.boardId!, {
              default_role: currentRole,
              expire_seconds: 86400 * 7,
            });
            Toast.success(`Приглашение отправлено на ${email}!`);
            closeModals();
          } catch {
            Toast.error("Не удалось отправить приглашение");
            confirmBtn.disabled = false;
            confirmBtn.textContent = "Пригласить";
          }
        });
      },
      { signal },
    );

    this.appDiv
      .querySelector("#btn-gantt-filter")
      ?.addEventListener("click", (e) => {
        e.stopPropagation();
        const popover = this.appDiv.querySelector(
          "#gantt-filter-popover",
        ) as HTMLElement;
        if (popover) {
          const wasHidden = popover.classList.contains("hidden");
          closeModals();
          if (wasHidden) {
            popover.classList.remove("hidden");
            this.tempGanttFilterStartDate = this.ganttFilterStartDate
              ? new Date(this.ganttFilterStartDate)
              : new Date(Date.now() - 3 * 86400000);
            this.tempGanttFilterEndDate = this.ganttFilterEndDate
              ? new Date(this.ganttFilterEndDate)
              : new Date(Date.now() + 3 * 86400000);
            this.renderGanttFilterPopover(state);
          }
        }
      });

    const filterPopover = this.appDiv.querySelector("#gantt-filter-popover");
    filterPopover?.addEventListener("click", (e) => {
      e.stopPropagation();
    });

    if (state.boardId) {
      KanbanColumnManager.bind(this.appDiv, state, closeModals, signal);
      KanbanTaskCreation.bind(this.appDiv, state, closeModals, signal);
      KanbanContextMenus.bind(this.appDiv, state, signal);
      if (state.myRole !== "viewer") {
        KanbanDragAndDrop.bind(this.appDiv, state.boardId, signal);
      }
    }
  }
}
```

src/modules/kanban/components/KanbanTaskCreation.ts:
```typescript
import { KanbanActions } from "../KanbanActions";
import { KanbanState } from "../kanban.types";
import { kanbanStore } from "../KanbanStore";
import { KanbanContextMenus } from "./KanbanContextMenus";

export class KanbanTaskCreation {
  public static bind(appDiv: HTMLElement, state: KanbanState, closeModals: () => void, signal: AbortSignal): void {
    const btnNewTask = appDiv.querySelector<HTMLButtonElement>("#btn-new-task");
    if (btnNewTask && state.sections.length === 0) {
      btnNewTask.disabled = true;
      btnNewTask.classList.add("kanban__action-btn--disabled");
    }

    const modalCreateTask = appDiv.querySelector<HTMLElement>("#modal-create-task");
    const modalOverlay = appDiv.querySelector<HTMLElement>("#modal-overlay");
    const taskTitleInput = appDiv.querySelector<HTMLInputElement>("#new-task-title");
    const btnConfirmCreateTask = appDiv.querySelector<HTMLButtonElement>("#btn-confirm-create-task");
    const modalAssigneeBtn = appDiv.querySelector<HTMLElement>("#assignee-select-btn");
    let selectedAssigneeId: string;
    let activeSectionId: string = state.sections[0]?.id ?? "";

    const setConfirmDisabled = (disabled: boolean) => {
      if (!btnConfirmCreateTask) return;
      btnConfirmCreateTask.disabled = disabled;
    };

    const openCreateModal = (sectionId?: string) => {
      if (state.sections.length === 0) return;
      activeSectionId = sectionId ?? state.sections[0].id;
      closeModals();
      modalOverlay?.classList.remove("hidden");
      modalCreateTask?.classList.remove("hidden");
      if (taskTitleInput) {
        taskTitleInput.value = "";
        taskTitleInput.focus();
      }
      if (modalAssigneeBtn) modalAssigneeBtn.textContent = "Выбрать...";
      selectedAssigneeId = undefined!;
      setConfirmDisabled(true);
    };

    taskTitleInput?.addEventListener("input", () => {
      setConfirmDisabled(!taskTitleInput.value.trim());
    }, { signal });

    btnNewTask?.addEventListener("click", () => openCreateModal(), { signal });

    modalAssigneeBtn?.addEventListener("click", (e: MouseEvent) => {
      e.stopPropagation();
      KanbanContextMenus.closeMenu();
      document.querySelectorAll(".assignee-dropdown").forEach((dd) => dd.remove());

      const dropdown = document.createElement("div");
      dropdown.className = "assignee__dropdown assignee-dropdown";

      const searchContainer = document.createElement("div");
      searchContainer.className = "assignee__search-container";
      const searchInput = document.createElement("input");
      searchInput.type = "text";
      searchInput.placeholder = "Поиск...";
      searchInput.className = "assignee__search-input";
      searchContainer.appendChild(searchInput);
      dropdown.appendChild(searchContainer);

      const listContainer = document.createElement("div");
      listContainer.className = "assignee__list-container";
      dropdown.appendChild(listContainer);

      const renderList = (filter = "") => {
        listContainer.innerHTML = "";

        if ("Не назначен".toLowerCase().includes(filter.toLowerCase())) {
          const clearItem = document.createElement("div");
          clearItem.className = "assignee__dropdown-item assignee__dropdown-item--clear";
          clearItem.innerHTML = `<div class="assignee__avatar assignee__avatar--clear">?</div><div class="assignee__info"><span class="assignee__name">Не назначен</span></div>`;
          clearItem.addEventListener("click", () => {
            selectedAssigneeId = undefined!;
            if (modalAssigneeBtn) modalAssigneeBtn.textContent = "Выбрать...";
            dropdown.remove();
          });
          listContainer.appendChild(clearItem);
        }

        state.users
          .filter((u) => u.name.toLowerCase().includes(filter.toLowerCase()))
          .forEach((user) => {
            const item = document.createElement("div");
            item.className = "assignee__dropdown-item";
            if (user.id === selectedAssigneeId) item.classList.add("assignee__dropdown-item--selected");
            item.innerHTML = `
              ${user.avatarUrl ? `<img src="${user.avatarUrl}" class="assignee__avatar assignee__avatar--img">` : `<div class="assignee__avatar">${user.name.charAt(0).toUpperCase()}</div>`}
              <div class="assignee__info">
                <span class="assignee__name">${user.name}</span>
                <span class="assignee__email">${user.email}</span>
              </div>
            `;
            item.addEventListener("click", () => {
              selectedAssigneeId = user.id;
              if (modalAssigneeBtn) {
                modalAssigneeBtn.innerHTML = `
                  ${user.avatarUrl ? `<img src="${user.avatarUrl}" class="assignee__avatar-small">` : `<div class="assignee__avatar-fallback-small">${user.name.charAt(0).toUpperCase()}</div>`}
                  ${user.name}
                `;
              }
              dropdown.remove();
            });
            listContainer.appendChild(item);
          });
      };

      renderList();
      searchInput.addEventListener("input", (e) => renderList((e.target as HTMLInputElement).value));

      if (modalAssigneeBtn.parentElement) {
        modalAssigneeBtn.parentElement.classList.add("relative-wrapper");
        modalAssigneeBtn.parentElement.appendChild(dropdown);
      }
      searchInput.focus();
    }, { signal });

    btnConfirmCreateTask?.addEventListener("click", () => {
      const title = taskTitleInput?.value.trim();
      if (!title || state.sections.length === 0) return;

      btnConfirmCreateTask.disabled = true;
      KanbanActions.createTask(state.boardId!, activeSectionId, title, selectedAssigneeId);
      closeModals();
    }, { signal });

    appDiv.querySelectorAll<HTMLButtonElement>(".kanban__add-card-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const parent = btn.parentElement;
        if (!parent) return;

        const sectionId = parent.getAttribute("data-section-id")!;

        if (window.innerWidth <= 768) {
          openCreateModal(sectionId);
          return;
        }

        parent.innerHTML = `<div class="kanban__add-card-form"><textarea class="kanban__add-card-input" id="inline-new-task-${sectionId}" placeholder="Введите имя карточки..." maxlength="50" autofocus></textarea></div>`;
        const input = document.getElementById(`inline-new-task-${sectionId}`) as HTMLTextAreaElement;
        input.focus();

        const saveTask = () => {
          const val = input.value.trim();
          if (val) KanbanActions.createTask(state.boardId!, sectionId, val);
          else kanbanStore.emit("change");
        };

        input.addEventListener("blur", saveTask, { signal });
        input.addEventListener("keydown", (e: KeyboardEvent) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            input.blur();
          } else if (e.key === "Escape") {
            input.value = "";
            input.blur();
          }
        }, { signal });
      }, { signal });
    });
  }
}
```

src/modules/kanban/components/KanbanDragAndDrop.ts:
```typescript
import { KanbanActions } from "../KanbanActions";

export class KanbanDragAndDrop {
  public static bind(appDiv: HTMLElement, boardId: string, signal: AbortSignal): void {
    let draggedTaskId: string | null = null;
    let sourceSectionId: string | null = null;
    let draggedElement: HTMLElement | null = null;
    let initialIndex: number | null = null;

    appDiv.querySelectorAll<HTMLElement>(".kanban-card").forEach((card) => {
      card.addEventListener("dragstart", (e: DragEvent) => {
        draggedTaskId = card.getAttribute("data-id");
        draggedElement = card;

        const columnCards = card.closest(".kanban__column-cards");
        sourceSectionId = columnCards?.getAttribute("data-section-id") || null;
        initialIndex = columnCards ? Array.from(columnCards.querySelectorAll(".kanban-card")).indexOf(card) : null;

        if (e.dataTransfer) {
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData("text/plain", draggedTaskId || "");
        }
        setTimeout(() => (card.classList.add("kanban-card--dragging")), 0);
      }, { signal });

      card.addEventListener("dragend", () => {
        if (draggedElement) draggedElement.classList.remove("kanban-card--dragging");
        draggedElement = null;
        draggedTaskId = null;
        sourceSectionId = null;
      }, { signal });
    });

    appDiv.querySelectorAll<HTMLElement>(".kanban__column-cards").forEach((dropZone) => {
      dropZone.addEventListener("dragover", (e: DragEvent) => {
        e.preventDefault();
        if (e.dataTransfer) e.dataTransfer.dropEffect = "move";

        if (!draggedElement) return;

        const targetCard = (e.target as HTMLElement).closest(".kanban-card") as HTMLElement;
        const isDifferentCard = targetCard && targetCard !== draggedElement;
        if (isDifferentCard) {
          const rect = targetCard.getBoundingClientRect();
          const middleY = rect.top + rect.height / 2;
          const shouldInsertAfter = e.clientY > middleY;
          dropZone.insertBefore(draggedElement, shouldInsertAfter ? targetCard.nextSibling : targetCard);
        } else {
          const targetDropZone = (e.target as HTMLElement).closest('.kanban__column-cards');
          const isTargetDropZone = e.target === dropZone || targetDropZone === dropZone;
          if (isTargetDropZone) {
            if (!dropZone.contains(draggedElement)) {
              dropZone.appendChild(draggedElement);
            }
          }
        }
      }, { signal });

      dropZone.addEventListener("drop", (e: DragEvent) => {
        e.preventDefault();
        const targetSectionId = dropZone.getAttribute("data-section-id");

        if (draggedTaskId && targetSectionId && draggedElement) {
          const cards = Array.from(dropZone.querySelectorAll(".kanban-card"));

          const position = cards.indexOf(draggedElement);
          const oldPosition = initialIndex !== null ? initialIndex : -1;

          if (targetSectionId !== sourceSectionId || position !== oldPosition) {
            KanbanActions.moveTask(boardId, draggedTaskId, sourceSectionId ?? targetSectionId, targetSectionId, position);

            initialIndex = position;
            sourceSectionId = targetSectionId;
          }
        }
      }, { signal });
    });
  }
}
```

src/modules/kanban/components/KanbanContextMenus.ts:
```typescript
import { KanbanActions } from "../KanbanActions";
import { KanbanState } from "../kanban.types";
import { navigateTo } from "../../../router";
import { Toast } from "../../../utils/toast";
import { kanbanApi } from "../../../api";
import { showConfirmModal } from "../../../utils/confirmModal";
import { kanbanStore } from "../KanbanStore";

export class KanbanContextMenus {
  private static activeMenu: HTMLElement | null = null;

  public static bind(
    appDiv: HTMLElement,
    state: KanbanState,
    signal: AbortSignal,
  ): void {
    document.addEventListener("click", () => this.closeMenu(), { signal });

    appDiv
      .querySelectorAll<HTMLElement>(".kanban__btn-col-options")
      .forEach((btn) => {
        btn.addEventListener(
          "click",
          (e: MouseEvent) => {
            e.stopPropagation();
            this.closeMenu();
            const target = e.currentTarget as HTMLElement;
            const sectionId = target.getAttribute("data-id")!;

            const menu = this.createMenuNode(
              `
          <div class="context-menu__item" id="ctx-edit-list">Изменить</div>
          <div class="context-menu__item context-menu__item--danger" id="ctx-delete-list">Удалить колонку</div>
        `,
              target,
            );

            menu
              .querySelector("#ctx-edit-list")
              ?.addEventListener("click", () => {
                navigateTo(
                  `/section?boardId=${state.boardId}&sectionId=${sectionId}`,
                );
              });

            menu
              .querySelector("#ctx-delete-list")
              ?.addEventListener("click", () => {
                if (state.sections[0]?.id === sectionId)
                  return Toast.error("Нельзя удалять бэклог");
                KanbanActions.deleteSection(state.boardId!, sectionId);
              });
          },
          { signal },
        );
      });

    appDiv
      .querySelectorAll<HTMLInputElement>(".kanban-subtask-checkbox")
      .forEach((cb) => {
        cb.addEventListener("change", () => {
          const subtaskId = cb.getAttribute("data-id");
          const desc = cb.getAttribute("data-desc");
          const card = cb.closest(".kanban-card") as HTMLElement | null;

          const textSpan = cb.parentElement?.querySelector(
            ".kanban-card__subtask-text",
          );
          if (cb.checked) {
            textSpan?.classList.add("kanban-card__subtask-text--done");
          } else {
            textSpan?.classList.remove("kanban-card__subtask-text--done");
          }

          if (card) {
            const checkboxes = card.querySelectorAll<HTMLInputElement>(
              ".kanban-subtask-checkbox",
            );
            const total = checkboxes.length;
            const done = Array.from(checkboxes).filter((c) => c.checked).length;
            const percent = total > 0 ? Math.round((done / total) * 100) : 0;

            const progressFill = card.querySelector(
              ".kanban-card__progress-fill",
            ) as HTMLElement | null;
            if (progressFill) {
              progressFill.style.width = `${percent}%`;
            }

            const subtasksTitle = card.querySelector(
              ".kanban-card__subtasks-title",
            );
            if (subtasksTitle) {
              subtasksTitle.textContent = `Подзадачи ${done}/${total}`;
            }

            const taskId = card.getAttribute("data-id");
            if (taskId && subtaskId && desc) {
              kanbanStore.updateSubtaskSilently(
                taskId,
                subtaskId,
                cb.checked,
                desc,
              );
            }
          }

          if (subtaskId && desc) {
            kanbanApi.updateSubtask(subtaskId, {
              is_done: cb.checked,
              description: desc,
            });
          }
        });
      });

    appDiv
      .querySelectorAll<HTMLElement>(".kanban-card__options-btn")
      .forEach((btn) => {
        btn.addEventListener(
          "click",
          (e: MouseEvent) => {
            e.stopPropagation();
            this.closeMenu();
            const target = e.currentTarget as HTMLElement;
            const taskId = target.getAttribute("data-id")!;
            const title = target.getAttribute("data-title") || "";

            const menu = this.createMenuNode(
              `
          <div class="context-menu__item" id="ctx-edit-card">Открыть</div>
          <div class="context-menu__item context-menu__item--danger" id="ctx-delete-card">Удалить</div>
        `,
              target,
            );

            menu
              .querySelector("#ctx-edit-card")
              ?.addEventListener("click", () => {
                navigateTo(
                  `/task?boardId=${state.boardId}&taskId=${taskId}&title=${encodeURIComponent(title)}`,
                );
              });

            menu
              .querySelector("#ctx-delete-card")
              ?.addEventListener("click", () => {
                this.closeMenu();
                showConfirmModal({
                  title: "Удалить карточку",
                  text: `Вы уверены, что хотите удалить карточку "${title}"?`,
                  confirmLabel: "Удалить",
                  onConfirm: () =>
                    KanbanActions.deleteTask(state.boardId!, taskId),
                });
              });
          },
          { signal },
        );
      });

    appDiv
      .querySelectorAll<HTMLElement>(".kanban-card__status-checkmark")
      .forEach((btn) => {
        btn.addEventListener(
          "click",
          async (e: MouseEvent) => {
            e.stopPropagation();
            const card = btn.closest(".kanban-card") as HTMLElement | null;
            if (!card) return;
            const taskId = card.getAttribute("data-id");
            if (!taskId) return;

            const isCurrentlyDone = btn.classList.contains(
              "kanban-card__status-checkmark--active",
            );
            const nextDone = !isCurrentlyDone;

            const titleEl = card.querySelector(".kanban-card__title");

            if (nextDone) {
              card.classList.add("kanban-card--done");
              btn.classList.add("kanban-card__status-checkmark--active");
              titleEl?.classList.add("kanban-card__title--done");
            } else {
              card.classList.remove("kanban-card--done");
              btn.classList.remove("kanban-card__status-checkmark--active");
              titleEl?.classList.remove("kanban-card__title--done");
            }

            try {
              await kanbanApi.updateTaskStatus(taskId, { done: nextDone });
              await KanbanActions.fetchKanban(state.boardId!, true);
            } catch (err) {
              Toast.error("Не удалось обновить статус задачи");

              if (isCurrentlyDone) {
                card.classList.add("kanban-card--done");
                btn.classList.add("kanban-card__status-checkmark--active");
                titleEl?.classList.add("kanban-card__title--done");
              } else {
                card.classList.remove("kanban-card--done");
                btn.classList.remove("kanban-card__status-checkmark--active");
                titleEl?.classList.remove("kanban-card__title--done");
              }
              await KanbanActions.fetchKanban(state.boardId!, true);
            }
          },
          { signal },
        );
      });

    appDiv.querySelectorAll<HTMLElement>(".kanban-card").forEach((card) => {
      card.addEventListener(
        "click",
        (e: MouseEvent) => {
          const target = e.target as HTMLElement;

          if (
            target.closest(".kanban-card__options-btn") ||
            target.closest(".assignee__select-btn") ||
            target.closest(".kanban-card__subtask-item") ||
            target.closest(".kanban-card__status-checkmark")
          ) {
            return;
          }

          const subtasksHeader = target.closest(
            ".kanban-card__subtasks-header",
          );
          if (subtasksHeader) {
            e.stopPropagation();
            const list = subtasksHeader.nextElementSibling;
            if (list) {
              list.classList.toggle("hidden");
              const svg = subtasksHeader.querySelector("svg");
              if (svg) {
                if (list.classList.contains("hidden")) {
                  svg.classList.remove("kanban-card__subtasks-icon--expanded");
                } else {
                  svg.classList.add("kanban-card__subtasks-icon--expanded");
                }
              }
            }
            return;
          }

          const subtasksList = target.closest(".kanban-card__subtasks-list");
          if (subtasksList) {
            e.stopPropagation();
            return;
          }

          const taskId = card.getAttribute("data-id");
          const title = card.getAttribute("data-title") || "";
          navigateTo(
            `/task?boardId=${state.boardId}&taskId=${taskId}&title=${encodeURIComponent(title)}`,
          );
        },
        { signal },
      );
    });
  }

  public static closeMenu(): void {
    if (this.activeMenu) {
      this.activeMenu.remove();
      this.activeMenu = null;
    }
  }

  private static createMenuNode(
    innerHTML: string,
    targetBtn: HTMLElement,
  ): HTMLElement {
    const menu = document.createElement("div");
    menu.className = "context-menu";
    menu.innerHTML = innerHTML;

    const rect = targetBtn.getBoundingClientRect();
    menu.style.top = `${rect.bottom + window.scrollY + 8}px`;
    menu.style.left = `${rect.left + window.scrollX - 150}px`;
    document.body.appendChild(menu);
    this.activeMenu = menu;

    return menu;
  }
}
```

src/modules/kanban/components/KanbanColumnManager.ts:
```typescript
import { KanbanActions } from "../KanbanActions";
import { KanbanState, Section } from "../kanban.types";
import { Toast } from "../../../utils/toast";

export class KanbanColumnManager {
  public static bind(appDiv: HTMLElement, state: KanbanState, closeModals: () => void, signal: AbortSignal): void {
    this.bindCreation(appDiv, state.boardId!, closeModals, signal);

    const btnManage = appDiv.querySelector("#btn-manage-columns");
    const modalManage = appDiv.querySelector<HTMLElement>("#modal-manage-columns");
    const modalOverlay = appDiv.querySelector<HTMLElement>("#modal-overlay");
    const manageList = appDiv.querySelector<HTMLElement>("#manage-columns-list");

    btnManage?.addEventListener("click", () => {
      closeModals();
      if (manageList) this.renderManageList(state.boardId!, state.sections, manageList);
      modalOverlay?.classList.remove("hidden");
      modalManage?.classList.remove("hidden");
    }, { signal });

    appDiv.querySelector("#btn-close-manage")?.addEventListener("click", () => {
      closeModals();
    });
  }

  private static bindCreation(appDiv: HTMLElement, boardId: string, closeModals: () => void, signal: AbortSignal): void {
    const modalCreateColumn = appDiv.querySelector<HTMLElement>("#modal-create-column");
    const modalOverlay = appDiv.querySelector<HTMLElement>("#modal-overlay");
    const inputName = appDiv.querySelector<HTMLInputElement>("#create-col-name");
    const inputMax = appDiv.querySelector<HTMLInputElement>("#create-col-max");
    const inputMandatory = appDiv.querySelector<HTMLInputElement>("#create-col-mandatory");
    const btnCreate = appDiv.querySelector<HTMLButtonElement>("#btn-confirm-create-column");
    let selectedColor = "white";

    const openCreateColumn = () => {
      closeModals();
      modalOverlay?.classList.remove("hidden");
      modalCreateColumn?.classList.remove("hidden");
      if (inputName) inputName.value = "";
      if (inputMax) inputMax.value = "";
      if (inputMandatory) inputMandatory.checked = false;
      if (btnCreate) btnCreate.disabled = true;
      setTimeout(() => inputName?.focus(), 100);
    };

    appDiv.querySelector("#btn-add-column")?.addEventListener("click", openCreateColumn, { signal });
    appDiv.querySelector("#btn-add-column-modal")?.addEventListener("click", openCreateColumn, { signal });

    inputName?.addEventListener("input", () => {
      if (btnCreate) btnCreate.disabled = !inputName.value.trim();
    }, { signal });

    appDiv.querySelectorAll<HTMLButtonElement>(".create-column-form__color-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        appDiv.querySelectorAll(".create-column-form__color-btn").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        selectedColor = btn.getAttribute("data-color") || "white";
      }, { signal });
    });

    btnCreate?.addEventListener("click", () => {
      const name = inputName?.value.trim();
      if (!name) return;
      const max = parseInt(inputMax?.value || "", 10);

      btnCreate.disabled = true;
      KanbanActions.createSection(boardId, name, isNaN(max) || max <= 0 ? 100 : max, inputMandatory?.checked || false, selectedColor);
      closeModals();
    }, { signal });
  }

  private static renderManageList(boardId: string, sections: Section[], container: HTMLElement): void {
    container.innerHTML = sections.map((s) => `
      <div class="manage-columns__item" data-id="${s.id}" draggable="true">
        <div class="manage-columns__left">
          <div class="manage-columns__dot bg-${s.color}"></div>
          <input type="text" class="manage-columns__name" value="${s.section_name}" data-id="${s.id}" placeholder="Имя колонки">
        </div>
        <div class="manage-columns__actions">
          <button class="icon-btn manage-columns__delete" data-id="${s.id}" data-name="${s.section_name}">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ff5c5c" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
          <div class="manage-columns__color-trigger bg-${s.color}" data-id="${s.id}"></div>
          <div class="manage-columns__drag">≡</div>
        </div>
      </div>
    `).join("");

    let draggedItem: HTMLElement | null = null;

    container.querySelectorAll<HTMLElement>(".manage-columns__item").forEach((el) => {
      el.addEventListener("dragstart", () => {
        draggedItem = el;
        setTimeout(() => el.classList.add("kanban-card--dragging"), 0);
      });
      el.addEventListener("dragend", () => {
        el.classList.remove("kanban-card--dragging");
        draggedItem = null;
        const newOrder = Array.from(container.querySelectorAll(".manage-columns__item")).map(i => i.getAttribute("data-id")!);
        KanbanActions.reorderSections(boardId, newOrder);
      });
      el.addEventListener("dragover", (e: DragEvent) => {
        e.preventDefault();
        const target = e.currentTarget as HTMLElement;
        if (target && target !== draggedItem) {
          const rect = target.getBoundingClientRect();
          const next = e.clientY - rect.top > rect.height / 2;
          container.insertBefore(draggedItem!, next ? target.nextSibling : target);
        }
      });
    });

    container.querySelectorAll<HTMLInputElement>(".manage-columns__name").forEach((input) => {
      input.addEventListener("blur", () => {
        const id = input.getAttribute("data-id")!;
        const section = sections.find((s) => s.id === id);
        if (section && input.value.trim() && input.value.trim() !== section.section_name) {
          KanbanActions.updateSection(id, {
            link: id,
            name: input.value.trim(),
            color: section.color || "white",
            max_tasks: section.max_tasks || 100,
            position: section.position || 1,
            is_mandatory: section.is_mandatory || false,
          });
        }
      });
    });

    container.querySelectorAll<HTMLElement>(".manage-columns__color-trigger").forEach((trigger) => {
      trigger.addEventListener("click", (e: MouseEvent) => {
        e.stopPropagation();
        document.querySelector(".color-picker-dropdown")?.remove();

        const dropdown = document.createElement("div");
        dropdown.className = "color-picker-dropdown";

        const colors = [
          { name: "white" },
          { name: "grey" },
          { name: "red" },
          { name: "orange" },
          { name: "blue" },
          { name: "green" },
          { name: "purple" },
          { name: "pink" }
        ];

        colors.forEach(c => {
          const btn = document.createElement("button");
          btn.className = `color-picker-dropdown__btn bg-${c.name}`;
          btn.addEventListener("click", () => {
            const id = trigger.getAttribute("data-id")!;
            const section = sections.find((s) => s.id === id);
            if (section) {
              KanbanActions.updateSection(id, {
                link: id,
                name: section.section_name || "Секция",
                color: c.name,
                max_tasks: section.max_tasks || 100,
                position: section.position || 1,
                is_mandatory: section.is_mandatory || false,
              }).then(() => {
                dropdown.remove();
                trigger.className = `manage-columns__color-trigger bg-${c.name}`;
                (trigger.parentElement?.parentElement?.querySelector(".manage-columns__dot") as HTMLElement).className = `manage-columns__dot bg-${c.name}`;
              });
            }
          });
          dropdown.appendChild(btn);
        });

        const rect = trigger.getBoundingClientRect();
        dropdown.style.top = `${rect.bottom + window.scrollY + 8}px`;
        dropdown.style.left = `${rect.left + window.scrollX - 80}px`;
        document.body.appendChild(dropdown);

        const closeDropdown = (ev: MouseEvent) => {
          if (!dropdown.contains(ev.target as Node)) {
            dropdown.remove();
            document.removeEventListener("click", closeDropdown);
          }
        };
        setTimeout(() => document.addEventListener("click", closeDropdown), 0);
      });
    });

    container.querySelectorAll<HTMLButtonElement>(".manage-columns__delete").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id")!;
        if (sections[0]?.id === id) return Toast.error("Нельзя удалять бэклог");
        KanbanActions.deleteSection(boardId, id);

        document.querySelector("#modal-manage-columns")?.classList.add("hidden");
        document.querySelector("#modal-overlay")?.classList.add("hidden");
      });
    });
  }
}
```

src/modules/profile/ProfileStore.ts:
```typescript
import { Store } from '../../core/Store';
import { appDispatcher, Action } from '../../core/Dispatcher';
import { ProfileState, ActionTypes, UserProfile } from './profile.types';

const initialState: ProfileState = {
  user: null,
  isLoading: false,
  isSaving: false,
  isDeleteModalOpen: false,
  error: null,
};

class ProfileStore extends Store {
  private state: ProfileState = { ...initialState };

  public getState(): ProfileState {
    return this.state;
  }

  constructor() {
    super();
    appDispatcher.register((action: Action) => {
      switch (action.type) {
        case ActionTypes.SET_USER:
          this.state.user = action.payload as UserProfile;
          this.emit('change');
          break;
        case ActionTypes.SET_IS_LOADING:
          this.state.isLoading = action.payload as boolean;
          this.emit('change');
          break;
        case ActionTypes.SET_IS_SAVING:
          this.state.isSaving = action.payload as boolean;
          this.emit('change');
          break;
        case ActionTypes.SET_DELETE_MODAL_OPEN:
          this.state.isDeleteModalOpen = action.payload as boolean;
          this.emit('change');
          break;
        case ActionTypes.SET_ERROR:
          this.state.error = action.payload as string | null;
          this.emit('change');
          break;
        case ActionTypes.RESET_STATE:
          this.state = { ...initialState };
          this.emit('change');
          break;
      }
    });
  }
}

export const profileStore = new ProfileStore();
```

src/modules/profile/profile.types.ts:
```typescript
export interface UserProfile {
  display_name: string;
  description_user: string;
  email: string;
  avatar_url?: string;
}

export interface ProfileState {
  user: UserProfile | null;
  isLoading: boolean;
  isSaving: boolean;
  isDeleteModalOpen: boolean;
  error: string | null;
}

export const ActionTypes = {
  SET_USER: 'PROFILE_SET_USER',
  SET_IS_LOADING: 'PROFILE_SET_IS_LOADING',
  SET_IS_SAVING: 'PROFILE_SET_IS_SAVING',
  SET_DELETE_MODAL_OPEN: 'PROFILE_SET_DELETE_MODAL_OPEN',
  SET_ERROR: 'PROFILE_SET_ERROR',
  RESET_STATE: 'PROFILE_RESET_STATE',
};
```

src/modules/profile/ProfileActions.ts:
```typescript
import { appDispatcher } from '../../core/Dispatcher';
import { ActionTypes } from './profile.types';
import { authApi, profileApi } from '../../api';
import { navigateTo, setIsAuth } from '../../router';
import { Toast } from '../../utils/toast';

export const ProfileActions = {
  resetState() {
    appDispatcher.dispatch({ type: ActionTypes.RESET_STATE });
  },

  async fetchProfile() {
    appDispatcher.dispatch({ type: ActionTypes.SET_IS_LOADING, payload: true });
    try {
      const res = await profileApi.getProfile();
      const user = res.data;
      appDispatcher.dispatch({ type: ActionTypes.SET_USER, payload: user });
    } catch (err: any) {
      console.error('Profile fetch error', err);
      if (err?.status === 401) {
        localStorage.removeItem('isAuth');
        navigateTo('/login');
      } else {
        appDispatcher.dispatch({ type: ActionTypes.SET_ERROR, payload: 'Не удалось загрузить профиль' });
      }
    } finally {
      appDispatcher.dispatch({ type: ActionTypes.SET_IS_LOADING, payload: false });
    }
  },

  async updateProfile(displayName: string, descriptionUser: string) {
    appDispatcher.dispatch({ type: ActionTypes.SET_IS_SAVING, payload: true });
    try {
      await profileApi.updateProfile({
        display_name: displayName,
        description_user: descriptionUser,
      });
      await ProfileActions.fetchProfile();
    } catch (e) {
      console.error('Save profile failed', e);
      appDispatcher.dispatch({ type: ActionTypes.SET_ERROR, payload: 'Не удалось сохранить профиль' });
    } finally {
      appDispatcher.dispatch({ type: ActionTypes.SET_IS_SAVING, payload: false });
    }
  },

  async updateAvatar(file: File) {
    appDispatcher.dispatch({ type: ActionTypes.SET_IS_SAVING, payload: true });
    const fd = new FormData();
    fd.append('avatar', file);
    try {
      await profileApi.updateAvatar(fd);
      await ProfileActions.fetchProfile();
    } catch (err: any) {
      console.error('Avatar upload error', err);
      const status = err?.status;
      if (status === 413) {
        Toast.error('Изображение слишком большое');
      } else if (status === 415) {
        Toast.error('Неверный формат изображения');
      } else {
        Toast.error('Не удалось загрузить аватар');
      }
    } finally {
      appDispatcher.dispatch({ type: ActionTypes.SET_IS_SAVING, payload: false });
    }
  },

  async deleteAvatar() {
    appDispatcher.dispatch({ type: ActionTypes.SET_IS_SAVING, payload: true });
    try {
      await profileApi.deleteAvatar();
      appDispatcher.dispatch({ type: ActionTypes.SET_DELETE_MODAL_OPEN, payload: false });
      await ProfileActions.fetchProfile();
    } catch (err) {
      console.error('Avatar delete error', err);
      appDispatcher.dispatch({ type: ActionTypes.SET_ERROR, payload: 'Не удалось удалить аватар' });
    } finally {
      appDispatcher.dispatch({ type: ActionTypes.SET_IS_SAVING, payload: false });
    }
  },

  async logout(): Promise<void> {
    try {
      await authApi.logout();
    } catch (err: unknown) {
      console.error("Logout error", err);
    }
    
    setIsAuth(false);
    localStorage.removeItem("isAuth");
    navigateTo("/login");
  },

  openDeleteModal() {
    appDispatcher.dispatch({ type: ActionTypes.SET_DELETE_MODAL_OPEN, payload: true });
  },

  closeDeleteModal() {
    appDispatcher.dispatch({ type: ActionTypes.SET_DELETE_MODAL_OPEN, payload: false });
  }
};
```

src/modules/profile/index.ts:
```typescript
import { ProfileView } from './ProfileView';

let currentView: ProfileView | null = null;

export const renderProfileModule = (appDiv: HTMLElement): void => {
  if (currentView) {
    currentView.unmount();
  }
  currentView = new ProfileView(appDiv);
  currentView.mount();
};
```

src/modules/profile/ProfileView.ts:
```typescript
import Handlebars from 'handlebars';
import profileTpl from '../../templates/profile.hbs?raw';
import { profileStore } from './ProfileStore';
import { ProfileActions } from './ProfileActions';
import { navigateTo } from '../../router';
import { showConfirmModal } from '../../utils/confirmModal';
import { UserProfile } from './profile.types';

const template = Handlebars.compile(profileTpl);

export class ProfileView {
  private appDiv: HTMLElement;
  private boundUpdate: () => void;
  private currentUser: UserProfile | null = null;
  private isInitialRender: boolean = true;

  constructor(appDiv: HTMLElement) {
    this.appDiv = appDiv;
    this.boundUpdate = this.update.bind(this);
  }

  public mount() {
    ProfileActions.resetState();
    profileStore.on('change', this.boundUpdate);
    ProfileActions.fetchProfile();
  }

  public unmount() {
    profileStore.off('change', this.boundUpdate);
  }

  private update() {
    const state = profileStore.getState();

    if (state.isLoading && this.isInitialRender) {
      return;
    }

    if (state.user && (this.isInitialRender || this.currentUser !== state.user)) {
      this.isInitialRender = false;
      this.currentUser = state.user;
      this.appDiv.innerHTML = template({ user: state.user });
      this.attachListeners();
    }

    if (state.user) {
      this.updateUI(state);
    }
  }

  private attachListeners() {
    document.getElementById('nav-boards')?.addEventListener('click', () => navigateTo('/boards'));
    document.getElementById('nav-logo')?.addEventListener('click', () => navigateTo('/boards'));
    document.getElementById('logout-btn')?.addEventListener('click', () => {
      showConfirmModal({
        title: "Выход",
        text: "Вы уверены, что хотите выйти из аккаунта?",
        confirmLabel: "Выйти",
        onConfirm: () => ProfileActions.logout(),
      });
    });

    const form = document.getElementById('profile-form');
    const nameInput = document.getElementById('profile-name') as HTMLInputElement;
    const descInput = document.getElementById('profile-desc') as HTMLTextAreaElement;
    const btnSave = document.getElementById('btn-save-profile') as HTMLButtonElement;

    const checkChanges = () => {
      const state = profileStore.getState();
      const user = state.user;
      if (!user) return;

      if (
        nameInput.value !== user.display_name ||
        descInput.value !== (user.description_user || '')
      ) {
        btnSave.classList.add('profile__btn-active');
        btnSave.classList.remove('profile__btn-disabled');
        btnSave.disabled = false;
      } else {
        btnSave.classList.add('profile__btn-disabled');
        btnSave.classList.remove('profile__btn-active');
        btnSave.disabled = true;
      }
    };

    nameInput?.addEventListener('input', checkChanges);
    descInput?.addEventListener('input', checkChanges);

    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      ProfileActions.updateProfile(nameInput.value.trim(), descInput.value.trim());
    });

    const avatarUpload = document.getElementById('avatar-upload') as HTMLInputElement;
    avatarUpload?.addEventListener('change', (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        ProfileActions.updateAvatar(file);
      }
    });

    document.getElementById('btn-delete-avatar')?.addEventListener('click', () => {
      const state = profileStore.getState();
      if (state.user?.avatar_url) {
        ProfileActions.openDeleteModal();
      }
    });

    document.querySelectorAll('.modal__close-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        ProfileActions.closeDeleteModal();
      });
    });

    const modalOverlay = document.getElementById('modal-overlay');
    modalOverlay?.addEventListener('click', (e) => {
      if (e.target === modalOverlay) {
        ProfileActions.closeDeleteModal();
      }
    });

    document.getElementById('confirm-delete-avatar')?.addEventListener('click', () => {
      ProfileActions.deleteAvatar();
    });
  }

  private updateUI(state: any) {
    const btnSave = document.getElementById('btn-save-profile') as HTMLButtonElement;
    if (btnSave) {
      if (state.isSaving) {
        btnSave.disabled = true;
      } else {
        const nameInput = document.getElementById('profile-name') as HTMLInputElement;
        const descInput = document.getElementById('profile-desc') as HTMLTextAreaElement;
        const user = state.user;
        if (user && nameInput && descInput) {
          if (
            nameInput.value !== user.display_name ||
            descInput.value !== (user.description_user || '')
          ) {
            btnSave.classList.add('profile__btn-active');
            btnSave.classList.remove('profile__btn-disabled');
            btnSave.disabled = false;
          } else {
            btnSave.classList.add('profile__btn-disabled');
            btnSave.classList.remove('profile__btn-active');
            btnSave.disabled = true;
          }
        }
      }
    }

    const modalOverlay = document.getElementById('modal-overlay');
    const modalDelete = document.getElementById('modal-delete-avatar');

    if (modalOverlay && modalDelete) {
      if (state.isDeleteModalOpen) {
        modalOverlay.classList.remove('hidden');
        modalDelete.classList.remove('hidden');
      } else {
        modalOverlay.classList.add('hidden');
        modalDelete.classList.add('hidden');
      }
    }
  }
}
```

src/modules/register/RegisterStore.ts:
```typescript
import { Store } from '../../core/Store';
import { appDispatcher, Action } from '../../core/Dispatcher';
import { RegisterState, ActionTypes } from './register.types';

const initialState: RegisterState = {
  isLoading: false,
  globalError: null,
  fieldErrors: {
    name: null,
    email: null,
    password: null,
    repeatPassword: null,
  }
};

class RegisterStore extends Store {
  private state: RegisterState = { ...initialState };

  public getState(): RegisterState {
    return this.state;
  }

  constructor() {
    super();
    appDispatcher.register((action: Action) => {
      switch (action.type) {
        case ActionTypes.SET_IS_LOADING:
          this.state.isLoading = action.payload as boolean;
          this.emit('change');
          break;
        case ActionTypes.SET_GLOBAL_ERROR:
          this.state.globalError = action.payload as string | null;
          this.emit('change');
          break;
        case ActionTypes.SET_FIELD_ERROR:
          const { field, error } = action.payload as { field: keyof RegisterState['fieldErrors'], error: string | null };
          this.state.fieldErrors[field] = error;
          this.emit('change');
          break;
        case ActionTypes.CLEAR_ERRORS:
          this.state.globalError = null;
          this.state.fieldErrors = { name: null, email: null, password: null, repeatPassword: null };
          this.emit('change');
          break;
        case ActionTypes.RESET_STATE:
          this.state = { ...initialState };
          this.emit('change');
          break;
      }
    });
  }
}

export const registerStore = new RegisterStore();
```

src/modules/register/RegisterActions.ts:
```typescript
import { appDispatcher } from '../../core/Dispatcher';
import { ActionTypes } from './register.types';
import { authApi } from '../../api';
import { navigateTo, setIsAuth } from '../../router';

export const RegisterActions = {
  resetState() {
    appDispatcher.dispatch({ type: ActionTypes.RESET_STATE });
  },

  setGlobalError(error: string | null) {
    appDispatcher.dispatch({ type: ActionTypes.SET_GLOBAL_ERROR, payload: error });
  },

  setFieldError(field: string, error: string | null) {
    appDispatcher.dispatch({ type: ActionTypes.SET_FIELD_ERROR, payload: { field, error } });
  },

  async registerUser(name: string, email: string, password: string) {
    appDispatcher.dispatch({ type: ActionTypes.CLEAR_ERRORS });
    appDispatcher.dispatch({ type: ActionTypes.SET_IS_LOADING, payload: true });

    try {
      await authApi.register({
        display_name: name,
        email,
        password,
        repeated_password: password
      });

      localStorage.setItem('isAuth', 'true');
      setIsAuth(true);
      navigateTo('/boards');
    } catch (err: any) {
      const errMsg = err.data?.message || err.data?.error;

      if (errMsg) {
        if (errMsg.includes('exists')) {
          this.setFieldError('email', 'Этот адрес уже зарегистрирован');
        } else {
          this.setGlobalError(errMsg);
        }
      } else {
        this.setGlobalError('Проверьте подключение и попробуйте снова');
      }
    } finally {
      appDispatcher.dispatch({ type: ActionTypes.SET_IS_LOADING, payload: false });
    }
  }
};
```

src/modules/register/register.types.ts:
```typescript
export interface RegisterState {
  isLoading: boolean;
  globalError: string | null;
  fieldErrors: {
    name: string | null;
    email: string | null;
    password: string | null;
    repeatPassword: string | null;
  };
}

export const ActionTypes = {
  SET_IS_LOADING: 'REGISTER_SET_IS_LOADING',
  SET_GLOBAL_ERROR: 'REGISTER_SET_GLOBAL_ERROR',
  SET_FIELD_ERROR: 'REGISTER_SET_FIELD_ERROR',
  CLEAR_ERRORS: 'REGISTER_CLEAR_ERRORS',
  RESET_STATE: 'REGISTER_RESET_STATE',
};
```

src/modules/register/RegisterView.ts:
```typescript
import Handlebars from 'handlebars';
import registerTpl from '../../templates/register.hbs?raw';
import { setInputError, setGlobalError, validateEmail, validatePassword } from '../../utils';
import { FormValidator, ValidationSchema } from '../../utils/validator';
import { navigateTo } from '../../router';
import { registerStore } from './RegisterStore';
import { RegisterActions } from './RegisterActions';

const template = Handlebars.compile(registerTpl);

export class RegisterView {
  private appDiv: HTMLElement;
  private boundUpdate: () => void;
  private validator: FormValidator | null = null;
  private isFormValid: boolean = false;

  constructor(appDiv: HTMLElement) {
    this.appDiv = appDiv;
    this.boundUpdate = this.update.bind(this);
  }

  public mount() {
    RegisterActions.resetState();
    this.appDiv.innerHTML = template({});

    registerStore.on('change', this.boundUpdate);
    this.attachListeners();
    this.updateUI();
  }

  public unmount() {
    registerStore.off('change', this.boundUpdate);
  }

  private update() {
    const state = registerStore.getState();

    setGlobalError(state.globalError);

    if (state.fieldErrors.email) setInputError('email', state.fieldErrors.email);
    if (state.fieldErrors.name) setInputError('name', state.fieldErrors.name);
    if (state.fieldErrors.password) setInputError('password', state.fieldErrors.password);
    if (state.fieldErrors.repeatPassword) setInputError('repeatPassword', state.fieldErrors.repeatPassword);

    this.updateUI();
  }

  private updateUI() {
    const state = registerStore.getState();
    const submitBtn = document.getElementById('register-submit') as HTMLButtonElement | null;

    if (submitBtn) {
      submitBtn.disabled = state.isLoading || !this.isFormValid;
    }
  }

  private attachListeners() {
    const form = document.getElementById('register-form') as HTMLFormElement | null;
    const linkLogin = document.getElementById('link-login') as HTMLAnchorElement | null;

    if (linkLogin) {
      linkLogin.addEventListener('click', (e: MouseEvent) => {
        e.preventDefault();
        navigateTo('/login');
      });
    }

    const registerSchema: ValidationSchema = {
      name: [
        { required: true, message: 'Введите имя' }
      ],
      email: [
        { required: true, message: 'Введите адрес электронной почты' },
        {
          customValidator: (value: string) => validateEmail(value) ? null : 'Неверный формат email',
          message: 'Неверный формат email'
        }
      ],
      password: [
        { required: true, message: 'Введите пароль' },
        {
          customValidator: (value: string) => validatePassword(value),
          message: 'Ошибка в пароле'
        }
      ],
      repeatPassword: [
        { required: true, message: 'Повторите пароль' },
        {
          customValidator: (value: string) => {
            const password = (document.getElementById('password') as HTMLInputElement | null)?.value.trim() || '';
            return value === password ? null : 'Пароли не совпадают';
          },
          message: 'Пароли не совпадают'
        }
      ]
    };

    this.validator = new FormValidator(
      registerSchema,
      (fieldId, error) => {
        setInputError(fieldId, error);
      },
      (isValid) => {
        this.isFormValid = isValid;
        this.updateUI();
      }
    );

    this.validator.attachLiveValidation();

    if (form) {
      form.addEventListener('submit', (e: SubmitEvent) => {
        e.preventDefault();

        if (!this.validator?.validate()) {
          return;
        }

        const name = (document.getElementById('name') as HTMLInputElement | null)?.value.trim() ?? '';
        const email = (document.getElementById('email') as HTMLInputElement | null)?.value.trim() ?? '';
        const password = (document.getElementById('password') as HTMLInputElement | null)?.value.trim() ?? '';

        RegisterActions.registerUser(name, email, password);
      });
    }
  }
}
```

src/modules/register/index.ts:
```typescript
import { RegisterView } from './RegisterView';

let currentView: RegisterView | null = null;

export const renderRegisterModule = (appDiv: HTMLElement): void => {
  if (currentView) {
    currentView.unmount();
  }
  currentView = new RegisterView(appDiv);
  currentView.mount();
};
```

src/modules/supportAdmin/index.ts:
```typescript
import { appDispatcher } from "../../core/Dispatcher";
import { supportApi, authApi } from "../../api";
import Handlebars from "handlebars";
import { showConfirmModal } from "../../utils/confirmModal";
import adminTpl from "../../templates/support_admin.hbs?raw";
import { Store } from "../../core/Store";
import { navigateTo, setIsAuth } from "../../router";

const template = Handlebars.compile(adminTpl);

class SupportAdminStore extends Store {
  public state: any = { tickets: new Array(), statistics: { new: 0, in_progress: 0, closed: 0 }, currentTicket: null };
  constructor() {
    super();
    appDispatcher.register((action) => {
      if (action.type === 'SA_SET_STATE') {
        this.state = { ...this.state, ...(action.payload as any) };
        this.emit('change');
      }
    });
  }

  public getState() {
    return this.state;
  }
}

const store = new SupportAdminStore();

export const SupportAdminActions = {
  async fetchAll() {
    try {
      const tRes = await supportApi.getTickets();
      const resultList = tRes.data.appeals;

      const stats = { new: 0, in_progress: 0, closed: 0 };

      for (let i = 0; i < resultList.length; i++) {
        const s = resultList[i].status;
        if (s === 'new') stats.new += 1;
        if (s === 'in_progress') stats.in_progress += 1;
        if (s === 'closed') stats.closed += 1;
      }

      appDispatcher.dispatch({
        type: 'SA_SET_STATE',
        payload: { tickets: resultList, statistics: stats }
      });
    } catch (e) {
      console.error("Error in fetchAll", e);
    }
  },

  async openTicket(id: string) {
    const state = store.getState();
    const ticket = state.tickets.find((t: any) => t.appeal_link === id || t.id === id);
    if (ticket) {
      appDispatcher.dispatch({ type: 'SA_SET_STATE', payload: { currentTicket: ticket } });
    }
  },

  async updateTicket(id: string, data: any) {
    try {
      await supportApi.updateTicket(id, data);
      await this.fetchAll();
      this.openTicket(id);
    } catch (e) {
      console.error("Failed to update ticket", e);
    }
  }
};

let boundRender: (() => void) | null = null;

export const renderSupportAdminModule = (appDiv: HTMLElement): void => {
  const render = () => {
    appDiv.innerHTML = template(store.getState());

    appDiv.querySelectorAll('.sa-ticket-item').forEach(el => {
      el.addEventListener('click', () => {
        const id = el.getAttribute('data-id');
        if (id) SupportAdminActions.openTicket(id);
      });
    });

    const statusSelect = appDiv.querySelector('#sa-status-select') as HTMLSelectElement;
    if (statusSelect) {
      statusSelect.addEventListener('change', (e) => {
        const status = (e.target as HTMLSelectElement).value;
        const currentTicket = store.getState().currentTicket;
        if (currentTicket) {
          const id = currentTicket.appeal_link || currentTicket.id;
          SupportAdminActions.updateTicket(id, { status });
        }
      });
    }

    appDiv.querySelector('#nav-boards')?.addEventListener('click', () => navigateTo('/boards'));
    appDiv.querySelector('#nav-logo')?.addEventListener('click', () => navigateTo('/boards'));
    appDiv.querySelector('#nav-profile')?.addEventListener('click', () => navigateTo('/profile'));
    appDiv.querySelector('#logout-btn')?.addEventListener('click', () => {
      showConfirmModal({
        title: "Выход",
        text: "Вы уверены, что хотите выйти из аккаунта?",
        confirmLabel: "Выйти",
        onConfirm: async () => {
          try { await authApi.logout(); } catch {}
          setIsAuth(false);
          localStorage.removeItem('isAuth');
          navigateTo('/login');
        },
      });
    });
  };

  if (boundRender) {
    store.off('change', boundRender);
  }
  boundRender = render;
  store.on('change', boundRender);

  render();
  SupportAdminActions.fetchAll();
};
```

src/modules/section/SectionActions.ts:
```typescript
import { appDispatcher } from '../../core/Dispatcher';
import { ActionTypes } from './section.types';
import { boardsApi, kanbanApi } from '../../api';
import { navigateTo } from '../../router';
import { Toast } from '../../utils/toast';
import { clearKanbanCache } from '../../modules/kanban';
import { sectionStore } from './SectionStore';

export const SectionActions = {
  resetState() {
    appDispatcher.dispatch({ type: ActionTypes.RESET_STATE });
  },

  async fetchSection(boardId: string, sectionId: string) {
    appDispatcher.dispatch({ type: ActionTypes.SET_IDS, payload: { boardId, sectionId } });
    appDispatcher.dispatch({ type: ActionTypes.SET_IS_LOADING, payload: true });

    try {
      const boardRes = await boardsApi.getBoard(boardId);
      if (boardRes.data.name) {
        appDispatcher.dispatch({ type: ActionTypes.SET_BOARD_NAME, payload: boardRes.data.name });
      }

      const sectionRes = await kanbanApi.getSection(sectionId);
      const sectionData = sectionRes.data;

      if (!sectionData) {
        throw new Error('No section data');
      }

      const formattedData = {
        section_link: sectionId,
        section_name: sectionData.name || "Без названия",
        color: sectionData.color || "white",
        max_tasks: sectionData.max_tasks || 100,
        is_mandatory: sectionData.is_mandatory || false,
        position: sectionData.position || 1,
      };

      appDispatcher.dispatch({ type: ActionTypes.SET_SECTION_DATA, payload: formattedData });
      appDispatcher.dispatch({ type: ActionTypes.SET_COLOR, payload: formattedData.color });
    } catch (err) {
      console.error("Fetch error", err);
      Toast.error("Ошибка при загрузке данных");
      navigateTo(`/board?id=${boardId}`);
    } finally {
      appDispatcher.dispatch({ type: ActionTypes.SET_IS_LOADING, payload: false });
    }
  },

  setColor(color: string) {
    appDispatcher.dispatch({ type: ActionTypes.SET_COLOR, payload: color });
  },

  setDeleteModalOpen(isOpen: boolean) {
    appDispatcher.dispatch({ type: ActionTypes.SET_DELETE_MODAL_OPEN, payload: isOpen });
  },

  async updateSection(name: string, maxTasks: number, isMandatory: boolean) {
    const state = sectionStore.getState();
    if (!state.sectionId || !state.boardId || !state.sectionData) return;

    appDispatcher.dispatch({ type: ActionTypes.SET_IS_SAVING, payload: true });

    const payload = {
      link: state.sectionId,
      name: name || "Без названия",
      color: state.selectedColor,
      max_tasks: isNaN(maxTasks) ? 100 : maxTasks,
      is_mandatory: isMandatory,
      position: state.sectionData.position || 1,
    };

    try {
      await kanbanApi.updateSection(state.sectionId, payload);
      clearKanbanCache();
      Toast.success("Секция сохранена");
      navigateTo(`/board?id=${state.boardId}`);
    } catch (err) {
      console.error("Update section error", err);
      const isBacklog =
        state.sectionData.section_name?.toLowerCase().includes("бэклог") ||
        state.sectionData.section_name?.toLowerCase().includes("backlog");
      if (isBacklog) {
        Toast.error("Нельзя изменять бэклог");
      } else {
        Toast.error("Ошибка при сохранении");
      }
    } finally {
      appDispatcher.dispatch({ type: ActionTypes.SET_IS_SAVING, payload: false });
    }
  },

  async deleteSection() {
    const state = sectionStore.getState();
    if (!state.sectionId || !state.boardId) return;

    try {
      await kanbanApi.deleteSection(state.sectionId);
      clearKanbanCache();
      this.setDeleteModalOpen(false);
      navigateTo(`/board?id=${state.boardId}`);
    } catch (err) {
      Toast.error("Ошибка при удалении");
    }
  }
};
```

src/modules/section/SectionStore.ts:
```typescript
import { Store } from '../../core/Store';
import { appDispatcher, Action } from '../../core/Dispatcher';
import { SectionState, ActionTypes, SectionData } from './section.types';

const initialState: SectionState = {
  boardId: null,
  sectionId: null,
  boardName: 'Без названия',
  sectionData: null,
  selectedColor: 'white',
  isLoading: false,
  isSaving: false,
  isDeleteModalOpen: false,
};

class SectionStore extends Store {
  private state: SectionState = { ...initialState };

  public getState(): SectionState {
    return this.state;
  }

  constructor() {
    super();
    appDispatcher.register((action: Action) => {
      switch (action.type) {
        case ActionTypes.SET_IDS:
          const { boardId, sectionId } = action.payload as { boardId: string; sectionId: string };
          this.state.boardId = boardId;
          this.state.sectionId = sectionId;
          this.emit('change');
          break;
        case ActionTypes.SET_BOARD_NAME:
          this.state.boardName = action.payload as string;
          this.emit('change');
          break;
        case ActionTypes.SET_SECTION_DATA:
          this.state.sectionData = action.payload as SectionData;
          this.emit('change');
          break;
        case ActionTypes.SET_COLOR:
          this.state.selectedColor = action.payload as string;
          this.emit('change');
          break;
        case ActionTypes.SET_IS_LOADING:
          this.state.isLoading = action.payload as boolean;
          this.emit('change');
          break;
        case ActionTypes.SET_IS_SAVING:
          this.state.isSaving = action.payload as boolean;
          this.emit('change');
          break;
        case ActionTypes.SET_DELETE_MODAL_OPEN:
          this.state.isDeleteModalOpen = action.payload as boolean;
          this.emit('change');
          break;
        case ActionTypes.RESET_STATE:
          this.state = { ...initialState };
          this.emit('change');
          break;
      }
    });
  }
}

export const sectionStore = new SectionStore();
```

src/modules/section/SectionView.ts:
```typescript
import Handlebars from "handlebars";
import sectionTpl from "../../templates/section.hbs?raw";
import { sectionStore } from "./SectionStore";
import { SectionActions } from "./SectionActions";
import { navigateTo } from "../../router";
import { renderKanbanModule } from "../../modules/kanban";

const template = Handlebars.compile(sectionTpl);

export class SectionView {
  private appDiv: HTMLElement;
  private overlayContainer: HTMLElement | null = null;
  private boundUpdate: () => void;
  private boundGlobalClick: (e: MouseEvent) => void;
  private isInitialRender: boolean = true;

  constructor(appDiv: HTMLElement) {
    this.appDiv = appDiv;
    this.boundUpdate = this.update.bind(this);
    this.boundGlobalClick = this.handleGlobalClick.bind(this);
  }

  public async mount() {
    SectionActions.resetState();
    this.isInitialRender = true;

    const urlParams = new URLSearchParams(window.location.search);
    const sectionId = urlParams.get("sectionId");
    const boardId = urlParams.get("boardId");

    if (!sectionId || sectionId === "null" || !boardId || boardId === "null") {
      return navigateTo("/boards");
    }

    try {
      await renderKanbanModule(this.appDiv);
    } catch (err) {
      console.error("Board render error", err);
    }

    this.overlayContainer = document.createElement("div");
    this.overlayContainer.id = "section-overlay-container";
    this.appDiv.appendChild(this.overlayContainer);

    sectionStore.on('change', this.boundUpdate);
    document.addEventListener("click", this.boundGlobalClick);

    SectionActions.fetchSection(boardId, sectionId);
  }

  public unmount() {
    sectionStore.off('change', this.boundUpdate);
    document.removeEventListener("click", this.boundGlobalClick);

    if (this.overlayContainer) {
      this.overlayContainer.remove();
      this.overlayContainer = null;
    }
    document.querySelector(".context-menu")?.remove();
  }

  private update() {
    const state = sectionStore.getState();

    if (state.isLoading || !state.sectionData || !this.overlayContainer) {
      return;
    }

    if (this.isInitialRender) {
      this.isInitialRender = false;
      this.overlayContainer.innerHTML = template({
        board_name: state.boardName,
        section: state.sectionData,
      });
      this.attachListeners();
    }

    this.updateUI(state);
  }

  private attachListeners() {
    if (!this.overlayContainer) return;

    this.overlayContainer.querySelector("#btn-save-section")?.addEventListener("click", () => {
      const name = (this.overlayContainer?.querySelector("#section-name-input") as HTMLInputElement).value.trim();
      const maxTasks = parseInt((this.overlayContainer?.querySelector("#section-max-tasks-input") as HTMLInputElement).value);
      const isMandatory = (this.overlayContainer?.querySelector("#section-mandatory-input") as HTMLInputElement).checked;

      SectionActions.updateSection(name, maxTasks, isMandatory);
    });

    this.overlayContainer.querySelector("#btn-back-section")?.addEventListener("click", () => {
      const boardId = sectionStore.getState().boardId;
      navigateTo(`/board?id=${boardId}`);
    });

    this.overlayContainer.querySelector("#section-overlay")?.addEventListener("click", (e) => {
      if (e.target === e.currentTarget) {
        const boardId = sectionStore.getState().boardId;
        navigateTo(`/board?id=${boardId}`);
      }
    });

    const colorSquares = this.overlayContainer.querySelectorAll(".color-square");
    colorSquares.forEach((square) => {
      square.addEventListener("click", () => {
        const squareColor = square.getAttribute("data-color");
        if (squareColor) {
          SectionActions.setColor(squareColor);
        }
      });
    });

    this.overlayContainer.querySelector("#btn-section-options")?.addEventListener("click", (e) => {
      e.stopPropagation();
      document.querySelector(".context-menu")?.remove();

      const menu = document.createElement("div");
      menu.className = "context-menu";
      menu.innerHTML = `<div class="context-menu__item context-menu__item--danger" id="ctx-delete-section">Удалить секцию</div>`;

      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      menu.style.top = `${rect.bottom + window.scrollY + 8}px`;
      menu.style.left = `${rect.left + window.scrollX - 150}px`;

      document.body.appendChild(menu);

      menu.querySelector("#ctx-delete-section")?.addEventListener("click", () => {
        const nameInput = this.overlayContainer?.querySelector("#section-name-input") as HTMLInputElement;
        const deleteNameEl = this.overlayContainer?.querySelector("#delete-section-name") as HTMLElement;
        if (deleteNameEl && nameInput) {
          deleteNameEl.textContent = nameInput.value;
        }

        SectionActions.setDeleteModalOpen(true);
        menu.remove();
      });
    });

    this.overlayContainer.querySelectorAll(".modal__close-btn").forEach((btn) =>
      btn.addEventListener("click", () => SectionActions.setDeleteModalOpen(false))
    );

    this.overlayContainer.querySelector("#btn-confirm-delete-section")?.addEventListener("click", () => {
      SectionActions.deleteSection();
    });
  }

  private updateUI(state: any) {
    if (!this.overlayContainer) return;

    const btnSave = this.overlayContainer.querySelector("#btn-save-section") as HTMLButtonElement;
    if (btnSave) {
      if (state.isSaving) {
        btnSave.disabled = true;
        btnSave.textContent = "Сохранение...";
      } else {
        btnSave.disabled = false;
        btnSave.textContent = "Сохранить";
      }
    }

    const colorSquares = this.overlayContainer.querySelectorAll(".color-square");
    colorSquares.forEach((square) => {
      if (square.getAttribute("data-color") === state.selectedColor) {
        square.classList.add("active");
      } else {
        square.classList.remove("active");
      }
    });

    const modalOverlay = this.overlayContainer.querySelector("#modal-overlay-section");
    const modalDelete = this.overlayContainer.querySelector("#modal-delete-section");

    if (modalOverlay && modalDelete) {
      if (state.isDeleteModalOpen) {
        modalOverlay.classList.remove("hidden");
        modalDelete.classList.remove("hidden");
      } else {
        modalOverlay.classList.add("hidden");
        modalDelete.classList.add("hidden");
      }
    }
  }

  private handleGlobalClick() {
    document.querySelector(".context-menu")?.remove();
  }
}
```

src/modules/section/index.ts:
```typescript
import { SectionView } from './SectionView';

let currentView: SectionView | null = null;

export const renderSectionModule = async (appDiv: HTMLElement): Promise<void> => {
  if (currentView) {
    currentView.unmount();
  }
  currentView = new SectionView(appDiv);
  await currentView.mount();
};
```

src/modules/section/section.types.ts:
```typescript
export interface SectionData {
  section_link: string;
  section_name: string;
  color: string;
  max_tasks: number;
  is_mandatory: boolean;
  position: number;
}

export interface SectionState {
  boardId: string | null;
  sectionId: string | null;
  boardName: string;
  sectionData: SectionData | null;
  selectedColor: string;
  isLoading: boolean;
  isSaving: boolean;
  isDeleteModalOpen: boolean;
}

export const ActionTypes = {
  SET_IDS: 'SECTION_SET_IDS',
  SET_BOARD_NAME: 'SECTION_SET_BOARD_NAME',
  SET_SECTION_DATA: 'SECTION_SET_SECTION_DATA',
  SET_COLOR: 'SECTION_SET_COLOR',
  SET_IS_LOADING: 'SECTION_SET_IS_LOADING',
  SET_IS_SAVING: 'SECTION_SET_IS_SAVING',
  SET_DELETE_MODAL_OPEN: 'SECTION_SET_DELETE_MODAL_OPEN',
  RESET_STATE: 'SECTION_RESET_STATE',
};
```

src/modules/passwordRecovery/PasswordRecoveryStore.ts:
```typescript
import { Store } from '../../core/Store';
import { appDispatcher, Action } from '../../core/Dispatcher';
import { PasswordRecoveryState, PasswordRecoveryStep, ActionTypes } from './passwordRecovery.types';

const initialState: PasswordRecoveryState = {
  step: PasswordRecoveryStep.EMAIL,
  email: '',
  code: '',
  timeLeft: 59,
  isLoading: false,
  globalError: null,
  fieldErrors: {
    email: null,
    code: null,
    password: null,
    repeatPassword: null,
  }
};

class PasswordRecoveryStore extends Store {
  private state: PasswordRecoveryState = { ...initialState };

  public getState(): PasswordRecoveryState {
    return this.state;
  }

  constructor() {
    super();
    appDispatcher.register((action: Action) => {
      switch (action.type) {
        case ActionTypes.SET_STEP:
          this.state.step = action.payload as PasswordRecoveryStep;
          this.emit('change');
          break;
        case ActionTypes.SET_EMAIL:
          this.state.email = action.payload as string;
          this.emit('change');
          break;
        case ActionTypes.SET_CODE:
          this.state.code = action.payload as string;
          this.emit('change');
          break;
        case ActionTypes.SET_TIME_LEFT:
          this.state.timeLeft = action.payload as number;
          this.emit('change');
          break;
        case ActionTypes.SET_IS_LOADING:
          this.state.isLoading = action.payload as boolean;
          this.emit('change');
          break;
        case ActionTypes.SET_GLOBAL_ERROR:
          this.state.globalError = action.payload as string | null;
          this.emit('change');
          break;
        case ActionTypes.SET_FIELD_ERROR:
          const { field, error } = action.payload as { field: keyof PasswordRecoveryState['fieldErrors'], error: string | null };
          this.state.fieldErrors[field] = error;
          this.emit('change');
          break;
        case ActionTypes.CLEAR_ERRORS:
          this.state.globalError = null;
          this.state.fieldErrors = { email: null, code: null, password: null, repeatPassword: null };
          this.emit('change');
          break;
        case ActionTypes.RESET_STATE:
          this.state = { ...initialState };
          this.emit('change');
          break;
      }
    });
  }
}

export const passwordRecoveryStore = new PasswordRecoveryStore();
```

src/modules/passwordRecovery/PasswordRecoveryActions.ts:
```typescript
import { appDispatcher } from '../../core/Dispatcher';
import { ActionTypes, PasswordRecoveryStep } from './passwordRecovery.types';
import { authApi } from '../../api';
import { validateEmail, validatePassword } from '../../utils';
import { navigateTo } from '../../router';
import { passwordRecoveryStore } from './PasswordRecoveryStore';

let timerInterval: ReturnType<typeof setInterval> | null = null;

export const PasswordRecoveryActions = {
  resetState() {
    if (timerInterval) clearInterval(timerInterval);
    appDispatcher.dispatch({ type: ActionTypes.RESET_STATE });
  },

  async sendEmail(email: string) {
    appDispatcher.dispatch({ type: ActionTypes.CLEAR_ERRORS });

    if (!validateEmail(email)) {
      appDispatcher.dispatch({ type: ActionTypes.SET_FIELD_ERROR, payload: { field: 'email', error: 'Неверный формат email' } });
      return;
    }

    appDispatcher.dispatch({ type: ActionTypes.SET_IS_LOADING, payload: true });

    try {
      await authApi.forgotPassword({ email });
      appDispatcher.dispatch({ type: ActionTypes.SET_EMAIL, payload: email });
      appDispatcher.dispatch({ type: ActionTypes.SET_STEP, payload: PasswordRecoveryStep.CODE });
      this.startTimer();
    } catch (err: any) {
      if (err.status === 429) {
        appDispatcher.dispatch({ type: ActionTypes.SET_GLOBAL_ERROR, payload: 'Слишком много попыток. Подождите немного.' });
      } else if (err.status === 404) {
        appDispatcher.dispatch({ type: ActionTypes.SET_GLOBAL_ERROR, payload: 'Пользователь не найден' });
      } else {
        appDispatcher.dispatch({ type: ActionTypes.SET_GLOBAL_ERROR, payload: err.data?.message || err.data?.error || 'Не удалось отправить код' });
      }
    } finally {
      appDispatcher.dispatch({ type: ActionTypes.SET_IS_LOADING, payload: false });
    }
  },

  startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    appDispatcher.dispatch({ type: ActionTypes.SET_TIME_LEFT, payload: 59 });

    timerInterval = setInterval(() => {
      const currentTimer = passwordRecoveryStore.getState().timeLeft;
      if (currentTimer > 0) {
        appDispatcher.dispatch({ type: ActionTypes.SET_TIME_LEFT, payload: currentTimer - 1 });
      } else {
        if (timerInterval) clearInterval(timerInterval);
      }
    }, 1000);
  },

  async resendCode() {
    const email = passwordRecoveryStore.getState().email;
    appDispatcher.dispatch({ type: ActionTypes.CLEAR_ERRORS });
    try {
      await authApi.forgotPassword({ email });
      this.startTimer();
    } catch (err) {
      appDispatcher.dispatch({ type: ActionTypes.SET_FIELD_ERROR, payload: { field: 'code', error: 'Не удалось отправить код повторно' } });
    }
  },

  async verifyCode(code: string) {
    appDispatcher.dispatch({ type: ActionTypes.CLEAR_ERRORS });
    appDispatcher.dispatch({ type: ActionTypes.SET_IS_LOADING, payload: true });

    try {
      await authApi.checkCode({ code });
      if (timerInterval) clearInterval(timerInterval);
      appDispatcher.dispatch({ type: ActionTypes.SET_CODE, payload: code });
      appDispatcher.dispatch({ type: ActionTypes.SET_STEP, payload: PasswordRecoveryStep.NEW_PASS });
    } catch (err) {
      appDispatcher.dispatch({ type: ActionTypes.SET_FIELD_ERROR, payload: { field: 'code', error: 'Неверный или недействительный код' } });
    } finally {
      appDispatcher.dispatch({ type: ActionTypes.SET_IS_LOADING, payload: false });
    }
  },

  async resetPassword(password: string, repeatPassword: string) {
    appDispatcher.dispatch({ type: ActionTypes.CLEAR_ERRORS });

    let hasError = false;
    const passErrorMsg = validatePassword(password);
    if (passErrorMsg) {
      appDispatcher.dispatch({ type: ActionTypes.SET_FIELD_ERROR, payload: { field: 'password', error: passErrorMsg } });
      hasError = true;
    }

    if (password !== repeatPassword) {
      appDispatcher.dispatch({ type: ActionTypes.SET_FIELD_ERROR, payload: { field: 'repeatPassword', error: 'Пароли не совпадают' } });
      hasError = true;
    }

    if (hasError) return;

    appDispatcher.dispatch({ type: ActionTypes.SET_IS_LOADING, payload: true });
    const code = passwordRecoveryStore.getState().code;

    try {
      await authApi.resetPassword({
        token_id: code,
        password,
        repeated_password: repeatPassword
      });
      navigateTo('/login');
    } catch (err: any) {
      appDispatcher.dispatch({ type: ActionTypes.SET_GLOBAL_ERROR, payload: err.data?.message || err.data?.error || 'Не удалось сохранить новый пароль' });
    } finally {
      appDispatcher.dispatch({ type: ActionTypes.SET_IS_LOADING, payload: false });
    }
  },

  goBack() {
    const step = passwordRecoveryStore.getState().step;
    if (step === PasswordRecoveryStep.CODE) {
      if (timerInterval) clearInterval(timerInterval);
      appDispatcher.dispatch({ type: ActionTypes.SET_STEP, payload: PasswordRecoveryStep.EMAIL });
      appDispatcher.dispatch({ type: ActionTypes.CLEAR_ERRORS });
    } else {
      navigateTo('/login');
    }
  }
};
```

src/modules/passwordRecovery/index.ts:
```typescript
import { PasswordRecoveryView } from './PasswordRecoveryView';

let currentView: PasswordRecoveryView | null = null;

export const renderPasswordRecoveryModule = (appDiv: HTMLElement): void => {
  if (currentView) {
    currentView.unmount();
  }
  currentView = new PasswordRecoveryView(appDiv);
  currentView.mount();
};
```

src/modules/passwordRecovery/passwordRecovery.types.ts:
```typescript
export enum PasswordRecoveryStep {
  EMAIL = 'EMAIL',
  CODE = 'CODE',
  NEW_PASS = 'NEW_PASS'
}

export interface PasswordRecoveryState {
  step: PasswordRecoveryStep;
  email: string;
  code: string;
  timeLeft: number;
  isLoading: boolean;
  globalError: string | null;
  fieldErrors: {
    email: string | null;
    code: string | null;
    password: string | null;
    repeatPassword: string | null;
  };
}

export const ActionTypes = {
  SET_STEP: 'PR_SET_STEP',
  SET_EMAIL: 'PR_SET_EMAIL',
  SET_CODE: 'PR_SET_CODE',
  SET_TIME_LEFT: 'PR_SET_TIME_LEFT',
  SET_IS_LOADING: 'PR_SET_IS_LOADING',
  SET_GLOBAL_ERROR: 'PR_SET_GLOBAL_ERROR',
  SET_FIELD_ERROR: 'PR_SET_FIELD_ERROR',
  CLEAR_ERRORS: 'PR_CLEAR_ERRORS',
  RESET_STATE: 'PR_RESET_STATE'
};
```

src/modules/passwordRecovery/PasswordRecoveryView.ts:
```typescript
import Handlebars from 'handlebars';
import tplEmail from '../../templates/password_recovery_email.hbs?raw';
import tplCode from '../../templates/password_recovery_code.hbs?raw';
import tplNewPass from '../../templates/password_recovery_new_pass.hbs?raw';
import { passwordRecoveryStore } from './PasswordRecoveryStore';
import { PasswordRecoveryActions } from './PasswordRecoveryActions';
import { PasswordRecoveryState, PasswordRecoveryStep } from './passwordRecovery.types';
import { setInputError, setGlobalError } from '../../utils';

const renderStepEmail = Handlebars.compile(tplEmail);
const renderStepCode = Handlebars.compile(tplCode);
const renderStepNewPass = Handlebars.compile(tplNewPass);

export class PasswordRecoveryView {
  private appDiv: HTMLElement;
  private boundUpdate: () => void;
  private currentStep: PasswordRecoveryStep | null = null;

  constructor(appDiv: HTMLElement) {
    this.appDiv = appDiv;
    this.boundUpdate = this.update.bind(this);
  }

  public mount() {
    PasswordRecoveryActions.resetState();
    passwordRecoveryStore.on('change', this.boundUpdate);
    this.update();
  }

  public unmount() {
    passwordRecoveryStore.off('change', this.boundUpdate);
  }

  private update() {
    const state = passwordRecoveryStore.getState();

    if (this.currentStep !== state.step) {
      this.currentStep = state.step;
      this.renderStep(state.step, state);
    }

    this.updateErrors(state);
    this.updateStateUI(state);
  }

  private renderStep(step: PasswordRecoveryStep, state: PasswordRecoveryState) {
    if (step === PasswordRecoveryStep.EMAIL) {
      this.appDiv.innerHTML = renderStepEmail({});
      this.attachEmailListeners();
    } else if (step === PasswordRecoveryStep.CODE) {
      this.appDiv.innerHTML = renderStepCode({ email: state.email });
      this.attachCodeListeners();
    } else if (step === PasswordRecoveryStep.NEW_PASS) {
      this.appDiv.innerHTML = renderStepNewPass({});
      this.attachNewPassListeners();
    }

    const emailInput = document.getElementById('email') as HTMLInputElement | null;
    if (emailInput && state.email && step === PasswordRecoveryStep.EMAIL) {
      emailInput.value = state.email;
    }
  }

  private attachEmailListeners() {
    const form = document.getElementById('recovery-email-form') as HTMLFormElement | null;
    const emailInput = document.getElementById('email') as HTMLInputElement | null;
    const submitBtn = document.getElementById('recovery-submit') as HTMLButtonElement | null;
    const backLink = document.getElementById('back-link-email') as HTMLAnchorElement | null;

    if (backLink) {
      backLink.addEventListener('click', (e) => {
        e.preventDefault();
        PasswordRecoveryActions.goBack();
      });
    }

    if (emailInput && submitBtn) {
      emailInput.addEventListener('input', () => {
        submitBtn.disabled = !emailInput.value.trim();
      });
      submitBtn.disabled = !emailInput.value.trim();
    }

    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        if (emailInput) {
          PasswordRecoveryActions.sendEmail(emailInput.value.trim());
        }
      });
    }
  }

  private attachCodeListeners() {
    const form = document.getElementById('recovery-code-form') as HTMLFormElement | null;
    const codeInput = document.getElementById('code') as HTMLInputElement | null;
    const submitBtn = form?.querySelector<HTMLButtonElement>('button[type="submit"]');
    const backLink = document.getElementById('back-link') as HTMLAnchorElement | null;

    if (codeInput && submitBtn) {
      codeInput.addEventListener('input', () => {
        submitBtn.disabled = !codeInput.value.trim();
      });
      submitBtn.disabled = !codeInput.value.trim();
    }

    if (backLink) {
      backLink.addEventListener('click', (e) => {
        e.preventDefault();
        PasswordRecoveryActions.goBack();
      });
    }

    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        if (codeInput) {
          PasswordRecoveryActions.verifyCode(codeInput.value.trim());
        }
      });
    }
  }

  private attachNewPassListeners() {
    const form = document.getElementById('recovery-pass-form') as HTMLFormElement | null;
    const password = document.getElementById('password') as HTMLInputElement | null;
    const repeatPassword = document.getElementById('repeatPassword') as HTMLInputElement | null;
    const submitBtn = form?.querySelector<HTMLButtonElement>('button[type="submit"]');

    const checkForm = () => {
      if (submitBtn && password && repeatPassword) {
        submitBtn.disabled = !(password.value.trim() && repeatPassword.value.trim());
      }
    };

    if (password) password.addEventListener('input', checkForm);
    if (repeatPassword) repeatPassword.addEventListener('input', checkForm);
    checkForm();

    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        if (password && repeatPassword) {
          PasswordRecoveryActions.resetPassword(password.value, repeatPassword.value);
        }
      });
    }
  }

  private updateErrors(state: PasswordRecoveryState) {
    setGlobalError(state.globalError);

    if (state.step === PasswordRecoveryStep.EMAIL) {
      setInputError('email', state.fieldErrors.email);
    } else if (state.step === PasswordRecoveryStep.CODE) {
      setInputError('code', state.fieldErrors.code);
    } else if (state.step === PasswordRecoveryStep.NEW_PASS) {
      setInputError('password', state.fieldErrors.password);
      setInputError('repeatPassword', state.fieldErrors.repeatPassword);
    }
  }

  private isCurrentStepValid(step: PasswordRecoveryStep): boolean {
    switch (step) {
      case PasswordRecoveryStep.EMAIL: {
        const emailInput = document.getElementById('email') as HTMLInputElement | null;
        return Boolean(emailInput?.value.trim());
      }

      case PasswordRecoveryStep.CODE: {
        const codeInput = document.getElementById('code') as HTMLInputElement | null;
        return Boolean(codeInput?.value.trim());
      }

      case PasswordRecoveryStep.NEW_PASS: {
        const password = document.getElementById('password') as HTMLInputElement | null;
        const repeatPassword = document.getElementById('repeatPassword') as HTMLInputElement | null;
        return Boolean(password?.value.trim() && repeatPassword?.value.trim());
      }

      default:
        return false;
    }
  }

  private updateSubmitButtonUI(state: PasswordRecoveryState) {
    const submitBtn = document.querySelector('button[type="submit"]') as HTMLButtonElement | null;

    if (!submitBtn) return;

    if (state.isLoading) {
      submitBtn.disabled = true;
      return;
    }

    submitBtn.disabled = !this.isCurrentStepValid(state.step);
  }

  private updateTimerUI(state: PasswordRecoveryState) {
    if (state.step !== PasswordRecoveryStep.CODE) return;

    const timerSpan = document.getElementById('timer');
    const resendLink = document.getElementById('resend-link');

    if (state.timeLeft > 0) {
      if (timerSpan) {
        timerSpan.textContent = `0:${state.timeLeft.toString().padStart(2, '0')}`;
      }
      return;
    }

    if (resendLink && !resendLink.querySelector('#resend-action')) {
      resendLink.innerHTML = '<a href="#" id="resend-action">Отправить повторно</a>';
      document.getElementById('resend-action')?.addEventListener('click', (e) => {
        e.preventDefault();
        PasswordRecoveryActions.resendCode();
      });
    }
  }

  private updateStateUI(state: PasswordRecoveryState) {
    this.updateTimerUI(state);
    this.updateSubmitButtonUI(state);
  }
}
```

src/templates/support_widget.hbs:
```
<div class="support-widget">
  {{#if (eq view 'list')}}
  <button class="btn btn--primary" id="sw-btn-create">+ Новое обращение</button>

  <div class="support-widget__list mt-1">
    {{#each tickets}}
    <div class="support-widget__ticket" data-id="{{#if appeal_link}}{{appeal_link}}{{else}}{{id}}{{/if}}">
      <h4>{{display_name}}</h4>
      <div class="sw-flex-between">
        <span class="status status-{{status}}">
          {{#if (eq status 'new')}}Новое{{/if}}
          {{#if (eq status 'in_progress')}}В работе{{/if}}
          {{#if (eq status 'closed')}}Закрыто{{/if}}
        </span>
        <span class="support-widget__ticket-status-meta"> </span>
      </div>
    </div>
    {{/each}}

    {{#if (eq tickets.length 0)}}
    <p class="sw-no-tickets">У вас пока нет обращений</p>
    {{/if}}
  </div>
  {{/if}}

  {{#if (eq view 'create')}}
  <button class="support-widget__back-btn sw-btn-back-wrap" id="sw-btn-back">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
      stroke-linecap="round" stroke-linejoin="round">
      <line x1="19" y1="12" x2="5" y2="12"></line>
      <polyline points="12 19 5 12 12 5"></polyline>
    </svg>
    Назад
  </button>

  <div class="support-widget__create">
    <div class="input-group sw-mb-08">
      <label class="input-group__label">Email</label>
      <input type="email" id="sw-email" class="input-group__field" placeholder="Ваш email" value="{{user.email}}">
    </div>

    <div class="input-group sw-mb-08">
      <label class="input-group__label">Имя</label>
      <input type="text" id="sw-name" class="input-group__field" placeholder="Как к вам обращаться?"
        value="{{user.display_name}}">
    </div>

    <div class="input-group relative-wrapper sw-mb-08">
      <label class="input-group__label">Категория</label>
      <button type="button" id="sw-category-btn" class="input-group__field support-widget__select-btn">
        <span id="sw-category-text">Баг</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ccc" stroke-width="2"
          class="sw-flex-shrink-0">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>
      <div id="sw-category-dropdown" class="support-widget__dropdown hidden">
        <div class="support-widget__dropdown-item">Баг</div>
        <div class="support-widget__dropdown-item">Предложение</div>
        <div class="support-widget__dropdown-item">Продуктовая проблема</div>
      </div>
    </div>

    <div class="input-group sw-mb-08">
      <label class="input-group__label">Описание</label>
      <textarea id="sw-desc" class="input-group__field"
        placeholder="Опишите проблему максимально подробно..."></textarea>
    </div>

    <div class="sw-flex-gap-05 sw-mb-15">
      <label for="sw-attachment" class="support-widget__attachment-btn sw-attachment-btn">
        <div id="sw-attachment-preview-container" class="hidden support-widget__preview-box">
          <img id="sw-attachment-preview" src="" alt="Preview">
        </div>
        <svg id="sw-attachment-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="sw-flex-shrink-0">
          <path
            d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48">
          </path>
        </svg>
        <span id="sw-attachment-name" class="support-widget__attachment-text">Прикрепить фото</span>
        <span id="sw-attachment-hint" class="support-widget__attachment-hint">(необязательно)</span>
        <input type="file" id="sw-attachment" class="hidden" accept="image/*">
      </label>

      <button type="button" id="sw-attachment-remove" class="icon-btn hidden sw-icon-remove" title="Удалить вложение">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>

    <button class="btn btn--primary" id="sw-btn-submit" disabled>Отправить</button>
  </div>
  {{/if}}

  {{#if (eq view 'chat')}}
  <div class="sw-flex-between sw-mb-1">
    <button class="support-widget__back-btn sw-btn-back-wrap" id="sw-btn-back">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
        stroke-linecap="round" stroke-linejoin="round">
        <line x1="19" y1="12" x2="5" y2="12"></line>
        <polyline points="12 19 5 12 12 5"></polyline>
      </svg>
      Назад
    </button>
    <span class="status status-{{currentTicket.status}}">
      {{#if (eq currentTicket.status 'new')}}Новое{{/if}}
      {{#if (eq currentTicket.status 'in_progress')}}В работе{{/if}}
      {{#if (eq currentTicket.status 'closed')}}Закрыто{{/if}}
    </span>
  </div>
  <h3 class="sw-title-margin">{{currentTicket.display_name}}</h3>

  <div class="support-widget__messages" id="sw-messages">
    <div class="msg msg-user"><strong>Описание:</strong><br>{{currentTicket.description}}</div>

    {{#if currentTicket.attachment_key}}
    <div class="msg msg-user sw-msg-img-wrap">
      <img src="{{currentTicket.attachment_key}}" class="sw-msg-img" alt="Вложение">
    </div>
    {{/if}}
  </div>
  {{/if}}
</div>
```

src/templates/profile.hbs:
```
<div class="boards__layout">
  {{> sidebar activeProfile=true}}

  <div class="main-content profile__container">
    <h1 class="boards__title profile__title">Профиль</h1>

    <div class="profile__avatar-section">
      <div class="profile__avatar-preview">
        {{#if user.avatar_url}}
        <img src="{{user.avatar_url}}" alt="Avatar" class="profile__avatar-img">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"
          class="hidden profile__avatar-fallback">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
        {{else}}
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"
          class="profile__avatar-fallback">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
        {{/if}}
      </div>
      <div class="profile__avatar-actions">
        <label for="avatar-upload" class="profile__action-link cursor-pointer">Изменить фото</label>
        <input type="file" id="avatar-upload" class="hidden" accept="image/*">
        <span id="btn-delete-avatar"
          class="profile__action-delete{{#unless user.avatar_url}} profile__action-delete--disabled{{/unless}} cursor-pointer">Удалить
          фото</span>
      </div>
    </div>

    <form id="profile-form">
      <div class="input-group">
        <label class="profile__input-label">Имя</label>
        <input type="text" id="profile-name" class="input-group__field profile__input-field"
          value="{{user.display_name}}" maxlength="128">
      </div>
      <div class="input-group">
        <label class="profile__input-label">О себе</label>
        <textarea id="profile-desc" class="input-group__field profile__textarea" maxlength="1000"
          placeholder="Расскажите о себе">{{user.description_user}}</textarea>
      </div>
      <div class="input-group">
        <div class="input-group__header">
          <label class="profile__input-label">Email</label>
        </div>
        <div class="input-group__wrapper profile__email-wrapper">
          <input type="text" class="input-group__field profile__email-input" value="{{user.email}}" readonly>
          <svg class="profile__email-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666"
            stroke-width="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
        </div>
      </div>
      <button type="submit" class="btn profile__btn-save profile__btn-disabled" id="btn-save-profile"
        disabled>Сохранить</button>
    </form>
  </div>
</div>

<div id="modal-overlay" class="modal__overlay hidden">
  <div id="modal-delete-avatar" class="modal hidden">
    <div class="modal__header">
      <h2 class="modal__title">Удалить фото профиля?</h2>
      <button class="modal__close-btn">×</button>
    </div>
    <div class="modal__actions">
      <button class="btn btn--danger" id="confirm-delete-avatar">Удалить</button>
      <button class="btn btn--cancel modal__close-btn">Отменить</button>
    </div>
  </div>
</div>
```

src/templates/support_admin.hbs:
```
<div class="boards__layout">
  {{> sidebar activeSupport=true}}

  <div class="main-content">
    <h1 class="boards__title mb-1">Панель управления поддержкой</h1>

    <div class="support-admin__stats mb-1">
      <div class="stat-card">
        <h3>Новые</h3>
        <div class="val">{{statistics.new}}</div>
      </div>
      <div class="stat-card">
        <h3>В работе</h3>
        <div class="val">{{statistics.in_progress}}</div>
      </div>
      <div class="stat-card">
        <h3>Закрыто</h3>
        <div class="val">{{statistics.closed}}</div>
      </div>
    </div>

    <div class="support-admin__layout">
      <div class="support-admin__list">
        <h3 class="sa-title-margin">Список тикетов</h3>
        {{#each tickets}}
        <div
          class="support-widget__ticket sa-ticket-item {{#if (eq ../currentTicket.appeal_link appeal_link)}}sa-ticket-item--active{{/if}}"
          data-id="{{#if appeal_link}}{{appeal_link}}{{else}}{{id}}{{/if}}">
          <h4>{{display_name}}</h4>
          <div class="sa-ticket-flex">
            <span class="status status-{{status}}">
              {{#if (eq status 'new')}}Новое{{/if}}{{#if (eq status 'in_progress')}}В работе{{/if}}{{#if (eq status
              'closed')}}Закрыто{{/if}}
            </span>
            <span class="sa-ticket-cat">{{category}}</span>
          </div>
        </div>
        {{/each}}

        {{#if (eq tickets.length 0)}}
        <p class="sa-empty">Нет обращений</p>
        {{/if}}
      </div>

      <div class="support-admin__detail">
        {{#if currentTicket}}
        <div class="sa-detail-header">
          <h2 class="sa-detail-title">{{currentTicket.display_name}}</h2>
          <div class="sa-detail-actions">
            <select id="sa-status-select" class="input-group__field sa-status-select">
              <option value="new" {{#if (eq currentTicket.status 'new' )}}selected{{/if}}>Новое</option>
              <option value="in_progress" {{#if (eq currentTicket.status 'in_progress' )}}selected{{/if}}>В работе
              </option>
              <option value="closed" {{#if (eq currentTicket.status 'closed' )}}selected{{/if}}>Закрыто</option>
            </select>
          </div>
        </div>
        <p class="sa-meta">Категория: {{currentTicket.category}} | Email: {{currentTicket.email}}</p>

        <div class="support-widget__messages sa-messages" id="sa-messages">
          <div class="msg msg-user sa-msg-user">
            <strong>Описание:</strong><br>{{currentTicket.description}}
          </div>
          {{#if currentTicket.attachment_key}}
          <div class="msg msg-user sa-msg-img-wrap">
            <img src="{{currentTicket.attachment_key}}" class="sa-msg-img" alt="Вложение">
          </div>
          {{/if}}
        </div>
        {{else}}
        <div class="sa-empty-detail">
          Выберите обращение из списка
        </div>
        {{/if}}
      </div>
    </div>
  </div>
</div>
```

src/templates/support_iframe.hbs:
```
<div class="support-iframe__header">
  <h3>Служба поддержки</h3>
  <button id="close-support-iframe">&times;</button>
</div>
<iframe src="/support-widget" id="support-iframe-el"></iframe>

<div id="sw-close-modal" class="sw-close-modal hidden">
  <h3 class="sw-close-modal__title">Закрыть форму?</h3>
  <p class="sw-close-modal__desc">Введенные данные будут потеряны.</p>
  <div class="sw-close-modal__actions">
    <button id="sw-btn-confirm-close" class="sw-close-modal__btn sw-close-modal__btn--danger">Закрыть</button>
    <button id="sw-btn-cancel-close" class="sw-close-modal__btn sw-close-modal__btn--cancel">Отмена</button>
  </div>
</div>
```

src/templates/password_recovery_code.hbs:
```
<div class="auth__page">
  <div class="auth__form-container">
    <div class="auth__form-wrapper">
      <h1 class="auth__title">Введите код<br>подтверждения</h1>
      <p class="auth__subtitle-left mb-1">Код отправлен на {{email}}</p>

      <form id="recovery-code-form" novalidate>
        {{> input id="code" label="Код из письма" type="text" placeholder="123456" maxlength="6" }}

        <div class="resend__container">
          <span id="resend-link" class="resend__text">
            Отправить повторно через <span id="timer">0:59</span>
          </span>
        </div>

        <button type="submit" class="btn btn--primary mt-1" disabled>Подтвердить</button>

        <p class="auth__footer-text mt-1">
          <a href="#" id="back-link">Вернуться назад</a>
        </p>
      </form>
    </div>
  </div>

  <div class="auth__logo-container">
    <div class="auth__logo-content">
      <img src="/logo.svg" alt="NeXus Logo" class="auth__logo" />
      <p class="auth__subtitle">Центр управления проектами</p>
    </div>
  </div>
</div>
```

src/templates/kanban.hbs:
```
<div class="boards__layout">
  {{> sidebar activeBoards=true}}

  <div class="main-content kanban__content">
    <div class="kanban__header">
      <div class="kanban__title-group">
        <div class="board-card__icon-monitor">
          {{#if background}}
          <img src="{{background}}" class="board-card__bg-img" alt="Background">
          {{else}}
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ccc" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="4" width="18" height="12" rx="2"></rect>
            <path d="M12 16v4M8 22l4-4 4 4"></path>
          </svg>
          {{/if}}
        </div>
        <h1 class="kanban__board-title">{{board_name}}</h1>
      </div>
      <div class="kanban__actions">
        {{#unless isViewer}}
        <button class="btn btn--primary kanban__action-btn" id="btn-new-task">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Новая задача
        </button>
        <button class="btn btn--secondary kanban__action-btn" id="btn-manage-columns">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="7" height="7" rx="1"></rect>
            <rect x="14" y="3" width="7" height="7" rx="1"></rect>
            <rect x="14" y="14" width="7" height="7" rx="1"></rect>
            <rect x="3" y="14" width="7" height="7" rx="1"></rect>
          </svg>
          Управление колонками
        </button>
        <button class="btn btn--secondary kanban__action-btn" id="btn-share-board">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
            <polyline points="16 6 12 2 8 6"></polyline>
            <line x1="12" y1="2" x2="12" y2="15"></line>
          </svg>
          Поделиться
        </button>
        {{/unless}}
      </div>
    </div>

    <div class="kanban__view-tabs">
      <button class="kanban__view-tab active" id="tab-view-kanban">Канбан</button>
      <button class="kanban__view-tab" id="tab-view-gantt">Диаграмма Ганта</button>

      <div class="gantt-filter hidden" id="gantt-filter-container">
        <button class="kanban__view-tab" id="btn-gantt-filter" style="display: flex; align-items: center; gap: 0.5rem;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
          <span id="gantt-filter-label">Период: Все</span>
        </button>
        <div id="gantt-filter-popover" class="gantt-filter-popover hidden"></div>
      </div>
    </div>

    <div class="kanban__columns-wrapper">
      <div class="kanban__columns-container">
        {{#each sections}}
        <div class="kanban__column" data-id="{{id}}">
          <div class="kanban__column-header">
            <div class="kanban__column-title color-{{color}}">
              <span class="kanban__col-dot bg-{{color}}"></span>
              {{section_name}}
            </div>
            {{#unless ../isViewer}}
            <button class="icon-btn kanban__btn-col-options" data-id="{{id}}">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="5" cy="12" r="2" />
                <circle cx="12" cy="12" r="2" />
                <circle cx="19" cy="12" r="2" />
              </svg>
            </button>
            {{/unless}}
          </div>

          <div class="kanban__column-cards" data-section-id="{{id}}">
            {{#each tasks}}
            <div class="kanban-card {{#if is_done}}kanban-card--done{{/if}}" data-id="{{id}}" data-title="{{title}}"
              draggable="{{#if ../../isViewer}}false{{else}}true{{/if}}">
              <div class="kanban-card__header">
                <div class="kanban-card__assignee">Исп.: <span class="kanban-card__assignee-text">{{#if
                    executor}}{{executor}}{{else}}Не назначен{{/if}}</span></div>
                {{#unless ../../isViewer}}
                <button class="icon-btn kanban-card__options-btn" data-id="{{id}}" data-title="{{title}}">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="5" cy="12" r="1.5" />
                    <circle cx="12" cy="12" r="1.5" />
                    <circle cx="19" cy="12" r="1.5" />
                  </svg>
                </button>
                {{/unless}}
              </div>
              <div class="kanban-card__title {{#if is_done}}kanban-card__title--done{{/if}}">{{title}}</div>

              {{#if hasSubtasks}}
              <div class="kanban-card__subtasks">
                <div class="kanban-card__progress-bar">
                  <div class="kanban-card__progress-fill" style="{{progressPercentStyle}}"></div>
                </div>
                <div class="kanban-card__subtasks-header">
                  <span class="kanban-card__subtasks-title">{{subtasksProgressText}}</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </div>
                <div class="kanban-card__subtasks-list hidden">
                  {{#each subtasks}}
                  <label class="custom-checkbox kanban-card__subtask-item">
                    <input type="checkbox" class="kanban-subtask-checkbox" data-id="{{id}}" data-desc="{{description}}"
                      {{#if is_done}}checked{{/if}} {{#if ../../../isViewer}}disabled style="cursor: default;"{{/if}}>
                    <span class="checkmark"></span>
                    <span
                      class="kanban-card__subtask-text {{#if is_done}}kanban-card__subtask-text--done{{/if}}">{{description}}</span>
                  </label>
                  {{/each}}
                </div>
              </div>
              {{/if}}

              {{#if due_date}}
              <div class="kanban-card__meta">
                <span class="kanban-card__meta-item">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#888" stroke-width="2"
                    stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                  <span class="kanban-card__meta-text">{{due_date}}</span>
                </span>
                <span class="kanban-card__meta-item">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#888" stroke-width="2"
                    stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                  </svg>
                  <span class="kanban-card__meta-text">До {{time}}</span>
                </span>
              </div>
              {{/if}}

              {{#unless ../../isViewer}}
              <button class="kanban-card__status-checkmark {{#if is_done}}kanban-card__status-checkmark--active{{/if}}"
                title="Изменить статус задачи" type="button">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </button>
              {{else}}
                {{#if is_done}}
                <div class="kanban-card__status-checkmark kanban-card__status-checkmark--active" style="cursor: default; pointer-events: none;">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </div>
                {{/if}}
              {{/unless}}
            </div>
            {{/each}}
          </div>

          {{#unless ../isViewer}}
          <div class="kanban__add-card-wrapper mt-05" data-section-id="{{id}}">
            <button class="kanban__add-card-btn">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                class="kanban__add-card-icon">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Добавить карточку
            </button>
          </div>
          {{/unless}}
        </div>
        {{/each}}

        {{#unless isViewer}}
        <div class="kanban__column kanban__column--add kanban__column--transparent">
          <div class="kanban__add-column-wrapper">
            <button class="kanban__add-column-btn w-100" id="btn-add-column">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Добавить колонку
            </button>
          </div>
        </div>
        {{/unless}}

      </div>
    </div>

    <div class="gantt-chart hidden" id="gantt-chart-container">
    </div>

  </div>
</div>

<div id="modal-overlay" class="modal__overlay hidden">
  <div id="modal-invite-board" class="modal invite-modal hidden">
    <div class="modal__header">
      <h2 class="modal__title">Пригласить</h2>
      <button class="modal__close-btn" id="btn-close-invite">×</button>
    </div>
    <div class="modal__body">
      <div class="invite-modal__tabs">
        <button class="invite-modal__tab active" id="tab-invite-member">Участник</button>
        <button class="invite-modal__tab" id="tab-invite-guest">Гость</button>
      </div>

      <div class="invite-modal__role-select-container" id="invite-role-select-container">
        <button type="button" id="invite-role-btn" class="input-group__field invite-modal__role-btn">
          <span id="invite-role-text">Участник</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ccc" stroke-width="2">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </button>
        <div id="invite-role-dropdown" class="invite-modal__dropdown hidden">
          <div class="invite-modal__dropdown-item" data-role="editor">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
              class="invite-modal__dropdown-icon">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            Участник
          </div>
          <div class="invite-modal__dropdown-item" data-role="admin">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
              class="invite-modal__dropdown-icon">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="8.5" cy="7" r="4"></circle>
              <line x1="20" y1="8" x2="20" y2="14"></line>
              <line x1="23" y1="11" x2="17" y2="11"></line>
            </svg>
            Админ
          </div>
        </div>
      </div>

      <div class="input-group">
        <label class="modal__input-label">Ссылка для приглашения</label>
        <div class="invite-modal__link-row">
          <input type="text" id="invite-link-input" class="input-group__field invite-modal__link-field" readonly
            value="Загрузка ссылки...">
          <button class="btn btn--primary invite-modal__copy-btn" id="btn-copy-invite-link">Копировать</button>
        </div>
      </div>

      <div class="invite-modal__members-section">
        <div class="invite-modal__members-header">
          <h3 class="invite-modal__members-title">Участники</h3>
          <input type="text" id="invite-members-search" class="invite-modal__search-input" placeholder="Поиск...">
        </div>
        <div class="invite-modal__members-list" id="invite-members-list">
        </div>
      </div>

    </div>
  </div>

  <div id="modal-manage-columns" class="manage-columns hidden">
    <div class="manage-columns__header">
      <h2 class="manage-columns__title">Управление колонками</h2>
      <button class="modal__close-btn">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>

    <div class="manage-columns__list" id="manage-columns-list">
    </div>

    <button class="manage-columns__add-btn" id="btn-add-column-modal">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <line x1="5" y1="12" x2="19" y2="12"></line>
      </svg>
      Создать колонку
    </button>

    <button class="manage-columns__footer-btn" id="btn-close-manage">Готово</button>
  </div>

  <div id="modal-delete-section" class="modal hidden">
    <div class="modal__header">
      <h2 class="modal__title">Удалить колонку</h2>
      <button class="modal__close-btn">×</button>
    </div>
    <p class="modal__text">Вы уверены, что хотите удалить колонку “<span id="delete-section-modal-name"
        class="fw-bold"></span>”? Все задачи в ней также будут удалены.</p>
    <div class="modal__actions">
      <button class="btn btn--danger" id="btn-confirm-delete-section-modal">Удалить</button>
      <button class="btn btn--cancel modal__close-btn">Отменить</button>
    </div>
  </div>

  <div id="modal-delete-card" class="modal hidden">
    <div class="modal__header">
      <h2 class="modal__title">Удалить карточку</h2>
      <button class="modal__close-btn">×</button>
    </div>
    <p class="modal__text">Вы уверены, что хотите удалить карточку<br>“<span id="delete-card-name"
        class="fw-bold"></span>”?</p>
    <div class="modal__actions">
      <button class="btn btn--danger" id="btn-confirm-delete-card">Удалить</button>
      <button class="btn btn--cancel modal__close-btn">Отменить</button>
    </div>
  </div>

  <div id="modal-create-task" class="modal hidden">
    <div class="modal__header">
      <h2 class="modal__title">Новая задача</h2>
      <button class="modal__close-btn">×</button>
    </div>
    <div class="modal__body">
      <input type="text" id="new-task-title" class="kanban__modal-input" placeholder="Введите название задачи..."
        autofocus>
      <div class="kanban__assignee-block">
        <span class="kanban__assignee-label">Исполнитель:</span>
        <button id="assignee-select-btn" class="assignee__select-btn" type="button">Выбрать...</button>
      </div>
    </div>
    <div class="modal__actions">
      <button class="btn btn--primary" id="btn-confirm-create-task">Создать</button>
      <button class="btn btn--cancel modal__close-btn">Отменить</button>
    </div>
  </div>
  <div id="modal-create-column" class="modal hidden">
    <div class="modal__header">
      <h2 class="modal__title">Создать колонку</h2>
      <button class="modal__close-btn">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>
    <div class="modal__body create-column-form">
      <div class="create-column-form__input-wrap">
        <input type="text" id="create-col-name" class="kanban__modal-input"
          placeholder="Новая колонка" maxlength="50">
      </div>

      <label class="create-column-form__label">Цвета</label>
      <div class="create-column-form__colors">
        <button class="create-column-form__color-btn active" data-color="white"></button>
        <button class="create-column-form__color-btn" data-color="grey"></button>
        <button class="create-column-form__color-btn" data-color="red"></button>
        <button class="create-column-form__color-btn" data-color="orange"></button>
        <button class="create-column-form__color-btn" data-color="blue"></button>
        <button class="create-column-form__color-btn" data-color="green"></button>
        <button class="create-column-form__color-btn" data-color="purple"></button>
        <button class="create-column-form__color-btn" data-color="pink"></button>
      </div>

      <div class="create-column-form__row">
        <label class="toggle">
          <input type="checkbox" id="create-col-mandatory">
          <span class="slider"></span>
        </label>
        <span class="create-column-form__label-inline">Обязательная колонка</span>
      </div>

      <div class="create-column-form__input-wrap mb-2">
        <label class="create-column-form__label">Максимальное число задач</label>
        <input type="number" id="create-col-max" class="create-column-form__max-input" placeholder="00" min="0"
          max="999">
      </div>
    </div>
    <button class="btn btn--primary w-100" id="btn-confirm-create-column" disabled>Создать</button>
  </div>
</div>
```

src/templates/login.hbs:
```
<div class="auth__page">
  <div class="auth__form-container">
    <div class="auth__form-wrapper">
      <h1 class="auth__title">Войти</h1>

      <form id="login-form" novalidate>
        {{> input id="email" label="Email" type="email" placeholder="email@example.com" maxlength="128" }}
        {{> input id="password" label="Пароль" type="password" placeholder="Введите пароль" isPassword=true
        forgotPassword=true maxlength="128" }}

        <button type="submit" class="btn btn--primary mt-05" id="login-submit" disabled>Войти</button>

        <p class="auth__footer-text mt-1">
          Нет аккаунта? <a href="#" id="link-register">Зарегистрироваться</a>
        </p>

        <div class="divider">
          <div class="divider__line"></div>Или<div class="divider__line"></div>
        </div>
        <a href="{{vkAuthUrl}}" class="btn btn--vk">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 101 100" fill="none">
            <g clip-path="url(#clip0_2_40)">
              <path
                d="M0.5 48C0.5 25.3726 0.5 14.0589 7.52944 7.02944C14.5589 0 25.8726 0 48.5 0H52.5C75.1274 0 86.4411 0 93.4706 7.02944C100.5 14.0589 100.5 25.3726 100.5 48V52C100.5 74.6274 100.5 85.9411 93.4706 92.9706C86.4411 100 75.1274 100 52.5 100H48.5C25.8726 100 14.5589 100 7.52944 92.9706C0.5 85.9411 0.5 74.6274 0.5 52V48Z"
                fill="transparent" />
              <path
                d="M53.7085 72.042C30.9168 72.042 17.9169 56.417 17.3752 30.417H28.7919C29.1669 49.5003 37.5834 57.5836 44.25 59.2503V30.417H55.0004V46.8752C61.5837 46.1669 68.4995 38.667 70.8329 30.417H81.5832C79.7915 40.5837 72.2915 48.0836 66.9582 51.1669C72.2915 53.6669 80.8336 60.2086 84.0836 72.042H72.2499C69.7082 64.1253 63.3754 58.0003 55.0004 57.1669V72.042H53.7085Z"
                fill="white" />
            </g>
          </svg>
          Войти с VK ID
        </a>

        <div id="global-error" class="global-error__banner hidden mt-1">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <span id="global-error-text">Проверьте подключение и попробуйте снова</span>
        </div>
      </form>
    </div>
  </div>

  <div class="auth__logo-container">
    <div class="auth-logo-content">
      <img src="/logo.svg" alt="NeXus Logo" class="auth__logo" />
      <p class="auth__subtitle">Центр управления проектами</p>
    </div>
  </div>
</div>
```

src/templates/password_recovery_new_pass.hbs:
```
<div class="auth__page">
  <div class="auth__form-container">
    <div class="auth__form-wrapper">
      <h1 class="auth__title">Придумайте<br>новый пароль</h1>

      <form id="recovery-pass-form" novalidate>
        {{> input id="password" label="Новый пароль" type="password" placeholder="Минимум 8 символов" isPassword=true
        maxlength="128" }}
        {{> input id="repeatPassword" label="Подтвердите пароль" type="password" placeholder="Минимум 8 символов"
        isPassword=true maxlength="128" }}

        <button type="submit" class="btn btn--primary mt-1" disabled>Сохранить</button>
      </form>
    </div>
  </div>

  <div class="auth__logo-container">
    <div class="auth__logo-content">
      <img src="/logo.svg" alt="NeXus Logo" class="auth__logo" />
      <p class="auth__subtitle">Центр управления проектами</p>
    </div>
  </div>
</div>
```

src/templates/task.hbs:
```
<div class="task__page-container" id="task-overlay">
  <div class="task__panel {{#if noAnimation}}task__panel--no-animation{{/if}}">
    <div class="task__header-bar">
      <div class="task__header-left">
        <button class="icon-btn task__close-btn" id="btn-back" title="Закрыть">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      <div class="task__header-right">
        <button
          class="btn task__status-btn {{#if task.is_done}}task__status-btn--done{{else}}task__status-btn--pending{{/if}}"
          id="btn-toggle-task-status" type="button" {{#if isViewer}}disabled style="cursor: default; opacity: 0.75;"{{/if}}>
          {{#if task.is_done}}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          Выполнена
          {{else}}
          Выполнить
          {{/if}}
        </button>
        {{#unless isViewer}}
        <button class="btn btn--primary task__save-btn" id="btn-save-task">Сохранить</button>
        <button class="icon-btn task__options-btn" id="btn-task-options">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="5" cy="12" r="2" />
            <circle cx="12" cy="12" r="2" />
            <circle cx="19" cy="12" r="2" />
          </svg>
        </button>
        {{/unless}}
      </div>
    </div>

    <div class="task__content">
      <div class="task__board-title" id="task-board-name">{{board_name}}</div>

      <div class="task__title-container">
        <input type="text" class="task__title-input {{#if task.is_done}}task__title-input--done{{/if}}" id="task-title-input" value="{{task.title}}"
          placeholder="Заголовок задачи" maxlength="100" {{#if isViewer}}disabled{{/if}}>
      </div>

      <div class="task__meta-list">
        <div class="task__meta-item relative-wrapper">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
          <span class="task__meta-label">Исполнитель:</span>
          <button class="task__meta-value-btn task__meta-value-btn-flex" id="task-executor-btn"
            data-id="{{task.executor_id}}" {{#if isViewer}}disabled style="border-bottom: none; cursor: default;"{{/if}}>
            {{#if task.executor_id}}
            {{#if task.executor_avatar}}
            <img src="{{task.executor_avatar}}" class="assignee__avatar-small">
            {{else}}
            <div class="assignee__avatar-fallback-small">{{task.executor_fallback}}</div>
            {{/if}}
            {{task.executor}}
            {{else}}
            Не назначен
            {{/if}}
          </button>
        </div>

        <div class="task__meta-item relative-wrapper">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
          <span class="task__meta-label">Дата:</span>
          <button class="task__meta-value-btn" id="task-date-btn" type="button" {{#if isViewer}}disabled style="border-bottom: none; cursor: default;"{{/if}}>
            {{#if task.due_date}}{{task.due_date}}{{else}}Не задана{{/if}}
          </button>
          <input type="hidden" id="task-date-input" value="{{task.raw_date}}">
        </div>

        <div class="task__meta-item relative-wrapper">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
          <span class="task__meta-label">Время:</span>
          <button class="task__meta-value-btn" id="task-time-btn" {{#if isViewer}}disabled style="border-bottom: none; cursor: default;"{{/if}}>
            {{#if task.time}}{{task.time}}{{else}}Не задано{{/if}}
          </button>
          <input type="hidden" id="task-time-input" value="{{task.raw_time}}">
        </div>
      </div>

      {{#if isViewer}}
        {{#if task.description}}
        <div class="task__description-section">
          <div class="task__description-box">
            <textarea class="task__description-textarea" id="task-desc-input"
              disabled style="background: transparent; border-color: transparent; padding: 0; resize: none; cursor: default; color: #ccc;">{{task.description}}</textarea>
          </div>
        </div>
        {{/if}}
      {{else}}
        <div class="task__description-section">
          <div class="task__description-box">
            <textarea class="task__description-textarea" id="task-desc-input"
              placeholder="Добавить описание...">{{task.description}}</textarea>
          </div>
        </div>
      {{/if}}

      <div class="task__subtasks-section">
        <h3 class="task__section-title">Подзадачи</h3>
        <div class="task__subtasks-list">
          {{#each task.subtasks}}
          <div class="task__subtask-row task__subtask-row-flex">
            <label class="custom-checkbox task__subtask-item task__subtask-item-flex">
              <input type="checkbox" class="subtask-checkbox" data-id="{{id}}" data-desc="{{description}}" {{#if
                is_done}}checked{{/if}} {{#if ../../isViewer}}disabled style="cursor: default;"{{/if}}>
              <span class="checkmark"></span>
              <input type="text" class="task__subtask-text-input {{#if is_done}}task__subtask-text-input--done{{/if}}"
                value="{{description}}" data-id="{{id}}" data-done="{{is_done}}" {{#if ../../isViewer}}disabled style="cursor: default;"{{/if}}>
            </label>
            {{#unless ../../isViewer}}
            <button class="icon-btn task__subtask-delete-btn task__subtask-delete-btn-styled" data-id="{{id}}">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
            {{/unless}}
          </div>
          {{/each}}
        </div>

        {{#if isViewer}}
          {{#unless task.subtasks}}
            <p style="color: #666; font-size: 0.95rem; margin-top: 0.5rem; margin-bottom: 1.5rem;">Нет подзадач</p>
          {{/unless}}
        {{/if}}

        {{#unless isViewer}}
        <div class="task__subtask-add mt-05">
          <input type="text" class="task__subtask-input" id="new-subtask-input" placeholder="Добавить подзадачу...">
          <button class="icon-btn task__subtask-add-btn" id="subtask-add-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>
        </div>
        {{/unless}}
      </div>

      <div class="task__attachments-section">
        <h3 class="task__section-title">Вложения</h3>
        <div class="task__attachments-list">
          {{#each attachments}}
          <div class="task__attachment-item" data-id="{{attachment_link}}">
            <a href="{{attachment_path}}" target="_blank" class="task__attachment-link"
              data-is-image="{{#if isImage}}true{{else}}false{{/if}}" title="{{display_name}}"
              style="text-decoration: none; color: inherit; display: flex; align-items: center; gap: 0.75rem; flex: 1; min-width: 0;">
              {{#if isImage}}
              <div class="task__attachment-preview-thumb">
                <img src="{{attachment_path}}" alt="{{display_name}}" class="task__attachment-thumb-img">
              </div>
              {{else}}
              <svg class="task__attachment-icon" width="20" height="20" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
              </svg>
              {{/if}}
              <span class="task__attachment-name">{{display_name}}</span>
            </a>
            {{#unless ../isViewer}}
            <button class="icon-btn task__attachment-delete-btn" data-link="{{attachment_link}}">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
            {{/unless}}
          </div>
          {{/each}}
        </div>

        {{#if isViewer}}
          {{#unless attachments}}
            <p style="color: #666; font-size: 0.95rem; margin-top: 0.5rem; margin-bottom: 1.5rem;">Нет вложений</p>
          {{/unless}}
        {{/if}}

        {{#unless isViewer}}
        <div class="task__attachment-upload mt-05">
          <label for="task-file-input" class="task__attachment-upload-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round" class="task__attachment-icon-svg">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            <span id="task-file-name">
              {{#if isAttachmentsFull}}
              Лимит файлов (100/100)
              {{else}}
              {{#if (eq attachmentsCount 0)}}
              Загрузить файл
              {{else}}
              Загрузить файл
              {{/if}}
              {{/if}}
            </span>
          </label>
          <input type="file" id="task-file-input" class="hidden">
        </div>
        {{/unless}}
      </div>

      <div class="task__comments-section">
        <h3 class="task__section-title">Комментарии ({{comments.length}})</h3>

        <div class="task__comments-list">
          {{#each comments}}
          {{#if show_date_header}}
          <div class="task__comments-date">{{date_header}}</div>
          {{/if}}

          <div class="task__comment {{#if is_mine}}task__comment--mine{{else}}task__comment--others{{/if}}"
            data-id="{{comment_link}}">
            {{#unless is_mine}}
            {{#if author_avatar}}
            <img src="{{author_avatar}}" alt="Avatar" class="task__comment-avatar">
            {{else}}
            <div class="task__comment-avatar-fallback">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </div>
            {{/if}}
            {{/unless}}

            <div class="task__comment-body-wrapper">
              <div class="task__comment-bubble">
                <div class="task__comment-author">{{author_name}}</div>
                <div class="task__comment-text">{{text}}</div>
              </div>

              {{#if is_mine}}
              <div class="task__comment-menu-wrap">
                <button class="task__comment-menu-btn icon-btn" title="Действия">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="5" cy="12" r="2"></circle>
                    <circle cx="12" cy="12" r="2"></circle>
                    <circle cx="19" cy="12" r="2"></circle>
                  </svg>
                </button>
                <div class="task__comment-dropdown hidden">
                  <button class="task__comment-dropdown-item task__comment-edit-btn">Редактировать</button>
                  <button class="task__comment-dropdown-item task__comment-delete-btn">Удалить</button>
                </div>
              </div>
              {{/if}}
            </div>

            {{#if created_time}}
            <span class="task__comment-time">{{created_time}}</span>
            {{/if}}

            {{#if is_mine}}
            {{#if author_avatar}}
            <img src="{{author_avatar}}" alt="Avatar" class="task__comment-avatar">
            {{else}}
            <div class="task__comment-avatar-fallback">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </div>
            {{/if}}
            {{/if}}
          </div>
          {{/each}}
          {{#if (eq comments.length 0)}}
          <p class="task__no-comments">Нет комментариев</p>
          {{/if}}
        </div>
      </div>

      <div class="task__comment-input-area">
        <input type="text" class="task__comment-input" placeholder="Комментарий...">
        <button class="icon-btn task__comment-send-btn">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
        </button>
      </div>

    </div>
  </div>
</div>

<div id="modal-overlay" class="modal__overlay hidden">
  <div id="modal-delete-task" class="modal hidden">
    <div class="modal__header">
      <h2 class="modal__title">Удалить карточку</h2>
      <button class="modal__close-btn">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>
    <p class="modal__text">Вы уверены, что хотите удалить карточку “<span id="delete-task-name"
        class="fw-bold"></span>”?</p>
    <div class="modal__actions">
      <button class="btn btn--danger" id="btn-confirm-delete-task">Удалить</button>
      <button class="btn btn--cancel modal__close-btn">Отменить</button>
    </div>
  </div>
</div>
```

src/templates/section.hbs:
```
<div class="task__page-container" id="section-overlay">
  <div class="task__panel">
    <div class="task__header-bar">
      <div class="task__header-left">
        <button class="icon-btn task__close-btn" id="btn-back-section" title="Закрыть">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      <div class="task__header-right">
        <button class="btn btn--primary task__save-btn" id="btn-save-section">Сохранить</button>
        <button class="icon-btn task__options-btn" id="btn-section-options">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="5" cy="12" r="2" />
            <circle cx="12" cy="12" r="2" />
            <circle cx="19" cy="12" r="2" />
          </svg>
        </button>
      </div>
    </div>

    <div class="task__content">
      <div class="task__board-title">{{board_name}}</div>

      <div class="task__title-container">
        <input type="text" class="task__title-input" id="section-name-input" value="{{section.section_name}}"
          placeholder="Название секции" maxlength="50">
      </div>

      <div class="task__meta-list">
        <div class="task__meta-item">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M12 8v8M8 12h8"></path>
          </svg>
          <span class="task__meta-label">Лимит задач:</span>
          <input type="number" class="task__meta-date-input" id="section-max-tasks-input" value="{{section.max_tasks}}"
            min="0" max="999">
        </div>

        <div class="task__meta-item">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="2">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z">
            </path>
          </svg>
          <span class="task__meta-label">Цвет:</span>
          {{> colorPicker}}
        </div>
        <div class="task__meta-item">
          <span class="task__meta-label section-mandatory-label">Обязательная секция</span>
          <label class="toggle">
            <input type="checkbox" id="section-mandatory-input" {{#if section.is_mandatory}}checked{{/if}}>
            <span class="slider"></span>
          </label>
        </div>
      </div>
    </div>
  </div>
</div>

<div id="modal-overlay-section" class="modal__overlay hidden">
  <div id="modal-delete-section" class="modal hidden">
    <div class="modal__header">
      <h2 class="modal__title">Удалить секцию</h2>
      <button class="modal__close-btn">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>
    <p class="modal__text">Вы уверены, что хотите удалить секцию “<span id="delete-section-name"
        class="fw-bold"></span>”? Все задачи в ней также будут удалены.</p>
    <div class="modal__actions">
      <button class="btn btn--danger" id="btn-confirm-delete-section">Удалить</button>
      <button class="btn btn--cancel modal__close-btn">Отменить</button>
    </div>
  </div>
</div>
```

src/templates/register.hbs:
```
<div class="auth__page">
  <div class="auth__form-container">
    <div class="auth__form-wrapper">
      <h1 class="auth__title">Регистрация</h1>

      <form id="register-form" novalidate>
        {{> input id="name" label="Имя" type="text" placeholder="Ваше имя" maxlength="128" }}
        {{> input id="email" label="Email" type="email" placeholder="email@example.com" maxlength="128" }}
        {{> input id="password" label="Пароль" type="password" placeholder="Минимум 8 символов" isPassword=true
        maxlength="128" }}
        {{> input id="repeatPassword" label="Повторите пароль" type="password" placeholder="Минимум 8 символов"
        isPassword=true maxlength="128" }}

        <button type="submit" class="btn btn--primary mt-1" id="register-submit" disabled>Зарегистрироваться</button>

        <p class="auth__footer-text mt-1">
          У вас уже есть аккаунт? <a href="#" id="link-login">Войти</a>
        </p>

        <div id="global-error" class="global-error__banner hidden mt-1">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <span id="global-error-text">Проверьте подключение и попробуйте снова</span>
        </div>
      </form>
    </div>
  </div>

  <div class="auth__logo-container">
    <div class="auth__logo-content">
      <img src="/logo.svg" alt="NeXus Logo" class="auth__logo" />
      <p class="auth__subtitle">Центр управления проектами</p>
    </div>
  </div>
</div>
```

src/templates/boards.hbs:
```
<div class="boards__layout">
  {{> sidebar activeBoards=true}}

  <div class="main-content">
    <div class="boards__header-container">
      <h1 class="boards__title">
        {{#if (eq boards.length 0)}}Досок{{else}}Доски{{/if}}
        <span class="boards__count">{{boards.length}}</span>
      </h1>
      <button class="btn btn--primary btn--create" id="btn-create-board">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
        Создать
      </button>
    </div>

    {{#if (eq boards.length 0)}}
    <div class="boards__grid">
      <div class="board-card board-card--empty-large" id="btn-create-board-empty">
        <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="1.5"
          stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="4" x2="12" y2="20"></line>
          <line x1="4" y1="12" x2="20" y2="12"></line>
        </svg>
      </div>
    </div>
    {{else}}
    <div class="boards__grid">
      {{#each boards}}
      <div class="board-card" data-id="{{id}}">
        <div class="board-card__top">
          <div class="board-card__header">
            <div class="board-card__title-group">
              <div class="board-card__icon-monitor">
                {{#if background}}
                <img src="{{background}}" class="board-card__bg-img" alt="Background">
                {{else}}
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ccc" stroke-width="2"
                  stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="4" width="18" height="12" rx="2"></rect>
                  <path d="M12 16v4M8 22l4-4 4 4"></path>
                </svg>
                {{/if}}
              </div>
              <div class="board-card__name-wrapper">
                <h2 class="board-card__name">{{board_name}}</h2>
              </div>
            </div>
            <button class="icon-btn board-card__options-btn" data-id="{{id}}" data-name="{{board_name}}">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="5" cy="12" r="2" />
                <circle cx="12" cy="12" r="2" />
                <circle cx="19" cy="12" r="2" />
              </svg>
            </button>
          </div>
        </div>

        <div class="board-card__bottom">
          <div class="board-card__divider"></div>
          <div class="board-card__stats">
            <div class="stat__item">
              <div class="stat__value">{{backlog}}</div>
              <div class="stat__label">Задачи<br>в бэклоге</div>
            </div>
            <div class="stat__item">
              <div class="stat__value">{{hot}}</div>
              <div class="stat__label">Горящих<br>задач</div>
            </div>
            <div class="stat__item">
              <div class="stat__value">{{members}}</div>
              <div class="stat__label">Человек состоит<br>в команде</div>
            </div>
          </div>
        </div>
      </div>
      {{/each}}
    </div>
    {{/if}}
  </div>
</div>

<div id="modal-overlay" class="modal__overlay hidden">
  <div id="modal-create-board" class="modal hidden">
    <div class="modal__header">
      <h2 class="modal__title">Создать доску</h2>
      <button class="modal__close-btn">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>
    <div class="modal__body">
      <label for="create-board-image" class="modal__image-row">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="7 10 12 15 17 10"></polyline>
          <line x1="12" y1="15" x2="12" y2="3"></line>
        </svg>
        <span id="create-board-image-name">Изображение доски</span>
        <input type="file" id="create-board-image" class="hidden" accept="image/*" />
      </label>
      <div class="input-group modal__input-group">
        <label class="modal__input-label">Название доски</label>
        <input type="text" id="new-board-name" class="modal__input-field" placeholder="Например, Запуск продукта"
          autocomplete="off" />
        <span class="modal__input-error" id="new-board-name-error">Введите имя доски</span>
      </div>
    </div>
    <button class="btn btn--primary modal__action-btn" id="btn-confirm-create" disabled>Создать</button>
  </div>

  <div id="modal-edit-board" class="modal hidden">
    <div class="modal__header">
      <h2 class="modal__title">Изменить доску</h2>
      <button class="modal__close-btn">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>
    <div class="modal__body">
      <label for="edit-board-image" class="modal__image-row">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="7 10 12 15 17 10"></polyline>
          <line x1="12" y1="15" x2="12" y2="3"></line>
        </svg>
        <span id="edit-board-image-name">Изображение доски</span>
        <input type="file" id="edit-board-image" class="hidden" accept="image/*" />
      </label>
      <div class="input-group modal__input-group">
        <label class="modal__input-label">Другое название доски</label>
        <input type="text" id="edit-board-name" class="modal__input-field" placeholder="Например, Запуск продукта"
          autocomplete="off" />
      </div>
    </div>
    <div class="modal__actions-vertical">
      <button class="btn btn--primary modal__action-btn" id="btn-confirm-edit" disabled>Изменить</button>
      <button class="btn btn--danger modal__action-btn" id="btn-open-delete">Удалить</button>
    </div>
  </div>

  <div id="modal-delete-board" class="modal hidden">
    <div class="modal__header">
      <h2 class="modal__title">Удалить доску</h2>
      <button class="modal__close-btn">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>
    <p class="modal__text">Вы уверены, что хотите удалить доску<br>“<span id="delete-board-name"
        class="fw-bold"></span>”?</p>
    <div class="modal__actions">
      <button class="btn btn--danger" id="btn-confirm-delete">Удалить</button>
      <button class="btn btn--cancel modal__close-btn">Отменить</button>
    </div>
  </div>
</div>
```

src/templates/password_recovery_email.hbs:
```
<div class="auth__page">
  <div class="auth__form-container">
    <div class="auth__form-wrapper">
      <h1 class="auth__title">Восстановление<br>пароля</h1>
      <p class="auth__subtitle-left mb-1">
        Укажите свой Email, на который мы отправим<br>письмо с ссылкой на смену пароля
      </p>

      <form id="recovery-email-form" novalidate>
        {{> input id="email" label="Email" type="email" placeholder="example@email.com" maxlength="128" }}

        <button type="submit" class="btn btn--primary mt-1" id="recovery-submit" disabled>Отправить</button>

        <p class="auth__footer-text mt-1">
          <a href="#" id="back-link-email">Вернуться назад</a>
        </p>

        <div id="global-error" class="global-error__banner hidden mt-1">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <span id="global-error-text">Проверьте подключение и попробуйте снова</span>
        </div>
      </form>
    </div>
  </div>

  <div class="auth__logo-container">
    <div class="auth__logo-content">
      <img src="/logo.svg" alt="NeXus Logo" class="auth__logo" />
      <p class="auth__subtitle">Центр управления проектами</p>
    </div>
  </div>
</div>
```

src/templates/partials/sidebar.hbs:
```
<div class="sidebar">
  <div class="sidebar__top">
    <div class="sidebar__logo cursor-pointer" id="nav-logo">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="2"
        stroke-linecap="round" stroke-linejoin="round">
        <path d="M5 22h14" />
        <path d="M5 2h14" />
        <path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22" />
        <path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2" />
      </svg>
    </div>
    <div class="sidebar__icon cursor-pointer {{#if activeBoards}}sidebar__icon--active{{/if}}" id="nav-boards"
      title="Доски">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
        stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1"></rect>
        <rect x="14" y="3" width="7" height="7" rx="1"></rect>
        <rect x="3" y="14" width="7" height="7" rx="1"></rect>
        <path d="M14 17.5h7"></path>
        <path d="M17.5 14v7"></path>
      </svg>
    </div>
  </div>
  <div class="sidebar__bottom">
    <div class="sidebar__icon cursor-pointer {{#if activeSupport}}sidebar__icon--active{{/if}}" id="nav-support"
      title="Поддержка">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
        stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
        <line x1="12" y1="17" x2="12.01" y2="17"></line>
      </svg>
    </div>
    <div class="sidebar__icon cursor-pointer {{#if activeProfile}}sidebar__icon--active{{/if}}" id="nav-profile"
      title="Профиль">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
        stroke-linecap="round" stroke-linejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
        <circle cx="12" cy="7" r="4"></circle>
      </svg>
    </div>
    <div class="sidebar__icon cursor-pointer" id="logout-btn" title="Выйти">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
        stroke-linecap="round" stroke-linejoin="round">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
        <polyline points="16 17 21 12 16 7"></polyline>
        <line x1="21" y1="12" x2="9" y2="12"></line>
      </svg>
    </div>
  </div>
</div>
```

src/templates/partials/colorPicker.hbs:
```
<div class="color-picker-list">
  <button type="button" class="color-square white" data-color="white" title="Белый"></button>
  <button type="button" class="color-square grey" data-color="grey" title="Серый"></button>
  <button type="button" class="color-square red" data-color="red" title="Красный"></button>
  <button type="button" class="color-square orange" data-color="orange" title="Оранжевый"></button>
  <button type="button" class="color-square blue" data-color="blue" title="Синий"></button>
  <button type="button" class="color-square green" data-color="green" title="Зеленый"></button>
  <button type="button" class="color-square purple" data-color="purple" title="Фиолетовый"></button>
  <button type="button" class="color-square pink" data-color="pink" title="Розовый"></button>
</div>
```

src/templates/partials/input.hbs:
```
<div class="input-group">
  <div class="input-group__header">
    <label class="input-group__label" for="{{id}}">{{label}}</label>
    {{#if forgotPassword}}
    <a href="#" class="forgot-link">Забыли пароль?</a>
    {{/if}}
  </div>
  <div class="input-group__wrapper">
    <input type="{{type}}" id="{{id}}" class="input-group__field" placeholder="{{placeholder}}" {{#if
      disabled}}disabled{{/if}} {{#if maxlength}}maxlength="{{maxlength}}" {{/if}}>

    {{#if isPassword}}
    <button type="button" class="input-group__toggle-btn" data-target="{{id}}">
      <svg class="icon-eye-slash" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path
          d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24">
        </path>
        <line x1="1" y1="1" x2="23" y2="23"></line>
      </svg>
      <svg class="icon-eye hidden" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
        <circle cx="12" cy="12" r="3"></circle>
      </svg>
    </button>
    {{/if}}
  </div>
  <span id="{{id}}-error" class="input-group__error-msg"></span>
</div>
```

src/api/boards.ts:
```typescript
import { apiClient } from "./client";
import {
  BaseResponse,
  ApiResponse,
  BoardInfo,
  CreateBoardRequest,
  UpdateBoardRequest,
  GetMembersResponse,
  UploadBackgroundResponse,
  InviteInfo,
  CreateInviteRequest,
  CreateInviteResponse,
  AcceptInviteResponse,
  UpdateMemberRoleRequest,
} from "./types";

export const boardsApi = {
  getBoards: () => apiClient.get<ApiResponse<BoardInfo[]>>("/boards"),
  getBoard: (link: string) => apiClient.get<ApiResponse<BoardInfo>>(`/boards/${link}`),
  createBoard: (data: CreateBoardRequest) =>
    apiClient.post<ApiResponse<BoardInfo>, CreateBoardRequest>("/boards", data),
  updateBoard: (link: string, data: UpdateBoardRequest) =>
    apiClient.put<BaseResponse, UpdateBoardRequest>(`/boards/${link}`, data),
  updateBoardBackground: (link: string, formData: FormData) =>
    apiClient.put<ApiResponse<UploadBackgroundResponse>, FormData>(`/boards/${link}/background`, formData),
  deleteBoard: (link: string) => apiClient.delete<BaseResponse>(`/boards/${link}`),
  getBoardUsers: (link: string) =>
    apiClient.get<ApiResponse<GetMembersResponse>>(`/boards/${link}/users`),

  removeMember: (boardLink: string, userLink: string) =>
    apiClient.delete<BaseResponse>(`/boards/${boardLink}/members/${userLink}`),

  updateMemberRole: (boardLink: string, userLink: string, data: UpdateMemberRoleRequest) =>
    apiClient.put<BaseResponse, UpdateMemberRoleRequest>(`/boards/${boardLink}/members/${userLink}/role`, data),

  getInvites: (link: string) =>
    apiClient.get<ApiResponse<InviteInfo[]>>(`/boards/${link}/invites`),

  createInvite: (link: string, data: CreateInviteRequest) =>
    apiClient.post<ApiResponse<CreateInviteResponse>, CreateInviteRequest>(`/boards/${link}/invites`, data),

  acceptInvite: (inviteLink: string) =>
    apiClient.post<ApiResponse<AcceptInviteResponse>, null>(`/invites/${inviteLink}`),

  closeInvite: (inviteLink: string) =>
    apiClient.delete<BaseResponse>(`/invites/${inviteLink}`),
};
```

src/api/kanban.ts:
```typescript
import { apiClient } from "./client";
import {
  BaseResponse,
  ApiResponse,
  SectionInfo,
  ListSectionLink,
  CreateSectionRequest,
  CardsResponse,
  CardResponse,
  CreateCardRequest,
  CreateCardResponse,
  UpdateCardRequest,
  ReorderCardsRequest,
  NewStatusTask,
  NewTimeLine,
  CommentsResponse,
  CreateCommentRequest,
  CreateCommentResponse,
  UpdateCommentRequest,
  SubtaskResponse,
  CreateSubtaskRequest,
  UpdateSubtaskRequest,
  AttachmentResponse,
} from "./types";

export const kanbanApi = {
  getSections: (boardLink: string) =>
    apiClient.get<ApiResponse<SectionInfo[]>>(`/boards/${boardLink}/sections`),
  reorderSections: (boardLink: string, data: ListSectionLink) =>
    apiClient.patch<BaseResponse, ListSectionLink>(
      `/boards/${boardLink}/sections/reorder`,
      data,
    ),
  createSection: (data: CreateSectionRequest) =>
    apiClient.post<ApiResponse<SectionInfo>, CreateSectionRequest>(
      "/sections",
      data,
    ),
  getSection: (sectionLink: string) =>
    apiClient.get<ApiResponse<SectionInfo>>(`/sections/${sectionLink}`),
  updateSection: (sectionLink: string, data: Partial<SectionInfo>) =>
    apiClient.put<BaseResponse, Partial<SectionInfo>>(
      `/sections/${sectionLink}`,
      data,
    ),
  deleteSection: (sectionLink: string) =>
    apiClient.delete<BaseResponse>(`/sections/${sectionLink}`),

  getTasks: (sectionLink: string) =>
    apiClient.get<ApiResponse<CardsResponse>>(`/sections/${sectionLink}/cards`),
  getTask: (taskLink: string) =>
    apiClient.get<ApiResponse<CardResponse>>(`/cards/${taskLink}`),
  createTask: (data: CreateCardRequest) =>
    apiClient.post<ApiResponse<CreateCardResponse>, CreateCardRequest>(
      "/cards",
      data,
    ),
  updateTask: (taskLink: string, data: UpdateCardRequest) =>
    apiClient.put<BaseResponse, UpdateCardRequest>(`/cards/${taskLink}`, data),
  deleteTask: (taskLink: string) =>
    apiClient.delete<BaseResponse>(`/cards/${taskLink}`),
  reorderTask: (taskLink: string, data: ReorderCardsRequest) =>
    apiClient.patch<BaseResponse, ReorderCardsRequest>(
      `/cards/${taskLink}/reorder`,
      data,
    ),

  updateTaskStatus: (taskLink: string, data: NewStatusTask) =>
    apiClient.patch<BaseResponse, NewStatusTask>(
      `/cards/${taskLink}/status`,
      data,
    ),
  updateTaskTimeline: (taskLink: string, data: NewTimeLine) =>
    apiClient.patch<BaseResponse, NewTimeLine>(
      `/cards/${taskLink}/timeline`,
      data,
    ),

  uploadAttachment: (taskLink: string, formData: FormData) =>
    apiClient.post<ApiResponse<AttachmentResponse>, FormData>(
      `/cards/${taskLink}/attachments`,
      formData,
    ),
  deleteAttachment: (attachmentLink: string) =>
    apiClient.delete<BaseResponse>(`/attachments/${attachmentLink}`),

  getComments: (taskLink: string) =>
    apiClient.get<ApiResponse<CommentsResponse>>(`/cards/${taskLink}/comments`),
  createComment: (taskLink: string, data: CreateCommentRequest) =>
    apiClient.post<ApiResponse<CreateCommentResponse>, CreateCommentRequest>(
      `/cards/${taskLink}/comments`,
      data,
    ),
  updateComment: (commentLink: string, data: UpdateCommentRequest) =>
    apiClient.put<BaseResponse, UpdateCommentRequest>(
      `/comments/${commentLink}`,
      data,
    ),
  deleteComment: (commentLink: string) =>
    apiClient.delete<BaseResponse>(`/comments/${commentLink}`),

  createSubtask: (taskLink: string, data: CreateSubtaskRequest) =>
    apiClient.post<ApiResponse<SubtaskResponse>, CreateSubtaskRequest>(
      `/cards/${taskLink}/subtasks`,
      data,
    ),
  updateSubtask: (subtaskLink: string, data: UpdateSubtaskRequest) =>
    apiClient.put<BaseResponse, UpdateSubtaskRequest>(
      `/subtasks/${subtaskLink}`,
      data,
    ),
  deleteSubtask: (subtaskLink: string) =>
    apiClient.delete<BaseResponse>(`/subtasks/${subtaskLink}`),
};
```

src/api/types.ts:
```typescript
export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

export interface ApiError<T = unknown> {
  status: number;
  data: T | null;
}

export interface BaseResponse {
  status: string;
}

export interface ApiResponse<T> {
  status: string;
  data: T;
}

export interface UserInfoResponse {
  avatar: string;
  display_name: string;
  email: string;
  link: string;
}
export interface LogInRequest {
  email: string;
  password: string;
}
export interface RegisterRequest {
  display_name: string;
  email: string;
  password: string;
  repeated_password: string;
}
export interface PasswordRecoveryRequest {
  email: string;
}
export interface RecoveryCodeRequest {
  code: string;
}
export interface NewPasswordRequest {
  password: string;
  repeated_password: string;
  token_id: string;
}

export interface ProfileResponse {
  avatar_url: string;
  description_user: string;
  display_name: string;
  email: string;
  link: string;
}
export interface UpdateProfileRequest {
  description_user: string;
  display_name: string;
}
export interface AvatarResponse {
  avatar_url: string;
}

export interface BoardInfo {
  background: string;
  description: string;
  link: string;
  name: string;
}
export interface CreateBoardRequest {
  background?: string;
  description?: string;
  name: string;
}
export interface UpdateBoardRequest {
  background?: string;
  board_link: string;
  description?: string;
  name?: string;
}
export interface MemberInfo {
  avatar_url: string;
  description: string;
  display_name: string;
  email: string;
  link: string;
  role: string;
}
export interface GetMembersResponse {
  members: MemberInfo[];
}
export interface UploadBackgroundResponse {
  background_key: string;
}
export interface InviteInfo {
  board_link: string;
  created_at: number;
  default_role: string;
  expire_at: number;
  invite_link: string;
  status: string;
  target_user_link?: string;
}
export interface CreateInviteRequest {
  default_role: string;
  expire_seconds: number;
  user_link?: string;
}
export interface CreateInviteResponse {
  board_link: string;
  created_at: number;
  default_role: string;
  expire_at: number;
  invite_link: string;
  status: string;
  target_user_link?: string;
}
export interface AcceptInviteResponse {
  board_link: string;
  role: string;
}
export interface UpdateMemberRoleRequest {
  new_role: string;
}

export interface SectionInfo {
  color: string;
  is_mandatory: boolean;
  link: string;
  max_tasks: number;
  name: string;
  position: number;
}
export interface CreateSectionRequest {
  board_link: string;
  color?: string;
  is_mandatory?: boolean;
  max_tasks?: number;
  name: string;
}
export interface ListSectionLink {
  list_links: string[];
}

export interface SubtaskInfo {
  description: string;
  is_done: boolean;
  link: string;
  position: number;
}
export interface SubtaskResponse {
  description: string;
  is_done: boolean;
  position: number;
  subtask_link: string;
}
export interface CreateSubtaskRequest {
  description: string;
}
export interface UpdateSubtaskRequest {
  description: string;
  is_done: boolean;
}

export interface AttachmentResponse {
  attachment_link: string;
  attachment_path: string;
  display_name: string;
  position: number;
}

export interface Card {
  deadline: string;
  description: string;
  executor_link: string;
  link: string;
  subtasks: SubtaskInfo[];
  title: string;
  position: number;
}

export interface CardsResponse {
  cards: Card[];
}

export interface CardResponse {
  attachments?: AttachmentResponse[];
  card_link: string;
  deadline: string;
  description: string;
  executor_link: string;
  Start: string;
  status: boolean;
  subtasks: SubtaskResponse[];
  title: string;
  position: number;
}

export interface CreateCardRequest {
  description?: string;
  executor_link?: string;
  section_link: string;
  title: string;
}
export interface CreateCardResponse {
  card_link: string;
  position: number;
  section_link: string;
}
export interface UpdateCardRequest {
  deadline?: string;
  description?: string;
  executor_link?: string;
  start?: string;
  title?: string;
}
export interface ReorderCardsRequest {
  position: number;
  section_link: string;
}

export interface NewStatusTask {
  done: boolean;
}

export interface NewTimeLine {
  deadline: string;
  start: string;
}

export interface CommentResponse {
  author_link: string;
  comment_link: string;
  parent_link: string;
  text: string;
  created_at: string;
}
export interface CommentsResponse {
  comments: CommentResponse[];
}
export interface CreateCommentRequest {
  parent_link?: string;
  text: string;
}
export interface CreateCommentResponse {
  comment_link: string;
}
export interface UpdateCommentRequest {
  text: string;
}

export interface AppealInfo {
  appeal_id: number;
  appeal_link: string;
  attachment_url: string;
  attachment_key?: string;
  category: string;
  created_at: string;
  description: string;
  display_name: string;
  email: string;
  status: string;
}
export interface GetAppealsResponse {
  appeals: AppealInfo[];
  role: string;
}
export interface CreateAppealRequest {
  category: string;
  description: string;
  display_name: string;
  email: string;
}
export interface ChangeAppealStatusInfo {
  appeal_link?: string;
  new_status: string;
}
export interface AppealsStats {
  close_appeals: number;
  in_work_appeals: number;
  open_appeals: number;
}
export interface UploadAttachmentResponse {
  attachment_url: string;
}
```

src/api/client.ts:
```typescript
import { HttpMethod, ApiError } from "./types";

export const API_URL = "https://clac-clac.ru/api";

const getCookie = (name: string): string | null => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(";").shift() || null;
  }
  return null;
};

let cachedCsrfToken: string | null = null;

export const fetchCsrfToken = async (): Promise<string | null> => {
  try {
    const csrfRes = await fetch(`${API_URL}/csrf`, { credentials: "include" });

    let token =
      csrfRes.headers.get("X-CSRF-Token") ||
      csrfRes.headers.get("X-Csrf-Token");

    if (!token) {
      try {
        const data = await csrfRes.json();
        token = data.csrf_token || data.token || data.csrfToken || null;
      } catch {}
    }

    if (!token) {
      token = getCookie("csrf_token");
    }

    return token;
  } catch (e) {
    console.error("Failed to get CSRF token", e);
    return null;
  }
};

export const clearCachedCsrfToken = () => {
  cachedCsrfToken = null;
};

const request = async <TResponse = unknown, TBody = unknown>(
  method: HttpMethod,
  url: string,
  body: TBody | null = null,
  headers: HeadersInit = {},
): Promise<TResponse> => {
  const options: RequestInit = {
    method,
    headers: { ...headers },
    credentials: "include",
  };

  if (!(body instanceof FormData)) {
    (options.headers as Record<string, string>)["Content-Type"] = "application/json";
  }

  if (method !== "GET") {
    let csrfToken = getCookie("csrf_token") || cachedCsrfToken;

    if (!csrfToken && url !== "/csrf") {
      csrfToken = await fetchCsrfToken();
    }

    if (csrfToken) {
      cachedCsrfToken = csrfToken;
      (options.headers as Record<string, string>)["X-CSRF-Token"] = csrfToken;
    }
  }

  if (body) {
    if (body instanceof FormData) {
      options.body = body;
    } else {
      options.body = JSON.stringify(body);
    }
  }

  let response = await fetch(`${API_URL}${url}`, options);

  if (response.status === 403 && method !== "GET" && url !== "/csrf") {
    console.warn("Received 403 Forbidden. Retrying with fresh CSRF token...");
    cachedCsrfToken = null;
    const newToken = await fetchCsrfToken();

    if (newToken) {
      cachedCsrfToken = newToken;
      (options.headers as Record<string, string>)["X-CSRF-Token"] = newToken;
      response = await fetch(`${API_URL}${url}`, options);
    }
  }

  if (url === "/login" || url === "/logout" || url === "/register") {
    cachedCsrfToken = null;
  }

  if (response.status === 401) {
    cachedCsrfToken = null;
  }

  let data: TResponse | null = null;
  try {
    const text = await response.text();
    if (text) {
      try {
        data = JSON.parse(text) as TResponse;
      } catch {
        data = text as unknown as TResponse;
      }
    } else {
      data = null;
    }
  } catch (err) {
    data = null;
  }

  if (!response.ok) {
    const error: ApiError = { status: response.status, data };
    throw error;
  }

  return data as TResponse;
};

export const apiClient = {
  get: <TResponse = unknown>(
    url: string,
    headers?: HeadersInit,
  ): Promise<TResponse> => request<TResponse>("GET", url, null, headers),

  post: <TResponse = unknown, TBody = unknown>(
    url: string,
    body?: TBody,
    headers?: HeadersInit,
  ): Promise<TResponse> =>
    request<TResponse, TBody>("POST", url, body, headers),

  put: <TResponse = unknown, TBody = unknown>(
    url: string,
    body?: TBody,
    headers?: HeadersInit,
  ): Promise<TResponse> => request<TResponse, TBody>("PUT", url, body, headers),

  patch: <TResponse = unknown, TBody = unknown>(
    url: string,
    body?: TBody,
    headers?: HeadersInit,
  ): Promise<TResponse> =>
    request<TResponse, TBody>("PATCH", url, body, headers),

  delete: <TResponse = unknown>(
    url: string,
    headers?: HeadersInit,
  ): Promise<TResponse> => request<TResponse>("DELETE", url, null, headers),
};
```

src/api/profile.ts:
```typescript
import { apiClient } from "./client";
import {
  BaseResponse,
  ApiResponse,
  ProfileResponse,
  UpdateProfileRequest,
  AvatarResponse,
} from "./types";

export const profileApi = {
  getProfile: () => apiClient.get<ApiResponse<ProfileResponse>>("/profiles"),
  getProfileByLink: (link: string) =>
    apiClient.get<ApiResponse<ProfileResponse>>(`/profiles/${link}`),
  updateProfile: (data: UpdateProfileRequest) =>
    apiClient.post<BaseResponse, UpdateProfileRequest>("/profiles/info", data),
  updateAvatar: (formData: FormData) =>
    apiClient.put<ApiResponse<AvatarResponse>, FormData>("/profiles/avatar", formData),
  deleteAvatar: () => apiClient.delete<BaseResponse>("/profiles/avatar"),
};
```

src/api/index.ts:
```typescript
export * from "./types";
export { apiClient, fetchCsrfToken, clearCachedCsrfToken, API_URL } from "./client";
export { authApi } from "./auth";
export { profileApi } from "./profile";
export { boardsApi } from "./boards";
export { kanbanApi } from "./kanban";
export { supportApi } from "./support";
```

src/api/support.ts:
```typescript
import { apiClient } from "./client";
import {
  ApiResponse,
  GetAppealsResponse,
  CreateAppealRequest,
  ChangeAppealStatusInfo,
  AppealsStats,
  UploadAttachmentResponse,
} from "./types";

const categoryMap: Record<string, string> = {
  "Баг": "bug",
  "Предложение": "proposal",
  "Продуктовая проблема": "complaint"
};

export const supportApi = {
  getTickets: () => apiClient.get<ApiResponse<GetAppealsResponse>>("/appeals"),
  createTicket: (data: CreateAppealRequest) => {
    const categoryKey = categoryMap[data.category] || data.category;
    return apiClient.post<ApiResponse<{ appeal_link: string }>, CreateAppealRequest>(
      "/appeals",
      { ...data, category: categoryKey }
    );
  },
  updateTicket: (link: string, data: ChangeAppealStatusInfo) =>
    apiClient.patch<ApiResponse<string>, ChangeAppealStatusInfo>(`/appeals/${link}`, data),
  deleteTicket: (link: string) => apiClient.delete<ApiResponse<string>>(`/appeals/${link}`),
  getStatistics: () => apiClient.get<ApiResponse<AppealsStats>>("/appeals/stats"),
  uploadAttachment: (link: string, formData: FormData) =>
    apiClient.put<ApiResponse<UploadAttachmentResponse>, FormData>(`/appeals/${link}/attachment`, formData),
};
```

src/api/auth.ts:
```typescript
import { apiClient } from "./client";
import {
  BaseResponse,
  ApiResponse,
  UserInfoResponse,
  LogInRequest,
  RegisterRequest,
  PasswordRecoveryRequest,
  RecoveryCodeRequest,
  NewPasswordRequest,
} from "./types";

export const authApi = {
  checkAuth: () => apiClient.get<BaseResponse>("/me"),
  login: (data: LogInRequest) =>
    apiClient.post<ApiResponse<UserInfoResponse>, LogInRequest>("/login", data),
  register: (data: RegisterRequest) =>
    apiClient.post<ApiResponse<UserInfoResponse>, RegisterRequest>("/register", data),
  logout: () => apiClient.post<BaseResponse>("/logout"),
  forgotPassword: (data: PasswordRecoveryRequest) =>
    apiClient.post<BaseResponse, PasswordRecoveryRequest>("/forgot-password", data),
  checkCode: (data: RecoveryCodeRequest) =>
    apiClient.post<BaseResponse, RecoveryCodeRequest>("/check-code", data),
  resetPassword: (data: NewPasswordRequest) =>
    apiClient.post<BaseResponse, NewPasswordRequest>("/reset-password", data),
  vkLogin: (code: string) =>
    apiClient.get<void>(`/oauth/vk?code=${encodeURIComponent(code)}`),
};
```

src/styles/auth.scss:
```scss
.auth {
  &__page {
    display: flex;
    height: 100vh;
    height: 100dvh;
    width: 100vw;
    overflow: hidden;
    background-color: var(--bg-main);
    background-image: url('/background.png');
    background-size: cover;
    background-position: center;
  }

  &__form-container {
    width: 50%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 0;
    z-index: 10;
  }

  &__form-wrapper {
    width: 100%;
    max-width: 420px;
    margin: 0 auto;
    padding: 0 1.5rem;
  }

  &__title {
    font-size: 2.5rem;
    font-weight: 700;
    margin-bottom: 2rem;
    text-align: left;
  }

  &__subtitle-left {
    color: var(--text-muted);
    font-size: 0.95rem;
    line-height: 1.5;
    margin-top: -1rem;
  }

  &__logo-container {
    width: 50%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }

  &__logo {
    width: 250px;
    margin-bottom: 0.5rem;
  }

  &__subtitle {
    color: var(--text-muted);
    text-align: center;
    font-size: 0.95rem;
  }

  &__footer-text {
    text-align: center;
    font-size: 0.875rem;
    color: var(--text-main);

    a {
      color: var(--primary);
    }
  }
}

.divider {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin: 1.5rem 0;
  color: #6b7280;
  font-size: 0.875rem;

  &__line {
    flex: 1;
    height: 1px;
    background-color: #2a2a2c;
  }
}

.resend {
  &__container {
    margin-top: -0.5rem;
    margin-bottom: 1rem;
    text-align: left;
  }

  &__text {
    font-size: 0.85rem;
    color: var(--text-muted);

    a {
      color: var(--primary);
      text-decoration: none;
      transition: opacity 0.2s;

      &:hover {
        opacity: 0.8;
        text-decoration: underline;
      }
    }
  }
}

@media (max-width: 768px) {
  .auth {
    &__form-container {
      width: 100%;
    }

    &__logo-container {
      display: none;
    }

    &__title {
      font-size: 2rem;
      margin-bottom: 1.5rem;

      word-wrap: break-word;
    }

    &__subtitle-left {
      font-size: 0.85rem;
      margin-bottom: 1.5rem;
    }
  }

  .resend__text {
    font-size: 0.8rem;
  }
}
```

src/styles/boards.scss:
```scss
@use "boards/layout";
@use "boards/components";
@use "boards/boards-list";
@use "boards/kanban";
@use "boards/profile";
@use "boards/task";
```

src/styles/boards/_boards-list.scss:
```scss
.boards {
  &__header-container {
    display: flex;
    gap: 1.5rem;
    align-items: center;
    border-bottom: 1px solid #2a2a2c;
    padding-bottom: 1.5rem;
    margin-bottom: 2rem;
  }

  &__title {
    font-size: 1.8rem;
    font-weight: 700;
    margin: 0;
    color: white;
  }

  &__count {
    color: #555;
  }

  &__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
    gap: 1.5rem;
  }
}

@media (max-width: 768px) {
  .boards__header-container {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 0.5rem;
    margin-bottom: 1rem;
  }

  .boards__title {
    font-size: 1.25rem;
  }

  .boards__grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
}
```

src/styles/boards/_layout.scss:
```scss
.boards {
  &__layout {
    display: flex;
    height: 100vh;
    height: 100dvh;
    background-color: #1a1a1c;
  }
}

.sidebar {
  width: 72px;
  background-color: #1a1a1c;
  border-right: 1px solid #2a2a2c;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1.5rem 0;
  justify-content: space-between;
  z-index: 10;

  &__logo {
    display: flex;
    justify-content: center;
    align-items: center;
    margin-bottom: 1.5rem;
  }

  &__icon {
    width: 40px;
    height: 40px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #666;
    cursor: pointer;
    transition: all 0.2s;
    margin-bottom: 0.5rem;

    &:hover {
      background-color: #2a2a2c;
      color: white;
    }

    &--active {
      color: var(--primary);
    }

    &--logout:hover {
      background-color: #3b1f1f;
      color: var(--text-error);
    }
  }
}

.main-content {
  flex: 1;
  padding: 2rem 4rem;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  z-index: 10;
  user-select: none;
  -webkit-user-select: none;
}

.relative-wrapper {
  position: relative;
}

@media (max-width: 768px) {
  .boards__layout {
    flex-direction: column-reverse;
  }

  .sidebar {
    width: 100%;
    height: calc(64px + env(safe-area-inset-bottom));
    padding: 0;
    padding-bottom: env(safe-area-inset-bottom);
    flex-direction: row;
    border-right: none;
    border-top: 1px solid #2a2a2c;
    justify-content: space-around;
    align-items: center;
  }

  .sidebar__top,
  .sidebar__bottom {
    display: contents;
  }

  .sidebar__logo {
    display: none;
  }

  .sidebar__icon {
    margin-bottom: 0;
    width: 48px;
    height: 48px;
  }

  .main-content {
    padding: 1rem;
  }
}
```

src/styles/boards/_profile.scss:
```scss
.profile {
  &__container {
    max-width: 600px;
    padding: 2rem 4rem;
  }

  &__title {
    font-size: 2rem;
    font-weight: bold;
    margin-bottom: 2rem;
  }

  &__avatar-section {
    display: flex;
    gap: 1.5rem;
    align-items: center;
    margin-bottom: 2.5rem;
  }

  &__avatar-preview {
    width: 80px;
    height: 80px;
    background: #252527;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }

  &__avatar-actions {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }

  &__action-link {
    color: #8b5cf6;
    font-size: 0.9rem;
    cursor: pointer;
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }

  &__action-delete {
    color: #ccc;
    font-size: 0.9rem;
    cursor: pointer;
    text-decoration: none;

    &:hover {
      color: var(--text-error);
      text-decoration: underline;
    }

    &--disabled {
      color: #555;
      cursor: not-allowed;
      pointer-events: none;

      &:hover {
        color: #555;
        text-decoration: none;
      }
    }
  }

  &__input-label {
    color: #ccc;
    margin-bottom: 0.6rem;
    font-size: 0.85rem;
  }

  &__input-field {
    background: #252527;
    border-color: #333;
  }

  &__textarea {
    resize: vertical;
    min-height: 100px;
    background: #252527;
    border-color: #333;
  }

  &__email-wrapper {
    position: relative;
  }

  &__email-input {
    background: #252527;
    border-color: #333;
    padding-right: 2.5rem;
    color: #888;
  }

  &__email-icon {
    position: absolute;
    right: 1rem;
  }

  &__btn-save {
    width: auto;
    padding: 0.8rem 2.5rem;
    border-radius: 8px;
  }

  &__btn-active {
    background: var(--primary);
    color: white;
    cursor: pointer;
  }

  &__btn-disabled {
    background: #555;
    color: #999;
    cursor: not-allowed;
  }
}

.profile-modal {
  padding: 0 !important;
  overflow: hidden;
  width: 440px !important;

  &__content {
    display: flex;
    flex-direction: column;
  }

  &__header {
    height: 120px;
    background-color: var(--color-picker-pink);
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    width: 100%;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    svg {
      width: 60px;
      height: 60px;
      stroke: white;
    }
  }

  &__body {
    padding: 1.5rem 2rem;
  }

  &__colors-title {
    font-size: 1rem;
    font-weight: 500;
    color: white;
    margin-bottom: 0.8rem;
  }

  &__upload-box {
    margin-top: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.8rem;
    align-items: flex-start;
  }

  &__action-btn {
    background: transparent;
    border: none;
    color: white;
    font-size: 0.95rem;
    font-weight: 500;
    cursor: pointer;
    padding: 0;
    transition: color 0.2s;

    &:hover {
      color: var(--primary);
    }

    &--delete {
      color: #ccc;

      &:hover {
        color: var(--text-error);
      }
    }
  }

  &__actions {
    display: flex;
    gap: 0.8rem;
    padding: 0 2rem 2rem 2rem;

    .profile-modal__btn {
      flex: 1;
      padding: 0.6rem;
      border-radius: 8px;
      font-size: 0.95rem;
      font-weight: 500;
      cursor: pointer;
      border: none;
      transition: background 0.2s;

      &--cancel {
        background: #333;
        color: white;

        &:hover {
          background: #444;
        }
      }

      &--save {
        background: white;
        color: black;

        &:hover {
          background: #e5e5e5;
        }
      }
    }
  }
}

@media (max-width: 768px) {
  .profile {
    &__container {
      padding: 1rem;
    }

    &__title {
      font-size: 1.5rem;
      margin-bottom: 1.5rem;
    }

    &__avatar-section {
      gap: 1rem;
      margin-bottom: 2rem;
    }

    &__avatar-preview {
      width: 64px;
      height: 64px;
    }

    &__btn-save {
      width: 100%;
      padding: 0.8rem;
    }
  }

  .profile-modal {
    width: 100% !important;
    max-width: 380px !important;

    &__header {
      height: 100px;
    }

    &__body {
      padding: 1rem 1.5rem;
    }

    &__actions {
      padding: 0 1.5rem 1.5rem 1.5rem;
      flex-direction: column;
      gap: 0.5rem;

      .profile-modal__btn {
        width: 100%;
      }
    }
  }
}
```

src/styles/boards/_task.scss:
```scss
.task {
  &__page-container {
    padding: 2rem 4rem;
  }

  &__header-bar {
    display: flex;
    justify-content: space-between;
    margin-bottom: 3rem;
  }

  &__btn {
    background: transparent;
    border: 1px solid #444;
    padding: 0.6rem 1.2rem;
    border-radius: 8px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: #ccc;

    &--share {
      background: #252527;
      border: 1px solid #333;
    }
  }

  &__board-title {
    color: white;
    font-size: 1.1rem;
    font-weight: bold;
    margin-bottom: 0.5rem;
  }

  &__title {
    color: white;
    font-size: 2.8rem;
    font-weight: bold;
    margin-bottom: 3rem;
  }

  &__meta-list {
    display: flex;
    flex-direction: column;
    gap: 1.2rem;
    color: #999;
  }

  &__meta-item {
    display: flex;
    align-items: center;
    gap: 0.8rem;
  }

  &__meta-text {
    font-size: 0.95rem;
  }

  &__meta-strong {
    color: white;
    font-weight: normal;
  }

  &__meta-label {
    color: #666;
    font-size: 0.95rem;
    min-width: 110px;
    flex-shrink: 0;
  }

  &__meta-value-btn {
    background: transparent;
    border: none;
    color: white;
    cursor: pointer;
    padding: 0;
    font-size: 0.95rem;
    font-family: inherit;
    border-bottom: 1px solid #555;
    line-height: 1.4;
    text-align: left;

    &:hover {
      border-bottom-color: var(--primary, #8b5cf6);
      color: #ddd;
    }
  }

  &__meta-value-btn-flex {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  &__meta-date-input {
    background: transparent;
    border: none;
    border-bottom: 1px solid #555;
    color: white;
    font-size: 0.95rem;
    font-family: inherit;
    outline: none;
    width: 80px;
    padding: 0;
    line-height: 1.4;

    &:focus {
      border-bottom-color: var(--primary, #8b5cf6);
    }

    &::-webkit-inner-spin-button,
    &::-webkit-outer-spin-button {
      opacity: 1;
    }
  }

  &__description-box {
    margin-top: 3rem;
    color: #ccc;
    line-height: 1.6;
    font-size: 1rem;
  }

  &__desc-title {
    color: white;
    margin-bottom: 1rem;
    font-size: 1.2rem;
    font-weight: 600;
  }

  &__desc-text {
    white-space: pre-wrap;
    margin: 0;
  }

  &__section-title {
    color: white;
    font-size: 1.15rem;
    font-weight: bold;
    margin-bottom: 1rem;
  }

  &__subtasks-section {
    margin-bottom: 2.5rem;
  }

  &__subtasks-list {
    display: flex;
    flex-direction: column;
    gap: 0.8rem;
  }

  &__subtask-add {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    border-bottom: 1px solid #333;
    padding-bottom: 0.2rem;

    &:focus-within {
      border-bottom-color: var(--primary, #8b5cf6);
    }
  }

  &__subtask-input {
    flex: 1;
    background: transparent;
    border: none;
    color: #ccc;
    padding: 0.5rem 0;
    outline: none;
    font-size: 0.95rem;
  }

  &__subtask-add-btn {
    display: none;
    color: #888;
    padding: 4px;
    transition: color 0.2s;

    &:hover {
      color: white;
    }

    @media (max-width: 768px) {
      display: flex;
    }
  }

  &__subtask-item {
    margin: 0;
    font-size: 0.95rem;
  }

  &__subtask-item-flex {
    flex: 1;
    display: flex;
    align-items: center;
    min-width: 0;
  }

  &__subtask-row-flex {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    width: 100%;
    min-width: 0;
  }

  &__subtask-text {
    margin-top: 1px;
  }

  &__subtask-text-input {
    background: transparent;
    border: none;
    outline: none;
    width: 100%;
    margin-left: 10px;
    margin: 0;
    padding: 0;
    font-size: 0.95rem;
    color: #cccccc;
    font-family: inherit;
    transition: color 0.2s;
    flex: 1;
    min-width: 0;

    &:focus {
      color: #ffffff;
    }

    &--done {
      color: #666666;
      text-decoration: line-through;
    }
  }

  &__subtask-delete-btn-styled {
    color: #ff5c5c;
    padding: 4px;
  }

  &__attachments-section {
    margin-bottom: 2.5rem;
    border-top: 1px solid #333;
    padding-top: 1.5rem;
  }

  &__attachments-list {
    display: flex;
    flex-direction: column;
    gap: 0.8rem;
    margin-bottom: 1rem;
  }

  &__attachment-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    background: #1e1e20;
    padding: 0.8rem 1rem;
    border-radius: 12px;
    border: 1px solid #333;
    min-width: 0;
  }

  &__attachment-icon {
    color: #888;
    flex-shrink: 0;
  }

  &__attachment-name {
    flex: 1;
    font-size: 0.95rem;
    color: #ccc;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
  }

  &__attachment-delete-btn {
    color: #888;
    padding: 4px;
    transition: color 0.15s;

    &:hover {
      color: #ff5c5c;
    }
  }

  &__attachment-preview-thumb {
    width: 32px;
    height: 32px;
    border-radius: 6px;
    overflow: hidden;
    background: #252527;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    border: 1px solid #333;
    cursor: pointer;
    transition: border-color 0.15s;

    &:hover {
      border-color: #555;
    }
  }

  &__attachment-thumb-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  &__attachment-upload {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding-bottom: 0.2rem;
  }

  &__attachment-upload-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: #888;
    font-size: 0.95rem;
    cursor: pointer;
    padding: 0.2rem 0;
    transition: color 0.15s;
    margin-top: 0.5rem;

    &:hover {
      color: white;
    }
  }

  &__attachment-icon-svg {
    margin-right: 0.5rem;
  }

  &__comments-section {
    margin-bottom: 2rem;
    border-top: 1px solid #333;
    padding-top: 1.5rem;
  }

  &__comments-date {
    text-align: center;
    color: #888;
    font-size: 0.85rem;
    margin: 1.5rem 0 1rem;
    font-weight: 500;
  }

  &__comments-list {
    display: flex;
    flex-direction: column;
    gap: 1.2rem;
  }

  &__comment {
    display: flex;
    gap: 0.75rem;
    align-items: flex-end;
    width: 100%;

    &--others {
      justify-content: flex-start;

      .task__comment-body-wrapper {
        order: 2;
      }

      .task__comment-time {
        order: 3;
        margin-left: 0.5rem;
      }

      .task__comment-avatar,
      .task__comment-avatar-fallback {
        order: 1;
      }

      .task__comment-bubble {
        border-top-left-radius: 0;
      }
    }

    &--mine {
      justify-content: flex-end;

      .task__comment-body-wrapper {
        order: 2;
      }

      .task__comment-time {
        order: 1;
        margin-right: 0.5rem;
      }

      .task__comment-avatar,
      .task__comment-avatar-fallback {
        order: 3;
      }

      .task__comment-bubble {
        border-top-right-radius: 0;
      }
    }
  }

  &__comment-body-wrapper {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    max-width: 75%;
    min-width: 0;
  }

  &__comment-avatar,
  &__comment-avatar-fallback {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    flex-shrink: 0;
    object-fit: cover;
  }

  &__comment-avatar-fallback {
    background: #333335;
    color: #888;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    font-size: 1.1rem;
  }

  &__comment-author {
    color: #8b5cf6;
    font-size: 0.85rem;
    font-weight: bold;
    margin-bottom: 0.2rem;
  }

  &__comment-bubble {
    background: #1e1e20;
    border: 1px solid #333;
    padding: 0.8rem 1rem;
    border-radius: 12px;
    color: #ccc;
    font-size: 0.95rem;
    line-height: 1.4;
    word-wrap: break-word;
    overflow-wrap: break-word;
    word-break: break-word;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);

    width: fit-content;
    max-width: 100%;
    min-width: 140px;
  }

  &__comment-time {
    font-size: 0.75rem;
    color: #666;
    align-self: flex-end;
    margin-bottom: 0.2rem;
    flex-shrink: 0;
  }

  &__comment-input-area {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-top: 1.5rem;
    padding-top: 1.5rem;
    border-top: 1px solid #333;
    background: #1a1a1c;
  }

  &__comment-input {
    flex: 1;
    background: #252527;
    border: 1px solid #333;
    color: white;
    padding: 1rem 1.25rem;
    border-radius: 12px;
    outline: none;
    font-size: 0.95rem;

    &:focus {
      border-color: #555;
    }
  }

  &__comment-send-btn {
    color: #8b5cf6;
    padding: 0.8rem;
    background: transparent;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: opacity 0.15s;

    &:hover {
      opacity: 0.8;
      color: #8b5cf6;
      background: transparent;
    }
  }

  &__no-comments {
    color: #666;
    font-size: 0.9rem;
  }

  &__comment-menu-wrap {
    position: relative;
    flex-shrink: 0;
    margin-left: auto;
    align-self: flex-start;
  }

  &__comment-menu-btn {
    color: #555;
    padding: 4px 6px;
    border-radius: 6px;
    transition:
      color 0.15s,
      background 0.15s;

    &:hover {
      color: #ccc;
      background: #2e2e30;
    }
  }

  &__comment-dropdown {
    position: absolute;
    right: 0;
    top: calc(100% + 4px);
    background: #2a2a2c;
    border: 1px solid #3a3a3c;
    border-radius: 8px;
    min-width: 160px;
    z-index: 200;
    overflow: hidden;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);

    &.hidden {
      display: none;
    }
  }

  &__comment-dropdown-item {
    display: block;
    width: 100%;
    text-align: left;
    padding: 0.65rem 1rem;
    color: #ccc;
    font-size: 0.9rem;
    background: none;
    border: none;
    cursor: pointer;

    &:hover {
      background: #333335;
      color: white;
    }
  }

  &__comment-edit-input {
    width: 100%;
    background: #252527;
    border: 1px solid #555;
    border-radius: 8px;
    color: white;
    padding: 0.5rem 0.75rem;
    font-size: 0.95rem;
    line-height: 1.4;
    resize: none;
    outline: none;
    min-height: 64px;
    word-break: break-word;

    &:focus {
      border-color: var(--primary);
    }
  }

  &__comment-edit-actions {
    display: flex;
    gap: 0.5rem;
    margin-top: 0.4rem;
  }

  &__comment-edit-save,
  &__comment-edit-cancel {
    padding: 0.3rem 0.8rem;
    font-size: 0.85rem;
    border-radius: 6px;
  }

  &__panel {
    width: 100%;
    max-width: 500px;
    height: 100%;
    background-color: #1a1a1c;
    box-shadow: -10px 0 30px rgba(0, 0, 0, 0.5);
    display: flex;
    flex-direction: column;
    animation: slide-in-right 0.3s ease-out;
  }

  &__content {
    padding: 0 2rem;
    flex: 1;
    overflow-y: auto;
  }

  &__title-input {
    background: transparent;
    border: none;
    color: white;
    font-size: 2rem;
    font-weight: bold;
    width: 100%;
    padding: 0.5rem 0;
    margin-bottom: 1.5rem;
    outline: none;

    &:focus {
      border-bottom: 1px solid #444;
    }
  }

  @media (max-width: 768px) {
    &__panel {
      width: 100% !important;
      max-width: 100% !important;
    }
    &__header-bar {
      padding: 1rem 1.25rem;
    }
    &__content {
      padding: 0 1.25rem;
    }
    &__title-input {
      font-size: 1.6rem;
    }
  }

  @media (max-width: 480px) {
    &__meta-label {
      min-width: 90px;
      font-size: 0.85rem;
    }
    &__meta-value-btn {
      font-size: 0.85rem;
    }
    &__meta-date-input {
      font-size: 0.85rem;
    }
    &__subtask-text-input {
      font-size: 0.85rem;
    }
    &__comment-body-wrapper {
      max-width: 80%;
      min-width: 140px;
    }
    &__comment-bubble {
      padding: 0.6rem 0.8rem;
      font-size: 0.9rem;
    }
    &__comment-time {
      font-size: 0.7rem;
    }
  }
}

.task__panel--no-animation {
  animation: none !important;
}

.date-picker {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  background: #252527;
  border-radius: 16px;
  padding: 1rem 1.25rem;
  z-index: 1000;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.55);
  min-width: 272px;

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
    color: white;
    font-weight: 600;
    font-size: 1rem;
  }

  &__nav-btn {
    background: transparent;
    border: none;
    color: #888;
    cursor: pointer;
    padding: 0.25rem 0.6rem;
    border-radius: 8px;
    font-size: 1.2rem;
    line-height: 1;
    transition:
      background 0.15s,
      color 0.15s;

    &:hover {
      background: #333;
      color: white;
    }
  }

  &__grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 2px;
  }

  &__day-name {
    text-align: center;
    font-size: 0.72rem;
    color: #666;
    padding: 0.3rem 0 0.5rem;
    font-weight: 500;
    letter-spacing: 0.03em;
  }

  &__day {
    text-align: center;
    padding: 0.45rem 0;
    border-radius: 8px;
    cursor: pointer;
    font-size: 0.88rem;
    color: white;
    transition: background 0.12s;
    border: 1px solid transparent;

    &:hover {
      background: #333;
    }

    &--other-month {
      color: #444;

      &:hover {
        background: transparent;
        cursor: default;
      }
    }

    &--today {
      border-color: #555;
    }

    &--selected {
      background: var(--primary, #8b5cf6);
      color: white;

      &:hover {
        background: var(--primary, #8b5cf6);
      }
    }
  }
}

.time-picker {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  background: #252527;
  border-radius: 16px;
  padding: 1rem 1.5rem;
  display: flex;
  gap: 2rem;
  z-index: 1000;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.55);

  &__col {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
  }

  &__col-label {
    color: #888;
    font-size: 0.8rem;
    font-weight: 500;
    letter-spacing: 0.03em;
  }

  &__scroll {
    height: 120px;
    overflow-y: auto;
    scrollbar-width: none;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    scroll-snap-type: y mandatory;
    padding: 45px 0;
    box-sizing: border-box;

    &::-webkit-scrollbar {
      display: none;
    }
  }

  &__num {
    font-size: 1.4rem;
    color: #555;
    cursor: pointer;
    line-height: 1.6;
    min-width: 40px;
    text-align: center;
    border-radius: 8px;
    scroll-snap-align: center;
    transition: color 0.15s;

    &:hover {
      color: #bbb;
    }

    &--selected {
      color: white;
      font-size: 1.7rem;
      font-weight: 700;
    }
  }
}

.section-mandatory-label {
  min-width: 160px;
}

.lightbox-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.9);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.25s ease;
  backdrop-filter: blur(5px);

  &--visible {
    opacity: 1;
    pointer-events: auto;
  }
}

.lightbox-container {
  position: relative;
  max-width: 90vw;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.lightbox-close {
  position: absolute;
  top: -40px;
  right: 0;
  background: none;
  border: none;
  color: white;
  font-size: 2.5rem;
  cursor: pointer;
  transition: color 0.2s;

  &:hover {
    color: #ff5c5c;
  }
}

.lightbox-img {
  max-width: 90vw;
  max-height: 80vh;
  object-fit: contain;
  border-radius: 8px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
}

.lightbox-caption {
  color: #ccc;
  margin-top: 1rem;
  font-size: 1rem;
  text-align: center;
}

.invite-modal {
  width: 440px !important;

  &__members-section {
    margin-top: 1.5rem;
    border-top: 1px solid #2a2a2c;
    padding-top: 1.5rem;
    width: 100%;
  }

  &__members-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1.2rem;
    width: 100%;
  }

  &__members-title {
    color: white;
    font-size: 1.15rem;
    font-weight: bold;
    margin: 0;
  }

  &__search-input {
    width: 160px;
    background: #18181a;
    border: 1px solid #333;
    border-radius: 8px;
    color: white;
    padding: 0.5rem 0.75rem;
    font-size: 0.85rem;
    outline: none;
    transition: border-color 0.2s;

    &::placeholder {
      color: #555;
    }

    &:focus {
      border-color: #555;
    }
  }

  &__members-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    max-height: 240px;
    overflow-y: auto;
    width: 100%;
    box-sizing: border-box;
    padding-right: 8px;

    &::-webkit-scrollbar {
      width: 6px;
    }

    &::-webkit-scrollbar-track {
      background: transparent;
    }

    &::-webkit-scrollbar-thumb {
      background: #333;
      border-radius: 3px;
    }
  }

  &__member-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: #18181a;
    padding: 0.75rem 1rem;
    border-radius: 12px;
    border: 1px solid #333;
    gap: 1rem;
    box-sizing: border-box;
    width: 100%;
  }

  &__member-left {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    min-width: 0;
    flex: 1;
  }

  &__member-avatar,
  &__member-avatar-fallback {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    flex-shrink: 0;
    object-fit: cover;
  }

  &__member-avatar-fallback {
    background: var(--primary);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    font-size: 0.9rem;
  }

  &__member-info {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  &__member-name {
    color: white;
    font-size: 0.9rem;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__member-email {
    color: #666;
    font-size: 0.75rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__member-right {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-shrink: 0;
  }

  &__member-role-static {
    color: #888;
    font-size: 0.85rem;
    font-weight: 500;
    padding: 0.4rem 0.6rem;
  }

  &__member-role-dropdown-container {
    position: relative;
    z-index: 1000;
  }

  &__member-role-trigger {
    background: #252527;
    border: 1px solid #333;
    color: #ccc;
    border-radius: 8px;
    padding: 0.4rem 0.75rem;
    font-size: 0.85rem;
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
    outline: none;
    transition:
      border-color 0.2s,
      color 0.2s;

    &:hover {
      border-color: #555;
      color: white;
    }

    svg {
      flex-shrink: 0;
    }
  }

  &__member-role-dropdown {
    position: fixed;
    background: #1e1e20;
    border: 1px solid #333;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
    overflow: hidden;
  }

  &__member-role-option {
    padding: 0.5rem 1rem;
    color: #ccc;
    font-size: 0.85rem;
    cursor: pointer;
    transition:
      background 0.15s,
      color 0.15s;

    &:hover {
      background: #2a2a2c;
      color: white;
    }
  }

  &__member-delete-btn {
    background: transparent;
    border: none;
    color: #ff5c5c;
    cursor: pointer;
    padding: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition:
      opacity 0.2s,
      background-color 0.2s;
    border-radius: 6px;
    flex-shrink: 0;

    &:hover {
      opacity: 0.8;
      background: rgba(255, 92, 92, 0.1);
    }
  }

  &__search-input {
    flex: 1;
    max-width: 180px;
    background: #18181a;
    border: 1px solid #333;
    border-radius: 8px;
    color: white;
    padding: 0.5rem 0.75rem;
    font-size: 0.85rem;
    outline: none;

    &::placeholder {
      color: #555;
    }

    &:focus {
      border-color: #555;
    }
  }

  &__tabs {
    display: flex;
    gap: 0.5rem;
    background: #18181a;
    padding: 4px;
    border-radius: 8px;
    margin-bottom: 1.5rem;
  }

  &__tab {
    flex: 1;
    background: transparent;
    border: none;
    color: #888;
    padding: 0.6rem;
    font-size: 0.9rem;
    font-weight: 500;
    border-radius: 6px;
    cursor: pointer;
    transition:
      background 0.2s,
      color 0.2s;

    &:hover {
      color: white;
    }

    &.active {
      background: #252527;
      color: white;
    }
  }

  &__role-select-container {
    position: relative;
    margin-bottom: 1.5rem;
  }

  &__role-btn {
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #18181a !important;
    border: 1px solid #333 !important;
    color: white;
    cursor: pointer;
    padding: 0.85rem 1rem !important;
    font-size: 0.95rem;
    border-radius: 8px;
    text-align: left;

    span {
      margin: 0;
    }
  }

  &__dropdown {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: #1e1e20;
    border: 1px solid #333;
    border-radius: 8px;
    margin-top: 4px;
    z-index: 1100;
    overflow: hidden;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);

    &-item {
      padding: 10px 16px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      font-size: 0.95rem;
      color: #ccc;
      transition:
        background 0.2s,
        color 0.2s;

      &:hover {
        background: #2a2a2c;
        color: white;
      }
    }

    &-icon {
      color: #888;
    }
  }

  &__link-row {
    display: flex;
    gap: 0.75rem;
    align-items: center;
  }

  &__link-field {
    flex: 1;
    background: #18181a !important;
    border-color: #333 !important;
    color: #888 !important;
    text-overflow: ellipsis;
  }

  &__copy-btn {
    width: auto !important;
    padding: 0.85rem 1.25rem !important;
    font-size: 0.95rem !important;
    border-radius: 8px !important;
  }
}

.task__status-btn {
  width: auto !important;
  padding: 0.5rem 1rem !important;
  font-size: 0.9rem !important;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 500;

  &--pending {
    background: transparent;
    color: #ccc;
    border: 1px solid #444;

    &:hover {
      background: rgba(16, 185, 129, 0.1);
      border-color: #10b981;
      color: #10b981;
    }
  }

  &--done {
    background: #10b981;
    color: white;
    border: 1px solid #10b981;

    &:hover {
      background: #059669;
      border-color: #059669;
    }
  }
}

.task__title-input {
  transition:
    text-decoration 0.2s ease,
    color 0.2s ease;

  &--done {
    text-decoration: line-through;
    color: #666 !important;
  }
}
```

src/styles/boards/_kanban.scss:
```scss
.kanban {
  &__content {
    display: flex;
    flex-direction: column;
    padding: 0 !important;
    height: 100%;
    overflow: hidden !important;
  }

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem 2rem;
    border-bottom: 1px solid #2a2a2c;
    background: #1a1a1c;
    flex-shrink: 0;
    z-index: 10;
  }

  &__title-group {
    display: flex;
    align-items: center;
    gap: 1rem;

    h1 {
      font-size: 1.25rem;
      font-weight: bold;
    }
  }

  &__board-title {
    font-size: 1.8rem;
    font-weight: 700;
    color: white;
    margin: 0;
  }

  &__actions {
    display: flex;
    gap: 1rem;
  }

  &__action-btn {
    border-radius: 12px;
    padding: 0.6rem 1.2rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 500;
    font-size: 0.95rem;
    width: auto;

    &--share {
      background: #252525;
      border: none;
      color: #fff;
      border-radius: 16px;
      padding: 6px 26px 6px 15px;
      width: 169px;
      height: 42px;
      font-weight: 400;
      font-size: 16px;
      gap: 8px;

      &:hover {
        background: #333333;
      }
    }

    &--disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  &__columns-wrapper {
    display: flex;
    flex: 1;
    padding-top: 18px;
    padding-left: 38px;
    min-height: 0;
  }

  &__columns-container {
    display: flex;
    gap: 0;
    padding: 0;
    overflow-x: auto;
    overflow-y: hidden;
    flex: 1;
    align-items: stretch;
    border: 1px solid #2a2a2c;
    border-radius: 12px;
    background: #222224;

    &::-webkit-scrollbar {
      height: 12px;
    }

    &::-webkit-scrollbar-track {
      background: #1a1a1c;
      border-radius: 8px;
    }

    &::-webkit-scrollbar-thumb {
      background: #333;
      border-radius: 8px;
    }
  }

  &__column {
    background: #222224;
    border-radius: 0;
    min-width: 360px;
    max-width: 360px;
    display: flex;
    flex-direction: column;
    max-height: 100%;
    margin-right: 1.5rem;
    position: relative;
    height: 100%;
    padding: 1.5rem;

    &:last-child {
      margin-right: 0;
    }

    &::after {
      content: "";
      position: absolute;
      right: -0.75rem;
      top: 0;
      bottom: 0;
      width: 1px;
      background: repeating-linear-gradient(
        to bottom,
        #2a2a2c,
        #2a2a2c 10px,
        transparent 10px,
        transparent 20px
      );
      pointer-events: none;
    }

    &--transparent {
      background: transparent;
    }
  }

  &__column-header {
    padding: 1rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-weight: 500;
    font-size: 0.95rem;
    flex-shrink: 0;
  }

  &__column-title {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    font-size: 1.15rem;
    font-weight: 600;
  }

  &__col-dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    display: inline-block;
  }

  &__btn-col-options {
    padding: 0;
  }

  &__column-cards {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    overflow-y: auto;
    flex: 1;
    min-height: 0;
    padding: 0 0.25rem 0.5rem 0.25rem;
    scrollbar-width: thin;
    scrollbar-color: #3a3a3c transparent;

    &::-webkit-scrollbar {
      width: 6px;
    }

    &::-webkit-scrollbar-track {
      background: transparent;
      border-radius: 4px;
    }

    &::-webkit-scrollbar-thumb {
      background: #3a3a3c;
      border-radius: 4px;
      transition: background 0.2s;

      &:hover {
        background: #4a4a4c;
      }
    }

    .kanban-card:first-child {
      margin-top: 15px;
    }
  }

  &__add-card-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: #ccc;
    padding: 0.8rem;
    cursor: pointer;
    border-radius: 8px;
    transition: all 0.2s;
    font-size: 0.9rem;
    width: 100%;
    border: none;
    background: transparent;
    text-align: left;

    &:hover {
      background: #2a2a2c;
      color: white;
    }
  }

  &__add-card-icon {
    vertical-align: text-bottom;
    margin-right: 4px;
  }

  &__add-column-btn {
    border: 1px dashed #444;
    border-radius: 12px;
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: flex-start;
    padding: 0 1rem;
    gap: 0.5rem;
    color: #ccc;
    cursor: pointer;
    transition: all 0.2s;
    background: transparent;

    &:hover {
      border-color: #888;
      color: white;
    }
  }

  &__add-card-form {
    background: #1e1e20;
    border: 1px dashed #444;
    border-radius: 12px;
    padding: 1.2rem;
    margin-bottom: 0.5rem;
  }

  &__add-column-form {
    background: #1e1e20;
    border: 1px dashed #444;
    border-radius: 12px;
    padding: 1.2rem;
    min-height: 75px;
    display: flex;
    align-items: center;
  }

  &__add-card-input,
  &__add-column-input {
    width: 100%;
    background: transparent;
    border: none;
    color: white;
    font-size: 0.95rem;
    resize: none;
    outline: none;
  }

  &__add-card-input {
    min-height: 40px;
  }

  &__modal-input {
    width: 100%;
    background: #1a1a1c;
    border: 1px solid #444;
    border-radius: 8px;
    padding: 0.8rem;
    color: white;
    font-size: 1rem;
    outline: none;
    margin-bottom: 1rem;

    &--no-margin {
      margin-bottom: 0;
    }
  }

  &__assignee-block {
    background: #252527;
    padding: 0.8rem;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    border-radius: 8px;
    margin-bottom: 1rem;
  }

  &__assignee-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  &__assignee-label {
    color: var(--primary, #8b5cf6);
    font-size: 0.85rem;
    font-weight: 500;
    white-space: nowrap;
  }
}

.kanban-card {
  background-color: #222224;
  border: 1px solid #333;
  border-radius: 10px;
  padding: 1.25rem;
  cursor: pointer;
  position: relative;
  transition:
    border-color 0.2s,
    transform 0.1s;
  z-index: 1;
  display: flex;
  flex-direction: column;

  &:hover {
    border-color: #555;
    z-index: 10;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);

    .kanban-card__options-btn {
      opacity: 1;
    }
  }

  &--dragging {
    opacity: 0.5;
  }

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #3b3b3d;
    padding-bottom: 0.8rem;
    margin-bottom: 1rem;
  }

  &__assignee {
    font-size: 0.85rem;
    color: #777;
    display: flex;
    align-items: center;
    line-height: 1;
    gap: 0.4rem;
    font-weight: 500;
  }

  &__assignee-text {
    color: white;
  }

  &__options-btn {
    opacity: 0;
    background: transparent;
    border: none;
    color: #888;
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;

    &:hover {
      background-color: #2a2a2c;
      color: white;
    }
  }

  &__title {
    font-size: 1.15rem;
    color: white;
    font-weight: bold;
    margin-bottom: 1.2rem;
    line-height: 1.4;
    word-wrap: break-word;
  }

  &__meta {
    display: flex;
    flex-direction: column;
    gap: 0.7rem;
  }

  &__meta-item {
    display: flex;
    align-items: center;
    gap: 0.6rem;
  }

  &__meta-text {
    color: #888;
    font-size: 0.85rem;
    font-weight: 500;
  }

  &__subtasks {
    margin-bottom: 1rem;
    border-top: 1px solid #333;
    padding-top: 0.8rem;
  }

  &__progress-bar {
    width: 100%;
    height: 4px;
    background: #2a2a2c;
    border-radius: 2px;
    margin-bottom: 0.8rem;
    overflow: hidden;
  }

  &__progress-fill {
    height: 100%;
    background: #8b5cf6;
    border-radius: 2px;
    transition: width 0.3s ease;
  }

  &__subtasks-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    color: #fff;
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;

    svg {
      color: #888;
      transition: transform 0.2s;
    }

    &:hover svg {
      color: #fff;
    }
  }

  &__subtasks-icon--expanded {
    transform: rotate(180deg);
  }

  &__subtasks-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-top: 0.8rem;

    &.hidden {
      display: none !important;
    }
  }

  &__subtask-item {
    font-size: 0.8rem;
    margin: 0;
    gap: 0.6rem;
  }

  &__subtask-text {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: #ccc;

    &--done {
      text-decoration: line-through;
      color: #666;
    }
  }

  &__subtasks-more {
    font-size: 0.75rem;
    color: #888;
    cursor: pointer;
    margin-top: 0.3rem;

    &:hover {
      color: #fff;
      text-decoration: underline;
    }
  }

  &--done {
    opacity: 0.55;
    border-color: #2a2a2c;
    background-color: #1f1f21;

    &:hover {
      opacity: 0.8;
    }
  }

  &__title {
    transition:
      text-decoration 0.2s ease,
      color 0.2s ease;

    &--done {
      text-decoration: line-through;
      color: var(--text-muted) !important;
    }
  }

  &__status-checkmark {
    position: absolute;
    bottom: 1.25rem;
    right: 1.25rem;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    border: 2px solid #555;
    background: transparent;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
    color: transparent;
    padding: 0;

    &:hover {
      border-color: #10b981;
      color: rgba(16, 185, 129, 0.4);
    }

    &--active {
      border-color: #10b981;
      background-color: #10b981;
      color: white;

      &:hover {
        background-color: #059669;
        border-color: #059669;
      }
    }

    svg {
      width: 12px;
      height: 12px;
      stroke-width: 3px;
    }
  }
}

.create-column-form__color-btn {
  &[data-color="white"] {
    background: #ffffff;
  }

  &[data-color="grey"] {
    background: #9ca3af;
  }

  &[data-color="red"] {
    background: #f87171;
  }

  &[data-color="orange"] {
    background: #fb923c;
  }

  &[data-color="blue"] {
    background: #60a5fa;
  }

  &[data-color="green"] {
    background: #4ade80;
  }

  &[data-color="purple"] {
    background: #a5b4fc;
  }

  &[data-color="pink"] {
    background: #f9a8d4;
  }
}

.share-modal {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  border-radius: 40px;
  padding: 30px 42px;
  width: 629px;
  max-height: 90vh;
  overflow-y: auto;
  background: #252525;
  z-index: 10001;
  display: flex;
  flex-direction: column;
  gap: 20px;

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  &__title {
    font-weight: 700;
    font-size: 44px;
    line-height: 100%;
    color: #fff;
    margin: 0;
  }

  &__close-btn {
    background: transparent;
    border: none;
    color: #ccc;
    cursor: pointer;
    padding: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: color 0.2s;

    &:hover {
      color: #fff;
    }
  }

  &__divider {
    border: 1px solid #3b3b3b;
    width: 100%;
    margin: 0;
  }

  &__toggle {
    display: inline-flex;
    border: 1px solid #3b3b3b;
    border-radius: 12px;
    padding: 0 4px;
    width: fit-content;
    height: 43px;
    background: #252525;
    overflow: hidden;
  }

  &__toggle-btn {
    border: none;
    border-radius: 9px;
    padding: 10px;
    background: transparent;
    color: #ccc;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;

    &--active {
      background: var(--bg-main, #0a0a0a);
      color: #fff;
    }

    &:not(&--active):hover {
      color: #fff;
    }
  }

  &__role-wrapper {
    position: relative;
  }

  &__role-select {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border: 2px solid #3b3b3b;
    border-radius: 12px;
    padding: 10px 8px;
    width: 238px;
    height: 72px;
    background: var(--bg-main, #0a0a0a);
    cursor: pointer;
    transition: border-color 0.2s;

    &:hover {
      border-color: #555;
    }
  }

  &__role-text {
    color: #fff;
    font-size: 16px;
    font-weight: 500;
  }

  &__role-dropdown {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    width: 238px;
    background: var(--bg-main, #0a0a0a);
    border: 2px solid #3b3b3b;
    border-radius: 12px;
    z-index: 10002;
    overflow: hidden;
  }

  &__role-option {
    padding: 12px 16px;
    color: #fff;
    font-size: 14px;
    cursor: pointer;
    transition: background 0.2s;

    &:hover {
      background: #333;
    }
  }

  &__label {
    color: #ccc;
    font-size: 14px;
    margin: 0;
  }

  &__link-row {
    display: flex;
    gap: 12px;
    align-items: flex-end;
  }

  &__input {
    border-radius: 10px;
    padding: 10px 20px;
    width: 380px;
    height: 52px;
    background: #1f1f1f;
    border: none;
    color: #fff;
    font-size: 14px;
    outline: none;

    &--email {
      width: 100%;
    }

    &::placeholder {
      color: #666;
    }
  }

  &__copy-btn {
    border-radius: 10px;
    width: 147px;
    height: 52px;
    background: #2a2a2c;
    border: none;
    color: #fff;
    font-size: 14px;
    cursor: pointer;
    transition: background 0.2s;
    flex-shrink: 0;

    &:hover {
      background: #3a3a3c;
    }
  }

  &__actions {
    display: flex;
    gap: 12px;
    margin-top: 8px;
  }

  &__btn {
    border-radius: 10px;
    width: 262px;
    height: 52px;
    font-size: 16px;
    cursor: pointer;
    transition: all 0.2s;
    border: none;

    &--cancel {
      background: transparent;
      border: 1px solid #676767;
      color: #fff;

      &:hover {
        background: rgba(103, 103, 103, 0.1);
      }
    }

    &--invite {
      background: #676767;
      color: #fff;

      &:hover:not(:disabled) {
        background: #777;
      }

      &:disabled {
        background: #676767;
        color: #999;
        cursor: not-allowed;
      }
    }
  }
}

@media (max-width: 768px) {
  .kanban {
    &__header {
      flex-direction: column;
      align-items: flex-start;
      gap: 1rem;
      padding: 1rem;
    }

    &__board-title {
      font-size: 1.4rem;
    }

    &__actions {
      width: 100%;
      overflow-x: auto;
      padding-bottom: 0.2rem;

      &::-webkit-scrollbar {
        display: none;
      }

      scrollbar-width: none;
    }

    &__action-btn {
      white-space: nowrap;
      padding: 0.5rem 0.8rem;
      font-size: 0.85rem;
    }

    &__columns-wrapper {
      padding-top: 1rem;
      padding-left: 1rem;
    }

    &__columns-container {
      padding-right: 1rem;
    }

    &__column {
      min-width: 85vw;
      max-width: 85vw;
      padding: 1rem;
      margin-right: 1rem;

      &::after {
        display: none;
      }
    }

    &__column-header {
      padding: 0.5rem 0;
    }

    &__column-title {
      font-size: 1rem;
    }

    &__add-column-btn {
      height: 50px;
      font-size: 0.9rem;
    }
  }

  .kanban-card {
    padding: 1rem;

    &__options-btn {
      opacity: 1;
    }

    &__title {
      font-size: 1.05rem;
      margin-bottom: 0.8rem;
    }

    &__meta-text {
      font-size: 0.75rem;
    }
  }

  .share-modal {
    width: calc(100vw - 32px);
    border-radius: 24px;
    padding: 24px;

    &__title {
      font-size: 32px;
    }

    &__input {
      width: 100%;
    }

    &__link-row {
      flex-direction: column;
      align-items: stretch;
    }

    &__copy-btn {
      width: 100%;
    }

    &__actions {
      flex-direction: column;
    }

    &__btn {
      width: 100%;
    }
  }
}

.kanban__view-tabs {
  display: flex;
  gap: 0.5rem;
  padding: 0 2rem;
  margin-top: 1rem;
  flex-shrink: 0;
}

.kanban__view-tab {
  background: #252527;
  border: 1px solid #333;
  color: #888;
  padding: 0.5rem 1.25rem;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.2s;

  &:hover {
    color: white;
    background: #2e2e30;
  }

  &.active {
    background: #1e1e20;
    color: white;
    border-color: #8b5cf6;
  }
}

.gantt-chart {
  display: flex;
  flex: 1;
  min-height: 0;
  background: #1a1a1c;
  border: 1px solid #2a2a2c;
  border-radius: 12px;
  margin: 1.5rem 2rem;
  overflow: hidden;

  &__left-pane {
    width: 40%;
    border-right: 1px solid #2a2a2c;
    display: flex;
    flex-direction: column;
    min-width: 320px;
    background: #222224;
  }

  &__right-pane {
    width: 60%;
    display: flex;
    flex-direction: column;
    overflow-x: auto;
    background: #222224;

    &::-webkit-scrollbar {
      height: 8px;
    }
    &::-webkit-scrollbar-track {
      background: #1a1a1c;
    }
    &::-webkit-scrollbar-thumb {
      background: #333;
      border-radius: 4px;
    }
  }

  &__header-row {
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 1.5rem;
    border-bottom: 1px solid #2a2a2c;
    background: #1a1a1c;
    color: #666;
    font-size: 0.85rem;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    flex-shrink: 0;
  }

  &__list {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    scrollbar-width: none;

    &::-webkit-scrollbar {
      display: none;
    }
  }

  &__row {
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 1.5rem;
    border-bottom: 1px solid #1f1f21;
    font-size: 0.95rem;
    color: white;
    user-select: none;
    box-sizing: border-box;
    flex-shrink: 0;

    &--section {
      background: #1d1d1f;
      font-weight: 600;
      cursor: pointer;

      &:hover {
        background: #232325;
      }
    }

    &--task {
      padding-left: 3rem;
      cursor: pointer;
      background: #222224;

      &:hover {
        background: #28282a;
      }
    }

    &--subtask {
      padding-left: 4.5rem;
      background: #222224;
      color: #ccc;
    }
  }

  &__item-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    flex: 1;
  }

  &__item-date {
    font-size: 0.75rem;
    color: #666;
    flex-shrink: 0;
    margin-left: 1rem;
  }

  &__chevron {
    color: #666;
    transition: transform 0.2s;
    flex-shrink: 0;
    display: flex;
    align-items: center;

    &--expanded {
      transform: rotate(180deg);
    }
  }

  &__col-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  &__subtask-checkbox {
    margin: 0 !important;
  }

  &__timeline-header {
    height: 48px;
    display: flex;
    border-bottom: 1px solid #2a2a2c;
    background: #1a1a1c;
    flex-shrink: 0;
  }

  &__timeline-cell {
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.85rem;
    color: #666;
    font-weight: 500;
    border-right: 1px solid #1f1f21;
    flex-shrink: 0;
    box-sizing: border-box;
  }

  &__grid-body {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    scrollbar-width: none;

    &::-webkit-scrollbar {
      display: none;
    }
  }

  &__grid-row {
    height: 44px;
    position: relative;
    border-bottom: 1px solid #1f1f21;
    box-sizing: border-box;
    display: flex;
    flex-shrink: 0;

    &--section {
      background: #1d1d1f;
    }
  }

  &__grid-line {
    height: 100%;
    border-right: 1px solid #1f1f21;
    flex-shrink: 0;
    box-sizing: border-box;
  }

  &__bar-container {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    pointer-events: none;
  }

  &__bar {
    position: absolute;
    top: 14px;
    height: 16px;
    border-radius: 8px;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
    pointer-events: auto !important;
    z-index: 10;
    overflow: visible !important;

    &--white {
      background: white;
      .gantt-chart__bar-handle::after {
        background: rgba(0, 0, 0, 0.35);
      }
      .gantt-chart__bar-handle:hover::after {
        background: rgba(0, 0, 0, 0.75);
      }
    }

    &--purple {
      background: #8b5cf6;
      .gantt-chart__bar-handle::after {
        background: rgba(255, 255, 255, 0.5);
      }
      .gantt-chart__bar-handle:hover::after {
        background: rgba(255, 255, 255, 0.9);
      }
    }
  }
}

.gantt-filter {
  position: relative;

  &-popover {
    position: absolute;
    top: calc(100% + 8px);
    left: 0;
    background: #1e1e20;
    border: 1px solid #333;
    border-radius: 16px;
    padding: 1.5rem;
    z-index: 1200;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.65);
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    min-width: 320px;
    backdrop-filter: blur(5px);

    &--double {
      min-width: 600px;
    }
  }

  &-inputs-row {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    width: 100%;
    color: #888;
    font-size: 0.95rem;
  }

  &-input-group {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    color: white;
  }

  &-field {
    background: #18181a !important;
    border: 1px solid #333 !important;
    border-radius: 8px !important;
    color: white !important;
    padding: 0.6rem 0.8rem !important;
    font-size: 0.95rem !important;
    outline: none;
    width: 120px !important;
    text-align: center;

    &--time {
      width: 80px !important;
    }
  }

  &-calendars {
    display: flex;
    gap: 1.5rem;
    justify-content: center;
  }

  &-calendar {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    width: 250px;
  }

  &-toggles {
    display: flex;
    flex-direction: column;
    gap: 0.8rem;
    border-top: 1px solid #333;
    padding-top: 1rem;
  }

  &-toggle-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    color: #ccc;
    font-size: 0.95rem;
  }

  &-actions {
    display: flex;
    gap: 0.75rem;
    border-top: 1px solid #333;
    padding-top: 1rem;
  }

  &-btn {
    flex: 1;
    padding: 0.6rem;
    border-radius: 8px;
    font-size: 0.95rem;
    font-weight: 500;
    cursor: pointer;
    border: none;

    &--cancel {
      background: transparent;
      border: 1px solid #444;
      color: #ccc;
      transition:
        background 0.2s,
        color 0.2s;
      &:hover {
        background: #2a2a2c;
        color: white;
      }
    }

    &--apply {
      background: #8b5cf6;
      color: white;
      transition: background 0.2s;
      &:hover {
        background: #7c3aed;
      }
    }
  }
}

@media (max-width: 768px) {
  .kanban__view-tabs {
    padding: 0 1rem;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .gantt-chart {
    margin: 1rem;
    flex-direction: row;

    &__left-pane {
      width: 150px;
      min-width: 150px;
    }

    &__right-pane {
      width: calc(100% - 150px);
    }

    &__header-row {
      padding: 0 0.5rem;
      font-size: 0.75rem;

      span:last-child {
        display: none;
      }
    }

    &__row {
      padding: 0 0.5rem;
      font-size: 0.8rem;
      height: 48px;

      &--task {
        padding-left: 1rem;
      }

      &--subtask {
        padding-left: 1.5rem;
      }
    }

    &__item-date {
      display: none;
    }

    &__grid-row {
      height: 48px;
    }

    &__bar {
      top: 16px;
    }
  }

  .gantt-filter-popover {
    width: calc(100vw - 2rem);
    min-width: 0 !important;
    max-width: 340px;
    right: 50% !important;
    left: auto !important;
    transform: translateX(50%);
    padding: 1rem;
    max-height: 80vh;
    overflow-y: auto;
  }

  .gantt-filter-calendars {
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }

  .gantt-filter-inputs-row {
    flex-direction: column;
    gap: 0.5rem;
  }
}

.gantt-chart__open-details-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  background: #2a2a2c;
  border: 1px solid #444;
  color: #ccc;
  padding: 4px 8px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.75rem;
  font-weight: 500;
  transition:
    background 0.15s,
    color 0.15s,
    border-color 0.15s;
  margin-left: 0.5rem;
  margin-right: auto;
  box-sizing: border-box;

  &:hover {
    background: #3a3a3c;
    color: white;
    border-color: #666;
  }

  svg {
    flex-shrink: 0;
  }
}

@media (max-width: 768px) {
  .gantt-chart__open-details-btn {
    padding: 6px;

    .gantt-chart__btn-text {
      display: none;
    }
  }

  .gantt-filter-popover {
    position: fixed;
    top: 50% !important;
    left: 50% !important;
    right: auto !important;
    transform: translate(-50%, -50%) !important;
    width: calc(100vw - 2rem);
    min-width: 0 !important;
    max-width: 340px;
    padding: 1rem;
    max-height: 80vh;
    overflow-y: auto;
  }
}

.gantt-chart {
  &__timeline-header {
    height: auto !important;
    display: flex;
    flex-direction: column;
    border-bottom: 1px solid #2a2a2c;
    background: #1a1a1c;
    flex-shrink: 0;
  }

  &__months-row {
    display: flex;
    height: 26px;
    border-bottom: 1px solid #2a2a2c;
    background: #141416;
    overflow: hidden;
  }

  &__month-cell {
    display: flex;
    align-items: center;
    padding-left: 10px;
    font-size: 0.78rem;
    color: #888;
    font-weight: bold;
    border-right: 1px solid #2a2a2c;
    box-sizing: border-box;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__days-row {
    display: flex;
    height: 24px;
  }

  &__timeline-cell {
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.82rem;
    color: #666;
    font-weight: 500;
    border-right: 1px solid #1f1f21;
    flex-shrink: 0;
    box-sizing: border-box;
  }

  &__row--done {
    opacity: 0.5;
  }

  &__bar--done {
    opacity: 0.5;
    background: #10b981 !important;
  }

  &__bar-handle {
    position: absolute;
    top: 0;
    width: 10px;
    height: 100%;
    cursor: ew-resize;
    z-index: 15;
    background: transparent;
    transition:
      background 0.15s ease,
      opacity 0.15s ease;
    display: flex;
    align-items: center;
    justify-content: center;

    &::after {
      content: "";
      width: 2px;
      height: 8px;
      border-radius: 1px;
      transition: background 0.15s ease;
    }

    &--left {
      left: 0;
      border-top-left-radius: 8px;
      border-bottom-left-radius: 8px;
    }

    &--right {
      right: 0;
      border-top-right-radius: 8px;
      border-bottom-right-radius: 8px;
    }

    &:hover {
      background: rgba(255, 255, 255, 0.2);
    }
  }

  &__task-status-btn {
    position: static !important;
    margin-right: 0.6rem;
    flex-shrink: 0;
    width: 18px !important;
    height: 18px !important;

    svg {
      width: 10px !important;
      height: 10px !important;
    }
  }
}
```

src/styles/boards/_components.scss:
```scss
.icon-btn {
  background: transparent;
  border: none;
  color: #666;
  cursor: pointer;
  font-size: 1.2rem;
  line-height: 1;
  padding: 0 0.5rem;

  &:hover {
    color: white;
  }
}

.btn {
  &--secondary {
    background: #2a2a2c;
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 8px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    transition: background 0.2s;

    &:hover {
      background: #3b3b3d;
    }
  }

  &--cancel {
    background: transparent;
    color: #ccc;
    border: 1px solid #444;

    &:hover {
      background: #333;
      color: white;
    }
  }

  &--danger {
    background: #ff5c5c;
    color: white;

    &:hover {
      background: #e53e3e;
    }
  }

  &--create {
    padding: 0.6rem 1.2rem;
    border-radius: 12px;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.95rem;
    font-weight: 500;
    width: auto;
  }
}

.modal {
  background: #1e1e20;
  border-radius: 24px;
  padding: 2.5rem;
  width: 480px;
  max-width: 90%;
  border: none;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8);
  display: none;
  position: relative;
  z-index: 2001;

  &__overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.75);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.2s ease;

    &:not(.hidden) {
      opacity: 1;
      pointer-events: auto;
    }

    &:not(.hidden) .modal:not(.hidden) {
      display: block;
    }
  }

  &__header {
    margin-bottom: 1.5rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  &__title {
    font-weight: 700;
    font-size: 1.5rem;
    color: white;
    margin: 0;
  }

  &__body {
    margin-bottom: 2rem;
  }

  &__text {
    color: white;
    font-size: 1rem;
    margin-bottom: 2rem;
    line-height: 1.5;
  }

  &__actions {
    display: flex;
    gap: 1rem;
    margin-top: 2rem;

    .btn {
      flex: 1;
      padding: 0.9rem;
      border-radius: 8px;
      font-weight: 500;
      font-size: 1rem;
    }
  }

  &__actions-vertical {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  &__close-btn {
    background: transparent;
    border: none;
    color: #aaa;
    font-size: 1.5rem;
    cursor: pointer;
    padding: 0;

    &:hover {
      color: white;
    }
  }

  &__action-btn {
    width: 100%;
    border-radius: 8px;
    font-weight: 500;
    padding: 0.9rem;
  }

  &__image-row {
    display: flex;
    align-items: center;
    gap: 0.8rem;
    color: white;
    margin-bottom: 1.5rem;
    font-size: 0.95rem;
    cursor: pointer;
    width: 100%;
    overflow: hidden;

    span {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      min-width: 0;
    }
  }

  &__input-group {
    margin-bottom: 0;
  }

  &__input-label {
    margin-bottom: 0.6rem;
    display: block;
    font-size: 0.85rem;
    color: #ccc;
  }

  &__input-field {
    background: #18181a;
    border: 1px solid transparent;
    color: white;
    padding: 0.8rem 1rem;
    width: 100%;
    border-radius: 6px;
    outline: none;

    &--error {
      border-color: #ff5c5c;
    }
  }

  &__input-error {
    color: #ff5c5c;
    font-size: 0.85rem;
    margin-top: 0.5rem;
    display: none;

    &--visible {
      display: block;
    }
  }
}

.board-card {
  background-color: #222224;
  border-radius: 24px;
  padding: 1.8rem 2rem;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  border: 1px solid transparent;
  transition: transform 0.2s, border-color 0.2s;
  cursor: pointer;
  min-height: 240px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);

  &:hover {
    border-color: #444;
  }

  &--empty-large {
    background-color: transparent;
    border: 2px dashed #444;
    align-items: center;
    justify-content: center;

    &:hover {
      border-color: #8b5cf6;
      background-color: rgba(139, 92, 246, 0.05);
    }
  }

  &__icon-monitor {
    width: 48px;
    height: 48px;
    background: #252527;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #ccc;
    flex-shrink: 0;
    position: relative;
    overflow: hidden;
  }

  &__bg-img {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    width: 100%;
  }

  &__title-group {
    display: flex;
    gap: 1rem;
    align-items: center;
  }

  &__name-wrapper {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  &__name {
    font-size: 1.15rem;
    font-weight: bold;
    margin: 0;
    color: white;
  }

  &__desc {
    color: #777;
    font-size: 0.85rem;
    margin: 0;
  }

  &__options-btn {
    background: #2a2a2c;
    padding: 0.4rem;
    border-radius: 8px;
  }

  &__divider {
    height: 1px;
    background: #2a2a2c;
    margin: 1.2rem 0;
  }

  &__stats {
    display: flex;
    justify-content: space-between;
    text-align: center;
  }
}

.stat {
  &__item {
    flex: 1;
  }

  &__value {
    font-size: 2rem;
    font-weight: 700;
    color: #555;
  }

  &__label {
    font-size: 0.75rem;
    color: #777;
    margin-top: 0.2rem;
    line-height: 1.3;
  }
}

.assignee {
  &__select-btn {
    background: transparent;
    border: none;
    color: #ccc;
    font-size: 0.9rem;
    cursor: pointer;
    padding: 0.2rem 0.5rem;
    border-radius: 4px;
    transition: all 0.2s;
    text-align: left;
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 0.5rem;

    &:hover {
      background-color: #2a2a2c;
      color: white;
    }

    &:active {
      transform: scale(0.98);
    }
  }

  &__dropdown {
    position: absolute;
    top: 100%;
    left: 0;
    min-width: 280px;
    background-color: #1a1a1c;
    border: 1px solid #2a2a2c;
    border-radius: 8px;
    margin-top: 0.5rem;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
    z-index: 1000;
    overflow: hidden;
  }

  &__dropdown-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.7rem 1rem;
    cursor: pointer;
    transition: background-color 0.2s;
    color: #ccc;
    font-size: 0.9rem;

    &:hover {
      background-color: #2a2a2c;
      color: white;
    }

    &--selected {
      background-color: rgba(139, 92, 246, 0.1);
      color: var(--primary);
    }

    &--clear {
      border-bottom: 1px solid #2a2a2c;
      color: #888;

      &:hover {
        color: #e05555;
        background-color: rgba(224, 85, 85, 0.08);
      }
    }

    &--disabled {
      opacity: 0.4;
      cursor: default;
      pointer-events: none;
    }
  }

  &__avatar {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background-color: var(--primary);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.75rem;
    font-weight: bold;
    color: white;
    flex-shrink: 0;

    &--clear {
      background-color: transparent;
      color: #888;
    }

    &--img {
      object-fit: cover;
    }
  }

  &__avatar-small {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    object-fit: cover;
  }

  &__avatar-fallback-small {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: var(--primary);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
  }

  &__info {
    display: flex;
    flex-direction: column;
  }

  &__name {
    font-weight: 500;
    color: white;
  }

  &__email {
    font-size: 0.75rem;
    color: #777;
  }

  &__search-container {
    padding: 0.75rem 1rem 0.5rem;
    border-bottom: 1px solid #2a2a2c;
  }

  &__search-input {
    box-sizing: border-box;
    width: 100%;
    background: #252527;
    border: 1px solid #333;
    color: white;
    padding: 0.5rem 0.75rem;
    border-radius: 6px;
    outline: none;
    font-size: 0.9rem;
    font-family: inherit;

    &::placeholder {
      color: #555;
    }

    &:focus {
      border-color: #555;
    }
  }

  &__list-container {
    max-height: 200px;
    overflow-y: auto;
  }
}

.color-picker-dropdown {
  position: absolute;
  background: #1e1e20;
  border: 1px solid #333;
  border-radius: 8px;
  padding: 0.5rem;
  display: flex;
  gap: 0.5rem;
  z-index: 9999;

  &__btn {
    width: 20px;
    height: 20px;
    border-radius: 4px;
    border: none;
    cursor: pointer;
  }
}

.context-menu {
  position: absolute;
  background: #252527;
  border: 1px solid #3b3b3d;
  border-radius: 12px;
  padding: 0.5rem;
  min-width: 200px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;

  &__item {
    padding: 0.7rem 1rem;
    font-size: 0.95rem;
    color: #ccc;
    cursor: pointer;
    border-radius: 8px;
    transition: background 0.2s, color 0.2s;

    &:hover {
      background: #333;
      color: white;
    }

    &--danger:hover {
      background: #4a2525;
      color: var(--text-error);
    }
  }
}

@media (max-width: 768px) {
  .btn--create {
    padding: 0.5rem 1rem;
    font-size: 0.85rem;
  }

  .board-card {
    min-height: auto;
    padding: 1.25rem;

    &--empty-large {
      min-height: 120px;

      svg {
        width: 40px;
        height: 40px;
      }
    }
  }

  .board-card__icon-monitor {
    width: 40px;
    height: 40px;

    svg {
      width: 24px;
      height: 24px;
    }
  }

  .board-card__name {
    font-size: 1.1rem;
  }

  .board-card__desc {
    font-size: 0.85rem;
  }

  .board-card__divider {
    margin: 1rem 0;
  }

  .stat__value {
    font-size: 1.5rem;
  }

  .stat__label {
    font-size: 0.7rem;
  }

  .modal {
    padding: 1.5rem;
    border-radius: 16px;
  }

  .modal__header {
    margin-bottom: 1rem;
  }

  .modal__title {
    font-size: 1.25rem;
  }

  .modal__actions {
    flex-direction: column;
    gap: 0.5rem;
    margin-top: 1.5rem;
  }

  .modal__actions .btn {
    width: 100%;
    padding: 0.8rem;
  }

  .modal__image-row {
    width: 100%;
    justify-content: flex-start;
  }
}
```

src/utils/toast.ts:
```typescript
export class Toast {
  private static container: HTMLDivElement | null = null;

  private static initContainer() {
    if (this.container && document.body.contains(this.container)) {
      return;
    }
    this.container = document.createElement("div");
    this.container.className = "toast-container";
    document.body.appendChild(this.container);
  }

  static show(
    message: string,
    type: "success" | "error" | "info" = "info",
    duration = 4000,
  ) {
    this.initContainer();
    const toast = document.createElement("div");

    toast.className = `toast toast--${type}`;

    toast.innerHTML = `
      <span class="toast__msg">${message}</span>
      <button class="toast__close">&times;</button>
    `;

    this.container!.appendChild(toast);

    requestAnimationFrame(() => {
      toast.classList.add("toast--visible");
    });

    const remove = () => {
      toast.classList.remove("toast--visible");
      setTimeout(() => toast.remove(), 300);
    };

    toast.querySelector("button")?.addEventListener("click", remove);

    if (duration > 0) {
      setTimeout(remove, duration);
    }
  }

  static success(msg: string) {
    this.show(msg, "success");
  }
  static error(msg: string) {
    this.show(msg, "error");
  }
  static info(msg: string) {
    this.show(msg, "info");
  }
}
```

src/utils/confirmModal.ts:
```typescript
export function showConfirmModal(options: {
  title: string;
  text: string;
  confirmLabel: string;
  onConfirm: () => void;
}): void {
  const overlay = document.createElement("div");
  overlay.className = "modal__overlay";
  overlay.style.opacity = "0";
  overlay.style.pointerEvents = "auto";

  overlay.innerHTML = `
    <div class="modal" style="display:block">
      <div class="modal__header">
        <h2 class="modal__title">${options.title}</h2>
        <button class="modal__close-btn" id="confirm-modal-close">×</button>
      </div>
      <p class="modal__text">${options.text}</p>
      <div class="modal__actions">
        <button class="btn btn--danger" id="confirm-modal-ok">${options.confirmLabel}</button>
        <button class="btn btn--cancel" id="confirm-modal-cancel">Отменить</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  requestAnimationFrame(() => {
    overlay.style.transition = "opacity 0.2s ease";
    overlay.style.opacity = "1";
  });

  const close = () => {
    overlay.style.opacity = "0";
    setTimeout(() => overlay.remove(), 200);
  };

  overlay.querySelector("#confirm-modal-ok")?.addEventListener("click", () => {
    close();
    options.onConfirm();
  });

  overlay.querySelector("#confirm-modal-cancel")?.addEventListener("click", close);
  overlay.querySelector("#confirm-modal-close")?.addEventListener("click", close);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
}
```

src/utils/validator.ts:
```typescript
export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  customValidator?: (value: string) => string | null;
  message: string;
}

export type ValidationSchema = Record<string, ValidationRule[]>;

type SetErrorFn = (fieldId: string, message: string | null) => void;

export class FormValidator {
  constructor(
    private readonly schema: ValidationSchema,
    private readonly onError: SetErrorFn,
    private readonly onValidityChange?: (isValid: boolean) => void
  ) {

  }

  /**
   * Выполняет активную проверку всех полей. 
   * Подсвечивает ошибки во всех невалидных полях.
   * Возвращает true, если форма валидна.
   */
  public validate(): boolean {
    let isFormValid = true;

    for (const [fieldId, rules] of Object.entries(this.schema)) {
      const field = this.getField(fieldId);
      if (!field) {
        continue;
      }

      const error = this.checkFieldRules(field.value.trim(), rules);
      this.onError(fieldId, error);

      if (error) {
        isFormValid = false;
      }
    }

    this.onValidityChange?.(isFormValid);
    return isFormValid;
  }

  /**
   * Сбрасывает все визуальные ошибки формы.
   */
  public clearErrors(): void {
    for (const fieldId of Object.keys(this.schema)) {
      this.onError(fieldId, null);
    }
  }

  /**
   * Подвешивает слушатели на поля для проверки на лету.
   */
  public attachLiveValidation(): void {
    for (const [fieldId, rules] of Object.entries(this.schema)) {
      const field = this.getField(fieldId);
      if (!field) {
        continue;
      }

      field.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement | HTMLTextAreaElement;
        const error = this.checkFieldRules(target.value.trim(), rules);

        this.onError(fieldId, error);

        this.onValidityChange?.(this.isFormValidPassively());
      });
    }
  }

  /**
   * Фоновая проверка формы без вызова коллбека отображения ошибок (onError).
   */
  private isFormValidPassively(): boolean {
    for (const [fieldId, rules] of Object.entries(this.schema)) {
      const field = this.getField(fieldId);
      if (!field) {
        continue;
      }

      if (this.checkFieldRules(field.value.trim(), rules) !== null) {
        return false;
      }
    }
    return true;
  }

  /**
   * Логика проверки конкретного поля по его правилам.
   */
  private checkFieldRules(value: string, rules: ValidationRule[]): string | null {
    for (const rule of rules) {
      if (rule.required && !value) {
        return rule.message;
      }
      if (rule.minLength !== undefined && value.length < rule.minLength) {
        return rule.message;
      }
      if (rule.maxLength !== undefined && value.length > rule.maxLength) {
        return rule.message;
      }
      if (rule.customValidator) {
        const customError = rule.customValidator(value);
        if (customError !== null) {
          return customError;
        }
      }
    }
    return null;
  }

  /**
   * Вспомогательный метод для безопасного получения поля формы (input или textarea).
   */
  private getField(fieldId: string): HTMLInputElement | HTMLTextAreaElement | null {
    return document.getElementById(fieldId) as HTMLInputElement | HTMLTextAreaElement | null;
  }
}
```

src/core/Store.ts:
```typescript
type StoreListener = (...args: unknown[]) => void;

export class Store {
  private listeners: Record<string, StoreListener[]> = {};

  on(event: string, listener: StoreListener): void {
    if (!this.listeners[event]) {
      this.listeners[event] =[];
    }
    this.listeners[event].push(listener);
  }

  off(event: string, listener: StoreListener): void {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter((l) => l !== listener);
  }

  emit(event: string, ...args: unknown[]): void {
    if (!this.listeners[event]) return;
    this.listeners[event].forEach((l) => l(...args));
  }
}
```

src/core/Dispatcher.ts:
```typescript
export interface Action<T = unknown> {
  type: string;
  payload?: T;
}

type DispatchCallback = (action: Action) => void;

class Dispatcher {
  private callbacks: DispatchCallback[] =[];

  register(callback: DispatchCallback): void {
    this.callbacks.push(callback);
  }

  dispatch<T = unknown>(action: Action<T>): void {
    this.callbacks.forEach((cb) => cb(action as Action));
  }
}

export const appDispatcher = new Dispatcher();
```

public/sw.js:
```javascript
const CACHE_NAME = "clac-clac-__CACHE_VERSION__";
const API_CACHE_NAME = "clac-clac-api-v2";

// eslint-disable-next-line no-undef
const staticAssets = __PRECACHE_MANIFEST__;

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(staticAssets)),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME && key !== API_CACHE_NAME)
          .map((key) => caches.delete(key)),
      );
    }),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (url.pathname === "/api/csrf") return;

  if (url.pathname.startsWith("/api") && request.method !== "GET") {
    event.waitUntil(caches.delete(API_CACHE_NAME));
    return;
  }

  if (url.pathname.startsWith("/api")) {
    event.respondWith(
      caches.open(API_CACHE_NAME).then((cache) =>
        cache.match(request).then((cached) => {
          const networkFetch = fetch(request.clone())
            .then((response) => {
              if (response && response.ok) {
                cache.put(request, response.clone());
              }
              return response;
            })
            .catch(() => null);

          if (cached) {
            event.waitUntil(networkFetch);
            return cached;
          }
          return networkFetch.then(
            (r) =>
              r ||
              new Response(JSON.stringify({ error: "offline" }), {
                status: 503,
                headers: { "Content-Type": "application/json" },
              }),
          );
        }),
      ),
    );
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match("/index.html")));
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request)
        .then((networkResponse) => {
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            networkResponse.type === "basic"
          ) {
            const responseToCache = networkResponse.clone();
            caches
              .open(CACHE_NAME)
              .then((cache) => cache.put(request, responseToCache));
          }
          return networkResponse;
        })
        .catch(() => {
          return null;
        });
    })
  );
});
```

