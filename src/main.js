import Handlebars from 'handlebars';
import { initGlobalListeners } from './utils.js';
import { renderLogin } from './pages/login.js';
import { renderRegister } from './pages/register.js';
import { renderBoards } from './pages/boards.js';
import { renderPasswordRecovery } from './pages/passwordRecovery.js';

const partialRes = await fetch('/src/templates/partials/input.hbs');
const inputPartial = await partialRes.text();
Handlebars.registerPartial('input', inputPartial);

initGlobalListeners();

const appDiv = document.getElementById('app');

export const navigateTo = (page) => {
  if (page === 'login') {
    renderLogin(appDiv);
  } else if (page === 'register') {
    renderRegister(appDiv);
  } else if (page === 'forgot-password') {
    renderPasswordRecovery(appDiv);
  } else {
    renderBoards(appDiv);
  }
};

const urlParams = new URLSearchParams(window.location.search);
const vkCode = urlParams.get('code');
const vkMessage = urlParams.get('message');

if (vkCode) {
  if (vkCode === '200') {
    localStorage.setItem('isAuth', 'true');
  } else {
    localStorage.setItem('vkError', vkMessage || 'Ошибка авторизации');
  }
  window.history.replaceState({}, '', '/');
}

if (window.location.pathname === '/home') {
  localStorage.setItem('isAuth', 'true');
  window.history.replaceState({}, '', '/');
}

const isAuth = localStorage.getItem('isAuth') === 'true';
navigateTo(isAuth ? 'boards' : 'login');
