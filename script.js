/**
 * OHMYBLOCK! - SENIOR REFACTORED CORE
 */

// --- STATE MANAGEMENT ---
const State = {
    currentDate: new Date(),
    settings: {
        startHour: 6,
        endHour: 20,
        interval: 60,
        color: '#007aff',
        font: 'system-ui',
        layout: 'layout-stack',
        viewMode: 'day'
    },
    months: ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"]
};

// --- STORAGE MODULE ---
const Storage = {
    save(key, data) { localStorage.setItem(key, JSON.stringify(data)); },
    get(key) { return JSON.parse(localStorage.getItem(key)); },
    getDayKey(date) { 
        const d = new Date(date);
        return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, '0') + "-" + String(d.getDate()).padStart(2, '0');
    },
    getWeekKey(date) {
        const d = new Date(date);
        d.setHours(0,0,0,0);
        d.setDate(d.getDate() + 4 - (d.getDay() || 7));
        return `${d.getFullYear()}-W${Math.ceil((((d - new Date(d.getFullYear(),0,1))/8.64e7)+1)/7)}`;
    },
    hasData(dateKey) {
        const data = this.get(`data_${dateKey}`);
        if (!data) return false;
        return Object.values(data).some(entry => entry.text && !entry.deleted);
    }
};

// --- UI RENDERER MODULE ---
const Renderer = {
    renderApp() {
        this.updateHeader();
        const container = document.getElementById('timeline');
        const sections = document.getElementById('dynamic-sections');
        container.innerHTML = '';

        if (State.settings.viewMode === 'week') {
            sections.classList.add('hidden');
            this.renderWeeklyView(container);
        } else {
            sections.classList.remove('hidden');
            this.renderDailyView(container);
            this.renderStaticSections();
        }
    },

    updateHeader() {
    const options = { weekday: 'long', day: 'numeric', month: 'long' };
    let dateStr = State.currentDate.toLocaleDateString('it-IT', options);
    
    // Converte in minuscolo con iniziali maiuscole: "Lunedì 26 Gennaio"
    document.getElementById('currentDateDisplay').innerText = 
        dateStr.replace(/\b\w/g, l => l.toUpperCase());

    document.documentElement.style.setProperty('--accent-color', State.settings.color);
    document.documentElement.style.setProperty('--main-font', State.settings.font);
    document.getElementById('app-container').className = State.settings.layout;
},

    createRow(timeStr, entry, dateKey, isReadOnly = false) {
    const row = document.createElement('div');
    row.className = `hour-row ${entry.important ? 'important' : ''}`;
    
    // HTML Riorganizzato: Stellina all'estrema sinistra
    row.innerHTML = `
        <button class="action-icon star-btn ${entry.important ? 'active' : ''}" title="Importante">★</button>
        <div class="hour-label">${timeStr}</div>
        <textarea placeholder="..." class="${entry.completed ? 'completed' : ''}" ${isReadOnly ? 'readonly' : ''}>${entry.text || ''}</textarea>
        ${!isReadOnly ? `
        <div class="row-actions">
            <button class="action-icon check-btn" title="Completa">✓</button>
            <button class="action-icon trash-btn" title="Elimina">🗑</button>
        </div>` : ''}
    `;

    // Gestione Stellina (Sempre attiva sia in Daily che in Weekly)
    const starBtn = row.querySelector('.star-btn');
    starBtn.onclick = (e) => {
        e.stopPropagation();
        const isCurrentlyImportant = row.classList.contains('important');
        this.handleUpdate(dateKey, timeStr, { important: !isCurrentlyImportant });
        this.renderApp(); // Refresh per aggiornare lo stato visivo
    };

    if (!isReadOnly) {
        const tx = row.querySelector('textarea');
        tx.oninput = () => this.handleUpdate(dateKey, timeStr, { text: tx.value });
        
        row.querySelector('.check-btn').onclick = (e) => {
            e.stopPropagation();
            tx.classList.toggle('completed');
            this.handleUpdate(dateKey, timeStr, { completed: tx.classList.contains('completed') });
        };

        row.querySelector('.trash-btn').onclick = (e) => {
            e.stopPropagation();
            if (tx.value.trim() !== "") {
                tx.value = "";
                this.handleUpdate(dateKey, timeStr, { text: "" });
            } else if (confirm("Eliminare questa fascia oraria?")) {
                this.handleUpdate(dateKey, timeStr, { deleted: true });
                this.renderApp();
            }
        };
    }
    return row;
},

    handleUpdate(dateKey, timeStr, updates) {
        const data = Storage.get(`data_${dateKey}`) || {};
        data[timeStr] = { ...(data[timeStr] || { text: '', completed: false, important: false, deleted: false }), ...updates };
        Storage.save(`data_${dateKey}`, data);
    },

    renderDailyView(container) {
    const dateKey = Storage.getDayKey(State.currentDate);
    const saved = Storage.get(`data_${dateKey}`) || {};
    
    const interval = State.settings.interval; // 15, 30 o 60

    for (let h = State.settings.startHour; h <= State.settings.endHour; h++) {
        // Calcola i minuti in base all'intervallo
        let minutes = [0];
        if (interval === 30) minutes = [0, 30];
        if (interval === 15) minutes = [0, 15, 30, 45];

        minutes.forEach(m => {
            const time = `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}`;
            if (saved[time]?.deleted) return;
            container.appendChild(this.createRow(time, saved[time] || {}, dateKey));
        });
    }
},

 renderWeeklyView(container) {
    let start = new Date(State.currentDate);
    start.setDate(start.getDate() - (start.getDay() || 7) + 1);

    for (let i = 0; i < 7; i++) {
        const d = new Date(start); d.setDate(start.getDate() + i);
        const dateKey = Storage.getDayKey(d);
          // Formattazione corretta per il settimanale
        let dayName = d.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
        let formattedDay = dayName.replace(/\b\w/g, l => l.toUpperCase());

        const h = document.createElement('div');
        h.className = 'weekly-day-container';
        h.innerHTML = `
            <div class="weekly-day-header">
                <span class="date-title">${formattedDay}</span>
                <button class="weekly-plus-btn" data-date="${dateKey}" data-label="${formattedDay}">+</button>
            </div>`;
        
        h.querySelector('.weekly-plus-btn').onclick = (e) => {
            QuickAdd.open(e.target.dataset.date, e.target.dataset.label);
        };
        container.appendChild(h);

        const saved = Storage.get(`data_${dateKey}`) || {};
        let count = 0;
      // ... dentro renderWeeklyView, nel ciclo degli eventi salvati ...
Object.keys(saved).sort().forEach(t => {
    if (saved[t].text && !saved[t].deleted) {
        // MODIFICA: cambiamo l'ultimo parametro da 'true' a 'false'
        const row = this.createRow(t, saved[t], dateKey, false); 
        
        // Manteniamo la possibilità di cliccare sul testo per aprire il pop-up di modifica
        const tx = row.querySelector('textarea');
        tx.style.cursor = "pointer";
        tx.onclick = () => QuickAdd.open(dateKey, dayName, t, saved[t].text);
        
        container.appendChild(row);
        count++;
    }
});
        
        if (count === 0) {
            const empty = document.createElement('div');
            empty.className = "weekly-day-no-data";
            empty.style = "text-align:center; color:gray; font-style:italic; padding: 10px 0 30px;";
            empty.innerText = "Nessun impegno";
            container.appendChild(empty);
        }
    }
    this.renderWeeklyExtra(container);
},

    renderStaticSections() {
        const dateKey = Storage.getDayKey(State.currentDate);
        this.renderGenericTasks(`tasks_${dateKey}`, 'tasks-container');
        
        const mCont = document.getElementById('meals-container');
        const sMeals = Storage.get(`meals_${dateKey}`) || {};
        mCont.innerHTML = ['Colazione', 'Pranzo', 'Cena'].map(m => `
            <div class="input-row"><div class="bullet"></div><input type="text" placeholder="${m}..." value="${sMeals[m]||''}" data-m="${m}"></div>
        `).join('');
        mCont.querySelectorAll('input').forEach(i => i.onchange = (e) => {
            sMeals[e.target.dataset.m] = e.target.value;
            Storage.save(`meals_${dateKey}`, sMeals);
        });

        const n = document.getElementById('general-notes');
        n.value = localStorage.getItem(`notes_${dateKey}`) || "";
        n.oninput = () => localStorage.setItem(`notes_${dateKey}`, n.value);
    },

    renderWeeklyExtra(container) {
        const weekId = Storage.getWeekKey(State.currentDate);
        const div = document.createElement('div');
        div.innerHTML = `<div class="section-box"><h3>Task Settimanali</h3><div class="rows-group" id="w-tasks"></div></div>
                         <div class="section-box"><h3>Note Settimanali</h3><div class="rows-group"><textarea id="w-notes" style="width:100%; min-height:100px"></textarea></div></div>`;
        container.appendChild(div);
        this.renderGenericTasks(`tasks_w_${weekId}`, 'w-tasks');
        const wn = document.getElementById('w-notes');
        wn.value = localStorage.getItem(`notes_w_${weekId}`) || "";
        wn.oninput = () => localStorage.setItem(`notes_w_${weekId}`, wn.value);
    },

    renderGenericTasks(key, id) {
        const cont = document.getElementById(id);
        let tasks = Storage.get(key) || [""];
        cont.innerHTML = '';
        tasks.forEach((t, i) => {
            const row = document.createElement('div');
            row.className = 'input-row';
            row.innerHTML = `<div class="bullet"></div><input type="text" value="${t}" placeholder="Nuovo task...">`;
            
            const input = row.querySelector('input');

            // Salvataggio su cambio focus o testo
            input.onchange = (e) => {
                tasks[i] = e.target.value;
                tasks = tasks.filter((task, idx) => task.trim() !== "" || idx === tasks.length - 1);
                if (tasks[tasks.length-1] !== "") tasks.push("");
                Storage.save(key, tasks);
                this.renderGenericTasks(key, id);
            };

            // FIX INVIO: Salvataggio immediato prima del nuovo focus
            input.onkeydown = (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    const val = input.value.trim();
                    if (val !== "") {
                        tasks[i] = val; // Persistenza valore immediata
                        if (i === tasks.length - 1) tasks.push("");
                        Storage.save(key, tasks);
                        this.renderGenericTasks(key, id);
                        
                        setTimeout(() => {
                            const newInputs = cont.querySelectorAll('input');
                            if (newInputs[i+1]) newInputs[i+1].focus();
                        }, 10);
                    }
                }
            };
            cont.appendChild(row);
        });
    }
};

// --- QUICK ADD & WHEEL PICKER MODULE ---
const QuickAdd = {
    selectedDate: "",
    editingTime: null,

    open(dateKey, label, time = null, text = "") {
        this.selectedDate = dateKey;
        this.editingTime = time; // Serve per sapere se stiamo modificando un vecchio evento
        
        // Aggiorna etichetta giorno
        document.getElementById('quick-add-date-label').innerText = label;
        
        // Imposta il testo dell'evento
        document.getElementById('quick-text').value = text;

        // Gestione Orario: se non c'è, mettiamo l'ora attuale o 09:00
        const inputTime = document.getElementById('event-time-input');
        inputTime.value = time || "09:00";

        // Mostra pop-up
        document.getElementById('quick-add-overlay').classList.remove('hidden');
    },

    save() {
        const newTime = document.getElementById('event-time-input').value;
        const text = document.getElementById('quick-text').value;

        if (!text) return alert("Inserisci un testo per l'evento");
        if (!newTime) return alert("Inserisci un orario valido");

        // Se stiamo modificando un evento e l'orario è cambiato, cancelliamo il vecchio slot
        if (this.editingTime && this.editingTime !== newTime) {
            Renderer.handleUpdate(this.selectedDate, this.editingTime, { deleted: true });
        }

        // Salvataggio/Aggiornamento
        Renderer.handleUpdate(this.selectedDate, newTime, { text, deleted: false });
        
        document.getElementById('quick-add-overlay').classList.add('hidden');
        Renderer.renderApp();
    }
};
// --- CALENDAR MODULE ---
const Calendar = {
    open() {
        document.getElementById('calendar-overlay').classList.remove('hidden');
        this.renderMesi();
    },
    renderMesi() {
        const currentYear = State.currentDate.getFullYear();
        document.getElementById('calendar-title').innerText = currentYear;
        const cont = document.getElementById('calendar-content');
        cont.innerHTML = `<div class="months-grid"></div>`;
        State.months.forEach((m, i) => {
            const b = document.createElement('button');
            b.className = 'cal-box'; b.innerText = m.substring(0,3).toUpperCase();
            b.onclick = () => this.renderGiorni(i);
            cont.firstChild.appendChild(b);
        });
    },
    renderGiorni(mIdx) {
        const currentYear = State.currentDate.getFullYear();
        document.getElementById('calendar-title').innerText = State.months[mIdx].toUpperCase();
        const cont = document.getElementById('calendar-content');
        cont.innerHTML = `<div class="calendar-weekdays"><div>Lun</div><div>Mar</div><div>Mer</div><div>Gio</div><div>Ven</div><div>Sab</div><div>Dom</div></div><div class="days-grid"></div>`;
        const grid = cont.querySelector('.days-grid');
        let firstDay = new Date(currentYear, mIdx, 1).getDay();
        const offset = firstDay === 0 ? 6 : firstDay - 1;
        const totalDays = new Date(currentYear, mIdx + 1, 0).getDate();
        const todayKey = Storage.getDayKey(new Date());

        for (let x = 0; x < offset; x++) {
            const empty = document.createElement('div');
            empty.className = 'cal-box empty';
            grid.appendChild(empty);
        }
        for (let d = 1; d <= totalDays; d++) {
            const tempDate = new Date(currentYear, mIdx, d);
            const dateKey = Storage.getDayKey(tempDate);
            const b = document.createElement('button');
            b.className = 'cal-box';
            b.innerText = d;
            if (dateKey === todayKey) b.classList.add('today');
            if (Storage.hasData(dateKey)) b.classList.add('has-event');
            b.onclick = () => {
                State.currentDate = tempDate;
                document.getElementById('calendar-overlay').classList.add('hidden');
                Renderer.renderApp();
            };
            grid.appendChild(b);
        }
    }
};

// --- EVENTS ---
function setupEventListeners() {
    document.getElementById('prevDay').onclick = () => { 
        const offset = State.settings.viewMode === 'week' ? 7 : 1;
        State.currentDate.setDate(State.currentDate.getDate() - offset); 
        Renderer.renderApp(); 
    };
    document.getElementById('nextDay').onclick = () => { 
        const offset = State.settings.viewMode === 'week' ? 7 : 1;
        State.currentDate.setDate(State.currentDate.getDate() + offset); 
        Renderer.renderApp(); 
    };
    document.getElementById('close-calendar').onclick = () => document.getElementById('calendar-overlay').classList.add('hidden');
    document.getElementById('toggle-layout').onclick = () => { 
        State.settings.viewMode = State.settings.viewMode === 'day' ? 'week' : 'day'; 
        Storage.save('agendaSettings', State.settings); 
        Renderer.renderApp(); 
    };
    document.getElementById('currentDateDisplay').onclick = () => Calendar.open();
    document.getElementById('open-settings').onclick = () => document.getElementById('settings-overlay').classList.remove('hidden');
    document.getElementById('exit-settings').onclick = () => document.getElementById('settings-overlay').classList.add('hidden');
    document.getElementById('cal-back-btn').onclick = () => isNaN(document.getElementById('calendar-title').innerText) ? Calendar.renderMesi() : document.getElementById('calendar-overlay').classList.add('hidden');
    document.getElementById('time-picker-trigger').onclick = () => document.getElementById('wheel-picker-container').classList.toggle('hidden');
    document.getElementById('save-quick-event').onclick = () => QuickAdd.save();
    document.getElementById('close-quick-add').onclick = () => document.getElementById('quick-add-overlay').classList.add('hidden');
    document.getElementById('restore-settings').onclick = () => { if(confirm("Ripristinare impostazioni?")) { localStorage.removeItem('agendaSettings'); location.reload(); }};

   // Cerca questa parte in setupEventListeners() e aggiornala:

['cfg-start', 'cfg-end', 'cfg-step', 'cfg-color', 'cfg-font', 'cfg-layout'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;

    el.onchange = () => {
        let val = el.value;
        
        // Forza i valori numerici per orari e intervalli
        if (el.type === 'number' || id === 'cfg-step') {
            val = parseInt(el.value);
        }

        const key = id.replace('cfg-', '');
        
        // Mappatura corretta delle chiavi
        if (key === 'start') State.settings.startHour = val;
        else if (key === 'end') State.settings.endHour = val;
        else if (key === 'step') State.settings.interval = val; // Qui salviamo l'intervallo
        else State.settings[key] = val;

        Storage.save('agendaSettings', State.settings);
        Renderer.renderApp(); // Riesegue il rendering con il nuovo intervallo
    };
});
}

// --- INIT ---
const savedSettings = Storage.get('agendaSettings');
if (savedSettings) State.settings = { ...State.settings, ...savedSettings };
  // Aggiorna visivamente i selettori nelle impostazioni con i valori salvati
    document.getElementById('cfg-start').value = State.settings.startHour;
    document.getElementById('cfg-end').value = State.settings.endHour;
    document.getElementById('cfg-step').value = State.settings.interval;
    document.getElementById('cfg-color').value = State.settings.color;
    document.getElementById('cfg-font').value = State.settings.font;
    document.getElementById('cfg-layout').value = State.settings.layout;
setupEventListeners();
Renderer.renderApp();
function loadSettingsInUI() {
    // Questa funzione assicura che gli input grafici corrispondano allo State
    document.getElementById('cfg-start').value = State.settings.startHour;
    document.getElementById('cfg-end').value = State.settings.endHour;
    document.getElementById('cfg-step').value = State.settings.interval;
    document.getElementById('cfg-color').value = State.settings.color;
    document.getElementById('cfg-font').value = State.settings.font;
    document.getElementById('cfg-layout').value = State.settings.layout;
}

// Chiamala quando apri le impostazioni
document.getElementById('open-settings').onclick = () => {
    loadSettingsInUI(); // Sincronizza UI prima di mostrare
    document.getElementById('settings-overlay').classList.remove('hidden');
};
