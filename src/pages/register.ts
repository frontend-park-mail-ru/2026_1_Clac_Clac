import Handlebars from 'handlebars';
import { apiClient } from '../api';
import { setInputError, setGlobalError, validateEmail, validatePassword } from '../utils';
import { FormValidator, ValidationSchema } from '../utils/validator';

import registerTpl from '../templates/register.hbs?raw';
import { navigateTo } from '../router';

type LocalApiError = {
  data: {
    message: string;
    error: string
  }
};

const template = Handlebars.compile(registerTpl);

export const renderRegister = (appDiv: HTMLElement): void => {
  appDiv.innerHTML = template({});

  const form = document.getElementById('register-form') as HTMLFormElement | null;
  const submitBtn = document.getElementById('register-submit') as HTMLButtonElement | null;
  const linkLogin = document.getElementById('link-login') as HTMLAnchorElement | null;

  if (!form) return;

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

  const validator = new FormValidator(registerSchema, (isValid) => {
    if (submitBtn) {
      submitBtn.disabled = !isValid;
    }
  });

  validator.attachLiveValidation();

  if (linkLogin) {
    linkLogin.addEventListener('click', (e: MouseEvent) => {
      e.preventDefault();
      navigateTo('/login');
    });
  }

  form.addEventListener('submit', async (e: SubmitEvent) => {
    e.preventDefault();

    if (!validator.validate()) {
      return;
    }

    const name = (document.getElementById('name') as HTMLInputElement | null)?.value.trim() ?? '';
    const email = (document.getElementById('email') as HTMLInputElement | null)?.value.trim() ?? '';
    const password = (document.getElementById('password') as HTMLInputElement | null)?.value.trim() ?? '';

    try {
      await apiClient.post('/register', {
        display_name: name,
        email: email,
        password: password,
        repeated_password: password
      });

      localStorage.setItem('isAuth', 'true');
      navigateTo('/boards');

    } catch (err: unknown) {
      const error = err as LocalApiError;
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
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
      }
    }
  });
};