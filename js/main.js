/* ============================================
   TEAM CHECK-IN APP — SYNC VERSION (Node.js backend)
   All users share the same check-ins via EC2 file storage.
   ============================================ */

const MAX_TEAM = 12;
let checkins = [];
let selectedMood = null;

// DOM elements
const inputName = document.getElementById('input-name');
const inputStatus = document.getElementById('input-status');
const inputTask = document.getElementById('input-task');
const moodPicker = document.getElementById('mood-picker');
const submitBtn = document.getElementById('submit-btn');
const clearBtn = document.getElementById('clear-btn');
const formError = document.getElementById('form-error');
const successToast = document.getElementById('success-toast');
const cardsGrid = document.getElementById('cards-grid');
const emptyState = document.getElementById('empty-state');
const cardsSubtitle = document.getElementById('cards-subtitle');
const countBadge = document.getElementById('checkin-count-badge');
const charCount = document.getElementById('char-count');
const headerDate = document.getElementById('header-date');
const themeToggle = document.getElementById('theme-toggle');
const dynamicGreeting = document.getElementById('dynamic-greeting');

function getTodayDate() { return new Date().toISOString().split('T')[0]; }
function getTodayCheckins() { return checkins.filter(c => c.date === getTodayDate()); }
function getUniqueMemberCountToday() { return new Set(getTodayCheckins().map(c => c.name.toLowerCase())).size; }

function updateSubmitButtonState() {
    const uniqueCount = getUniqueMemberCountToday();
    submitBtn.disabled = uniqueCount >= MAX_TEAM;
    if (submitBtn.disabled && !formError.textContent.includes('limit reached')) {
        formError.textContent = `✅ Team limit reached (${MAX_TEAM}/${MAX_TEAM}). No more check‑ins for today.`;
    } else if (!submitBtn.disabled && formError.textContent.includes('limit reached')) {
        formError.textContent = '';
    }
}

function setGreeting() {
    const hour = new Date().getHours();
    let greet = '';
    if (hour < 12) greet = '🌅 Good morning';
    else if (hour < 18) greet = '☀️ Good afternoon';
    else greet = '🌙 Good evening';
    dynamicGreeting.textContent = `${greet}, CloudTeam`;
}

function setHeaderDate() {
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    headerDate.textContent = now.toLocaleDateString('en-GB', options);
}

// Theme toggle
function initTheme() {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') document.body.classList.add('dark-mode');
    themeToggle.textContent = document.body.classList.contains('dark-mode') ? '☀️' : '🌙';
}
themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    themeToggle.textContent = isDark ? '☀️' : '🌙';
});

// Mood picker
moodPicker.addEventListener('click', (e) => {
    const btn = e.target.closest('.mood-btn');
    if (!btn) return;
    document.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    selectedMood = { emoji: btn.dataset.mood, label: btn.dataset.label };
    clearError();
});

inputTask.addEventListener('input', () => {
    charCount.textContent = `${inputTask.value.length} / 160`;
});

// API calls
async function loadCheckins() {
    try {
        const res = await fetch('/api/checkins');
        if (!res.ok) throw new Error('Failed to fetch');
        checkins = await res.json();
        renderAll();
    } catch (err) {
        console.error('Error loading check-ins:', err);
        showError('Cannot connect to server. Please refresh.');
    }
}

async function addCheckinToServer(entry) {
    const res = await fetch('/api/checkins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry)
    });
    if (res.ok) {
        await loadCheckins();
        return true;
    } else {
        const err = await res.json();
        showError(err.error || 'Failed to add check-in');
        return false;
    }
}

async function deleteCheckinOnServer(id) {
    await fetch(`/api/checkins/${id}`, { method: 'DELETE' });
    await loadCheckins();
}

async function addReactionOnServer(cardId, reactionType) {
    await fetch(`/api/reactions/${cardId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reactionType })
    });
    await loadCheckins();
}

async function addCommentOnServer(cardId, text, timestamp) {
    await fetch(`/api/comments/${cardId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, timestamp })
    });
    await loadCheckins();
}

async function resetTodayOnServer() {
    await fetch('/api/reset-today', { method: 'DELETE' });
    await loadCheckins();
}

// Submit handler
submitBtn.addEventListener('click', handleSubmit);
async function handleSubmit() {
    if (getUniqueMemberCountToday() >= MAX_TEAM) {
        showError(`Limit reached: only ${MAX_TEAM} team members can check in per day.`);
        updateSubmitButtonState();
        return;
    }

    const name = inputName.value.trim();
    const status = inputStatus.value.trim();
    const task = inputTask.value.trim();

    if (!name) return showError('Enter your name.');
    if (!selectedMood) return showError('Pick a mood.');
    if (!status) return showError('Add a status.');

    const today = getTodayDate();
    if (getTodayCheckins().some(c => c.name.toLowerCase() === name.toLowerCase()))
        return showError(`${name} already checked in today.`);

    const entry = {
        id: Date.now(),
        date: today,
        name,
        mood: selectedMood.emoji,
        moodLabel: selectedMood.label,
        status,
        task: task || '—',
        time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
        reactions: { '👍': 0, '🎉': 0, '☕': 0 },
        comments: []
    };
    const success = await addCheckinToServer(entry);
    if (success) {
        resetForm();
        showSuccess();
    }
}

function deleteCheckin(id) {
    const entry = checkins.find(c => c.id === id);
    if (entry && entry.date !== getTodayDate()) {
        showError('Can only delete today’s check‑ins.');
        return;
    }
    deleteCheckinOnServer(id);
}

function addReaction(cardId, reactionType) { addReactionOnServer(cardId, reactionType); }
function addComment(cardId, commentText) {
    if (!commentText.trim()) return;
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    addCommentOnServer(cardId, commentText.trim(), timestamp);
}

clearBtn.addEventListener('click', async () => {
    if (!checkins.some(c => c.date === getTodayDate())) return;
    if (confirm('Reset all check-ins for today?')) {
        await resetTodayOnServer();
        showSuccess();
    }
});

// Render functions
function renderCards() {
    const todayCheckins = getTodayCheckins();
    cardsGrid.innerHTML = '';
    if (todayCheckins.length === 0) { emptyState.classList.remove('hidden'); return; }
    emptyState.classList.add('hidden');
    todayCheckins.forEach(entry => {
        const card = document.createElement('div');
        card.className = 'checkin-card';
        card.setAttribute('data-id', entry.id);
        let reactionsHtml = '';
        for (const [emoji, count] of Object.entries(entry.reactions)) {
            reactionsHtml += `<button class="reaction-btn" data-reaction="${emoji}">${emoji}<span class="reaction-count">${count}</span></button>`;
        }
        let commentsHtml = '<div class="comment-section"><div class="comment-list">';
        entry.comments.forEach(com => {
            commentsHtml += `<div class="comment-item"><strong>${escapeHtml(com.timestamp)}</strong> ${escapeHtml(com.text)}</div>`;
        });
        commentsHtml += `</div><div class="comment-input-group">
      <input type="text" class="comment-input" placeholder="Add a comment..." maxlength="100">
      <button class="comment-add">💬</button>
    </div></div>`;
        card.innerHTML = `
      <span class="card-mood">${entry.mood}</span>
      <div class="card-name">${escapeHtml(entry.name)}</div>
      <div class="card-mood-label">${entry.moodLabel}</div>
      <div class="card-status">${escapeHtml(entry.status)}</div>
      <div class="card-task">${escapeHtml(entry.task)}</div>
      <div class="reactions-row">${reactionsHtml}</div>
      ${commentsHtml}
      <div class="card-footer">
        <span class="card-time">Checked in at ${entry.time}</span>
        <button class="card-delete" title="Remove check-in">✕</button>
      </div>
    `;
        card.querySelectorAll('.reaction-btn').forEach(btn => {
            btn.addEventListener('click', () => addReaction(entry.id, btn.getAttribute('data-reaction')));
        });
        const commentInput = card.querySelector('.comment-input');
        const commentAdd = card.querySelector('.comment-add');
        commentAdd.addEventListener('click', () => {
            addComment(entry.id, commentInput.value);
            commentInput.value = '';
        });
        commentInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                addComment(entry.id, commentInput.value);
                commentInput.value = '';
            }
        });
        card.querySelector('.card-delete').addEventListener('click', () => deleteCheckin(entry.id));
        cardsGrid.appendChild(card);
    });
}

function updateCountBadge() { countBadge.textContent = `${getUniqueMemberCountToday()} / ${MAX_TEAM} checked in`; }
function updateSubtitle() {
    const u = getUniqueMemberCountToday();
    if (u === 0) cardsSubtitle.textContent = 'No one has checked in yet — be the first.';
    else if (u === 1) cardsSubtitle.textContent = '1 team member has checked in today.';
    else if (u >= MAX_TEAM) cardsSubtitle.textContent = 'Full team checked in! 🎉';
    else cardsSubtitle.textContent = `${u} team members have checked in today.`;
}
function renderAll() {
    renderCards();
    updateCountBadge();
    updateSubtitle();
    updateSubmitButtonState();
}

function resetForm() {
    inputName.value = '';
    inputStatus.value = '';
    inputTask.value = '';
    charCount.textContent = '0 / 160';
    document.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('selected'));
    selectedMood = null;
    clearError();
}
function showError(msg) { formError.textContent = msg; }
function clearError() { formError.textContent = ''; }
function showSuccess() {
    successToast.classList.add('visible');
    setTimeout(() => successToast.classList.remove('visible'), 3000);
}
function escapeHtml(str) { return str.replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m] || m)); }

// Initial load
setHeaderDate();
setGreeting();
initTheme();
loadCheckins();