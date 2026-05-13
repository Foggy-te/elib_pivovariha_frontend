const STORAGE_KEY = 'electronic_library_requests';
const BOOKS = window.__BOOKS__ || [];

function getRequests() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch (error) {
    return [];
  }
}

function saveRequests(requests) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(requests));
}

function coverFallback(book) {
  if (!book) return '';
  return book.image || '';
}

function toast(title, message) {
  const wrapId = 'toastWrap';
  let wrap = document.getElementById(wrapId);
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.id = wrapId;
    wrap.className = 'toast-wrap';
    document.body.appendChild(wrap);
  }

  const card = document.createElement('div');
  card.className = 'toast-card';
  card.innerHTML = `<strong>${title}</strong><div><small>${message}</small></div>`;
  wrap.appendChild(card);
  setTimeout(() => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(12px)';
    setTimeout(() => card.remove(), 250);
  }, 2800);
}

function bookById(id) {
  return BOOKS.find((book) => Number(book.id) === Number(id));
}

function setupRevealAnimations() {
  const items = document.querySelectorAll('.reveal');
  if (!items.length) return;
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.style.animationDelay = `${Math.min(entry.target.dataset.delay || 0, 300)}ms`;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08 });
  items.forEach((item, index) => {
    item.style.opacity = '0';
    item.style.animationDelay = `${Math.min(index * 50, 350)}ms`;
    observer.observe(item);
  });
}

function initCatalogFilters() {
  const search = document.getElementById('bookSearch');
  const genre = document.getElementById('genreFilter');
  const availability = document.getElementById('availabilityFilter');
  const reset = document.getElementById('resetFilters');
  const items = [...document.querySelectorAll('.catalog-item')];
  const empty = document.getElementById('emptyState');
  if (!search || !genre || !availability || !reset || !items.length) return;

  const apply = () => {
    const q = search.value.trim().toLowerCase();
    const g = genre.value;
    const a = availability.value;
    let visible = 0;

    items.forEach((item) => {
      const title = item.dataset.title || '';
      const author = item.dataset.author || '';
      const itemGenre = item.dataset.genre || '';
      const itemAvailability = item.dataset.available || '';
      const matchesQuery = !q || title.includes(q) || author.includes(q);
      const matchesGenre = g === 'all' || itemGenre === g;
      const matchesAvailability = a === 'all' || itemAvailability === a;
      const show = matchesQuery && matchesGenre && matchesAvailability;
      item.style.display = show ? '' : 'none';
      if (show) visible += 1;
    });

    if (empty) empty.classList.toggle('d-none', visible !== 0);
  };

  [search, genre, availability].forEach((el) => el.addEventListener('input', apply));
  reset.addEventListener('click', () => {
    search.value = '';
    genre.value = 'all';
    availability.value = 'all';
    apply();
  });

  apply();
}

function initReserveButtons() {
  document.querySelectorAll('.reserve-btn').forEach((button) => {
    button.addEventListener('click', () => {
      const book = bookById(button.dataset.bookId);
      if (!book) return;
      const url = `/book/${book.id}`;
      window.location.href = url + '#reserveFormWrap';
    });
  });
}

function initReserveForms() {
  document.querySelectorAll('.reserve-form').forEach((form) => {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const book = bookById(form.dataset.bookId);
      if (!book) return;

      const data = new FormData(form);
      const request = {
        id: `req-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        bookId: Number(book.id),
        title: book.title,
        author: book.author,
        genre: book.genre,
        image: coverFallback(book),
        student_name: String(data.get('student_name') || '').trim(),
        class_name: String(data.get('class_name') || '').trim(),
        contact: String(data.get('contact') || '').trim(),
        date_needed: String(data.get('date_needed') || '').trim(),
        comment: String(data.get('comment') || '').trim(),
        status: 'На рассмотрении',
        created_at: new Date().toISOString()
      };

      const requests = getRequests();
      requests.unshift(request);
      saveRequests(requests);

      form.reset();
      toast('Заявка отправлена', `Книга «${book.title}» добавлена в раздел «Мои заявки».`);
      setTimeout(() => {
        window.location.href = '/requests';
      }, 850);
    });
  });
}

function statusClass(status) {
  const map = {
    'На рассмотрении': 'is-available',
    'Одобрена': 'is-available',
    'Отменена': 'is-busy',
    'Выдана': 'is-available'
  };
  return map[status] || 'is-available';
}

function renderRequestsPage() {
  const container = document.getElementById('requestsList');
  const empty = document.getElementById('requestsEmpty');
  const clearBtn = document.getElementById('clearRequests');
  if (!container || !empty) return;

  const render = () => {
    const requests = getRequests();
    container.innerHTML = '';

    if (!requests.length) {
      empty.classList.remove('d-none');
      return;
    }

    empty.classList.add('d-none');

    requests.forEach((request) => {
      const card = document.createElement('article');
      card.className = 'request-card';
      card.innerHTML = `
        <div class="request-cover" style="background-image:url('${request.image || ''}')"></div>
        <div>
          <div class="d-flex flex-wrap gap-2 mb-2">
            <span class="status-badge ${statusClass(request.status)}">${request.status}</span>
            <span class="genre-pill">${request.genre}</span>
          </div>
          <h3 class="h5 mb-1">${request.title}</h3>
          <p class="mb-1 text-white-50">${request.author}</p>
          <p class="mb-1"><strong>Ученик:</strong> ${request.student_name}</p>
          <p class="mb-1"><strong>Класс:</strong> ${request.class_name}</p>
          <p class="mb-1"><strong>Контакт:</strong> ${request.contact}</p>
          <p class="mb-0"><strong>Нужна к:</strong> ${request.date_needed || '—'}</p>
          ${request.comment ? `<p class="mt-2 mb-0 text-white-50">${request.comment}</p>` : ''}
        </div>
        <div class="request-actions">
          <a class="btn btn-outline-light" href="/book/${request.bookId}">Открыть книгу</a>
          <button class="btn btn-primary btn-cancel" data-request-id="${request.id}">Отменить</button>
        </div>
      `;
      container.appendChild(card);
    });

    document.querySelectorAll('.btn-cancel').forEach((btn) => {
      btn.addEventListener('click', () => {
        const requestId = btn.dataset.requestId;
        const updated = getRequests().filter((item) => item.id !== requestId);
        saveRequests(updated);
        toast('Заявка удалена', 'Запись была убрана из локального списка заявок.');
        render();
      });
    });
  };

  render();
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      saveRequests([]);
      toast('Заявки очищены', 'Локальный список заявок удалён.');
      render();
    });
  }
}


function openReserveCollapseFromHash() {
  if (window.location.hash !== '#reserveFormWrap') return;
  const el = document.getElementById('reserveFormWrap');
  if (!el || !window.bootstrap || !bootstrap.Collapse) return;
  const instance = bootstrap.Collapse.getOrCreateInstance(el, { toggle: false });
  instance.show();
  setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 250);
}

function initActiveNav() {
  const path = window.location.pathname;
  document.querySelectorAll('.nav-link').forEach((link) => {
    if (link.getAttribute('href') === path) link.classList.add('active');
  });
}

document.addEventListener('DOMContentLoaded', () => {
  setupRevealAnimations();
  initActiveNav();
  initCatalogFilters();
  initReserveButtons();
  initReserveForms();
  openReserveCollapseFromHash();
  renderRequestsPage();
});
