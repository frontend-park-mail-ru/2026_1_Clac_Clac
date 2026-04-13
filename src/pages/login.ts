import Handlebars from 'handlebars';
import { apiClient } from '../api';
import { setGlobalError, validateEmail } from '../utils';
import { FormValidator, ValidationSchema } from '../utils/validator';
import config from '../config';

import loginTpl from '../templates/login.hbs?raw';
import { navigateTo } from '../router';

import { Toast } from '../utils/toast';

const template = Handlebars.compile(loginTpl);

interface ApiError {
  status?: number;
  data?: {
    message?: string;
    error?: string;
  };
}

export const renderLogin = (appDiv: HTMLElement): void => {
  appDiv.innerHTML = template({
    vkAuthUrl: config.vkAuthUrl
  });

  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get("code");
  const message = urlParams.get("message");

  if (code === "502" && message?.includes("oauth_no_email")) {

    Toast.error("Для входа через VK необходимо привязать Email к вашему аккаунту.");

    window.history.replaceState({}, document.title, window.location.pathname);
  }

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

  const loginSchema: ValidationSchema = {
    email: [
      { required: true, message: 'Введите адрес электронной почты' },
      {
        customValidator: (value: string) => validateEmail(value) ? null : 'Неверный формат email',
        message: 'Неверный формат email'
      }
    ],
    password: [
      { required: true, message: 'Введите пароль' }
    ]
  };

  const validator = new FormValidator(loginSchema, (isValid) => {
    if (submitBtn) {
      submitBtn.disabled = !isValid;
    }
  });

  validator.attachLiveValidation();

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

  form?.addEventListener('submit', async (e: SubmitEvent) => {
    e.preventDefault();

    if (!validator.validate()) {
      return;
    }

    const email = emailInput?.value.trim() || '';
    const password = passwordInput?.value.trim() || '';

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
        emailInput?.classList.add('input-group__field--error');
        passwordInput?.classList.add('input-group__field--error');
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
