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
 * Инициализирует глобальные слушатели событий.
 */
export const initGlobalListeners = (): void => {
  document.body.addEventListener('click', (e: MouseEvent) => {
    const target = e.target as HTMLElement;

    const supportBtn = target.closest('#nav-support');
    if (supportBtn) {
      supportApi.getTickets().then((res: any) => {
        const data = res.data || res;
        const role = data.role;
        if (role === 'admin' || role === 'support') {
          navigateTo('/support-admin');
        } else {
          SupportIframeManager.toggle();
        }
      }).catch(() => {
        SupportIframeManager.toggle();
      });
      return;
    }

    const btn = target.closest('.input-group__toggle-btn');
    if (!btn) {
      return;
    }

    const inputId = btn.getAttribute('data-target');
    if (!inputId) {
      return;
    }

    const input = document.getElementById(inputId) as HTMLInputElement | null;

    if (!input) {
      return;
    }

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
