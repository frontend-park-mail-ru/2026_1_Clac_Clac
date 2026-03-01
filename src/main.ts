import './style.css';
import Handlebars from 'handlebars';
import inputPartial from './templates/partials/input.hbs?raw';

import { initGlobalListeners } from './utils';
import { renderLogin } from './pages/login';
import { renderRegister } from './pages/register';
import { renderBoards } from './pages/boards';

Handlebars.registerPartial('input', inputPartial);

initGlobalListeners();

const appDiv = document.getElementById('app')!;

function route() {
  const hash = window.location.hash;
  if (hash === '#/login') {
    renderLogin(appDiv);
  } else if (hash === '#/register') {
    renderRegister(appDiv);
  } else {
    renderBoards(appDiv); 
  }
}

window.addEventListener('hashchange', route);

route();
