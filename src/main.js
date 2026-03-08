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

const isAuth = localStorage.getItem('isAuth') === 'true';
navigateTo(isAuth ? 'boards' : 'login');
