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
  
  const linkRegister = document.getElementById('link-register');
  if (linkRegister) {
    linkRegister.addEventListener('click', (e) => {
      e.preventDefault();
      navigateTo('register');
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    let hasError = false;
    globalError.classList.add('hidden');

    if (!email) {
      setInputError('email', 'Введите адрес электронной почты');
      hasError = true;
    } else if (!email.includes('@')) {
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
      await apiClient.post('/login', { email, password });
      navigateTo('boards');
    } catch (err) {
      globalError.classList.remove('hidden');
      setInputError('email', 'Пользователь с таким email не найден');
    }
  });
};
