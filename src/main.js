import Handlebars from 'handlebars';
import { inputPartial } from './templates/partials/input.js';
import { initGlobalListeners } from './utils.js';
import { renderLogin } from './pages/login.js';
import { renderRegister } from './pages/register.js';
import { renderBoards } from './pages/boards.js';

Handlebars.registerPartial('input', inputPartial);
initGlobalListeners();

const appDiv = document.getElementById('app');

export const navigateTo = (page) => {
  if (page === 'login') {
    renderLogin(appDiv);
  } else if (page === 'register') {
    renderRegister(appDiv);
  } else {
    renderBoards(appDiv);
  }
};

navigateTo('login');
