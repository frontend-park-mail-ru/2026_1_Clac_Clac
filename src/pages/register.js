import Handlebars from 'handlebars';
import { apiClient } from '../api.js';
import { setInputError } from '../utils.js';
import { navigateTo } from '../main.js';

const response = await fetch('/src/templates/register.hbs');
const registerTpl = await response.text();
const template = Handlebars.compile(registerTpl);

export const renderRegister = (appDiv) => {
  appDiv.innerHTML = template({});

  const form = document.getElementById('register-form');
  const submitBtn = document.getElementById('register-submit');
  const linkLogin = document.getElementById('link-login');
  const globalError = document.getElementById('global-error');
  const globalErrorText = document.getElementById('global-error-text');

  const checkForm = () => {
    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();
    const repeatPassword = document.getElementById('repeatPassword').value.trim();
    const terms = document.getElementById('terms').checked;

    if (submitBtn) {
      submitBtn.disabled = !(name && email && password && repeatPassword && terms);
    }
  };

  const inputs = form.querySelectorAll('input');
  inputs.forEach(input => {
    input.addEventListener('input', checkForm);
    if (input.type === 'checkbox') input.addEventListener('change', checkForm);
  });
  checkForm();

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
    const repeatPassword = document.getElementById('repeatPassword').value.trim();
    const terms = document.getElementById('terms').checked;

    let hasError = false;
    if (globalError) globalError.classList.add('hidden');

    if (!name) {
      setInputError('name', 'Введите имя');
      hasError = true;
    } else {
      setInputError('name', null);
    }

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
    } else if (password.length < 6) {
      setInputError('password', 'Пароль должен содержать минимум 6 символов');
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
      await apiClient.post('/register', {
        display_name: name,
        email: email,
        password: password,
        repeated_password: repeatPassword
      });

      localStorage.setItem('isAuth', 'true');
      navigateTo('boards');

    } catch (err) {
      if (globalError) globalError.classList.remove('hidden');
      if (err.data && err.data.error) {
        if (err.data.error.includes('exists')) {
          setInputError('email', 'Этот адрес уже зарегистрирован');
          if (globalError) globalError.classList.add('hidden');
        } else {
          if (globalErrorText) globalErrorText.textContent = err.data.error;
        }
      } else {
        if (globalErrorText) globalErrorText.textContent = 'Проверьте подключение и попробуйте снова';
      }
    }
  });
};
