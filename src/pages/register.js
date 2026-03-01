import Handlebars from 'handlebars';
import { apiClient } from '../api.js';
import { setInputError } from '../utils.js';
import { registerTpl } from '../templates/register.js';
import { navigateTo } from '../main.js';

const template = Handlebars.compile(registerTpl);

export const renderRegister = (appDiv) => {
  appDiv.innerHTML = template({});
  
  const form = document.getElementById('register-form');
  const linkLogin = document.getElementById('link-login');
  
  if (linkLogin) {
    linkLogin.addEventListener('click', (e) => {
      e.preventDefault();
      navigateTo('login');
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const repeatPassword = document.getElementById('repeatPassword').value;
    const terms = document.getElementById('terms').checked;

    let hasError = false;

    if (!name) {
      setInputError('name', 'Введите имя');
      hasError = true;
    } else if (name.length < 3) {
      setInputError('name', 'Имя должно содержать минимум 3 символа');
      hasError = true;
    } else if (!/^[a-zA-Zа-яА-Я0-9]+$/.test(name)) {
      setInputError('name', 'Имя должно содержать только буквы и цифры');
      hasError = true;
    } else {
      setInputError('name', null);
    }

    if (!email) {
      setInputError('email', 'Введите адрес электронной почты');
      hasError = true;
    } else if (!email.includes('@')) {
      setInputError('email', 'Введите корректный email');
      hasError = true;
    } else {
      setInputError('email', null);
    }

    if (!password) {
      setInputError('password', 'Введите пароль');
      hasError = true;
    } else if (password.length < 8) {
      setInputError('password', 'Пароль должен содержать минимум 8 символов');
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
    
    if (!terms) {
      const termsError = document.getElementById('terms-error');
      if (termsError) {
        termsError.textContent = 'Необходимо согласиться с условиями использования.';
        termsError.classList.add('visible');
      }
      hasError = true;
    } else {
      const termsError = document.getElementById('terms-error');
      if (termsError) {
        termsError.classList.remove('visible');
      }
    }

    if (hasError) {
      return;
    }

    try {
      await apiClient.post('/register', { name, email, password });
      navigateTo('boards');
    } catch (err) {
      setInputError('email', 'Этот адрес уже зарегистрирован');
    }
  });
};
