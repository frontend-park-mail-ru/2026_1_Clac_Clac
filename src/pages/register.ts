import Handlebars from 'handlebars';
import { api } from '../api';
import { setInputError } from '../utils';
import registerTpl from '../templates/register.hbs?raw';
import '../styles/auth.css';

const template = Handlebars.compile(registerTpl);

export function renderRegister(appDiv: HTMLElement) {
  appDiv.innerHTML = template({});
  const form = document.getElementById('register-form') as HTMLFormElement;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = (document.getElementById('name') as HTMLInputElement).value;
    const email = (document.getElementById('email') as HTMLInputElement).value;
    const password = (document.getElementById('password') as HTMLInputElement).value;
    const repeatPassword = (document.getElementById('repeatPassword') as HTMLInputElement).value;
    const terms = (document.getElementById('terms') as HTMLInputElement).checked;

    let hasError = false;

    if (!name) { setInputError('name', 'Введите имя'); hasError = true; } 
    else if (name.length < 3) { setInputError('name', 'Имя должно содержать минимум 3 символа'); hasError = true; } 
    else if (!/^[a-zA-Zа-яА-Я0-9]+$/.test(name)) { setInputError('name', 'Имя должно содержать только буквы и цифры'); hasError = true; }
    else { setInputError('name', null); }

    if (!email) { setInputError('email', 'Введите адрес электронной почты'); hasError = true; } 
    else if (!email.includes('@')) { setInputError('email', 'Введите корректный email'); hasError = true; } 
    else { setInputError('email', null); }

    if (!password) { setInputError('password', 'Введите пароль'); hasError = true; } 
    else if (password.length < 8) { setInputError('password', 'Пароль должен содержать минимум 8 символов'); hasError = true; } 
    else { setInputError('password', null); }

    if (password !== repeatPassword) { setInputError('repeatPassword', 'Пароли не совпадают'); hasError = true; } 
    else { setInputError('repeatPassword', null); }

    if (!terms) {
      alert("Необходимо согласиться с условиями использования и политикой конфиденциальности.");
      hasError = true;
    }

    if (hasError) return;

    try {
      await api.post('/register', { name, email, password });
      window.location.hash = '#/';
    } catch (err: any) {
      setInputError('email', 'Этот адрес уже зарегистрирован');
    }
  });
}
