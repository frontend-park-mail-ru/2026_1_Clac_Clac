import Handlebars from 'handlebars';
import { apiClient } from '../api.js';
import { setInputError } from '../utils.js';
import { navigateTo } from '../main.js';

const response = await fetch('/src/templates/login.hbs');
const loginTpl = await response.text();
const template = Handlebars.compile(loginTpl);

export const renderLogin = (appDiv) => {
  appDiv.innerHTML = template({});

  const form = document.getElementById('login-form');
  const globalError = document.getElementById('global-error');
  const globalErrorText = document.getElementById('global-error-text');
  const submitBtn = document.getElementById('login-submit');

  const checkForm = () => {
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();
    if (submitBtn) {
      submitBtn.disabled = !(email && password);
    }
  };

  const inputs = form.querySelectorAll('input');
  inputs.forEach(input => input.addEventListener('input', checkForm));
  checkForm();

  const linkRegister = document.getElementById('link-register');
  if (linkRegister) {
    linkRegister.addEventListener('click', (e) => {
      e.preventDefault();
      navigateTo('register');
    });
  };

  const forgotLink = document.querySelector('.forgot-link');
  if (forgotLink) {
    forgotLink.addEventListener('click', (e) => {
      e.preventDefault();
      navigateTo('forgot-password');
    });
  };

  const btnVk = document.querySelector('.btn-vk');
  if (btnVk) {
    btnVk.addEventListener('click', () => {
      if (globalErrorText) globalErrorText.textContent = 'Вход через VK ID недоступен';
      if (globalError) globalError.classList.remove('hidden');
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    let hasError = false;
    if (globalError) globalError.classList.add('hidden');

    if (!email) {
      setInputError('email', 'Введите адрес электронной почты');
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
      await apiClient.post('/login', { email, password });

      localStorage.setItem('isAuth', 'true');
      navigateTo('boards');

    } catch (err) {
      if (globalError) globalError.classList.remove('hidden');
      if (err.status === 401 || (err.data && err.data.error && err.data.error.includes('not exist'))) {
        if (globalErrorText) globalErrorText.textContent = 'Неверный email или пароль';
        setInputError('email', 'Неверный email или пароль');
        setInputError('password', 'Неверный email или пароль');
      } else if (err.data && err.data.error) {
        if (globalErrorText) globalErrorText.textContent = err.data.error;
      } else {
        if (globalErrorText) globalErrorText.textContent = 'Проверьте подключение и попробуйте снова';
      }
    }
  });
};
