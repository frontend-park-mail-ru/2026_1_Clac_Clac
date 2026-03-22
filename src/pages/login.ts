import Handlebars from 'handlebars';
import { apiClient } from '../api';
import { setInputError, setGlobalError, validateEmail } from '../utils';
import { navigateTo } from '../main';
import config from '../config';

import loginTpl from '../templates/login.hbs?raw';

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
      navigateTo('register');
    });
  }

  const forgotLink = document.querySelector('.forgot-link');
  if (forgotLink) {
    forgotLink.addEventListener('click', (e: Event) => {
      e.preventDefault();
      navigateTo('forgot-password');
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
      navigateTo('boards');

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
