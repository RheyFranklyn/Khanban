const tagClass = {
    urgent: 'tag-urgent',
    priority: 'tag-priority',
    marketing: 'tag-marketing',
    planning: 'tag-planning'
};
const tagLabel = {
    urgent: 'Urgent',
    priority: 'Priority',
    marketing: 'Marketing',
    planning: 'Planning'
};
// COLLORS
const TAG_COLOR = {
    priority: '#5b6cff',
    marketing: '#2ecc71',
    urgent: '#e0394c',
    planning: '#ff9f43'
};
class KanbanBoard {
    arrayOfTask = [];
    idCounter = 1;
    addTask(title, description, tag = 'marketing', initials = '?', color = TAG_COLOR[tag]) {
        try {
            if (!title || title.trim() === "") {
                throw new Error("Task title cannot be empty.");
            }
            const newTask = {
                id: this.idCounter,
                title: title.trim(),
                description: description,
                tag: tag,
                initials: initials.trim().slice(0, 2).toUpperCase() || '?',
                color: color,
                status: 'todo'
            };
            this.arrayOfTask.push(newTask);
            this.idCounter++;
        }
        catch (error) {
            console.error("Failed to add task:", error.message);
            throw error;
        }
    }
    getTasksByStatus(status) {
        return this.arrayOfTask.filter(element => element.status === status);
    }
    getAllTasks() {
        return this.arrayOfTask;
    }
    updateTaskStatus(id, newStatus) {
        const taskToUpdate = this.arrayOfTask.find(element => element.id === id);
        if (taskToUpdate) {
            taskToUpdate.status = newStatus;
        }
        else {
            console.warn(`Task with ID ${id} not found to update status.`);
        }
    }
    updateTaskDetails(id, updates) {
        const taskToUpdate = this.arrayOfTask.find(element => element.id === id);
        if (!taskToUpdate) {
            console.warn(`Task with ID ${id} not found.`);
            return;
        }
        Object.assign(taskToUpdate, updates);
    }
    deleteTask(id) {
        this.arrayOfTask = this.arrayOfTask.filter(element => element.id !== id);
    }
}
// =========================================================
// UI / rendering layer — talks to KanbanBoard, never touches
// arrayOfTask directly. Everything below this line is new.
// =========================================================
const board = new KanbanBoard();
// seed data so the board isn't empty on load — replace with your own input flow
board.addTask('Design empty states for the inbox', 'Cover loading and error states', 'priority', 'AK');
board.addTask('Audit color contrast of dark mode', 'WCAG AA pass', 'urgent', 'AK');
board.addTask('Write copy for the users', 'Welcome + day 3 + day 7', 'marketing', 'JM');
board.addTask('Migrate billing service', '', 'planning', 'RV');
board.updateTaskStatus(4, 'in-progress'); // example of moving a seeded task
const STATUSES = ['todo', 'in-progress', 'review', 'done'];
let currentSearch = '';
function matchesSearch(task) {
    if (!currentSearch)
        return true;
    const haystack = `${task.title} ${task.description}`.toLowerCase();
    return haystack.includes(currentSearch);
}
function renderBoard() {
    STATUSES.forEach(status => {
        const list = document.querySelector(`.card-list[data-status="${status}"]`);
        if (!list)
            return;
        list.innerHTML = '';
        const tasks = board.getTasksByStatus(status).filter(matchesSearch);
        tasks.forEach(task => {
            list.appendChild(renderCard(task));
        });
        updateCount(status);
    });
}
function renderCard(task) {
    const card = document.createElement('div');
    card.className = 'card';
    card.dataset.id = String(task.id);
    card.innerHTML = `
        <div class="card-top">
            <span class="card-tag ${tagClass[task.tag]}">${tagLabel[task.tag]}</span>
            <div class="card-actions">
                <button class="card-action-btn edit" type="button" data-action="edit" title="Edit task">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="currentColor"/>
                    </svg>
                </button>
                <button class="card-action-btn delete" type="button" data-action="delete" title="Delete task">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M6 7h12M9.5 7V5.5a1.5 1.5 0 0 1 1.5-1.5h2a1.5 1.5 0 0 1 1.5 1.5V7m-8 0 .75 12.5A1.5 1.5 0 0 0 9.24 21h5.52a1.5 1.5 0 0 0 1.49-1.5L17 7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
                    </svg>
                </button>
            </div>
        </div>
        <div class="card-title">${escapeHtml(task.title)}</div>
        ${task.description ? `<div class="card-desc">${escapeHtml(task.description)}</div>` : ''}
        <div class="card-footer">
            <span class="card-id">#${task.id}</span>
            <span class="avatar" style="background:${task.color}">${task.initials}</span>
        </div>`;
    return card;
}
function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
}
function updateCount(status) {
    const col = document.querySelector(`.column[data-status="${status}"]`);
    if (!col)
        return;
    const countEl = col.querySelector('.count');
    if (countEl)
        countEl.textContent = String(board.getTasksByStatus(status).length);
}
renderBoard();
// ---------------- search ----------------
const searchInput = document.getElementById('searchInput');
searchInput.addEventListener('input', () => {
    currentSearch = searchInput.value.trim().toLowerCase();
    renderBoard();
});
// ---------------- drag logic ----------------
let dragCard = null;
let dragId = null;
let startX = 0, startY = 0;
let placeholder = null;
let rafPending = false;
let lastClientX = 0, lastClientY = 0;
function makePlaceholder(height) {
    const ph = document.createElement('div');
    ph.className = 'placeholder active';
    ph.style.setProperty('--ph-height', `${height}px`);
    return ph;
}
function onPointerDown(e) {
    const target = e.target;
    // clicking edit/delete should not start a drag
    if (target.closest('.card-action-btn'))
        return;
    const card = target.closest('.card');
    if (!card)
        return;
    dragCard = card;
    dragId = Number(card.dataset.id);
    startX = e.clientX;
    startY = e.clientY;
    const rect = card.getBoundingClientRect();
    placeholder = makePlaceholder(rect.height);
    card.after(placeholder);
    card.style.position = 'fixed';
    card.style.width = `${rect.width}px`;
    card.style.top = `${rect.top}px`;
    card.style.left = `${rect.left}px`;
    card.style.margin = '0';
    card.style.pointerEvents = 'none';
    card.classList.add('dragging');
    document.body.appendChild(card);
    card.setPointerCapture(e.pointerId);
    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
}
function onPointerMove(e) {
    lastClientX = e.clientX;
    lastClientY = e.clientY;
    if (!rafPending) {
        rafPending = true;
        requestAnimationFrame(() => {
            updateDragPosition();
            updateDropTarget();
            rafPending = false;
        });
    }
}
function updateDragPosition() {
    if (!dragCard)
        return;
    const dx = lastClientX - startX;
    const dy = lastClientY - startY;
    dragCard.style.transform = `translate(${dx}px, ${dy}px) scale(1.02)`;
}
function updateDropTarget() {
    if (!placeholder)
        return;
    const el = document.elementFromPoint(lastClientX, lastClientY);
    const column = el ? el.closest('.column') : null;
    document.querySelectorAll('.column').forEach(c => c.classList.remove('drag-over'));
    if (!column)
        return;
    column.classList.add('drag-over');
    const list = column.querySelector('.card-list');
    const cards = Array.from(list.querySelectorAll('.card:not(.dragging)'));
    let inserted = false;
    for (const sib of cards) {
        const rect = sib.getBoundingClientRect();
        const mid = rect.top + rect.height / 2;
        if (lastClientY < mid) {
            sib.before(placeholder);
            inserted = true;
            break;
        }
    }
    if (!inserted)
        list.appendChild(placeholder);
}
function onPointerUp() {
    document.querySelectorAll('.column').forEach(c => c.classList.remove('drag-over'));
    document.removeEventListener('pointermove', onPointerMove);
    document.removeEventListener('pointerup', onPointerUp);
    if (!dragCard || !placeholder || dragId === null)
        return;
    const targetList = placeholder.parentElement;
    const targetColumn = targetList.closest('.column');
    const newStatus = targetColumn.dataset.status;
    const phRectBefore = placeholder.getBoundingClientRect();
    placeholder.replaceWith(dragCard);
    dragCard.style.position = '';
    dragCard.style.width = '';
    dragCard.style.top = '';
    dragCard.style.left = '';
    dragCard.style.margin = '';
    dragCard.style.pointerEvents = '';
    const cardRectAfter = dragCard.getBoundingClientRect();
    const dx = phRectBefore.left - cardRectAfter.left;
    const dy = phRectBefore.top - cardRectAfter.top;
    dragCard.style.transform = `translate(${dx}px, ${dy}px) scale(1.02)`;
    const settledCard = dragCard;
    requestAnimationFrame(() => {
        settledCard.classList.remove('dragging');
        settledCard.style.transition = 'transform 220ms cubic-bezier(0.2,0,0,1), box-shadow 220ms ease';
        settledCard.style.transform = '';
    });
    const onSettled = () => {
        settledCard.style.transition = '';
        settledCard.removeEventListener('transitionend', onSettled);
    };
    settledCard.addEventListener('transitionend', onSettled);
    // ---- this is the only line that talks to your CRUD layer ----
    board.updateTaskStatus(dragId, newStatus);
    playDropSound();
    // counts need refreshing on both the origin and destination columns
    STATUSES.forEach(updateCount);
    // NOTE: in-column reordering is visual only right now because Task
    // has no `order` field. If you want persisted order, add `order: number`
    // to Task and update it here based on the card's new index in targetList.
    dragCard = null;
    placeholder = null;
    dragId = null;
}
document.getElementById('board').addEventListener('pointerdown', onPointerDown);
// ---------------- edit / delete ----------------
document.getElementById('board').addEventListener('click', (e) => {
    const target = e.target;
    const actionBtn = target.closest('.card-action-btn');
    if (!actionBtn)
        return;
    const card = actionBtn.closest('.card');
    if (!card)
        return;
    const id = Number(card.dataset.id);
    const action = actionBtn.dataset.action;
    if (action === 'delete') {
        const task = board.getAllTasks().find(t => t.id === id);
        const confirmed = window.confirm(`Delete "${task?.title ?? 'this task'}"? This can't be undone.`);
        if (confirmed) {
            board.deleteTask(id);
            renderBoard();
        }
    }
    if (action === 'edit') {
        const task = board.getAllTasks().find(t => t.id === id);
        if (task)
            openModal(task);
    }
});
// ---------------- drop sound effect ----------------
const dropAudio = new Audio('https://www.myinstants.com/media/sounds/pou-sound-effect.mp3');
dropAudio.volume = 0.7;
function playDropSound() {
    dropAudio.currentTime = 0; // Rewind so rapid repeat drops still play from the start
    dropAudio.play().catch(() => {
        // Autoplay can still be blocked on the very first interaction — safe to ignore
    });
}
// ---------------- add task modal ----------------
const addTaskBtn = document.getElementById('addTaskBtn');
const modalOverlay = document.getElementById('modalOverlay');
const addTaskForm = document.getElementById('addTaskForm');
const cancelAddTask = document.getElementById('cancelAddTask');
const taskTitleInput = document.getElementById('taskTitle');
const taskDescriptionInput = document.getElementById('taskDescription');
const taskTagSelect = document.getElementById('taskTag');
const taskInitialsInput = document.getElementById('taskInitials');
const modalTitle = document.getElementById('modalTitle');
const editingTaskIdInput = document.getElementById('editingTaskId');
const submitTaskBtn = document.getElementById('submitTaskBtn');
function openModal(task) {
    if (task) {
        // edit mode — prefill fields and remember which task we're updating
        modalTitle.textContent = 'Edit task';
        submitTaskBtn.textContent = 'Save changes';
        editingTaskIdInput.value = String(task.id);
        taskTitleInput.value = task.title;
        taskDescriptionInput.value = task.description;
        taskTagSelect.value = task.tag;
        taskInitialsInput.value = task.initials;
    }
    else {
        // add mode
        modalTitle.textContent = 'New task';
        submitTaskBtn.textContent = 'Add task';
        editingTaskIdInput.value = '';
        addTaskForm.reset();
    }
    modalOverlay.classList.add('open');
    taskTitleInput.focus();
}
function closeModal() {
    modalOverlay.classList.remove('open');
    addTaskForm.reset();
    editingTaskIdInput.value = '';
}
addTaskBtn.addEventListener('click', () => openModal());
cancelAddTask.addEventListener('click', closeModal);
// click outside the modal card closes it
modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay)
        closeModal();
});
// Escape key closes it
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalOverlay.classList.contains('open'))
        closeModal();
});
addTaskForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const editingId = editingTaskIdInput.value ? Number(editingTaskIdInput.value) : null;
    try {
        if (editingId !== null) {
            // edit mode — update existing task, status is left untouched
            const tag = taskTagSelect.value;
            board.updateTaskDetails(editingId, {
                title: taskTitleInput.value.trim(),
                description: taskDescriptionInput.value,
                tag: tag,
                initials: (taskInitialsInput.value || '?').trim().slice(0, 2).toUpperCase(),
                color: TAG_COLOR[tag]
            });
        }
        else {
            // add mode — new task
            board.addTask(taskTitleInput.value, taskDescriptionInput.value, taskTagSelect.value, taskInitialsInput.value || '?');
        }
        renderBoard();
        closeModal();
    }
    catch (error) {
        // addTask throws on empty title — surface it instead of silently failing
        taskTitleInput.setCustomValidity(error.message);
        taskTitleInput.reportValidity();
        taskTitleInput.addEventListener('input', () => taskTitleInput.setCustomValidity(''), { once: true });
    }
});
export {};
//# sourceMappingURL=app.js.map