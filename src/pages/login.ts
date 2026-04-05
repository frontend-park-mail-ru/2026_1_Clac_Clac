import Handlebars from 'handlebars';
import { apiClient } from '../api';
import { setGlobalError, validateEmail } from '../utils';
import { FormValidator, ValidationSchema } from '../utils/Validator';
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

  const btnVk = document.querySelector('.btn-vk');
  if (btnVk) {
    btnVk.addEventListener('click', () => {
      window.location.href = config.vkAuthUrl;
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