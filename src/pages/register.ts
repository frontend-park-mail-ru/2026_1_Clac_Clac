import Handlebars from 'handlebars';
import { apiClient } from '../api';
import { setInputError, setGlobalError, validateEmail, validatePassword } from '../utils';
import { navigateTo } from '../main';

import registerTpl from '../templates/register.hbs?raw';

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
      navigateTo('login');
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
      navigateTo('boards');

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
