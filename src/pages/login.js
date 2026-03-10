import Handlebars from 'handlebars';
import { apiClient } from '../api.js';
import { setInputError, setGlobalError, validateEmail } from '../utils.js';
import { navigateTo } from '../main.js';
import config from '../config.js';

const res = await fetch('/src/templates/login.hbs');
const loginTpl = await res.text();
const template = Handlebars.compile(loginTpl);

export const renderLogin = (appDiv) => {
  appDiv.innerHTML = template({});

  const vkError = localStorage.getItem('vkError');
  if (vkError) {
    let errorMsg = 'Ошибка авторизации через VK';
    if (vkError === 'vk_oauth_error') {
      errorMsg = 'Ошибка авторизации через VK';
    } else if (vkError === 'no_valid_email') {
      errorMsg = 'К вашему VK не привязан Email';
    } else if (vkError === 'cannot_request_data') {
      errorMsg = 'Не удалось получить данные из VK';
    } else if (vkError === 'something_went_wrong') {
      errorMsg = 'Что-то пошло не так. Попробуйте снова';
    } else {
      errorMsg = `Ошибка авторизации: ${vkError}`;
    }
    
    setGlobalError(errorMsg);
    localStorage.removeItem('vkError');
  }

  const form = document.getElementById('login-form');
  const submitBtn = document.getElementById('login-submit');

  const checkForm = () => {
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();

    if (submitBtn) {
      submitBtn.disabled = !(email && password);
    }
  };

  const inputs = form.querySelectorAll('input');
  inputs.forEach(input => {
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
    linkRegister.addEventListener('click', (e) => {
      e.preventDefault();
      navigateTo('register');
    });
  }

  const forgotLink = document.querySelector('.forgot-link');
  if (forgotLink) {
    forgotLink.addEventListener('click', (e) => {
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

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();

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
      submitBtn.disabled = true;
      await apiClient.post('/login', { email, password });

      localStorage.setItem('isAuth', 'true');
      navigateTo('boards');

    } catch (err) {
      const errMsg = err.data?.message || err.data?.error;

      if (err.status === 401 || (errMsg && (errMsg.includes('wrong') || errMsg.includes('exist') || errMsg.includes('invalid')))) {
        setGlobalError('Неверный email или пароль');
        document.getElementById('email').classList.add('error');
        document.getElementById('password').classList.add('error');
      } else if (errMsg) {
        setGlobalError(errMsg);
      } else {
        setGlobalError('Проверьте подключение и попробуйте снова');
      }
    } finally {
      submitBtn.disabled = false;
    }
  });
};
