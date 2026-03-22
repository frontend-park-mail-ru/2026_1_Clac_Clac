import Handlebars from 'handlebars';
import { initGlobalListeners } from './utils';
import { renderLogin } from './pages/login';
import { renderRegister } from './pages/register';
import { renderBoards } from './pages/boards';
import { renderPasswordRecovery } from './pages/passwordRecovery';

import inputPartial from '/src/templates/partials/input.hbs?raw';

Handlebars.registerPartial('input', inputPartial);

initGlobalListeners();

const appDiv = document.getElementById('app') as HTMLDivElement | null;

if (!appDiv) {
  throw new Error('Критическая ошибка: элемент #app не найден в DOM.');
}

export type Page = 'login' | 'register' | 'forgot-password' | 'boards';

/**
 * Выполняет навигацию по страницам SPA.
 * 
 * @param {string} page - Идентификатор страницы, на которую нужно перейти.
 */
export const navigateTo = (page: Page): void => {
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
