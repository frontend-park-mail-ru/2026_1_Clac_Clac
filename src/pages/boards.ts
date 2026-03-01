import Handlebars from 'handlebars';
import { api } from '../api';
import boardsTpl from '../templates/boards.hbs?raw';
import '../styles/boards.css';

const template = Handlebars.compile(boardsTpl);

export async function renderBoards(appDiv: HTMLElement) {
  try {
    const res = await api.get('/boards');
    let boards = res.data;
    
    if (!boards || boards.length === 0) {
      boards =[
        { 
          id: '1', 
          board_name: 'VK Design team. Cross project team', 
          description: 'Кросс-платформенная команда по генерации быстрых креативов',
          iconBg: '#0077FF',
          iconSvg: '<span style="color: white; font-weight: bold; font-size: 16px;">VK</span>',
          backlog: 172,
          hot: 3,
          members: 58,
          avatars:['https://i.pravatar.cc/100?img=11', 'https://i.pravatar.cc/100?img=12']
        },
        { 
          id: '2', 
          board_name: 'Учеба', 
          description: '',
          iconBg: '#FFFFFF',
          iconSvg: '<span style="font-size: 24px;">🎯</span>',
          backlog: 0,
          hot: 0,
          members: 1,
          avatars:['https://i.pravatar.cc/100?img=13']
        },
        { 
          id: '3', 
          board_name: 'CLAC CLAC team', 
          description: 'Создаём аналог Trello',
          iconBg: '#FFE0B2',
          iconSvg: '<span style="font-size: 24px;">💪</span>',
          backlog: 4,
          hot: 1,
          members: 7,
          avatars:['https://i.pravatar.cc/100?img=14', 'https://i.pravatar.cc/100?img=15', 'https://i.pravatar.cc/100?img=16']
        },
      ];
    }
    appDiv.innerHTML = template({ boards });

    const searchInput = document.querySelector('.search-input') as HTMLInputElement;
    const boardCards = document.querySelectorAll('.board-card');

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const query = (e.target as HTMLInputElement).value.toLowerCase();
        
        boardCards.forEach((card) => {
          const title = card.querySelector('.board-name')?.textContent?.toLowerCase() || '';
          const desc = card.querySelector('.board-desc')?.textContent?.toLowerCase() || '';
          
          if (title.includes(query) || desc.includes(query)) {
            (card as HTMLElement).style.display = 'flex';
          } else {
            (card as HTMLElement).style.display = 'none';
          }
        });
      });
    }

  } catch (err) {
    window.location.hash = '#/login';
  }
}
