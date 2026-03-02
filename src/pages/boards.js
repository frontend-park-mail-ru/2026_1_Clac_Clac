import Handlebars from 'handlebars';
import { apiClient } from '../api.js';
import { navigateTo } from '../main.js';

const response = await fetch('/src/templates/boards.hbs');
const boardsTpl = await response.text();
const template = Handlebars.compile(boardsTpl);

export const renderBoards = async (appDiv) => {
  try {
    const res = await apiClient.get('/boards');
    let boards = res.data || res;

    if (!boards || boards.length === 0) {
      boards = [
        {
          id: '1',
          board_name: 'VK Design team. Cross project team',
          description: 'Кросс-платформенная команда по генерации быстрых креативов',
          iconClass: 'bg-blue',
          iconHtml: '<span class="icon-text">VK</span>',
          backlog: 172,
          hot: 3,
          members: 58,
          avatars:['https://i.pravatar.cc/100?img=11', 'https://i.pravatar.cc/100?img=12'],
        },
        {
          id: '2',
          board_name: 'Учеба',
          description: '',
          iconClass: 'bg-white',
          iconHtml: '<span class="icon-emoji">🎯</span>',
          backlog: 0,
          hot: 0,
          members: 1,
          avatars: ['https://i.pravatar.cc/100?img=13'],
        },
        {
          id: '3',
          board_name: 'CLAC CLAC team',
          description: 'Создаём аналог Trello',
          iconClass: 'bg-orange-light',
          iconHtml: '<span class="icon-emoji">💪</span>',
          backlog: 4,
          hot: 1,
          members: 7,
          avatars:[
            'https://i.pravatar.cc/100?img=14',
            'https://i.pravatar.cc/100?img=15',
            'https://i.pravatar.cc/100?img=16',
          ],
        },
      ];
    }
    
    appDiv.innerHTML = template({ boards });

    const searchInput = document.querySelector('.search-input');
    const boardCards = document.querySelectorAll('.board-card');

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();

        boardCards.forEach((card) => {
          const title = card.querySelector('.board-name')?.textContent?.toLowerCase() || '';
          const desc = card.querySelector('.board-desc')?.textContent?.toLowerCase() || '';

          if (title.includes(query) || desc.includes(query)) {
            card.style.display = 'flex';
          } else {
            card.style.display = 'none';
          }
        });
      });
    }
  } catch (err) {
    navigateTo('login');
  }
};
