import Handlebars from 'handlebars';
import { apiClient } from '../api.js';
import { setInputError, setGlobalError, validateEmail, validatePassword } from '../utils.js';
import { navigateTo } from '../main.js';

const response = await fetch('/src/templates/register.hbs');
const registerTpl = await response.text();
const template = Handlebars.compile(registerTpl);

export const renderRegister = (appDiv) => {
  appDiv.innerHTML = template({});

  const form = document.getElementById('register-form');
  const submitBtn = document.getElementById('register-submit');
  const linkLogin = document.getElementById('link-login');

  const checkForm = () => {
    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();
    const repeatPassword = document.getElementById('repeatPassword').value.trim();

    if (submitBtn) {
      submitBtn.disabled = !(name && email && password && repeatPassword);
    }
  };

  const inputs = form.querySelectorAll('input');
  inputs.forEach(input => {
    input.addEventListener('input', checkForm);
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

    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();
    const repeatPassword = document.getElementById('repeatPassword').value.trim();

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

    } catch (err) {
      const errMsg = err.data?.message || err.data?.error;
      
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
