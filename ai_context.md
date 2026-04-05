babel.config.json:
```json
{
  "presets": [["@babel/preset-env", { "targets": "> 0.25%, not dead" }],
    "@babel/preset-typescript"
  ]
}
```

index.html:
```html
<!DOCTYPE html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <script type="importmap">
      {
        "imports": {
          "handlebars": "https://esm.sh/handlebars@4.7.8"
        }
      }
    </script>
    <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap" rel="stylesheet" />
    <link rel="stylesheet" href="/src/style.css" />
    <link rel="stylesheet" href="/src/styles/auth.css" />
    <link rel="stylesheet" href="/src/styles/boards.css" />
    <link rel="icon" type="image/x-icon" href="/favicon.ico"/>
    <title>NeXus</title>
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
    "@babel/core": "^7.29.0",
    "@babel/preset-env": "^7.29.2",
    "@babel/preset-typescript": "^7.28.5",
    "@eslint/js": "^10.0.1",
    "eslint": "^10.0.3",
    "globals": "^17.4.0",
    "jsdoc": "^4.0.5",
    "typescript": "^5.9.3",
    "vite": "^5.2.0",
    "vite-plugin-babel": "^1.6.0",
    "vite-plugin-pwa": "^1.2.0"
  }
}
```

vite-env.d.ts:
```typescript
/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />
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
    "types": ["vite/client", "vite-plugin-pwa/client"]
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
import { defineConfig } from 'vite';
import babel from 'vite-plugin-babel';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  server: {
    port: 3000,
    open: true,
  },
  build: {
    target: 'esnext',
    outDir: 'dist',
  },
  plugins: [
    babel(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,hbs}']
      },
      manifest: {
        name: 'NeXus SPA',
        short_name: 'NeXus',
        theme_color: '#0a0a0a',
        background_color: '#0a0a0a',
        display: 'standalone',
        icons: [
          { src: '/favicon.ico', sizes: '192x192', type: 'image/x-icon' }
        ]
      }
    })
  ]
});
```

structure.txt:
```
├── public/
│   ├── background.png
│   ├── favicon.ico
│   └── logo.svg
├── src/
│   ├── pages/
│   │   ├── boards.ts
│   │   ├── kanban.ts
│   │   ├── login.ts
│   │   ├── passwordRecovery.ts
│   │   ├── profile.ts
│   │   ├── register.ts
│   │   └── task.ts
│   ├── styles/
│   │   ├── auth.css
│   │   └── boards.css
│   ├── templates/
│   │   ├── partials/
│   │   │   ├── input.hbs
│   │   │   └── sidebar.hbs
│   │   ├── boards.hbs
│   │   ├── kanban.hbs
│   │   ├── login.hbs
│   │   ├── password_recovery_code.hbs
│   │   ├── password_recovery_email.hbs
│   │   ├── password_recovery_new_pass.hbs
│   │   ├── profile.hbs
│   │   ├── register.hbs
│   │   └── task.hbs
│   ├── api.ts
│   ├── config.ts
│   ├── main.ts
│   ├── router.ts
│   ├── style.css
│   └── utils.ts
├── .gitignore
├── babel.config.json
├── codemark.ts
├── eslint.config.js
├── index.html
├── package.json
├── README.md
├── st.ts
├── tsconfig.json
├── vite-env.d.ts
└── vite.config.ts
```

src/main.ts:
```typescript
import './styles/auth.css';
import './styles/boards.css';

import Handlebars from 'handlebars';
import { initGlobalListeners } from './utils';
import { handleRoute } from './router';
import inputPartial from '/src/templates/partials/input.hbs?raw';
import sidebarPartial from '/src/templates/partials/sidebar.hbs?raw';

import { registerSW } from 'virtual:pwa-register';
registerSW({ immediate: true });

Handlebars.registerPartial('input', inputPartial);
Handlebars.registerPartial('sidebar', sidebarPartial);

Handlebars.registerHelper('eq', function (a, b) {
  return a === b;
});

initGlobalListeners();

const urlParams = new URLSearchParams(window.location.search);
const vkCode = urlParams.get('code');
if (vkCode) {
  if (vkCode === '200') localStorage.setItem('isAuth', 'true');
  window.history.replaceState({}, '', '/boards');
}

handleRoute();
```

src/router.ts:
```typescript
import { renderLogin } from './pages/login';
import { renderRegister } from './pages/register';
import { renderBoards } from './pages/boards';
import { renderPasswordRecovery } from './pages/passwordRecovery';
import { renderProfile } from './pages/profile';
import { renderKanban } from './pages/kanban';
import { renderTask } from './pages/task';

export const routes: Record<string, (appDiv: HTMLElement) => void> = {
  '/login': renderLogin,
  '/register': renderRegister,
  '/forgot-password': renderPasswordRecovery,
  '/boards': renderBoards,
  '/profile': renderProfile,
  '/board': renderKanban,
  '/task': renderTask,
};

export const navigateTo = (path: string): void => {
  window.history.pushState({}, '', path);
  handleRoute();
};

export const handleRoute = (): void => {
  const appDiv = document.getElementById('app') as HTMLDivElement | null;
  if (!appDiv) return;

  const path = window.location.pathname;
  const isAuth = localStorage.getItem('isAuth') === 'true';

  if (path === '/' || (path === '/login' && isAuth)) {
    return navigateTo(isAuth ? '/boards' : '/login');
  }

  const routeHandler = routes[path] || routes['/login'];
  routeHandler(appDiv);
};

window.addEventListener('popstate', handleRoute);
```

src/utils.ts:
```typescript
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
    input.classList.add('error');
    errorMsg.textContent = message;
    errorMsg.classList.add('visible');
  } else {
    input.classList.remove('error');
    errorMsg.classList.remove('visible');
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
 * Инициализирует глобальные слушатели событий.
 */
export const initGlobalListeners = (): void => {
  document.body.addEventListener('click', (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    const btn = target.closest('.toggle-password-btn');

    if (!btn) return;

    const inputId = btn.getAttribute('data-target');
    if (!inputId) return;

    const input = document.getElementById(inputId) as HTMLInputElement | null;

    if (!input) return;

    const eyeSlash = btn.querySelector('.icon-eye-slash');
    const eye = btn.querySelector('.icon-eye');

    if (input.type === 'password') {
      input.type = 'text';
      eyeSlash?.classList.add('hidden');
      eye?.classList.remove('hidden');
    } else {
      input.type = 'password';
      eyeSlash?.classList.remove('hidden');
      eye?.classList.add('hidden');
    }
  });
};
```

src/api.ts:
```typescript
const API_URL = 'https://clac-clac.mooo.com/api';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

export interface ApiError<T = unknown> {
  status: number;
  data: T | null;
}

/**
 * Внутренняя функция для выполнения HTTP-запросов к API.
 * 
 * @param {string} method - HTTP-метод ('GET', 'POST', 'PUT', 'DELETE').
 * @param {string} url - Относительный путь API.
 * @param {Object|null} [body=null] - Тело запроса.
 * @param {Object} [headers={}] - Дополнительные HTTP-заголовки.
 * @returns {Promise<any>} Результат запроса.
 * @throws {Object} Объект ошибки, содержащий HTTP-статус и данные ошибки, если ответ не успешен.
 */
const request = async <TResponse = unknown, TBody = unknown>(
  method: HttpMethod,
  url: string,
  body: TBody | null = null,
  headers: HeadersInit = {}
): Promise<TResponse> => {
  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    credentials: 'include',
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_URL}${url}`, options);

  let data: TResponse | null;
  try {
    data = (await response.json()) as TResponse;
  } catch {
    data = null;
  }

  if (!response.ok) {
    const error: ApiError = { status: response.status, data };
    throw error;
  }

  return data as TResponse;
};

export const apiClient = {
  /**
   * Выполняет GET-запрос к API.
   * 
   * @param {string} url - Относительный путь API.
   * @param {Object} [headers={}] - Дополнительные HTTP-заголовки.
   * @returns {Promise<any>} Ответ сервера.
   */
  get: <TResponse = unknown>(url: string, headers?: HeadersInit): Promise<TResponse> =>
    request<TResponse>('GET', url, null, headers),

  /**
   * Выполняет POST-запрос к API.
   * 
   * @param {string} url - Относительный путь API.
   * @param {Object} body - Тело запроса.
   * @param {Object} [headers={}] - Дополнительные HTTP-заголовки.
   * @returns {Promise<any>} Ответ сервера.
   */
  post: <TResponse = unknown, TBody = unknown>(url: string, body?: TBody, headers?: HeadersInit): Promise<TResponse> =>
    request<TResponse, TBody>('POST', url, body, headers),

  /**
   * Выполняет PUT-запрос к API.
   * 
   * @param {string} url - Относительный путь API.
   * @param {Object} body - Тело запроса.
   * @param {Object} [headers={}] - Дополнительные HTTP-заголовки.
   * @returns {Promise<any>} Ответ сервера.
   */
  put: <TResponse = unknown, TBody = unknown>(url: string, body: TBody, headers?: HeadersInit): Promise<TResponse> =>
    request<TResponse, TBody>('PUT', url, body, headers),

  /**
   * Выполняет DELETE-запрос к API.
   * 
   * @param {string} url - Относительный путь API.
   * @param {Object} [headers={}] - Дополнительные HTTP-заголовки.
   * @returns {Promise<any>} Ответ сервера.
   */
  delete: <TResponse = unknown>(url: string, headers?: HeadersInit): Promise<TResponse> =>
    request<TResponse>('DELETE', url, null, headers),
};

export const profileApi = {
  getProfile: () => apiClient.get('/profile'),
  updateProfile: (data: { display_name: string; description_user: string }) => apiClient.post('/update-profile', data),
  updateAvatar: (formData: FormData) => {
    return fetch(`${API_URL}/api/update-avatar`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    }).then(res => {
      if (!res.ok) throw new Error('Ошибка загрузки аватара');
      return res.json();
    });
  },
  deleteAvatar: () => apiClient.delete('/delete-avatar'),
};

export const boardsApi = {
  getBoards: () => apiClient.get('/home'),
  createBoard: (data: { board_name: string; description?: string }) => apiClient.post('/boards', data),
  updateBoard: (id: string, data: { board_name: string; description?: string }) => apiClient.put(`/boards/${id}`, data),
  deleteBoard: (id: string) => apiClient.delete(`/boards/${id}`),
};

export const kanbanApi = {
  getSections: (boardId: string) => apiClient.get(`/boards/${boardId}/sections`),
  createSection: (boardId: string, data: { section_name: string; position: number }) => apiClient.post(`/boards/${boardId}/sections`, data),
  updateSection: (sectionId: string, data: { section_name: string }) => apiClient.put(`/sections/${sectionId}`, data),
  deleteSection: (sectionId: string) => apiClient.delete(`/sections/${sectionId}`),

  getTasks: (sectionId: string) => apiClient.get(`/sections/${sectionId}/tasks`),
  createTask: (sectionId: string, data: { title: string, due_date?: string }) => apiClient.post(`/sections/${sectionId}/tasks`, data),
  updateTask: (taskId: string, data: { title: string, section_id?: string }) => apiClient.put(`/tasks/${taskId}`, data),
  deleteTask: (taskId: string) => apiClient.delete(`/tasks/${taskId}`),
};
```

src/style.css:
```css
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
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  font-family: 'Roboto', sans-serif;
}

body {
  background-color: var(--bg-main);
  color: var(--text-main);
  overflow-x: hidden;
}

a {
  color: var(--primary);
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}

#app .hidden {
  display: none;
}

.input-group {
  display: flex;
  flex-direction: column;
  margin-bottom: 1.2rem;
}

.input-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.input-label {
  font-size: 0.875rem;
  color: #e5e5e5;
}

.forgot-link {
  font-size: 0.875rem;
  color: var(--primary);
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.input-field {
  width: 100%;
  background-color: var(--bg-input);
  color: var(--text-main);
  padding: 0.85rem 1rem;
  border-radius: 6px;
  border: 1px solid var(--border-default);
  outline: none;
  transition: all 0.2s ease;
  font-size: 0.95rem;
}

.input-field:hover {
  border-color: var(--border-hover);
}

.input-field:focus {
  border-color: #444;
}

#app .input-wrapper .input-field.error {
  border-color: var(--border-error);
  color: var(--text-error);
  box-shadow: none;
}

#app .input-wrapper .input-field.error::placeholder {
  color: var(--text-error);
  opacity: 0.7;
}

.input-field:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.input-error-msg {
  color: var(--text-error);
  font-size: 0.75rem;
  margin-top: 0.4rem;
  display: none;
}

.input-error-msg.visible {
  display: block;
}

.toggle-password-btn {
  position: absolute;
  right: 1rem;
  background: none;
  border: none;
  color: #6b7280;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.toggle-password-btn:hover {
  color: #9ca3af;
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
}

.btn-primary {
  background-color: var(--primary);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background-color: var(--primary-hover);
}

.btn-primary:disabled {
  background-color: #6b7280;
  color: #d1d5db;
  cursor: not-allowed;
}

.btn-vk {
  background-color: var(--vk-color);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.btn-vk:hover {
  background-color: var(--vk-hover);
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

.cursor-pointer {
  cursor: pointer;
}
```

src/config.ts:
```typescript
export default {
  vkAuthUrl: `https://oauth.vk.com/authorize?client_id=7051184&redirect_uri=https://clac-clac.mooo.com/api/oauth/vk&response_type=code&scope=email`
}
```

src/pages/boards.ts:
```typescript
import Handlebars from 'handlebars';
import { apiClient, boardsApi } from '../api';
import boardsTpl from '../templates/boards.hbs?raw';
import { navigateTo } from '../router';

const template = Handlebars.compile(boardsTpl);

interface User {
  id: string;
  username: string;
  email: string;
  avatar: string;
}

interface RawBoard {
  id: string;
  board_name: string;
  title: string;
  description: string;
  backlog: number;
  hot: number;
  members: number;
}

interface Board {
  id: string;
  board_name: string;
  description: string;
  backlog: number;
  hot: number;
  members: number;
}

let localBoards: Board[] = [];
let currentUser: User | null = null;
let eventController: AbortController | null = null;

/**
 * Отрисовывает главную страницу со списком досок проекта.
 * 
 * @param {HTMLElement} appDiv - DOM-контейнер, в который будет встроен HTML-код страницы.
 */
export const renderBoards = async (appDiv: HTMLElement): Promise<void> => {
  const success = await loadData();
  if (!success) return;

  /**
   * Обновляет UI интерфейс досок, перерисовывая шаблон и перенавешивая слушатели.
   */
  const updateUI = (): void => {
    if (eventController) {
      eventController.abort();
    }
    eventController = new AbortController();

    appDiv.innerHTML = template({ boards: localBoards, user: currentUser });
    attachEventListeners(appDiv, updateUI, eventController.signal);
  };
  updateUI();
};

/**
 * Асинхронно загружает данные пользователя и список досок с сервера.
 * В случае ошибки 401 автоматически перенаправляет пользователя на страницу входа.
 * 
 * @returns {Promise<boolean>} Возвращает `true`, если данные успешно загружены, или `false`, если произошла критическая ошибка.
 */
async function loadData(): Promise<boolean> {
  try {
    const res = await apiClient.get('/home') as any;
    let rawBoards: RawBoard[] = [];
    if (res && res.data) {
      rawBoards = res.data;
    } else if (Array.isArray(res)) {
      rawBoards = res;
    }

    localBoards = rawBoards.map(board => ({
      id: board.id,
      board_name: board.board_name || board.title || 'Без названия',
      description: board.description || 'Создаём аналог Trello',
      backlog: board.backlog || 0,
      hot: board.hot || 0,
      members: board.members || 0
    }));
    return true;
  } catch (err: any) {
    if (err.status === 401) {
      localStorage.removeItem('isAuth');
      navigateTo('/login');
      return false;
    }
    return true;
  }
}

/**
 * Инициализирует и прикрепляет слушатели событий на странице со списком досок.
 * 
 * @param {HTMLElement} appDiv - DOM-контейнер страницы.
 * @param {Function} updateUI - Функция для обновления интерфейса при изменении данных.
 * @param {AbortSignal} abortSignal - Сигнал от AbortController для своевременной отписки от глобальных событий.
 */
function attachEventListeners(appDiv: HTMLElement, updateUI: () => void, abortSignal: AbortSignal): void {
  const modalOverlay = appDiv.querySelector<HTMLElement>('#modal-overlay');
  const modalCreate = appDiv.querySelector<HTMLElement>('#modal-create-board');
  const modalEdit = appDiv.querySelector<HTMLElement>('#modal-edit-board');
  const modalDelete = appDiv.querySelector<HTMLElement>('#modal-delete-board');

  let currentBoardId: string | null = null;

  document.getElementById('nav-profile')?.addEventListener('click', () => navigateTo('/profile'), { signal: abortSignal });
  document.getElementById('logout-btn')?.addEventListener('click', () => {
    localStorage.removeItem('isAuth');
    navigateTo('/login');
  }, { signal: abortSignal });

  /**
   * Скрывает все открытые модальные окна и оверлей на странице.
   */
  const closeModals = (): void => {
    [modalOverlay, modalCreate, modalEdit, modalDelete].forEach(m => m?.classList.add('hidden'));
  };

  appDiv.querySelectorAll('.close-modal-btn').forEach(btn => btn.addEventListener('click', closeModals));
  if (modalOverlay) {
    modalOverlay.addEventListener('click', (e: MouseEvent) => {
      if (e.target === modalOverlay) closeModals();
    });
  }

  const openCreateModal = () => {
    modalOverlay?.classList.remove('hidden');
    modalCreate?.classList.remove('hidden');
    const inputNewBoard = appDiv.querySelector<HTMLInputElement>('#new-board-name');
    const errorNewBoard = appDiv.querySelector<HTMLElement>('#new-board-name-error');
    const btnConfirmCreate = appDiv.querySelector<HTMLButtonElement>('#btn-confirm-create');

    if (inputNewBoard) {
      inputNewBoard.value = '';
      inputNewBoard.style.borderColor = '#ff5c5c';
    }
    errorNewBoard?.classList.remove('hidden');
    if (btnConfirmCreate) btnConfirmCreate.disabled = true;
  };

  appDiv.querySelector('#btn-create-board')?.addEventListener('click', openCreateModal);
  appDiv.querySelector('#btn-create-board-empty')?.addEventListener('click', openCreateModal);

  const inputNewBoard = appDiv.querySelector<HTMLInputElement>('#new-board-name');
  const errorNewBoard = appDiv.querySelector<HTMLElement>('#new-board-name-error');
  const btnConfirmCreate = appDiv.querySelector<HTMLButtonElement>('#btn-confirm-create');

  inputNewBoard?.addEventListener('input', () => {
    const val = inputNewBoard.value.trim();
    if (val) {
      errorNewBoard?.classList.add('hidden');
      if (btnConfirmCreate) btnConfirmCreate.disabled = false;
      inputNewBoard.style.borderColor = '#333';
    } else {
      errorNewBoard?.classList.remove('hidden');
      if (btnConfirmCreate) btnConfirmCreate.disabled = true;
      inputNewBoard.style.borderColor = '#ff5c5c';
    }
  });

  btnConfirmCreate?.addEventListener('click', async () => {
    const boardName = inputNewBoard?.value.trim();
    if (!boardName) return;
    try {
      btnConfirmCreate.disabled = true;
      await boardsApi.createBoard({ board_name: boardName, description: 'Создаём аналог Trello' });
      closeModals();
      updateUI();
    } catch (err) {
      console.error('Create error', err);
    } finally {
      btnConfirmCreate.disabled = false;
    }
  });

  const editBoardNameInput = appDiv.querySelector<HTMLInputElement>('#edit-board-name');
  const btnConfirmEdit = appDiv.querySelector<HTMLButtonElement>('#btn-confirm-edit');
  const btnOpenDelete = appDiv.querySelector<HTMLButtonElement>('#btn-open-delete');
  const btnConfirmDelete = appDiv.querySelector<HTMLButtonElement>('#btn-confirm-delete');

  appDiv.querySelectorAll('.board-options-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = (e.currentTarget as HTMLElement).getAttribute('data-id')!;
      const name = (e.currentTarget as HTMLElement).getAttribute('data-name')!;
      currentBoardId = id;

      if (editBoardNameInput) editBoardNameInput.value = name;
      modalOverlay?.classList.remove('hidden');
      modalEdit?.classList.remove('hidden');
    });
  });

  btnConfirmEdit?.addEventListener('click', async () => {
    const name = editBoardNameInput?.value.trim();
    if (!name || !currentBoardId) {
      return;
    };
    try {
      btnConfirmEdit.disabled = true;
      await boardsApi.updateBoard(currentBoardId, { board_name: name });
      closeModals();
      updateUI();
    } finally {
      btnConfirmEdit.disabled = false;
    }
  });

  btnOpenDelete?.addEventListener('click', () => {
    modalEdit?.classList.add('hidden');
    modalDelete?.classList.remove('hidden');
    const deleteBoardName = appDiv.querySelector('#delete-board-name');
    if (deleteBoardName) {
      deleteBoardName.textContent = editBoardNameInput?.value || '';
    }
  });

  btnConfirmDelete?.addEventListener('click', async () => {
    if (!currentBoardId) return;
    try {
      btnConfirmDelete.disabled = true;
      await boardsApi.deleteBoard(currentBoardId);
      closeModals();
      updateUI();
    } finally {
      btnConfirmDelete.disabled = false;
      currentBoardId = null;
    }
  });

  appDiv.querySelectorAll('.board-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('.board-options-btn')) return;
      const id = card.getAttribute('data-id');
      navigateTo(`/board?id=${id}`);
    });
  });
}
```

src/pages/kanban.ts:
```typescript
import Handlebars from 'handlebars';
import { kanbanApi } from '../api';
import { navigateTo } from '../router';
import kanbanTpl from '../templates/kanban.hbs?raw';

const template = Handlebars.compile(kanbanTpl);

export const renderKanban = async (appDiv: HTMLElement): Promise<void> => {
  const urlParams = new URLSearchParams(window.location.search);
  const boardId = urlParams.get('id');
  if (!boardId) return navigateTo('/boards');

  try {
    const res = await kanbanApi.getSections(boardId) as any;
    let sections = Array.isArray(res.data) ? res.data : (res || []);

    const colors = ['#666', '#8b5cf6', '#f59e0b', '#10b981'];

    for (let i = 0; i < sections.length; i++) {
      sections[i].color = colors[i % colors.length];
      try {
        const tasksRes = await kanbanApi.getTasks(sections[i].id) as any;
        const tasksList = Array.isArray(tasksRes.data) ? tasksRes.data : [];
        sections[i].tasks = tasksList.map((t: any) => ({
          id: t.id,
          title: t.title,
          due_date: '17 марта, 2026',
          time: 'До 23:59'
        }));
      } catch {
        sections[i].tasks = [];
      }
    }

    appDiv.innerHTML = template({ board_name: "NeXuS (Trello)", sections });

    document.getElementById('nav-boards')?.addEventListener('click', () => navigateTo('/boards'));
    document.getElementById('nav-profile')?.addEventListener('click', () => navigateTo('/profile'));
    document.getElementById('logout-btn')?.addEventListener('click', () => {
      localStorage.removeItem('isAuth');
      navigateTo('/login');
    });

    const modalOverlay = document.getElementById('modal-overlay')!;
    const modalDeleteCard = document.getElementById('modal-delete-card')!;

    const closeModals = () => {
      modalOverlay.classList.add('hidden');
      modalDeleteCard.classList.add('hidden');
    };
    document.querySelectorAll('.close-modal-btn').forEach(btn => btn.addEventListener('click', closeModals));
    modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) closeModals(); });

    let activeMenu: HTMLElement | null = null;
    const closeMenu = () => {
      if (activeMenu) {
        activeMenu.remove();
        activeMenu = null;
      }
    };
    document.addEventListener('click', closeMenu);

    document.querySelectorAll('.btn-col-options').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeMenu();
        const sectionId = (e.currentTarget as HTMLElement).getAttribute('data-id');
        const menu = document.createElement('div');
        menu.className = 'context-menu';
        menu.innerHTML = `
          <div class="context-menu-item" id="ctx-add-card">Добавить карточку</div>
          <div class="context-menu-item" id="ctx-edit-list">Изменить имя списка</div>
          <div class="context-menu-item" id="ctx-delete-list">Удалить список</div>
        `;
        const rect = btn.getBoundingClientRect();
        menu.style.top = `${rect.bottom + window.scrollY}px`;
        menu.style.left = `${rect.left + window.scrollX}px`;
        document.body.appendChild(menu);
        activeMenu = menu;

        menu.querySelector('#ctx-delete-list')?.addEventListener('click', async () => {
          if (sectionId) {
            await kanbanApi.deleteSection(sectionId);
            renderKanban(appDiv);
          }
        });
      });
    });

    document.querySelectorAll('.btn-card-options').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeMenu();
        const taskId = (e.currentTarget as HTMLElement).getAttribute('data-id');
        const title = (e.currentTarget as HTMLElement).getAttribute('data-title');
        const menu = document.createElement('div');
        menu.className = 'context-menu';
        menu.innerHTML = `
          <div class="context-menu-item" id="ctx-edit-card">Изменить имя</div>
          <div class="context-menu-item text-danger" id="ctx-delete-card">Удалить карточку</div>
        `;
        const rect = btn.getBoundingClientRect();
        menu.style.top = `${rect.bottom + window.scrollY}px`;
        menu.style.left = `${rect.left + window.scrollX}px`;
        document.body.appendChild(menu);
        activeMenu = menu;

        menu.querySelector('#ctx-delete-card')?.addEventListener('click', () => {
          document.getElementById('delete-card-name')!.textContent = title || '';
          modalOverlay.classList.remove('hidden');
          modalDeleteCard.classList.remove('hidden');
          const confirmBtn = document.getElementById('btn-confirm-delete-card')!;
          confirmBtn.onclick = async () => {
            if (taskId) {
              await kanbanApi.deleteTask(taskId);
              renderKanban(appDiv);
            }
          };
        });
      });
    });

    document.querySelectorAll('.add-card-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const parent = btn.parentElement!;
        const sectionId = parent.getAttribute('data-section-id')!;
        parent.innerHTML = `
          <div class="add-card-form">
            <textarea class="add-card-input" id="inline-new-task-${sectionId}" placeholder="Введите имя карточки..." maxlength="50" autofocus></textarea>
            <div class="add-card-footer">
              <span class="char-count" id="char-count-${sectionId}">50</span>
              <div class="add-card-icons">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>
              </div>
            </div>
          </div>
        `;
        const input = document.getElementById(`inline-new-task-${sectionId}`) as HTMLTextAreaElement;
        const charCount = document.getElementById(`char-count-${sectionId}`)!;
        input.focus();

        input.addEventListener('input', () => {
          charCount.textContent = (50 - input.value.length).toString();
        });

        const saveTask = async () => {
          const val = input.value.trim();
          if (val) {
            await kanbanApi.createTask(sectionId, { title: val });
            renderKanban(appDiv);
          } else {
            renderKanban(appDiv);
          }
        };

        input.addEventListener('blur', saveTask);
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            input.blur();
          } else if (e.key === 'Escape') {
            input.value = '';
            input.blur();
          }
        });
      });
    });

    const addColumnBtn = document.getElementById('btn-add-column');
    if (addColumnBtn) {
      addColumnBtn.addEventListener('click', () => {
        const parent = addColumnBtn.parentElement!;
        parent.innerHTML = `
          <div class="add-column-form">
            <input type="text" class="add-column-input" id="inline-new-col-name" placeholder="Введите имя колонки..." autofocus>
          </div>
        `;
        const input = document.getElementById('inline-new-col-name') as HTMLInputElement;
        input.focus();

        const saveColumn = async () => {
          const val = input.value.trim();
          if (val) {
            await kanbanApi.createSection(boardId, { section_name: val, position: sections.length });
          }
          renderKanban(appDiv);
        };

        input.addEventListener('blur', saveColumn);
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') input.blur();
          else if (e.key === 'Escape') { input.value = ''; input.blur(); }
        });
      });
    }

    document.querySelectorAll('.kanban-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if ((e.target as HTMLElement).closest('.btn-card-options')) return;
        const taskId = card.getAttribute('data-id');
        const title = card.getAttribute('data-title') || '';
        navigateTo(`/task?boardId=${boardId}&taskId=${taskId}&title=${encodeURIComponent(title)}`);
      });
    });

  } catch (err) {
    console.error(err);
    navigateTo('/boards');
  }
};
```

src/pages/login.ts:
```typescript
import Handlebars from 'handlebars';
import { apiClient } from '../api';
import { setInputError, setGlobalError, validateEmail } from '../utils';
import config from '../config';

import loginTpl from '../templates/login.hbs?raw';
import { navigateTo } from '../router';

const template = Handlebars.compile(loginTpl);

interface ApiError {
  status?: number;
  data?: {
    message?: string;
    error?: string;
  };
}

/**
 * Отрисовывает страницу авторизации и инициализирует все связанные с ней обработчики событий.
 * 
 * @param {HTMLElement} appDiv - DOM-контейнер, в который будет встроен HTML-код страницы.
 */
export const renderLogin = (appDiv: HTMLElement): void => {
  appDiv.innerHTML = template({});

  const vkError = localStorage.getItem('vkError');
  if (vkError) {
    let errorMsg: string;

    switch (vkError) {
      case 'vk_oauth_error':
        errorMsg = 'Ошибка авторизации через VK';
        break;
      case 'no_valid_email':
        errorMsg = 'К вашему VK не привязан Email';
        break;
      case 'cannot_request_data':
        errorMsg = 'Не удалось получить данные из VK';
        break;
      case 'something_went_wrong':
        errorMsg = 'Что-то пошло не так. Попробуйте снова';
        break;
      default:
        errorMsg = `Ошибка авторизации: ${vkError}`;
    }

    setGlobalError(errorMsg);
    localStorage.removeItem('vkError');
  }

  const form = document.getElementById('login-form') as HTMLFormElement | null;
  const submitBtn = document.getElementById('login-submit') as HTMLButtonElement | null;
  const emailInput = document.getElementById('email') as HTMLInputElement | null;
  const passwordInput = document.getElementById('password') as HTMLInputElement | null;

  /**
   * Проверяет заполненность обязательных полей (email и пароль) 
   * и активирует или деактивирует кнопку входа.
   */
  const checkForm = (): void => {
    const emailVal = emailInput?.value.trim() || '';
    const passwordVal = passwordInput?.value.trim() || '';

    if (submitBtn) {
      submitBtn.disabled = !(emailVal && passwordVal);
    }
  };

  const inputs = form?.querySelectorAll('input');
  inputs?.forEach((input: HTMLInputElement) => {
    input.addEventListener('input', () => {
      checkForm();
      input.classList.remove('error');
      const errorMsg = document.getElementById(`${input.id}-error`);
      if (errorMsg) {
        errorMsg.classList.remove('visible');
      }
      setGlobalError(null);
    });
  });

  checkForm();

  const linkRegister = document.getElementById('link-register');
  if (linkRegister) {
    linkRegister.addEventListener('click', (e: MouseEvent) => {
      e.preventDefault();
      navigateTo('/register');
    });
  }

  const forgotLink = document.querySelector('.forgot-link');
  if (forgotLink) {
    forgotLink.addEventListener('click', (e: Event) => {
      e.preventDefault();
      navigateTo('/forgot-password');
    });
  }

  const btnVk = document.querySelector('.btn-vk');
  if (btnVk) {
    btnVk.addEventListener('click', () => {
      window.location.href = config.vkAuthUrl;
    });
  }

  form?.addEventListener('submit', async (e: SubmitEvent) => {
    e.preventDefault();

    const email = emailInput?.value.trim() || '';
    const password = passwordInput?.value.trim() || '';

    let hasError = false;
    setGlobalError(null);

    if (!email) {
      setInputError('email', 'Введите адрес электронной почты');
      hasError = true;
    } else if (!validateEmail(email)) {
      setInputError('email', 'Неверный формат email');
      hasError = true;
    } else {
      setInputError('email', null);
    }

    if (!password) {
      setInputError('password', 'Введите пароль');
      hasError = true;
    } else {
      setInputError('password', null);
    }

    if (hasError) {
      return;
    }

    try {
      if (submitBtn) submitBtn.disabled = true;
      await apiClient.post('/login', { email, password });

      localStorage.setItem('isAuth', 'true');
      navigateTo('/boards');

    } catch (error) {
      const err = error as ApiError;
      const errMsg = err.data?.message || err.data?.error;

      if (err.status === 401 || (errMsg && (errMsg.includes('wrong') || errMsg.includes('exist') || errMsg.includes('invalid')))) {
        setGlobalError('Неверный email или пароль');
        emailInput?.classList.add('error');
        passwordInput?.classList.add('error');
      } else if (errMsg) {
        setGlobalError(errMsg);
      } else {
        setGlobalError('Проверьте подключение и попробуйте снова');
      }
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
      }
    }
  });
};
```

src/pages/passwordRecovery.ts:
```typescript
import Handlebars from 'handlebars';
import { setInputError, setGlobalError, validateEmail, validatePassword } from '../utils';
import { apiClient } from '../api';

import tplEmail from '../templates/password_recovery_email.hbs?raw';
import tplCode from '../templates/password_recovery_code.hbs?raw';
import tplNewPass from '../templates/password_recovery_new_pass.hbs?raw';
import { navigateTo } from '../router';

const renderStepEmail = Handlebars.compile(tplEmail);
const renderStepCode = Handlebars.compile(tplCode);
const renderStepNewPass = Handlebars.compile(tplNewPass);

interface RecoveryState {
  email: string;
  code: string;
}

interface ApiError {
  data?: {
    message?: string;
    error?: string;
  };
}

let recoveryState: RecoveryState = {
  email: '',
  code: ''
};

/**
 * Отрисовывает первый шаг восстановления пароля: ввод адреса электронной почты.
 * 
 * @param {HTMLElement} appDiv - DOM-контейнер для рендеринга.
 */
const stepEmail = (appDiv: HTMLElement): void => {
  appDiv.innerHTML = renderStepEmail({});

  const form = document.getElementById('recovery-email-form') as HTMLFormElement | null;
  const emailInput = document.getElementById('email') as HTMLInputElement | null;
  const submitBtn = document.getElementById('recovery-submit') as HTMLButtonElement | null;
  const backLink = document.getElementById('back-link-email') as HTMLAnchorElement | null;

  if (backLink) {
    backLink.addEventListener('click', (e: MouseEvent) => {
      e.preventDefault();
      navigateTo('/login');
    });
  }

  /**
   * Проверяет наличие введенного адреса электронной почты и разблокирует/блокирует кнопку.
   */
  const checkForm = (): void => {
    if (submitBtn && emailInput) {
      submitBtn.disabled = !emailInput.value.trim();
    }
  };

  if (emailInput && recoveryState.email) {
    emailInput.value = recoveryState.email;
  }

  if (emailInput) {
    emailInput.addEventListener('input', checkForm);
  }
  checkForm();

  if (form) {
    form.addEventListener('submit', async (e: SubmitEvent) => {
      e.preventDefault();

      if (!emailInput || !submitBtn) return;

      const email = emailInput.value.trim();

      if (!email) {
        setInputError('email', 'Введите адрес электронной почты');
        return;
      } else if (!validateEmail(email)) {
        setInputError('email', 'Неверный формат email');
        return;
      }

      setGlobalError(null);

      try {
        submitBtn.disabled = true;
        await apiClient.post('/forgot-password', { email });
        recoveryState.email = email;
        stepCode(appDiv);
      } catch (err: unknown) {
        const error = err as ApiError;
        const errMsg = error.data?.message || error.data?.error;
        if (errMsg === 'user does not exists') {
          setGlobalError('Пользователь не найден');
        } else {
          setGlobalError(errMsg || 'Не удалось отправить код');
        }
      } finally {
        submitBtn.disabled = false;
      }
    });
  }
};

/**
 * Отрисовывает второй шаг восстановления пароля: ввод кода подтверждения.
 * 
 * @param {HTMLElement} appDiv - DOM-контейнер для рендеринга.
 */
const stepCode = (appDiv: HTMLElement): void => {
  appDiv.innerHTML = renderStepCode({ email: recoveryState.email });

  const form = document.getElementById('recovery-code-form') as HTMLFormElement | null;
  const codeInput = document.getElementById('code') as HTMLInputElement | null;
  const submitBtn = form?.querySelector<HTMLButtonElement>('button[type="submit"]');
  const resendLink = document.getElementById('resend-link') as HTMLElement | null;
  const timerSpan = document.getElementById('timer') as HTMLElement | null;

  /**
   * Проверяет заполненность поля кода и активирует/деактивирует кнопку подтверждения.
   */
  const checkForm = (): void => {
    if (submitBtn && codeInput) {
      submitBtn.disabled = !codeInput.value.trim();
    }
  };

  if (codeInput) {
    codeInput.addEventListener('input', checkForm);
  }
  checkForm();

  let timeLeft = 59;
  let timerInterval: ReturnType<typeof setInterval> | null = null;

  /**
   * Обновляет обратный отсчет таймера для повторной отправки кода.
   */
  const updateTimer = (): void => {
    if (timeLeft > 0) {
      timeLeft--;
      if (timerSpan) {
        timerSpan.textContent = `0:${timeLeft.toString().padStart(2, '0')}`;
      }
    } else {
      if (timerInterval) clearInterval(timerInterval);
      if (resendLink) {
        resendLink.innerHTML = '<a href="#" id="resend-action">Отправить повторно</a>';
        const action = document.getElementById('resend-action') as HTMLAnchorElement | null;
        if (action) {
          action.addEventListener('click', async (e: MouseEvent) => {
            e.preventDefault();
            try {
              await apiClient.post('/forgot-password', { email: recoveryState.email });
              stepCode(appDiv);
            } catch {
              setInputError('code', 'Не удалось отправить код повторно');
            }
          });
        }
      }
    }
  };

  timerInterval = setInterval(updateTimer, 1000);

  const backLink = document.getElementById('back-link') as HTMLAnchorElement | null;
  if (backLink) {
    backLink.addEventListener('click', (e: MouseEvent) => {
      e.preventDefault();
      if (timerInterval) {
        clearInterval(timerInterval);
      }
      stepEmail(appDiv);
    });
  }

  if (form) {
    form.addEventListener('submit', async (e: SubmitEvent) => {
      e.preventDefault();
      if (!codeInput || !submitBtn) return;

      const code = codeInput.value.trim();

      if (!code || code.length < 4) {
        setInputError('code', 'Введите код из письма');
        return;
      }

      try {
        submitBtn.disabled = true;
        await apiClient.post('/check-code', { code });
        if (timerInterval) clearInterval(timerInterval);
        recoveryState.code = code;
        stepNewPass(appDiv);
      } catch {
        setInputError('code', 'Неверный или недействительный код');
      } finally {
        submitBtn.disabled = false;
      }
    });
  }
};

/**
 * Отрисовывает третий шаг восстановления: ввод нового пароля.
 * 
 * @param {HTMLElement} appDiv - DOM-контейнер для рендеринга.
 */
const stepNewPass = (appDiv: HTMLElement): void => {
  appDiv.innerHTML = renderStepNewPass({});

  const form = document.getElementById('recovery-pass-form') as HTMLFormElement | null;
  const password = document.getElementById('password') as HTMLInputElement | null;
  const repeatPassword = document.getElementById('repeatPassword') as HTMLInputElement | null;
  const submitBtn = form?.querySelector<HTMLButtonElement>('button[type="submit"]');

  /**
   * Проверяет заполненность полей нового пароля и разблокирует кнопку отправки.
   */
  const checkForm = (): void => {
    if (submitBtn && password && repeatPassword) {
      submitBtn.disabled = !(password.value.trim() && repeatPassword.value.trim());
    }
  };

  if (form) {
    form.querySelectorAll<HTMLInputElement>('input').forEach(input => {
      input.addEventListener('input', checkForm);
    });
  }
  checkForm();

  if (form) {
    form.addEventListener('submit', async (e: SubmitEvent) => {
      e.preventDefault();
      if (!password || !repeatPassword || !submitBtn) return;

      let hasError = false;
      setInputError('password', null);
      setInputError('repeatPassword', null);
      setGlobalError(null);

      const passErrorMsg = validatePassword(password.value);
      if (passErrorMsg) {
        setInputError('password', passErrorMsg);
        hasError = true;
      }

      if (password.value !== repeatPassword.value) {
        setInputError('repeatPassword', 'Пароли не совпадают');
        hasError = true;
      }

      if (hasError) {
        return;
      }

      try {
        submitBtn.disabled = true;
        await apiClient.post('/reset-password', {
          token_id: recoveryState.code,
          password: password.value,
          repeated_password: repeatPassword.value
        });
        navigateTo('/login');
      } catch (err: unknown) {
        const error = err as ApiError;
        const errMsg = error.data?.message || error.data?.error;
        setGlobalError(errMsg || 'Не удалось сохранить новый пароль');
      } finally {
        submitBtn.disabled = false;
      }
    });
  }
};

/**
 * Отрисовывает страницу восстановления пароля с самого начала.
 * 
 * @param {HTMLElement} appDiv - DOM-контейнер, в который будет встроен HTML-код страницы.
 */
export const renderPasswordRecovery = (appDiv: HTMLElement): void => {
  recoveryState = { email: '', code: '' };
  stepEmail(appDiv);
};
```

src/pages/profile.ts:
```typescript
import Handlebars from 'handlebars';
import { profileApi } from '../api';
import { navigateTo } from '../router';
import profileTpl from '../templates/profile.hbs?raw';

const template = Handlebars.compile(profileTpl);

export const renderProfile = async (appDiv: HTMLElement): Promise<void> => {
  try {
    const res = await profileApi.getProfile() as any;
    const user = res.data;

    appDiv.innerHTML = template({ user });

    document.getElementById('nav-boards')?.addEventListener('click', () => navigateTo('/boards'));
    document.getElementById('logout-btn')?.addEventListener('click', () => {
      localStorage.removeItem('isAuth');
      navigateTo('/login');
    });

    const form = document.getElementById('profile-form');
    const btnSave = document.getElementById('btn-save-profile') as HTMLButtonElement;
    const nameInput = document.getElementById('profile-name') as HTMLInputElement;
    const descInput = document.getElementById('profile-desc') as HTMLTextAreaElement;

    const checkChanges = () => {
      if (nameInput.value !== user.display_name || descInput.value !== (user.description_user || '')) {
        btnSave.style.background = 'var(--primary)';
        btnSave.style.color = 'white';
        btnSave.style.cursor = 'pointer';
        btnSave.disabled = false;
      } else {
        btnSave.style.background = '#555';
        btnSave.style.color = '#999';
        btnSave.style.cursor = 'not-allowed';
        btnSave.disabled = true;
      }
    };
    nameInput.addEventListener('input', checkChanges);
    descInput.addEventListener('input', checkChanges);

    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        await profileApi.updateProfile({ display_name: nameInput.value, description_user: descInput.value });
        renderProfile(appDiv);
      } catch (e) {
        console.error('Save failed', e);
      }
    });

    const avatarUpload = document.getElementById('avatar-upload') as HTMLInputElement;
    avatarUpload?.addEventListener('change', async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const fd = new FormData();
        fd.append('avatar', file);
        await profileApi.updateAvatar(fd);
        renderProfile(appDiv);
      }
    });

    const modalOverlay = document.getElementById('modal-overlay')!;
    const modalDelete = document.getElementById('modal-delete-avatar')!;
    document.getElementById('btn-delete-avatar')?.addEventListener('click', () => {
      modalOverlay.classList.remove('hidden');
      modalDelete.classList.remove('hidden');
    });
    document.querySelectorAll('.close-modal-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        modalOverlay.classList.add('hidden');
        modalDelete.classList.add('hidden');
      });
    });
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) {
        modalOverlay.classList.add('hidden');
        modalDelete.classList.add('hidden');
      }
    });
    document.getElementById('confirm-delete-avatar')?.addEventListener('click', async () => {
      await profileApi.deleteAvatar();
      renderProfile(appDiv);
    });

  } catch (err) {
    navigateTo('/login');
  }
};
```

src/pages/register.ts:
```typescript
import Handlebars from 'handlebars';
import { apiClient } from '../api';
import { setInputError, setGlobalError, validateEmail, validatePassword } from '../utils';

import registerTpl from '../templates/register.hbs?raw';
import { navigateTo } from '../router';

const template = Handlebars.compile(registerTpl);

/**
 * Отрисовывает страницу регистрации и инициализирует все связанные с ней обработчики событий.
 * 
 * @param {HTMLElement} appDiv - DOM-контейнер, в который будет встроен HTML-код страницы.
 */
export const renderRegister = (appDiv: HTMLElement): void => {
  appDiv.innerHTML = template({});

  const form = document.getElementById('register-form') as HTMLFormElement | null;
  const submitBtn = document.getElementById('register-submit') as HTMLButtonElement | null;
  const linkLogin = document.getElementById('link-login') as HTMLAnchorElement | null;

  if (!form) return;

  /**
   * Проверяет заполненность обязательных полей (имя, email, пароли) 
   * и активирует или деактивирует кнопку регистрации.
   */
  const checkForm = (): void => {
    const name = (document.getElementById('name') as HTMLInputElement | null)?.value.trim() ?? '';
    const email = (document.getElementById('email') as HTMLInputElement | null)?.value.trim() ?? '';
    const password = (document.getElementById('password') as HTMLInputElement | null)?.value.trim() ?? '';
    const repeatPassword = (document.getElementById('repeatPassword') as HTMLInputElement | null)?.value.trim() ?? '';

    if (submitBtn) {
      submitBtn.disabled = !(name && email && password && repeatPassword);
    }
  };

  const inputs = form.querySelectorAll<HTMLInputElement>('input');
  inputs.forEach(input => {
    input.addEventListener('input', checkForm);
  });

  checkForm();

  if (linkLogin) {
    linkLogin.addEventListener('click', (e: MouseEvent) => {
      e.preventDefault();
      navigateTo('/login');
    });
  }

  form.addEventListener('submit', async (e: SubmitEvent) => {
    e.preventDefault();

    const name = (document.getElementById('name') as HTMLInputElement | null)?.value.trim() ?? '';
    const email = (document.getElementById('email') as HTMLInputElement | null)?.value.trim() ?? '';
    const password = (document.getElementById('password') as HTMLInputElement | null)?.value.trim() ?? '';
    const repeatPassword = (document.getElementById('repeatPassword') as HTMLInputElement | null)?.value.trim() ?? '';

    let hasError = false;
    setGlobalError(null);

    if (!name) {
      setInputError('name', 'Введите имя');
      hasError = true;
    } else {
      setInputError('name', null);
    }

    if (!email) {
      setInputError('email', 'Введите адрес электронной почты');
      hasError = true;
    } else if (!validateEmail(email)) {
      setInputError('email', 'Неверный формат email');
      hasError = true;
    } else {
      setInputError('email', null);
    }

    const passErrorMsg = validatePassword(password);
    if (passErrorMsg) {
      setInputError('password', passErrorMsg);
      hasError = true;
    } else {
      setInputError('password', null);
    }

    if (password !== repeatPassword) {
      setInputError('repeatPassword', 'Пароли не совпадают');
      hasError = true;
    } else {
      setInputError('repeatPassword', null);
    }

    if (hasError) {
      return;
    }

    try {
      await apiClient.post('/register', {
        display_name: name,
        email: email,
        password: password,
        repeated_password: repeatPassword
      });

      localStorage.setItem('isAuth', 'true');
      navigateTo('/boards');

    } catch (err: unknown) {
      type ApiError = { data?: { message?: string; error?: string } };
      const error = err as ApiError;
      const errMsg = error.data?.message || error.data?.error;

      if (errMsg) {
        if (errMsg.includes('exists')) {
          setInputError('email', 'Этот адрес уже зарегистрирован');
        } else {
          setGlobalError(errMsg);
        }
      } else {
        setGlobalError('Проверьте подключение и попробуйте снова');
      }
    }
  });
};
```

src/pages/task.ts:
```typescript
import Handlebars from 'handlebars';
import taskTpl from '../templates/task.hbs?raw';
import { navigateTo } from '../router';

const template = Handlebars.compile(taskTpl);

export const renderTask = (appDiv: HTMLElement): void => {
  const urlParams = new URLSearchParams(window.location.search);
  const title = urlParams.get('title') || 'ДЗ3 Макет';
  const boardId = urlParams.get('boardId') || '';

  appDiv.innerHTML = template({
    board_name: 'NeXuS (Trello)',
    task: {
      title: title,
      due_date: '17 марта, 2026',
      time: 'До 23:59'
    }
  });

  document.getElementById('nav-boards')?.addEventListener('click', () => navigateTo('/boards'));
  document.getElementById('nav-profile')?.addEventListener('click', () => navigateTo('/profile'));
  document.getElementById('logout-btn')?.addEventListener('click', () => {
    localStorage.removeItem('isAuth');
    navigateTo('/login');
  });

  document.getElementById('btn-back')?.addEventListener('click', () => {
    if (boardId) {
      navigateTo(`/board?id=${boardId}`);
    } else {
      navigateTo('/boards');
    }
  });
};
```

src/templates/profile.hbs:
```
<div class="boards-layout">
  {{> sidebar activeProfile=true}}

  <div class="main-content" style="max-width: 600px; padding: 2rem 4rem;">
    <h1 class="boards-title mb-1" style="font-size: 2rem; font-weight: bold; margin-bottom: 2rem;">Профиль</h1>

    <div class="profile-avatar-section" style="display: flex; gap: 1.5rem; align-items: center; margin-bottom: 2.5rem;">
      <div class="avatar-preview"
        style="width: 80px; height: 80px; background: #252527; border-radius: 12px; display: flex; align-items: center; justify-content: center; overflow: hidden;">
        {{#if user.avatar_url}}
        <img src="{{user.avatar_url}}" alt="Avatar" style="width: 100%; height: 100%; object-fit: cover;">
        {{else}}
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
        {{/if}}
      </div>
      <div class="avatar-actions" style="display: flex; flex-direction: column; gap: 0.6rem;">
        <label for="avatar-upload" class="action-link cursor-pointer"
          style="color: #8b5cf6; font-size: 0.9rem;">Изменить фото</label>
        <input type="file" id="avatar-upload" class="hidden" accept="image/*">
        <span id="btn-delete-avatar" class="action-text cursor-pointer" style="color: #ccc; font-size: 0.9rem;">Удалить
          фото</span>
      </div>
    </div>

    <form id="profile-form">
      <div class="input-group">
        <label class="input-label" style="color: #ccc; margin-bottom: 0.6rem; font-size: 0.85rem;">Имя</label>
        <input type="text" id="profile-name" class="input-field" value="{{user.display_name}}" maxlength="128"
          style="background: #252527; border-color: #333;">
      </div>
      <div class="input-group">
        <label class="input-label" style="color: #ccc; margin-bottom: 0.6rem; font-size: 0.85rem;">О себе</label>
        <textarea id="profile-desc" class="input-field"
          style="resize: vertical; min-height: 100px; background: #252527; border-color: #333;"
          placeholder="Расскажите о себе">{{user.description_user}}</textarea>
      </div>
      <div class="input-group">
        <div class="input-header" style="display: flex; justify-content: space-between; margin-bottom: 0.6rem;">
          <label class="input-label" style="color: #ccc; font-size: 0.85rem;">Email</label>
          <a href="#" class="forgot-link" style="color: #8b5cf6; font-size: 0.85rem;">Изменить пароль</a>
        </div>
        <div class="input-wrapper" style="position: relative;">
          <input type="text" class="input-field" value="{{user.email}}" readonly
            style="background: #252527; border-color: #333; padding-right: 2.5rem; color: #888;">
          <svg style="position: absolute; right: 1rem;" width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="#666" stroke-width="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
        </div>
      </div>
      <button type="submit" class="btn btn-primary" id="btn-save-profile"
        style="width: auto; padding: 0.8rem 2.5rem; background: #555; color: #999; cursor: not-allowed; border-radius: 8px;"
        disabled>Сохранить</button>
    </form>
  </div>
</div>

<div id="modal-overlay" class="modal-overlay hidden">
  <div id="modal-delete-avatar" class="modal hidden">
    <div class="modal-header" style="margin-bottom: 1.5rem;">
      <h2 class="modal-title" style="font-weight: bold; font-size: 1.6rem; color: white; margin: 0;">Удалить фото
        профиля?</h2>
      <button class="close-modal-btn">×</button>
    </div>
    <div class="modal-actions" style="justify-content: space-between; display: flex; gap: 1rem; margin-top: 2rem;">
      <button class="btn btn-danger" id="confirm-delete-avatar"
        style="flex: 1; padding: 0.8rem; border-radius: 8px;">Удалить</button>
      <button class="btn btn-cancel close-modal-btn"
        style="flex: 1; padding: 0.8rem; border-radius: 8px;">Отменить</button>
    </div>
  </div>
</div>
```

src/templates/password_recovery_code.hbs:
```
<div class="auth-page">
  <div class="auth-form-container">
    <div class="auth-form-wrapper">
      <h1 class="auth-title">Введите код<br>подтверждения</h1>
      <p class="auth-subtitle-left mb-1">Код отправлен на {{email}}</p>

      <form id="recovery-code-form" novalidate>
        {{> input id="code" label="Код из письма" type="text" placeholder="123456" maxlength="6" }}

        <div class="resend-container">
          <span id="resend-link" class="resend-text">
            Отправить повторно через <span id="timer">0:59</span>
          </span>
        </div>

        <button type="submit" class="btn btn-primary mt-1" disabled>Подтвердить</button>

        <p class="auth-footer-text mt-1">
          <a href="#" id="back-link">Вернуться назад</a>
        </p>
      </form>
    </div>
  </div>

  <div class="auth-logo-container">
    <div class="auth-logo-content">
      <img src="/logo.svg" alt="NeXus Logo" class="auth-logo" />
      <p class="auth-subtitle">Центр управления проектами</p>
    </div>
  </div>
</div>
```

src/templates/kanban.hbs:
```
<div class="boards-layout">
  {{> sidebar activeBoards=true}}

  <div class="main-content kanban-content">
    <div class="kanban-header">
      <div class="kanban-title-group">
        <div class="board-icon-monitor">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
            <line x1="8" y1="21" x2="16" y2="21"></line>
            <line x1="12" y1="17" x2="12" y2="21"></line>
          </svg>
        </div>
        <h1 class="boards-title">{{board_name}}</h1>
      </div>
      <div class="kanban-actions">
        <button class="btn btn-primary" id="btn-new-task">+ Новая задача</button>
        <button class="btn btn-secondary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="18" cy="5" r="3"></circle>
            <circle cx="6" cy="12" r="3"></circle>
            <circle cx="18" cy="19" r="3"></circle>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
          </svg> Поделиться
        </button>
      </div>
    </div>

    <div class="kanban-columns-container">
      {{#each sections}}
      <div class="kanban-column" data-id="{{id}}">
        <div class="column-header">
          <div class="column-title"><span class="col-dot" style="background: {{color}}"></span> {{section_name}}</div>
          <button class="icon-btn btn-col-options" data-id="{{id}}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="5" cy="12" r="2" />
              <circle cx="12" cy="12" r="2" />
              <circle cx="19" cy="12" r="2" />
            </svg>
          </button>
        </div>
        <div class="column-cards" data-section-id="{{id}}">
          {{#each tasks}}
          <div class="kanban-card" data-id="{{id}}" data-title="{{title}}">
            <div class="card-header" style="display: flex; justify-content: space-between; align-items: flex-start;">
              <div class="card-assignee">Исп.: Demo</div>
              <button class="icon-btn btn-card-options" data-id="{{id}}" data-title="{{title}}">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="5" cy="12" r="2" />
                  <circle cx="12" cy="12" r="2" />
                  <circle cx="19" cy="12" r="2" />
                </svg>
              </button>
            </div>
            <div class="card-title">{{title}}</div>
            {{#if due_date}}
            <div class="card-meta"
              style="display: flex; flex-direction: column; gap: 0.5rem; color: #888; font-size: 0.8rem;">
              <span class="meta-item" style="display: flex; align-items: center; gap: 0.4rem;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg> {{due_date}}
              </span>
              <span class="meta-item" style="display: flex; align-items: center; gap: 0.4rem;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg> {{time}}
              </span>
            </div>
            {{/if}}
          </div>
          {{/each}}
        </div>
        <div class="add-card-wrapper" data-section-id="{{id}}">
          <div class="add-card-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg> Добавить карточку
          </div>
        </div>
      </div>
      {{/each}}

      <div class="kanban-column-add">
        <div class="add-column-btn" id="btn-add-column">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg> Добавить колонку
        </div>
      </div>
    </div>
  </div>
</div>

<div id="modal-overlay" class="modal-overlay hidden">
  <div id="modal-delete-card" class="modal hidden">
    <div class="modal-header" style="margin-bottom: 1.5rem;">
      <h2 class="modal-title" style="font-weight: bold; font-size: 1.6rem; color: white; margin: 0;">Удалить карточку
      </h2>
      <button class="close-modal-btn">×</button>
    </div>
    <p class="modal-text" style="color: white; font-size: 0.95rem;">Вы уверены, что хотите удалить карточку<br>“<span
        id="delete-card-name" style="font-weight: bold;"></span>”?</p>
    <div class="modal-actions" style="justify-content: space-between; display: flex; gap: 1rem; margin-top: 2rem;">
      <button class="btn btn-danger" id="btn-confirm-delete-card"
        style="flex: 1; padding: 0.8rem; border-radius: 8px;">Удалить</button>
      <button class="btn btn-cancel close-modal-btn"
        style="flex: 1; padding: 0.8rem; border-radius: 8px;">Отменить</button>
    </div>
  </div>
</div>
```

src/templates/login.hbs:
```
<div class="auth-page">
  <div class="auth-form-container">
    <div class="auth-form-wrapper">
      <h1 class="auth-title">Войти</h1>

      <form id="login-form" novalidate>
        {{> input id="email" label="Email" type="email" placeholder="email@example.com" maxlength="128" }}
        {{> input id="password" label="Пароль" type="password" placeholder="Введите пароль" isPassword=true
        forgotPassword=true maxlength="128" }}

        <button type="submit" class="btn btn-primary mt-05" id="login-submit" disabled>Войти</button>

        <p class="auth-footer-text mt-1">
          Нет аккаунта? <a href="#" id="link-register">Зарегистрироваться</a>
        </p>

        <div class="divider">
          <div class="divider-line"></div>Или<div class="divider-line"></div>
        </div>
        <button type="button" class="btn btn-vk">
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
        </button>

        <div id="global-error" class="global-error-banner hidden mt-1">
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

  <div class="auth-logo-container">
    <div class="auth-logo-content">
      <img src="/logo.svg" alt="NeXus Logo" class="auth-logo" />
      <p class="auth-subtitle">Центр управления проектами</p>
    </div>
  </div>
</div>
```

src/templates/password_recovery_new_pass.hbs:
```
<div class="auth-page">
  <div class="auth-form-container">
    <div class="auth-form-wrapper">
      <h1 class="auth-title">Придумайте<br>новый пароль</h1>

      <form id="recovery-pass-form" novalidate>
        {{> input id="password" label="Новый пароль" type="password" placeholder="Минимум 8 символов" isPassword=true
        maxlength="128" }}
        {{> input id="repeatPassword" label="Подтвердите пароль" type="password" placeholder="Минимум 8 символов"
        isPassword=true maxlength="128" }}

        <button type="submit" class="btn btn-primary mt-1" disabled>Сохранить</button>
      </form>
    </div>
  </div>

  <div class="auth-logo-container">
    <div class="auth-logo-content">
      <img src="/logo.svg" alt="NeXus Logo" class="auth-logo" />
      <p class="auth-subtitle">Центр управления проектами</p>
    </div>
  </div>
</div>
```

src/templates/task.hbs:
```
<div class="boards-layout">
  {{> sidebar activeBoards=true}}

  <div class="main-content" style="padding: 2rem 4rem;">
    <div class="task-header-bar" style="display: flex; justify-content: space-between; margin-bottom: 3rem;">
      <button class="btn btn-secondary" id="btn-back"
        style="background: transparent; border: 1px solid #444; padding: 0.6rem 1.2rem; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 0.5rem; color: #ccc;">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg> Назад
      </button>
      <button class="btn btn-secondary" id="btn-share"
        style="background: #252527; border: 1px solid #333; padding: 0.6rem 1.2rem; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 0.5rem; color: #ccc;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="18" cy="5" r="3"></circle>
          <circle cx="6" cy="12" r="3"></circle>
          <circle cx="18" cy="19" r="3"></circle>
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
        </svg> Поделиться
      </button>
    </div>

    <div class="task-content">
      <div class="task-board-title" style="color: white; font-size: 1.1rem; font-weight: bold; margin-bottom: 0.5rem;">
        {{board_name}}</div>
      <h1 class="task-title" style="color: white; font-size: 2.8rem; font-weight: bold; margin-bottom: 3rem;">
        {{task.title}}</h1>

      <div class="task-meta-list" style="display: flex; flex-direction: column; gap: 1.2rem; color: #999;">
        <div class="task-meta-item" style="display: flex; align-items: center; gap: 0.8rem;">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
          <span style="font-size: 0.95rem;">Исп.: <strong
              style="color: white; font-weight: normal;">Demo</strong></span>
        </div>
        {{#if task.due_date}}
        <div class="task-meta-item" style="display: flex; align-items: center; gap: 0.8rem;">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
          <span style="font-size: 0.95rem;">{{task.due_date}}</span>
        </div>
        <div class="task-meta-item" style="display: flex; align-items: center; gap: 0.8rem;">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
          <span style="font-size: 0.95rem;">{{task.time}}</span>
        </div>
        {{/if}}
      </div>
    </div>
  </div>
</div>
```

src/templates/register.hbs:
```
<div class="auth-page">
  <div class="auth-form-container">
    <div class="auth-form-wrapper">
      <h1 class="auth-title">Регистрация</h1>

      <form id="register-form" novalidate>
        {{> input id="name" label="Имя" type="text" placeholder="Ваше имя" maxlength="128" }}
        {{> input id="email" label="Email" type="email" placeholder="email@example.com" maxlength="128" }}
        {{> input id="password" label="Пароль" type="password" placeholder="Минимум 8 символов" isPassword=true
        maxlength="128" }}
        {{> input id="repeatPassword" label="Повторите пароль" type="password" placeholder="Минимум 8 символов"
        isPassword=true maxlength="128" }}

        <button type="submit" class="btn btn-primary mt-1" id="register-submit" disabled>Зарегистрироваться</button>

        <p class="auth-footer-text mt-1">
          У вас уже есть аккаунт? <a href="#" id="link-login">Войти</a>
        </p>

        <div id="global-error" class="global-error-banner hidden mt-1">
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

  <div class="auth-logo-container">
    <div class="auth-logo-content">
      <img src="/logo.svg" alt="NeXus Logo" class="auth-logo" />
      <p class="auth-subtitle">Центр управления проектами</p>
    </div>
  </div>
</div>
```

src/templates/boards.hbs:
```
<div class="boards-layout">
  {{> sidebar activeBoards=true}}

  <div class="main-content">
    <div class="boards-header-container"
      style="display: flex; gap: 1.5rem; align-items: center; border-bottom: 1px solid #2a2a2c; padding-bottom: 1.5rem; margin-bottom: 2rem;">
      <h1 class="boards-title" style="font-size: 1.8rem; font-weight: bold; margin: 0; color: white;">
        {{#if (eq boards.length 0)}}Досок{{else}}Доски{{/if}}
        <span class="boards-count" style="color: #666;">{{boards.length}}</span>
      </h1>
      <button class="btn btn-primary btn-create" id="btn-create-board"
        style="padding: 0.6rem 1.2rem; border-radius: 999px;">+ Создать</button>
    </div>

    {{#if (eq boards.length 0)}}
    <div class="boards-grid">
      <div class="board-card-empty-large" id="btn-create-board-empty">
        <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="1">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
      </div>
    </div>
    {{else}}
    <div class="boards-grid">
      {{#each boards}}
      <div class="board-card" data-id="{{id}}">
        <div class="board-card-top">
          <div class="board-header"
            style="display: flex; justify-content: space-between; align-items: flex-start; width: 100%;">
            <div class="board-title-group" style="display: flex; gap: 1.2rem;">
              <div class="board-icon-monitor">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                  <line x1="8" y1="21" x2="16" y2="21"></line>
                  <line x1="12" y1="17" x2="12" y2="21"></line>
                </svg>
              </div>
              <div style="display: flex; flex-direction: column; gap: 0.3rem;">
                <h2 class="board-name" style="font-size: 1.2rem; font-weight: bold; margin: 0; color: white;">
                  {{board_name}}</h2>
                <p class="board-desc" style="color: #888; font-size: 0.9rem; margin: 0;">{{description}}</p>
              </div>
            </div>
            <button class="icon-btn board-options-btn" data-id="{{id}}" data-name="{{board_name}}"
              style="background: #2a2a2c; padding: 0.4rem; border-radius: 8px;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="5" cy="12" r="2" />
                <circle cx="12" cy="12" r="2" />
                <circle cx="19" cy="12" r="2" />
              </svg>
            </button>
          </div>
        </div>

        <div class="board-card-bottom">
          <div class="board-divider" style="height: 1px; background: #2a2a2c; margin: 1.5rem 0;"></div>
          <div class="board-stats" style="display: flex; justify-content: space-between; text-align: center;">
            <div class="stat-item">
              <span class="stat-value" style="font-size: 2.2rem; font-weight: bold; color: #444;">{{backlog}}</span>
              <span class="stat-label"
                style="font-size: 0.8rem; color: #888; margin-top: 0.5rem; line-height: 1.3;">Задачи<br>в бэклоге</span>
            </div>
            <div class="stat-item">
              <span class="stat-value" style="font-size: 2.2rem; font-weight: bold; color: #444;">{{hot}}</span>
              <span class="stat-label"
                style="font-size: 0.8rem; color: #888; margin-top: 0.5rem; line-height: 1.3;">Горящих<br>задач</span>
            </div>
            <div class="stat-item">
              <span class="stat-value" style="font-size: 2.2rem; font-weight: bold; color: #444;">{{members}}</span>
              <span class="stat-label"
                style="font-size: 0.8rem; color: #888; margin-top: 0.5rem; line-height: 1.3;">Человек состоит<br>в
                команде</span>
            </div>
          </div>
        </div>
      </div>
      {{/each}}
    </div>
    {{/if}}
  </div>
</div>

<div id="modal-overlay" class="modal-overlay hidden">
  <div id="modal-create-board" class="modal hidden">
    <div class="modal-header">
      <h2 class="modal-title" style="font-weight: bold; font-size: 1.6rem; color: white;">Создать доску</h2>
      <button class="close-modal-btn">×</button>
    </div>
    <div class="modal-body" style="margin-bottom: 1.5rem;">
      <div
        style="display: flex; align-items: center; gap: 0.6rem; color: white; margin-bottom: 1.5rem; font-size: 0.95rem;">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="17 8 12 3 7 8"></polyline>
          <line x1="12" y1="3" x2="12" y2="15"></line>
        </svg>
        Изображение доски
      </div>
      <div class="input-group" style="margin-bottom: 0;">
        <label class="input-label"
          style="margin-bottom: 0.6rem; display: block; font-size: 0.9rem; color: white;">Название доски</label>
        <input type="text" id="new-board-name" class="input-field" placeholder="Например, Запуск продукта"
          autocomplete="off" style="background: #252527; border-color: #ff5c5c;" />
        <span class="input-error-msg" id="new-board-name-error"
          style="color: #ff5c5c; font-size: 0.85rem; margin-top: 0.5rem;">Введите имя доски</span>
      </div>
    </div>
    <button class="btn btn-primary" id="btn-confirm-create" disabled
      style="width: 100%; padding: 0.8rem; border-radius: 8px;">Создать</button>
  </div>

  <div id="modal-edit-board" class="modal hidden">
    <div class="modal-header">
      <h2 class="modal-title" style="font-weight: bold; font-size: 1.6rem; color: white;">Изменить доску</h2>
      <button class="close-modal-btn">×</button>
    </div>
    <div class="modal-body" style="margin-bottom: 1.5rem;">
      <div
        style="display: flex; align-items: center; gap: 0.6rem; color: white; margin-bottom: 1.5rem; font-size: 0.95rem;">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="17 8 12 3 7 8"></polyline>
          <line x1="12" y1="3" x2="12" y2="15"></line>
        </svg>
        Изображение доски
      </div>
      <div class="input-group" style="margin-bottom: 0;">
        <label class="input-label"
          style="margin-bottom: 0.6rem; display: block; font-size: 0.9rem; color: white;">Другое название доски</label>
        <input type="text" id="edit-board-name" class="input-field" placeholder="Например, Запуск продукта"
          autocomplete="off" style="background: #252527; border-color: #333;" />
      </div>
    </div>
    <div style="display: flex; flex-direction: column; gap: 0.8rem;">
      <button class="btn btn-primary" id="btn-confirm-edit"
        style="width: 100%; padding: 0.8rem; border-radius: 8px;">Изменить</button>
      <button class="btn btn-danger" id="btn-open-delete"
        style="width: 100%; padding: 0.8rem; border-radius: 8px;">Удалить</button>
    </div>
  </div>

  <div id="modal-delete-board" class="modal hidden">
    <div class="modal-header" style="margin-bottom: 1.5rem;">
      <h2 class="modal-title" style="font-weight: bold; font-size: 1.6rem; color: white; margin: 0;">Удалить доску</h2>
      <button class="close-modal-btn">×</button>
    </div>
    <p class="modal-text" style="color: white; font-size: 0.95rem;">Вы уверены, что хотите удалить доску<br>“<span
        id="delete-board-name" style="font-weight: bold;"></span>”?</p>
    <div class="modal-actions" style="justify-content: space-between; display: flex; gap: 1rem; margin-top: 2rem;">
      <button class="btn btn-danger" id="btn-confirm-delete"
        style="flex: 1; padding: 0.8rem; border-radius: 8px;">Удалить</button>
      <button class="btn btn-cancel close-modal-btn"
        style="flex: 1; padding: 0.8rem; border-radius: 8px;">Отменить</button>
    </div>
  </div>
</div>
```

src/templates/password_recovery_email.hbs:
```
<div class="auth-page">
  <div class="auth-form-container">
    <div class="auth-form-wrapper">
      <h1 class="auth-title">Восстановление<br>пароля</h1>
      <p class="auth-subtitle-left mb-1">
        Укажите свой Email, на который мы отправим<br>письмо с ссылкой на смену пароля
      </p>

      <form id="recovery-email-form" novalidate>
        {{> input id="email" label="Email" type="email" placeholder="example@email.com" maxlength="128" }}

        <button type="submit" class="btn btn-primary mt-1" id="recovery-submit" disabled>Отправить</button>

        <p class="auth-footer-text mt-1">
          <a href="#" id="back-link-email">Вернуться назад</a>
        </p>

        <div id="global-error" class="global-error-banner hidden mt-1">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <span id="global-error-text">Такого Email нет</span>
        </div>
      </form>
    </div>
  </div>

  <div class="auth-logo-container">
    <div class="auth-logo-content">
      <img src="/logo.svg" alt="NeXus Logo" class="auth-logo" />
      <p class="auth-subtitle">Центр управления проектами</p>
    </div>
  </div>
</div>
```

src/templates/partials/sidebar.hbs:
```
<div class="sidebar">
  <div class="sidebar-top">
    <div class="sidebar-logo">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="2">
        <path d="M4 2v4l6 6-6 6v4h16v-4l-6-6 6-6V2H4z" />
      </svg>
    </div>
    <div class="sidebar-icon cursor-pointer {{#if activeBoards}}active{{/if}}" id="nav-boards" title="Доски">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="4" y="4" width="6" height="6" rx="1"></rect>
        <rect x="14" y="4" width="6" height="6" rx="1"></rect>
        <rect x="14" y="14" width="6" height="6" rx="1"></rect>
        <rect x="4" y="14" width="6" height="6" rx="1"></rect>
      </svg>
    </div>
  </div>
  <div class="sidebar-bottom">
    <div class="sidebar-icon cursor-pointer {{#if activeProfile}}active{{/if}}" id="nav-profile" title="Профиль">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
        <circle cx="12" cy="7" r="4"></circle>
      </svg>
    </div>
    <div class="sidebar-icon cursor-pointer" id="logout-btn" title="Выйти">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
        <polyline points="16 17 21 12 16 7"></polyline>
        <line x1="21" y1="12" x2="9" y2="12"></line>
      </svg>
    </div>
  </div>
</div>
```

src/templates/partials/input.hbs:
```
<div class="input-group">
  <div class="input-header">
    <label class="input-label" for="{{id}}">{{label}}</label>
    {{#if forgotPassword}}
    <a href="#" class="forgot-link">Забыли пароль?</a>
    {{/if}}
  </div>
  <div class="input-wrapper">
    <input type="{{type}}" id="{{id}}" class="input-field" placeholder="{{placeholder}}" {{#if disabled}}disabled{{/if}}
      {{#if maxlength}}maxlength="{{maxlength}}" {{/if}}>

    {{#if isPassword}}
    <button type="button" class="toggle-password-btn" data-target="{{id}}">
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
  <span id="{{id}}-error" class="input-error-msg"></span>
</div>
```

src/styles/boards.css:
```css
.boards-layout {
  display: flex;
  height: 100vh;
  background-color: #1a1a1c;
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
}

.sidebar-logo {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 1.5rem;
}

.sidebar-icon {
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
}

.sidebar-icon:hover {
  background-color: #2a2a2c;
  color: white;
}

.sidebar-icon.active {
  color: var(--primary);
}

.sidebar-icon-logout:hover {
  background-color: #3b1f1f;
  color: var(--text-error);
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

.boards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 1.5rem;
}

.board-card-empty-large {
  background-color: #252527;
  border: 2px dashed #444;
  border-radius: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 280px;
  cursor: pointer;
  transition: all 0.2s;
  width: 100%;
}

.board-card-empty-large:hover {
  border-color: #8b5cf6;
}

.board-card {
  background-color: #252527;
  border-radius: 32px;
  padding: 1.8rem 2rem;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  border: 1px solid transparent;
  transition: transform 0.2s, border-color 0.2s;
  cursor: pointer;
  min-height: 280px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.board-card:hover {
  border-color: #444;
}

.board-icon-monitor {
  width: 48px;
  height: 48px;
  background: #252527;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ccc;
  flex-shrink: 0;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s ease;
}

.modal-overlay:not(.hidden) {
  opacity: 1;
  pointer-events: auto;
}

.modal {
  background: #1e1e20;
  border-radius: 20px;
  padding: 2rem;
  width: 440px;
  max-width: 90%;
  border: 1px solid #333;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
  display: none;
  transform: translateY(20px);
  transition: transform 0.2s ease;
}

.modal-overlay:not(.hidden) .modal:not(.hidden) {
  display: block;
  transform: translateY(0);
}

.close-modal-btn {
  background: transparent;
  border: none;
  color: #888;
  font-size: 1.5rem;
  cursor: pointer;
}

.close-modal-btn:hover {
  color: white;
}

.btn-cancel {
  background: transparent;
  color: #ccc;
  border: 1px solid #444;
}

.btn-cancel:hover {
  background: #333;
  color: white;
}

.btn-danger {
  background: #ff5c5c;
  color: white;
}

.btn-danger:hover {
  background: #e53e3e;
}

.kanban-content {
  display: flex;
  flex-direction: column;
  padding: 0;
  height: 100vh;
  overflow: hidden;
}

.kanban-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 2rem;
  border-bottom: 1px solid #2a2a2c;
  background: var(--bg-main);
  flex-shrink: 0;
}

.kanban-title-group {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.kanban-title-group h1 {
  font-size: 1.25rem;
  font-weight: bold;
}

.kanban-actions {
  display: flex;
  gap: 1rem;
}

.btn-secondary {
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
}

.btn-secondary:hover {
  background: #3b3b3d;
}

.kanban-columns-container {
  display: flex;
  gap: 1.5rem;
  padding: 1.5rem 2rem;
  overflow-x: auto;
  overflow-y: hidden;
  flex: 1;
  align-items: flex-start;
}

.kanban-columns-container::-webkit-scrollbar {
  height: 12px;
}
.kanban-columns-container::-webkit-scrollbar-track {
  background: #1a1a1c;
  border-radius: 8px;
}
.kanban-columns-container::-webkit-scrollbar-thumb {
  background: #333;
  border-radius: 8px;
}

.kanban-column {
  background: #1e1e20;
  border-radius: 12px;
  min-width: 320px;
  max-width: 320px;
  display: flex;
  flex-direction: column;
  max-height: 100%;
  border: 1px solid #2a2a2c;
}

.column-header {
  padding: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 500;
  font-size: 0.95rem;
}

.column-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.col-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}

.icon-btn {
  background: transparent;
  border: none;
  color: #666;
  cursor: pointer;
  font-size: 1.2rem;
  line-height: 1;
  padding: 0 0.5rem;
}

.icon-btn:hover {
  color: white;
}

.column-cards {
  padding: 0 1rem 1rem 1rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.column-cards::-webkit-scrollbar {
  width: 6px;
}
.column-cards::-webkit-scrollbar-thumb {
  background: #333;
  border-radius: 4px;
}

.kanban-card {
  background: #252527;
  border: 1px solid #333;
  border-radius: 8px;
  padding: 1rem;
  cursor: pointer;
  transition: border-color 0.2s;
  position: relative;
}

.kanban-card:hover {
  border-color: #555;
}

.btn-card-options {
  opacity: 0;
  position: absolute;
  top: 8px;
  right: 8px;
  background: transparent;
  color: #888;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.kanban-card:hover .btn-card-options {
  opacity: 1;
}

.btn-card-options:hover {
  background: #3b3b3d;
  color: white;
}

.card-assignee {
  font-size: 0.75rem;
  color: #888;
  margin-bottom: 0.8rem;
}

.card-title {
  font-size: 0.95rem;
  color: white;
  line-height: 1.4;
  margin-bottom: 1rem;
}

.add-card-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #ccc;
  padding: 0.8rem;
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.2s;
  font-size: 0.9rem;
}

.add-card-btn:hover {
  background: #2a2a2c;
  color: white;
}

.kanban-column-add {
  min-width: 320px;
}

.add-column-btn {
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
}

.add-column-btn:hover {
  border-color: #888;
  color: white;
}

.context-menu {
  position: absolute;
  background: #252527;
  border: 1px solid #3b3b3d;
  border-radius: 8px;
  padding: 0.5rem 0;
  min-width: 200px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.5);
  z-index: 1000;
}

.context-menu-item {
  padding: 0.6rem 1rem;
  font-size: 0.9rem;
  color: #ccc;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
}

.context-menu-item:hover {
  background: #363638;
  color: white;
}

.context-menu-item.text-danger:hover {
  background: #4a2525;
  color: var(--text-error);
}

.add-card-form {
  background: #1e1e20;
  border: 1px solid #3b3b3d;
  border-radius: 8px;
  padding: 0.8rem;
  margin-bottom: 0.5rem;
}

.add-card-input {
  width: 100%;
  background: transparent;
  border: none;
  color: white;
  font-size: 0.95rem;
  resize: none;
  outline: none;
  min-height: 40px;
}

.add-card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 0.5rem;
  color: #666;
  font-size: 0.8rem;
}

.add-card-icons {
  display: flex;
  gap: 0.5rem;
}

.add-column-form {
  background: #1e1e20;
  border: 1px dashed #444;
  border-radius: 12px;
  min-width: 320px;
  height: 60px;
  display: flex;
  align-items: center;
  padding: 0 1rem;
}

.add-column-input {
  background: transparent;
  border: none;
  color: white;
  font-size: 0.95rem;
  outline: none;
  width: 100%;
}
```

src/styles/auth.css:
```css
.auth-page {
  display: flex;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  background-color: var(--bg-main);
  background-image: url('/background.png');
  background-size: cover;
  background-position: center;
}

.auth-form-container {
  width: 50%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 0;
  z-index: 10;
}

.auth-form-wrapper {
  width: 100%;
  max-width: 420px;
  margin: 0 auto;
}

.auth-title {
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 2rem;
  text-align: left;
}

.auth-subtitle-left {
  color: var(--text-muted);
  font-size: 0.9rem;
  line-height: 1.5;
  text-align: left;
}

.auth-logo-container {
  width: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: transparent;
}

.auth-logo-content {
  text-align: center;
}

.auth-logo {
  width: 250px;
  margin-bottom: 0.5rem;
}

.auth-subtitle {
  color: var(--text-muted);
  text-align: center;
  font-size: 0.95rem;
}

.auth-footer-text {
  text-align: center;
  font-size: 0.875rem;
  color: var(--text-main);
}

.auth-footer-text a {
  color: var(--primary);
}

.global-error-banner {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-error);
  font-size: 0.9rem;
  font-weight: 500;
  justify-content: center;
}

.divider {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin: 1.5rem 0;
  color: #6b7280;
  font-size: 0.875rem;
}

.divider-line {
  flex: 1;
  height: 1px;
  background-color: #2a2a2c;
}

.resend-container {
  text-align: right;
  margin-bottom: 1rem;
}

.resend-text {
  font-size: 0.875rem;
  color: var(--primary);
}
```

