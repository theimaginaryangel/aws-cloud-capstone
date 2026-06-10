/* ============================================
   TEAM CHECK-IN APP — FINAL INTEGRATED VERSION
   Limit: max 5 unique members/day, delete button, reactions, comments, dark mode
   ============================================ */

const STORAGE_KEY = 'team_checkins_v3';
const MAX_TEAM = 12;
let checkins = loadCheckins();
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

// Helper: today's date as YYYY-MM-DD
function getTodayDate() {
    return new Date().toISOString().split('T')[0];
}

function getTodayCheckins() {
    const today = getTodayDate();
    return checkins.filter(c => c.date === today);
}

function getUniqueMemberCountToday() {
    return new Set(getTodayCheckins().map(c => c.name.toLowerCase())).size;
}

// Update submit button state based on limit
function updateSubmitButtonState() {
    const uniqueCount = getUniqueMemberCountToday();
    const limitReached = uniqueCount >= MAX_TEAM;
    submitBtn.disabled = limitReached;
    if (limitReached && !formError.textContent.includes('limit reached')) {
        formError.textContent = `✅ Team limit reached (${MAX_TEAM}/${MAX_TEAM}). No more check‑ins for today.`;
    } else if (!limitReached && formError.textContent.includes('limit reached')) {
        formError.textContent = '';
    }
}

// Dynamic greeting based on hour
function setGreeting() {
    const hour = new Date().getHours();
    let greet = '';
    if (hour < 12) greet = '🌅 Good morning';
    else if (hour < 18) greet = '☀️ Good afternoon';
    else greet = '🌙 Good evening';
    dynamicGreeting.textContent = `${greet}, CloudTeam`;
}

// Daily rotating prompt
const prompts = [
    "What's one thing you'll finish today?",
    "What's blocking you?",
    "What are you knocking off the list today?",
    "Share a small win from yesterday.",
    "What are you learning right now?",
    "How can the team help you?"
];
const promptElement = document.getElementById('prompt-text');
if (promptElement) {
    promptElement.textContent = prompts[Math.floor(Math.random() * prompts.length)];
}

// Set header date
function setHeaderDate() {
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    headerDate.textContent = now.toLocaleDateString('en-GB', options);
}

// Theme toggle (dark/light mode)
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

// Character count for task textarea
inputTask.addEventListener('input', () => {
    charCount.textContent = `${inputTask.value.length} / 160`;
});

// Submit new check-in
submitBtn.addEventListener('click', handleSubmit);
function handleSubmit() {
    // Hard limit check
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
    const todayCheckins = getTodayCheckins();
    if (todayCheckins.some(c => c.name.toLowerCase() === name.toLowerCase()))
        return showError(`${name} already checked in today.`);

    if (getUniqueMemberCountToday() >= MAX_TEAM)
        return showError(`Cannot add more than ${MAX_TEAM} unique members today.`);

    const entry = {
        id: Date.now(),
        date: today,
        name: name,
        mood: selectedMood.emoji,
        moodLabel: selectedMood.label,
        status: status,
        task: task || '—',
        time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
        reactions: { '👍': 0, '🎉': 0, '☕': 0 },
        comments: []
    };
    checkins.unshift(entry);
    saveCheckins();
    renderAll();
    resetForm();
    showSuccess();
}

// Delete check-in (only today's entries are deletable)
function deleteCheckin(id) {
    const entry = checkins.find(c => c.id === id);
    if (!entry) return;
    if (entry.date !== getTodayDate()) {
        showError('You can only delete today’s check‑ins.');
        return;
    }
    checkins = checkins.filter(c => c.id !== id);
    saveCheckins();
    renderAll();
    updateSubmitButtonState();
    if (getUniqueMemberCountToday() < MAX_TEAM && formError.textContent.includes('limit')) {
        clearError();
    }
}

// Add reaction to a card
function addReaction(cardId, reactionType) {
    const entry = checkins.find(c => c.id === cardId);
    if (entry) {
        entry.reactions[reactionType] = (entry.reactions[reactionType] || 0) + 1;
        saveCheckins();
        renderAll();
    }
}

// Add comment to a card
function addComment(cardId, commentText) {
    if (!commentText.trim()) return;
    const entry = checkins.find(c => c.id === cardId);
    if (entry) {
        entry.comments.push({
            text: commentText.trim(),
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
        saveCheckins();
        renderAll();
    }
}

// Reset today's check-ins only
clearBtn.addEventListener('click', () => {
    const today = getTodayDate();
    const hasToday = checkins.some(c => c.date === today);
    if (!hasToday) return;
    if (confirm('Reset all check-ins for today?')) {
        checkins = checkins.filter(c => c.date !== today);
        saveCheckins();
        renderAll();
        updateSubmitButtonState();
        clearError();
        showSuccess();
    }
});

// Render everything: cards, badge, subtitle
function renderAll() {
    renderCards();
    updateCountBadge();
    updateSubtitle();
    updateSubmitButtonState();
}

function renderCards() {
    const todayCheckins = getTodayCheckins();
    cardsGrid.innerHTML = '';
    if (todayCheckins.length === 0) {
        emptyState.classList.remove('hidden');
        return;
    }
    emptyState.classList.add('hidden');

    todayCheckins.forEach(entry => {
        const card = document.createElement('div');
        card.className = 'checkin-card';
        card.setAttribute('data-id', entry.id);

        // Build reactions HTML
        let reactionsHtml = '';
        for (const [emoji, count] of Object.entries(entry.reactions)) {
            reactionsHtml += `<button class="reaction-btn" data-reaction="${emoji}">${emoji}<span class="reaction-count">${count}</span></button>`;
        }

        // Build comments HTML
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

        // Attach reaction listeners
        card.querySelectorAll('.reaction-btn').forEach(btn => {
            const reaction = btn.getAttribute('data-reaction');
            btn.addEventListener('click', () => addReaction(entry.id, reaction));
        });

        // Attach comment listener
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

        // Attach delete listener
        card.querySelector('.card-delete').addEventListener('click', () => deleteCheckin(entry.id));

        cardsGrid.appendChild(card);
    });
}

function updateCountBadge() {
    const unique = getUniqueMemberCountToday();
    countBadge.textContent = `${unique} / ${MAX_TEAM} checked in`;
    if (unique >= MAX_TEAM) {
        countBadge.style.background = 'rgba(16,185,129,0.2)';
        countBadge.style.color = '#6EE7B7';
    } else {
        countBadge.style.background = '';
        countBadge.style.color = '';
    }
}

function updateSubtitle() {
    const u = getUniqueMemberCountToday();
    if (u === 0) cardsSubtitle.textContent = 'No one has checked in yet — be the first.';
    else if (u === 1) cardsSubtitle.textContent = '1 team member has checked in today.';
    else if (u >= MAX_TEAM) cardsSubtitle.textContent = 'Full team checked in! 🎉';
    else cardsSubtitle.textContent = `${u} team members have checked in today.`;
}

// Form helpers
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
function escapeHtml(str) {
    return str.replace(/[&<>]/g, function (m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// Storage with auto‑cleanup (keep last 7 days)
function saveCheckins() {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoStr = weekAgo.toISOString().split('T')[0];
    checkins = checkins.filter(c => c.date >= weekAgoStr);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(checkins));
}
function loadCheckins() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const loaded = raw ? JSON.parse(raw) : [];
        return loaded.map(entry => {
            if (!entry.reactions) entry.reactions = { '👍': 0, '🎉': 0, '☕': 0 };
            if (!entry.comments) entry.comments = [];
            return entry;
        });
    } catch (e) { return []; }
}

// Initialise
setHeaderDate();
setGreeting();
initTheme();
renderAll();