let currentDate = new Date();
let settings = {
    startHour: 6,
    endHour: 20,
    interval: 30,
    color: '#007aff',
    font: 'system-ui',
    layout: 'layout-stack'
};

let oldSettings = {};

const monthsNames = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];
const dayLabels = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];

document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    setupEventListeners();
    renderApp();
});

function loadSettings() {
    const saved = localStorage.getItem('agendaSettings');
    if (saved) settings = JSON.parse(saved);
    applySettings();
}

function applySettings() {
    document.documentElement.style.setProperty('--accent-color', settings.color);
    document.documentElement.style.setProperty('--main-font', settings.font);
    document.getElementById('app-container').className = settings.layout;
    
    document.getElementById('cfg-start').value = settings.startHour;
    document.getElementById('cfg-end').value = settings.endHour;
    document.getElementById('cfg-step').value = settings.interval;
    document.getElementById('cfg-color').value = settings.color;
    document.getElementById('cfg-font').value = settings.font;
    document.getElementById('cfg-layout').value = settings.layout;
}

function renderApp() {
    updateDateDisplay();
    renderTimeline();
    renderStaticSections();
}

function updateDateDisplay() {
    const options = { weekday: 'long', day: 'numeric', month: 'long' };
    let dateStr = currentDate.toLocaleDateString('it-IT', options);
    document.getElementById('currentDateDisplay').innerText = dateStr.replace(/\b\w/g, l => l.toUpperCase());
}

// 1. Aggiornamento della funzione renderTimeline per gestire la cancellazione
function renderTimeline() {
    const timeline = document.getElementById('timeline');
    timeline.innerHTML = '';
    const dateKey = currentDate.toISOString().split('T')[0];
    const savedData = JSON.parse(localStorage.getItem(`data_${dateKey}`)) || {};

    for (let h = settings.startHour; h <= settings.endHour; h++) {
        let steps = [0];
        if (settings.interval == 15) steps = [0, 15, 30, 45];
        else if (settings.interval == 30) steps = [0, 30];

        steps.forEach(m => {
            if (h === settings.endHour && m > 0) return;
            const timeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
            const entry = savedData[timeStr] || { text: '', completed: false, important: false, deleted: false };
            
            if (entry.deleted) return;

            const row = document.createElement('div');
            row.className = `hour-row ${entry.important ? 'important' : ''}`;
            row.innerHTML = `
                <button class="action-icon star-btn ${entry.important ? 'active' : ''}">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="${entry.important ? '#ffcc00' : 'none'}" stroke="${entry.important ? '#ffcc00' : 'currentColor'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                </button>
                <div class="hour-label">${timeStr}</div>
                <textarea placeholder="..." class="${entry.completed ? 'completed' : ''}">${entry.text || ''}</textarea>
                <div class="row-actions">
                    <button class="action-icon trash-btn" title="Elimina">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                    <button class="action-icon check-btn" style="${entry.text ? 'display:flex' : 'display:none'}" title="Completa">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    </button>
                </div>
            `;

            const tx = row.querySelector('textarea');
            const trashBtn = row.querySelector('.trash-btn');
            const checkBtn = row.querySelector('.check-btn');
            const starBtn = row.querySelector('.star-btn');

            tx.oninput = (e) => {
                const val = e.target.value;
                checkBtn.style.display = val ? 'flex' : 'none';
                saveTimelineData(dateKey, timeStr, val, tx.classList.contains('completed'), row.classList.contains('important'), false);
            };

            // USARE 'pointerdown' per intercettare il tocco prima del blur del textarea
            const handleTrash = (e) => {
                e.preventDefault(); // Previene perdita focus immediata
                if (tx.value.trim() !== "") {
                    tx.value = '';
                    tx.classList.remove('completed');
                    row.classList.remove('important');
                    checkBtn.style.display = 'none';
                    starBtn.classList.remove('active');
                    updateStarIcon(starBtn, false);
                    saveTimelineData(dateKey, timeStr, '', false, false, false);
                } else {
                    row.remove();
                    saveTimelineData(dateKey, timeStr, '', false, false, true);
                }
            };

            const handleCheck = (e) => {
                e.preventDefault();
                tx.classList.toggle('completed');
                saveTimelineData(dateKey, timeStr, tx.value, tx.classList.contains('completed'), row.classList.contains('important'), false);
            };

            const handleStar = (e) => {
                e.preventDefault();
                const isImportant = row.classList.toggle('important');
                starBtn.classList.toggle('active');
                updateStarIcon(starBtn, isImportant);
                saveTimelineData(dateKey, timeStr, tx.value, tx.classList.contains('completed'), isImportant, false);
            };

            // Eventi per compatibilità universale (Mouse + Touch)
            trashBtn.onpointerdown = handleTrash;
            checkBtn.onpointerdown = handleCheck;
            starBtn.onpointerdown = handleStar;

            timeline.appendChild(row);
        });
    }
}

function updateStarIcon(btn, isImportant) {
    const svg = btn.querySelector('svg');
    if (isImportant) {
        svg.setAttribute('fill', '#ffcc00');
        svg.setAttribute('stroke', '#ffcc00');
    } else {
        svg.setAttribute('fill', 'none');
        svg.setAttribute('stroke', 'currentColor');
    }
}

// 2. Aggiornamento funzione salvataggio per includere il flag "deleted"
function saveTimelineData(dateKey, timeStr, text, completed, important, deleted) {
    let dayData = JSON.parse(localStorage.getItem(`data_${dateKey}`)) || {};
    dayData[timeStr] = { text, completed, important, deleted };
    localStorage.setItem(`data_${dateKey}`, JSON.stringify(dayData));
}

function openCalendar() {
    document.getElementById('calendar-overlay').classList.remove('hidden');
    renderMonthsView();
}

function renderMonthsView() {
    document.getElementById('calendar-title').innerText = "2026";
    document.getElementById('cal-back-btn').style.visibility = 'hidden';
    const container = document.getElementById('calendar-content');
    container.innerHTML = `<div class="months-grid"></div>`;
    const grid = container.querySelector('.months-grid');
    monthsNames.forEach((m, i) => {
        const btn = document.createElement('button');
        btn.className = 'cal-box';
        btn.innerText = m.substring(0, 3).toUpperCase();
        grid.appendChild(btn);
        btn.onclick = () => renderDaysView(i);
    });
}

function renderDaysView(monthIndex) {
    document.getElementById('calendar-title').innerText = monthsNames[monthIndex].toUpperCase() + " 2026";
    document.getElementById('cal-back-btn').style.visibility = 'visible';
    const container = document.getElementById('calendar-content');
    container.innerHTML = `<div class="days-grid"></div>`;
    const grid = container.querySelector('.days-grid');
    dayLabels.forEach(l => {
        const d = document.createElement('div');
        d.className = 'weekday-label'; d.innerText = l; grid.appendChild(d);
    });
    const firstDay = new Date(2026, monthIndex, 1).getDay();
    const offset = firstDay === 0 ? 6 : firstDay - 1;
    const days = new Date(2026, monthIndex + 1, 0).getDate();
    for (let i = 0; i < offset; i++) grid.appendChild(document.createElement('div'));
    for (let d = 1; d <= days; d++) {
        const btn = document.createElement('button');
        btn.className = 'cal-box'; btn.innerText = d;
        btn.onclick = () => {
            currentDate = new Date(2026, monthIndex, d);
            renderApp();
            document.getElementById('calendar-overlay').classList.add('hidden');
        };
        grid.appendChild(btn);
    }
}


let snapshotSettings = {};

function setupEventListeners() {
    // ... i primi listener (prevDay, nextDay, ecc.) rimangono uguali ...
    document.getElementById('prevDay').onclick = () => { currentDate.setDate(currentDate.getDate() - 1); renderApp(); };
    document.getElementById('nextDay').onclick = () => { currentDate.setDate(currentDate.getDate() + 1); renderApp(); };
    document.getElementById('currentDateDisplay').onclick = openCalendar;
    document.getElementById('cal-back-btn').onclick = renderMonthsView;
    document.getElementById('close-calendar').onclick = () => document.getElementById('calendar-overlay').classList.add('hidden');

    // Apertura: salva lo stato attuale
    document.getElementById('open-settings').onclick = () => {
        snapshotSettings = JSON.parse(JSON.stringify(settings)); 
        document.getElementById('settings-overlay').classList.remove('hidden');
    };

    // Pulsante Ripristina: ricarica lo snapshot
    document.getElementById('restore-settings').onclick = () => {
        settings = JSON.parse(JSON.stringify(snapshotSettings));
        applySettings();
        localStorage.setItem('agendaSettings', JSON.stringify(settings));
        renderApp();
    };

    // Pulsante Chiudi (sostituisce Salva/Annulla per uscire)
    document.getElementById('exit-settings').onclick = () => {
        document.getElementById('settings-overlay').classList.add('hidden');
    };

    // Applicazione IMMEDIATA al cambio di ogni input
    const inputs = ['cfg-start', 'cfg-end', 'cfg-step', 'cfg-color', 'cfg-font', 'cfg-layout'];
    inputs.forEach(id => {
        document.getElementById(id).onchange = () => {
            settings.startHour = parseInt(document.getElementById('cfg-start').value);
            settings.endHour = parseInt(document.getElementById('cfg-end').value);
            settings.interval = parseInt(document.getElementById('cfg-step').value);
            settings.color = document.getElementById('cfg-color').value;
            settings.font = document.getElementById('cfg-font').value;
            settings.layout = document.getElementById('cfg-layout').value;
            
            applySettings();
            localStorage.setItem('agendaSettings', JSON.stringify(settings));
            renderApp();
        };
    });
}
function renderStaticSections() {
    renderTasks();
    const dateKey = currentDate.toISOString().split('T')[0];
    const mealsContainer = document.getElementById('meals-container');
    const savedMeals = JSON.parse(localStorage.getItem(`meals_${dateKey}`)) || {};
    
    mealsContainer.innerHTML = ['Colazione', 'Pranzo', 'Cena'].map(m => `
        <div class="input-row">
            <span style="width:70px; font-size:0.7rem; color:var(--accent-color); font-weight:700">${m.toUpperCase()}</span>
            <input type="text" placeholder="..." value="${savedMeals[m] || ''}" oninput="saveMeal('${m}', this.value)">
        </div>
    `).join('');

    const notesArea = document.getElementById('general-notes');
    notesArea.value = localStorage.getItem(`notes_${dateKey}`) || "";
    notesArea.oninput = (e) => localStorage.setItem(`notes_${dateKey}`, e.target.value);
}

function renderTasks() {
    const container = document.getElementById('tasks-container');
    const dateKey = currentDate.toISOString().split('T')[0];
    const savedTasks = JSON.parse(localStorage.getItem(`tasks_${dateKey}`)) || [""];
    container.innerHTML = '';
    savedTasks.forEach((t, i) => createTaskRow(container, t, i, dateKey));
}

function createTaskRow(container, value, index, dateKey) {
    const row = document.createElement('div');
    row.className = 'input-row';
    row.innerHTML = `<div class="bullet"></div><input type="text" placeholder="Nuovo task..." value="${value}">`;
    const input = row.querySelector('input');
    input.oninput = (e) => {
        let tasks = JSON.parse(localStorage.getItem(`tasks_${dateKey}`)) || [""];
        tasks[index] = e.target.value;
        localStorage.setItem(`tasks_${dateKey}`, JSON.stringify(tasks));
    };
    input.onkeydown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            let tasks = JSON.parse(localStorage.getItem(`tasks_${dateKey}`)) || [""];
            tasks.splice(index + 1, 0, "");
            localStorage.setItem(`tasks_${dateKey}`, JSON.stringify(tasks));
            renderTasks();
            container.querySelectorAll('input')[index + 1].focus();
        }
    };
    container.appendChild(row);
}

function saveMeal(mealType, value) {
    const dateKey = currentDate.toISOString().split('T')[0];
    let meals = JSON.parse(localStorage.getItem(`meals_${dateKey}`)) || {};
    meals[mealType] = value;
    localStorage.setItem(`meals_${dateKey}`, JSON.stringify(meals));
}
function setupHourDropdowns() {
    const hours = Array.from({ length: 25 }, (_, i) => i); // Array 0-24

    ['start', 'end'].forEach(type => {
        const input = document.getElementById(`cfg-${type}`);
        const list = document.getElementById(`list-${type}`);

        // Popola la lista
        function renderList() {
            list.innerHTML = '';
            const currentVal = parseInt(input.value);
            
            hours.forEach(h => {
                const item = document.createElement('div');
                item.className = `dropdown-item ${h === currentVal ? 'active' : ''}`;
                item.innerText = h.toString().padStart(2, '0') + ':00';
                
                item.onclick = (e) => {
                    e.stopPropagation();
                    input.value = h;
                    // Trigger manuale dell'evento change per salvare le impostazioni
                    input.dispatchEvent(new Event('change'));
                    list.classList.add('hidden');
                };
                list.appendChild(item);
            });
        }

        // Mostra la tendina al click sull'input (comprese le freccette del CSS)
        input.onclick = (e) => {
            e.stopPropagation();
            // Chiudi l'altra tendina se aperta
            document.querySelectorAll('.custom-dropdown-list').forEach(el => el.classList.add('hidden'));
            renderList();
            list.classList.remove('hidden');
            
            // Scroll automatico all'elemento attivo
            setTimeout(() => {
                const activeItem = list.querySelector('.active');
                if (activeItem) activeItem.scrollIntoView({ block: 'center' });
            }, 10);
        };
    });

    // Chiudi le tendine se si clicca fuori
    document.addEventListener('click', () => {
        document.querySelectorAll('.custom-dropdown-list').forEach(el => el.classList.add('hidden'));
    });
}

// Chiama la funzione dentro setupEventListeners()
setupHourDropdowns();
