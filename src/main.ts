import './styles/auth.css';
import './styles/boards.css';

import Handlebars from 'handlebars';
import { initGlobalListeners } from './utils';
import { handleRoute } from './router';
import inputPartial from '/src/templates/partials/input.hbs?raw';
import sidebarPartial from '/src/templates/partials/sidebar.hbs?raw';

import { registerSW } from 'virtual:pwa-register';
registerSW({ immediate: true });

Handlebars.registerPartial('input', inputPartial);
Handlebars.registerPartial('sidebar', sidebarPartial);

Handlebars.registerHelper('eq', function (a, b) {
  return a === b;
});

initGlobalListeners();

const urlParams = new URLSearchParams(window.location.search);
const vkCode = urlParams.get('code');
if (vkCode) {
  if (vkCode === '200') localStorage.setItem('isAuth', 'true');
  window.history.replaceState({}, '', '/boards');
}

handleRoute();
