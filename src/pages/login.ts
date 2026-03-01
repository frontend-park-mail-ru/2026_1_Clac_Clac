import Handlebars from 'handlebars';
import { api } from '../api';
import { setInputError } from '../utils';
import loginTpl from '../templates/login.hbs?raw';
import '../styles/auth.css';

const template = Handlebars.compile(loginTpl);

export function renderLogin(appDiv: HTMLElement) {
  appDiv.innerHTML = template({});
  const form = document.getElementById('login-form') as HTMLFormElement;
  const globalError = document.getElementById('global-error')!;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = (document.getElementById('email') as HTMLInputElement).value;
    const password = (document.getElementById('password') as HTMLInputElement).value;

    let hasError = false;
    globalError.classList.add('hidden');

    if (!email) { setInputError('email', 'Введите адрес электронной почты'); hasError = true; }
    else if (!email.includes('@')) { setInputError('email', 'Неверный формат email'); hasError = true; }
    else { setInputError('email', null); }

    if (!password) { setInputError('password', 'Введите пароль'); hasError = true; }
    else { setInputError('password', null); }

    if (hasError) return;

    try {
      await api.post('/login', { email, password });
      window.location.hash = '#/';
    } catch (err: any) {
      globalError.classList.remove('hidden'); 
      setInputError('email', 'Пользователь с таким email не найден');
    }
  });
}
