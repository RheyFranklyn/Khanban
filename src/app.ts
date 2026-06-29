type ColumnStatus = 'todo' | 'in-progress' | 'review' | 'done'
type TaskTag = 'urgent' | 'priority' | 'marketing' | 'planning'

interface Task {
    id: number, 
    title: string,
    description: string,
    tag: TaskTag,
    initials: string,
    color: string,
    status: ColumnStatus
}

const tagClass: Record<TaskTag, string> = {
    urgent: 'tag-urgent',
    priority: 'tag-priority',
    marketing: 'tag-marketing',
    planning: 'tag-planning'
};

const tagLabel: Record<TaskTag, string> = {
    urgent: 'Urgent',
    priority: 'Priority',
    marketing: 'Marketing',
    planning: 'Planning'
};

// COLLORS
const TAG_COLOR: Record<TaskTag, string> = {
    priority: '#5b6cff',
    marketing: '#2ecc71',
    urgent: '#e0394c',
    planning: '#ff9f43'
};

class KanbanBoard {
    private arrayOfTask: Task[] = []
    private idCounter = 1;

    addTask(
        title: string,
        description: string,
        tag: TaskTag = 'marketing',
        initials: string = '?',
        color: string = TAG_COLOR[tag]
    ): void {
        try {
            if (!title || title.trim() === "") {
                throw new Error("Task title cannot be empty.");
            }

            const newTask: Task = {
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

        } catch (error) {
            console.error("Failed to add task:", (error as Error).message);
            throw error;
        }
    }

    getTasksByStatus(status: ColumnStatus): ReadonlyArray<Task> {
        return this.arrayOfTask.filter(element => element.status === status)
    }

    getAllTasks(): ReadonlyArray<Task> {
        return this.arrayOfTask
    }

    updateTaskStatus(id: number, newStatus: ColumnStatus): void {
        const taskToUpdate = this.arrayOfTask.find(element => element.id === id);
        if (taskToUpdate) {
            taskToUpdate.status = newStatus;
        } else {
            console.warn(`Task with ID ${id} not found to update status.`);
        }
    }

    updateTaskDetails(id: number, updates: Partial<Task>): void {
        const taskToUpdate = this.arrayOfTask.find(element => element.id === id)
        if (!taskToUpdate) {
            console.warn(`Task with ID ${id} not found.`);
            return;
        }
        Object.assign(taskToUpdate, updates)
    }

    deleteTask(id: number): void {
        this.arrayOfTask = this.arrayOfTask.filter(element => element.id !== id)
    }
}




const board = new KanbanBoard();

// premade data
board.addTask('Design empty states for the inbox', 'Cover loading and error states', 'priority', 'AK');
board.addTask('Audit color contrast of dark mode', 'WCAG AA pass', 'urgent', 'AK');
board.addTask('Write copy for the users', 'Welcome + day 3 + day 7', 'marketing', 'JM');
board.addTask('Migrate billing service', '', 'planning', 'RV');
board.updateTaskStatus(4, 'in-progress'); 

const STATUSES: ColumnStatus[] = ['todo', 'in-progress', 'review', 'done'];
let currentSearch = '';

function matchesSearch(task: Task): boolean {
    if (!currentSearch) return true;
    const haystack = `${task.title} ${task.description}`.toLowerCase();
    return haystack.includes(currentSearch);
}

function renderBoard(): void {
    STATUSES.forEach(status => {
        const list = document.querySelector<HTMLElement>(`.card-list[data-status="${status}"]`);
        if (!list) return;

        list.innerHTML = '';
        const tasks = board.getTasksByStatus(status).filter(matchesSearch);

        tasks.forEach(task => {
            list.appendChild(renderCard(task));
        });

        updateCount(status);
    });
}

function renderCard(task: Task): HTMLElement {
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

function escapeHtml(s: string): string {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
}

function updateCount(status: ColumnStatus): void {
    const col = document.querySelector<HTMLElement>(`.column[data-status="${status}"]`);
    if (!col) return;
    const countEl = col.querySelector('.count');
    if (countEl) countEl.textContent = String(board.getTasksByStatus(status).length);
}

renderBoard();

// ---------------- search ----------------
const searchInput = document.getElementById('searchInput') as HTMLInputElement;

searchInput.addEventListener('input', () => {
    currentSearch = searchInput.value.trim().toLowerCase();
    renderBoard();
});

// ---------------- drag logic ----------------
let dragCard: HTMLElement | null = null;
let dragId: number | null = null;
let startX = 0, startY = 0;
let placeholder: HTMLElement | null = null;
let lastClientX = 0, lastClientY = 0;

// spring-follow state: the card eases toward the pointer instead of snapping to it
let renderX = 0, renderY = 0;   // current rendered offset
let targetX = 0, targetY = 0;   // raw pointer offset
let dragLoopActive = false;
const FOLLOW_EASE = 0.32; // lower = laggier/floatier, higher = snappier

function makePlaceholder(height: number): HTMLElement {
    const ph = document.createElement('div');
    ph.className = 'placeholder active';
    ph.style.setProperty('--ph-height', `${height}px`);
    return ph;
}

function onPointerDown(e: PointerEvent): void {
    const target = e.target as HTMLElement;

    // clicking edit/delete should not start a drag
    if (target.closest('.card-action-btn')) return;

    const card = target.closest('.card') as HTMLElement | null;
    if (!card) return;

    dragCard = card;
    dragId = Number(card.dataset.id);
    startX = e.clientX;
    startY = e.clientY;
    renderX = 0; renderY = 0;
    targetX = 0; targetY = 0;

    const rect = card.getBoundingClientRect();
    placeholder = makePlaceholder(rect.height);
    card.after(placeholder);

    card.style.position = 'fixed';
    card.style.width = `${rect.width}px`;
    card.style.top = `${rect.top}px`;
    card.style.left = `${rect.left}px`;
    card.style.margin = '0';
    card.style.pointerEvents = 'none';

    document.body.appendChild(card);
    document.body.classList.add('is-dragging-card');

    // quick pop on pickup, then switch to untransitioned tracking
    card.style.transition = 'transform 120ms cubic-bezier(0.2, 0, 0, 1), box-shadow 120ms ease';
    card.style.transform = 'scale(1.04)';
    card.classList.add('dragging');

    setTimeout(() => {
        if (dragCard === card) card.style.transition = 'none';
    }, 120);

    card.setPointerCapture(e.pointerId);
    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);

    dragLoopActive = true;
    requestAnimationFrame(dragLoop);
}

function onPointerMove(e: PointerEvent): void {
    lastClientX = e.clientX;
    lastClientY = e.clientY;
    targetX = lastClientX - startX;
    targetY = lastClientY - startY;
}

function dragLoop(): void {
    if (!dragLoopActive || !dragCard) return;

    renderX += (targetX - renderX) * FOLLOW_EASE;
    renderY += (targetY - renderY) * FOLLOW_EASE;

    const lag = targetX - renderX;
    const tilt = Math.max(-8, Math.min(8, lag * 0.45));

    dragCard.style.transform = `translate(${renderX}px, ${renderY}px) scale(1.04) rotate(${tilt}deg)`;

    updateDropTarget();
    requestAnimationFrame(dragLoop);
}

function updateDropTarget(): void {
    if (!placeholder) return;

    const el = document.elementFromPoint(lastClientX, lastClientY);
    const column = el ? (el as HTMLElement).closest('.column') as HTMLElement | null : null;

    document.querySelectorAll('.column').forEach(c => c.classList.remove('drag-over'));
    if (!column) return;
    column.classList.add('drag-over');

    const list = column.querySelector('.card-list') as HTMLElement;
    const cards = Array.from(list.querySelectorAll('.card:not(.dragging)')) as HTMLElement[];

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
    if (!inserted) list.appendChild(placeholder);
}

function onPointerUp(): void {
    dragLoopActive = false;
    document.body.classList.remove('is-dragging-card');
    document.querySelectorAll('.column').forEach(c => c.classList.remove('drag-over'));
    document.removeEventListener('pointermove', onPointerMove);
    document.removeEventListener('pointerup', onPointerUp);

    if (!dragCard || !placeholder || dragId === null) return;

    const targetList = placeholder.parentElement as HTMLElement;
    const targetColumn = targetList.closest('.column') as HTMLElement;
    const newStatus = targetColumn.dataset.status as ColumnStatus;

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
    dragCard.style.transform = `translate(${dx}px, ${dy}px) scale(1.04)`;

    const settledCard = dragCard;
    requestAnimationFrame(() => {
        settledCard.classList.remove('dragging');
        // slight overshoot on settle for a springy feel
        settledCard.style.transition = 'transform 320ms cubic-bezier(0.34, 1.42, 0.64, 1), box-shadow 220ms ease';
        settledCard.style.transform = '';
    });

    const onSettled = () => {
        settledCard.style.transition = '';
        settledCard.removeEventListener('transitionend', onSettled);
    };
    settledCard.addEventListener('transitionend', onSettled);

    board.updateTaskStatus(dragId, newStatus);

    playDropSound();

    STATUSES.forEach(updateCount);


    dragCard = null;
    placeholder = null;
    dragId = null;
}

document.getElementById('board')!.addEventListener('pointerdown', onPointerDown as EventListener);

// ---------------- edit / delete ----------------
document.getElementById('board')!.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const actionBtn = target.closest('.card-action-btn') as HTMLElement | null;
    if (!actionBtn) return;

    const card = actionBtn.closest('.card') as HTMLElement | null;
    if (!card) return;

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
        if (task) openModal(task);
    }
});

// ---------------- drop sound effect ----------------
const dropAudio = new Audio('https://www.myinstants.com/media/sounds/pou-sound-effect.mp3');
dropAudio.volume = 0.7;
 
function playDropSound(): void {
    dropAudio.currentTime = 0; 
    dropAudio.play().catch(() => {
        
    });
}

// ---------------- add task modal ----------------
const addTaskBtn = document.getElementById('addTaskBtn') as HTMLButtonElement;
const modalOverlay = document.getElementById('modalOverlay') as HTMLElement;
const addTaskForm = document.getElementById('addTaskForm') as HTMLFormElement;
const cancelAddTask = document.getElementById('cancelAddTask') as HTMLButtonElement;
const taskTitleInput = document.getElementById('taskTitle') as HTMLInputElement;
const taskDescriptionInput = document.getElementById('taskDescription') as HTMLTextAreaElement;
const taskTagSelect = document.getElementById('taskTag') as HTMLSelectElement;
const taskInitialsInput = document.getElementById('taskInitials') as HTMLInputElement;
const modalTitle = document.getElementById('modalTitle') as HTMLElement;
const editingTaskIdInput = document.getElementById('editingTaskId') as HTMLInputElement;
const submitTaskBtn = document.getElementById('submitTaskBtn') as HTMLButtonElement;

function openModal(task?: Task): void {
    if (task) {
        // edit mode — prefill fields and remember which task we're updating
        modalTitle.textContent = 'Edit task';
        submitTaskBtn.textContent = 'Save changes';
        editingTaskIdInput.value = String(task.id);
        taskTitleInput.value = task.title;
        taskDescriptionInput.value = task.description;
        taskTagSelect.value = task.tag;
        taskInitialsInput.value = task.initials;
    } else {
        // add mode
        modalTitle.textContent = 'New task';
        submitTaskBtn.textContent = 'Add task';
        editingTaskIdInput.value = '';
        addTaskForm.reset();
    }

    modalOverlay.classList.add('open');
    taskTitleInput.focus();
}

function closeModal(): void {
    modalOverlay.classList.remove('open');
    addTaskForm.reset();
    editingTaskIdInput.value = '';
}

addTaskBtn.addEventListener('click', () => openModal());
cancelAddTask.addEventListener('click', closeModal);

// click outside the modal card closes it
modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
});

// Escape key closes it
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalOverlay.classList.contains('open')) closeModal();
});

addTaskForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const editingId = editingTaskIdInput.value ? Number(editingTaskIdInput.value) : null;

    try {
        if (editingId !== null) {
            // edit mode — update existing task, status is left untouched
            const tag = taskTagSelect.value as TaskTag;
            board.updateTaskDetails(editingId, {
                title: taskTitleInput.value.trim(),
                description: taskDescriptionInput.value,
                tag: tag,
                initials: (taskInitialsInput.value || '?').trim().slice(0, 2).toUpperCase(),
                color: TAG_COLOR[tag]
            });
        } else {
            // add mode — new task
            board.addTask(
                taskTitleInput.value,
                taskDescriptionInput.value,
                taskTagSelect.value as TaskTag,
                taskInitialsInput.value || '?'
            );
        }
        renderBoard();
        closeModal();
    } catch (error) {
        // addTask throws on empty title — surface it instead of silently failing
        taskTitleInput.setCustomValidity((error as Error).message);
        taskTitleInput.reportValidity();
        taskTitleInput.addEventListener('input', () => taskTitleInput.setCustomValidity(''), { once: true });
    }
});