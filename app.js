// ═══════════════════════════════════════════════════════════
// app.js — ShortNotes Application Logic
// ES6 module; imported by index.html
// ═══════════════════════════════════════════════════════════

import {
  registerUser, loginUser, logoutUser,
  onAuthChange, currentUser,
  subscribeToNotes, addNote, updateNote, deleteNote,
  subscribeToSubjects, saveSubjects,
} from './firebase.js';

/* ═══════════════════════════════════════════════════════════
   STATE
═══════════════════════════════════════════════════════════ */
const State = {
  user:          null,
  notes:         [],       // raw from Firestore
  subjects:      [],       // user's subject list
  activeFilter:  'all',    // sidebar filter
  priorityFilter:'all',    // chip filter
  searchQuery:   '',
  sortBy:        'updatedAt',
  editingNoteId: null,     // null = create mode
  selectedColor: '#6c8aff',
  revisionNotes: [],
  revisionIndex: 0,
  revAnswerShown:false,
  unsubNotes:    null,
  unsubSubjects: null,
};

/* ═══════════════════════════════════════════════════════════
   DOM REFS
═══════════════════════════════════════════════════════════ */
const $ = (id) => document.getElementById(id);
const $$ = (sel) => document.querySelectorAll(sel);

// Screens
const authScreen  = $('authScreen');
const appScreen   = $('appScreen');

// Auth
const loginForm       = $('loginForm');
const signupForm      = $('signupForm');
const loginEmail      = $('loginEmail');
const loginPassword   = $('loginPassword');
const loginBtn        = $('loginBtn');
const signupName      = $('signupName');
const signupEmail     = $('signupEmail');
const signupPassword  = $('signupPassword');
const signupBtn       = $('signupBtn');
const goToSignup      = $('goToSignup');
const goToLogin       = $('goToLogin');
const logoutBtn       = $('logoutBtn');

// Topbar
const globalSearch     = $('globalSearch');
const themeToggle      = $('themeToggle');
const quickAddBtn      = $('quickAddBtn');
const userAvatar       = $('userAvatar');
const userDropdown     = $('userDropdown');
const userNameEl       = $('userName');
const userEmailEl      = $('userEmail');
const sidebarToggle    = $('sidebarToggle');

// Sidebar
const sidebar          = $('sidebar');
const subjectNav       = $('subjectNav');
const addSubjectBtn    = $('addSubjectBtn');
const revisionModeToggle = $('revisionModeToggle');

// Dashboard
const countAll         = $('countAll');
const countPinned      = $('countPinned');
const countImportant   = $('countImportant');
const countRevise      = $('countRevise');
const countMemorized   = $('countMemorized');
const dashTotal        = $('dashTotal');
const dashImportant    = $('dashImportant');
const dashRevise       = $('dashRevise');
const dashMemo         = $('dashMemo');

// Notes
const notesGrid        = $('notesGrid');
const emptyState       = $('emptyState');
const loadingState     = $('loadingState');

// Sort
const sortSelect       = $('sortSelect');

// Note modal
const noteModalOverlay = $('noteModalOverlay');
const modalHeading     = $('modalHeading');
const charCounter      = $('charCounter');
const noteTitle        = $('noteTitle');
const notePriority     = $('notePriority');
const noteSubject      = $('noteSubject');
const noteStatus       = $('noteStatus');
const colorPicker      = $('colorPicker');
const noteContent      = $('noteContent');
const noteKeywords     = $('noteKeywords');
const noteTags         = $('noteTags');
const notePin          = $('notePin');
const noteFav          = $('noteFav');
const autosaveStatus   = $('autosaveStatus');
const modalClose       = $('modalClose');
const modalCancelBtn   = $('modalCancelBtn');
const modalSaveBtn     = $('modalSaveBtn');

// Detail modal
const detailOverlay    = $('detailOverlay');
const detailSubject    = $('detailSubject');
const detailStatus     = $('detailStatus');
const detailPriority   = $('detailPriority');
const detailTitle      = $('detailTitle');
const detailContent    = $('detailContent');
const detailKeywords   = $('detailKeywords');
const detailTags       = $('detailTags');
const detailUpdated    = $('detailUpdated');
const detailCopy       = $('detailCopy');
const detailEdit       = $('detailEdit');
const detailDelete     = $('detailDelete');
const detailClose      = $('detailClose');

// Subject modal
const subjectModalOverlay = $('subjectModalOverlay');
const newSubjectInput     = $('newSubjectInput');
const subjectModalCancel  = $('subjectModalCancel');
const subjectModalSave    = $('subjectModalSave');

// Revision overlay
const revisionOverlay  = $('revisionOverlay');
const revProgFill      = $('revProgFill');
const revProgText      = $('revProgText');
const revisionCard     = $('revisionCard');
const revSubject       = $('revSubject');
const revTitle         = $('revTitle');
const revContent       = $('revContent');
const revKeywords      = $('revKeywords');
const revisionClose    = $('revisionClose');
const revPrev          = $('revPrev');
const revShow          = $('revShow');
const revNext          = $('revNext');

/* ═══════════════════════════════════════════════════════════
   INIT
═══════════════════════════════════════════════════════════ */
function init() {
  restoreTheme();
  bindAuthEvents();
  bindAppEvents();
  bindKeyboardShortcuts();

  onAuthChange((user) => {
    State.user = user;
    if (user) {
      showApp(user);
    } else {
      hideApp();
    }
  });
}

/* ═══════════════════════════════════════════════════════════
   AUTH
═══════════════════════════════════════════════════════════ */
function bindAuthEvents() {
  goToSignup.addEventListener('click', (e) => { e.preventDefault(); switchAuthForm('signup'); });
  goToLogin.addEventListener('click',  (e) => { e.preventDefault(); switchAuthForm('login'); });

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    setAuthLoading(loginBtn, true);
    try {
      await loginUser(loginEmail.value.trim(), loginPassword.value);
      toast('Welcome back! 👋', 'success');
    } catch (err) {
      toast(friendlyAuthError(err.code), 'error');
    } finally {
      setAuthLoading(loginBtn, false);
    }
  });

  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (signupPassword.value.length < 6) { toast('Password must be at least 6 characters.', 'error'); return; }
    setAuthLoading(signupBtn, true);
    try {
      await registerUser(signupName.value.trim(), signupEmail.value.trim(), signupPassword.value);
      toast('Account created! Let\'s get studying. 📚', 'success');
    } catch (err) {
      toast(friendlyAuthError(err.code), 'error');
    } finally {
      setAuthLoading(signupBtn, false);
    }
  });

  logoutBtn.addEventListener('click', async () => {
    closeDropdown();
    try { await logoutUser(); toast('Signed out. See you soon!', 'info'); }
    catch (err) { toast('Logout failed.', 'error'); }
  });
}

function switchAuthForm(to) {
  loginForm.classList.toggle('active', to === 'login');
  signupForm.classList.toggle('active', to === 'signup');
  if (to === 'login') loginEmail.focus();
  else signupName.focus();
}

function setAuthLoading(btn, loading) {
  btn.querySelector('.btn-text').classList.toggle('hidden', loading);
  btn.querySelector('.btn-loader').classList.toggle('hidden', !loading);
  btn.disabled = loading;
}

function friendlyAuthError(code) {
  const map = {
    'auth/user-not-found':        'No account with that email.',
    'auth/wrong-password':        'Incorrect password.',
    'auth/email-already-in-use':  'Email already in use.',
    'auth/invalid-email':         'Invalid email address.',
    'auth/weak-password':         'Password is too weak.',
    'auth/invalid-credential':    'Invalid email or password.',
    'auth/too-many-requests':     'Too many attempts. Try again later.',
  };
  return map[code] || 'Something went wrong. Please try again.';
}

/* ═══════════════════════════════════════════════════════════
   SHOW / HIDE APP
═══════════════════════════════════════════════════════════ */
function showApp(user) {
  authScreen.classList.add('hidden');
  appScreen.classList.remove('hidden');

  // User info
  const initial = (user.displayName || user.email || '?')[0].toUpperCase();
  userAvatar.textContent = initial;
  userNameEl.textContent = user.displayName || 'User';
  userEmailEl.textContent = user.email;

  // Subscribe to Firestore
  showLoading(true);
  State.unsubNotes = subscribeToNotes(
    user.uid,
    (notes) => {
      State.notes = notes;
      showLoading(false);
      renderAll();
    },
    (err) => {
      console.error('Notes subscription error:', err);
      showLoading(false);
      toast('Error loading notes.', 'error');
    }
  );

  State.unsubSubjects = subscribeToSubjects(user.uid, (subjects) => {
    State.subjects = subjects;
    renderSubjectNav();
    populateSubjectDatalist();
  });
}

function hideApp() {
  appScreen.classList.add('hidden');
  authScreen.classList.remove('hidden');

  // Unsubscribe
  if (State.unsubNotes)    { State.unsubNotes();    State.unsubNotes    = null; }
  if (State.unsubSubjects) { State.unsubSubjects(); State.unsubSubjects = null; }

  // Reset state
  State.notes    = [];
  State.subjects = [];
  State.editingNoteId = null;
  notesGrid.innerHTML = '';
  switchAuthForm('login');
  loginEmail.value = loginPassword.value = signupEmail.value = signupPassword.value = signupName.value = '';
}

/* ═══════════════════════════════════════════════════════════
   RENDER ALL
═══════════════════════════════════════════════════════════ */
function renderAll() {
  updateCounts();
  renderNotes();
  renderSubjectNav();
}

/* ── COUNTS ─────────────────────────────────────────────── */
function updateCounts() {
  const n = State.notes;
  const total     = n.length;
  const pinned    = n.filter(x => x.pinned).length;
  const important = n.filter(x => x.status === 'important').length;
  const revise    = n.filter(x => x.status === 'to-revise').length;
  const memorized = n.filter(x => x.status === 'memorized').length;

  countAll.textContent      = total;
  countPinned.textContent   = pinned;
  countImportant.textContent = important;
  countRevise.textContent   = revise;
  countMemorized.textContent = memorized;

  dashTotal.textContent     = total;
  dashImportant.textContent = important;
  dashRevise.textContent    = revise;
  dashMemo.textContent      = memorized;
}

/* ── SUBJECT NAV ────────────────────────────────────────── */
function renderSubjectNav() {
  // Collect subjects from both the saved list AND existing notes
  const fromNotes = [...new Set(State.notes.map(n => n.subject).filter(Boolean))];
  const merged    = [...new Set([...State.subjects, ...fromNotes])].sort();

  subjectNav.innerHTML = '';
  merged.forEach(subj => {
    const count = State.notes.filter(n => n.subject === subj).length;
    const isActive = State.activeFilter === `subject:${subj}`;
    const a = document.createElement('a');
    a.className = 'nav-item' + (isActive ? ' active' : '');
    a.href = '#';
    a.dataset.filter = `subject:${subj}`;
    a.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="4"/></svg>
      <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1">${esc(subj)}</span>
      <span class="nav-count">${count}</span>`;
    a.addEventListener('click', (e) => { e.preventDefault(); setActiveFilter(`subject:${subj}`); });
    subjectNav.appendChild(a);
  });
}

function populateSubjectDatalist() {
  const dl = $('subjectList');
  if (!dl) return;
  const fromNotes = [...new Set(State.notes.map(n => n.subject).filter(Boolean))];
  const merged    = [...new Set([...State.subjects, ...fromNotes])].sort();
  dl.innerHTML = merged.map(s => `<option value="${esc(s)}">`).join('');
}

/* ═══════════════════════════════════════════════════════════
   NOTES RENDERING
═══════════════════════════════════════════════════════════ */
function getFilteredNotes() {
  let notes = [...State.notes];

  // Sidebar filter
  const f = State.activeFilter;
  if (f === 'pinned')    notes = notes.filter(n => n.pinned);
  else if (f === 'important')  notes = notes.filter(n => n.status === 'important');
  else if (f === 'to-revise')  notes = notes.filter(n => n.status === 'to-revise');
  else if (f === 'memorized')  notes = notes.filter(n => n.status === 'memorized');
  else if (f.startsWith('subject:')) {
    const subj = f.slice(8);
    notes = notes.filter(n => n.subject === subj);
  }

  // Priority filter
  if (State.priorityFilter !== 'all') {
    notes = notes.filter(n => n.priority === State.priorityFilter);
  }

  // Search
  if (State.searchQuery) {
    const q = State.searchQuery.toLowerCase();
    notes = notes.filter(n =>
      (n.title   || '').toLowerCase().includes(q) ||
      (n.content || '').toLowerCase().includes(q) ||
      (n.subject || '').toLowerCase().includes(q) ||
      (n.keywords || []).some(k => k.toLowerCase().includes(q)) ||
      (n.tags     || []).some(t => t.toLowerCase().includes(q))
    );
  }

  // Sort
  notes.sort((a, b) => {
    if (State.sortBy === 'title') {
      return (a.title || '').localeCompare(b.title || '');
    }
    if (State.sortBy === 'priority') {
      const order = { high: 0, medium: 1, low: 2 };
      return (order[a.priority] || 1) - (order[b.priority] || 1);
    }
    // Dates (updatedAt / createdAt)
    const aVal = a[State.sortBy]?.toMillis?.() || 0;
    const bVal = b[State.sortBy]?.toMillis?.() || 0;
    return bVal - aVal;
  });

  // Pinned always first
  return [
    ...notes.filter(n => n.pinned),
    ...notes.filter(n => !n.pinned),
  ];
}

function renderNotes() {
  const notes = getFilteredNotes();

  if (notes.length === 0) {
    notesGrid.innerHTML = '';
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');
  notesGrid.innerHTML = notes.map(n => buildNoteCard(n)).join('');

  // Bind card clicks
  notesGrid.querySelectorAll('.note-card').forEach(card => {
    const id = card.dataset.id;

    card.addEventListener('click', (e) => {
      // Ignore clicks on action buttons
      if (e.target.closest('.card-actions')) return;
      openDetailModal(id);
    });

    card.querySelector('.btn-edit')?.addEventListener('click', (e) => {
      e.stopPropagation();
      openNoteModal(id);
    });

    card.querySelector('.btn-pin')?.addEventListener('click', (e) => {
      e.stopPropagation();
      togglePin(id);
    });

    card.querySelector('.btn-fav')?.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleFav(id);
    });

    card.querySelector('.btn-delete-card')?.addEventListener('click', (e) => {
      e.stopPropagation();
      confirmDeleteNote(id);
    });
  });
}

function buildNoteCard(n) {
  const color    = n.color || '#6c8aff';
  const priColor = { high: '#f87171', medium: '#fbbf24', low: '#34d399' }[n.priority] || '#fbbf24';

  const statusBadge = n.status && n.status !== 'none' ? `
    <span class="status-label status-${n.status}">
      ${{ important:'⚡ Important', 'to-revise':'🔁 Revise', memorized:'✅ Done' }[n.status] || ''}
    </span>` : '';

  const keywords = (n.keywords || []).slice(0, 4).map(k =>
    `<span class="keyword-chip">${esc(k)}</span>`).join('');

  const tags = (n.tags || []).slice(0, 3).map(t =>
    `<span class="tag-chip">#${esc(t)}</span>`).join('');

  const ts = n.updatedAt?.toDate?.()
    ? timeAgo(n.updatedAt.toDate())
    : '';

  return `
  <div class="note-card ${n.pinned ? 'pinned' : ''}"
    data-id="${n.id}"
    style="--card-color:${color}">

    <div class="card-actions">
      <button class="card-action-btn btn-pin" title="${n.pinned ? 'Unpin' : 'Pin'}">
        ${n.pinned ? '📌' : '🔖'}
      </button>
      <button class="card-action-btn btn-fav" title="${n.favorite ? 'Unfavourite' : 'Favourite'}">
        ${n.favorite ? '⭐' : '☆'}
      </button>
      <button class="card-action-btn btn-edit" title="Edit">✏️</button>
      <button class="card-action-btn btn-delete-card delete" title="Delete">🗑️</button>
    </div>

    <div class="card-header">
      <span class="card-title">${esc(n.title || 'Untitled')}</span>
      ${n.pinned ? '<span class="card-pin">📌</span>' : ''}
    </div>

    ${n.subject ? `<div class="card-subject">${esc(n.subject)}</div>` : ''}

    ${n.content ? `<div class="card-content">${esc(n.content)}</div>` : ''}

    ${keywords ? `<div class="card-keywords">${keywords}</div>` : ''}

    <div class="card-footer">
      <div class="card-tags">${tags}</div>
      <div class="card-meta">
        <span class="priority-dot" style="background:${priColor}" title="${n.priority} priority"></span>
        ${statusBadge}
        <span style="font-size:.65rem;color:var(--tx-3)">${ts}</span>
      </div>
    </div>
  </div>`;
}

/* ═══════════════════════════════════════════════════════════
   NOTE MODAL (Create / Edit)
═══════════════════════════════════════════════════════════ */
let autosaveTimer = null;

function openNoteModal(noteId = null) {
  State.editingNoteId = noteId;
  const note = noteId ? State.notes.find(n => n.id === noteId) : null;

  modalHeading.textContent = note ? 'Edit Note' : 'New Note';

  // Populate fields
  noteTitle.value    = note?.title    || '';
  notePriority.value = note?.priority || 'medium';
  noteSubject.value  = note?.subject  || '';
  noteStatus.value   = note?.status   || 'none';
  noteContent.value  = note?.content  || '';
  noteKeywords.value = (note?.keywords || []).join(', ');
  noteTags.value     = (note?.tags     || []).join(', ');
  notePin.checked    = note?.pinned   || false;
  noteFav.checked    = note?.favorite || false;

  // Color
  State.selectedColor = note?.color || '#6c8aff';
  $$('#colorPicker .color-swatch').forEach(s => {
    s.classList.toggle('active', s.dataset.color === State.selectedColor);
  });

  updateCharCounter();
  setAutosaveStatus('saved');

  noteModalOverlay.classList.remove('hidden');
  setTimeout(() => noteTitle.focus(), 100);

  // Populate subject datalist
  populateSubjectDatalist();
}

function closeNoteModal() {
  clearTimeout(autosaveTimer);
  noteModalOverlay.classList.add('hidden');
  State.editingNoteId = null;
}

function gatherNoteData() {
  return {
    title:    noteTitle.value.trim(),
    subject:  noteSubject.value.trim(),
    content:  noteContent.value.trim(),
    keywords: splitCSV(noteKeywords.value),
    tags:     splitCSV(noteTags.value),
    priority: notePriority.value,
    status:   noteStatus.value,
    pinned:   notePin.checked,
    favorite: noteFav.checked,
    color:    State.selectedColor,
  };
}

async function saveNoteModal() {
  const data = gatherNoteData();
  if (!data.title && !data.content) {
    toast('Please add a title or content.', 'warn');
    noteTitle.focus();
    return;
  }

  setAutosaveStatus('saving');
  modalSaveBtn.disabled = true;

  try {
    if (State.editingNoteId) {
      await updateNote(State.user.uid, State.editingNoteId, data);
      toast('Note updated ✓', 'success');
    } else {
      await addNote(State.user.uid, data);
      // Auto-add subject to list if new
      if (data.subject && !State.subjects.includes(data.subject)) {
        const updated = [...State.subjects, data.subject].sort();
        await saveSubjects(State.user.uid, updated);
      }
      toast('Note saved ✓', 'success');
    }
    setAutosaveStatus('saved');
    closeNoteModal();
  } catch (err) {
    console.error(err);
    toast('Failed to save note.', 'error');
    setAutosaveStatus('saved');
  } finally {
    modalSaveBtn.disabled = false;
  }
}

/* Auto-save on typing (debounced) — updates existing notes only */
function scheduleAutosave() {
  clearTimeout(autosaveTimer);
  if (!State.editingNoteId) return; // don't auto-save new notes
  setAutosaveStatus('saving');
  autosaveTimer = setTimeout(async () => {
    try {
      await updateNote(State.user.uid, State.editingNoteId, gatherNoteData());
      setAutosaveStatus('saved');
    } catch { setAutosaveStatus('saved'); }
  }, 1800);
}

function setAutosaveStatus(status) {
  const dot  = autosaveStatus.querySelector('.as-dot');
  const text = autosaveStatus;
  if (status === 'saving') {
    dot.classList.add('saving');
    text.lastChild.textContent = ' Saving…';
  } else {
    dot.classList.remove('saving');
    text.lastChild.textContent = ' All changes saved';
  }
}

function updateCharCounter() {
  const len = noteContent.value.length;
  const max = 1200;
  charCounter.textContent = `${len} / ${max}`;
  charCounter.classList.toggle('near-limit', len > 900 && len < max);
  charCounter.classList.toggle('at-limit', len >= max);
}

/* ═══════════════════════════════════════════════════════════
   DETAIL MODAL
═══════════════════════════════════════════════════════════ */
let detailNoteId = null;

function openDetailModal(noteId) {
  const note = State.notes.find(n => n.id === noteId);
  if (!note) return;
  detailNoteId = noteId;

  detailSubject.textContent = note.subject || '';
  detailSubject.style.display = note.subject ? '' : 'none';

  const priLabel = { high:'🔴 High', medium:'🟡 Medium', low:'🟢 Low' }[note.priority] || '';
  detailPriority.textContent = priLabel;
  detailPriority.className   = 'detail-priority-badge';

  const statusLabel = { important:'⚡ Important', 'to-revise':'🔁 To Revise', memorized:'✅ Memorized' }[note.status] || '';
  detailStatus.textContent = statusLabel;
  detailStatus.className   = 'detail-status-badge' + (note.status && note.status !== 'none' ? ` status-${note.status}` : '');
  detailStatus.style.display = (note.status && note.status !== 'none') ? '' : 'none';

  detailTitle.textContent = note.title || 'Untitled';

  // Highlight keywords in content
  let content = esc(note.content || '');
  (note.keywords || []).forEach(kw => {
    if (!kw) return;
    const rx = new RegExp(`(${escRegex(kw)})`, 'gi');
    content = content.replace(rx, '<mark style="background:rgba(251,191,36,.2);color:var(--warn);border-radius:3px;padding:0 2px">$1</mark>');
  });
  detailContent.innerHTML = content;

  detailKeywords.innerHTML = (note.keywords || []).map(k =>
    `<span class="kw-highlighted">${esc(k)}</span>`).join('');

  detailTags.innerHTML = (note.tags || []).map(t =>
    `<span class="tag-chip">#${esc(t)}</span>`).join('');

  const ts = note.updatedAt?.toDate?.() ? `Updated ${timeAgo(note.updatedAt.toDate())}` : '';
  detailUpdated.textContent = ts;

  detailOverlay.classList.remove('hidden');
}

function closeDetailModal() {
  detailOverlay.classList.add('hidden');
  detailNoteId = null;
}

/* ═══════════════════════════════════════════════════════════
   NOTE ACTIONS
═══════════════════════════════════════════════════════════ */
async function togglePin(noteId) {
  const note = State.notes.find(n => n.id === noteId);
  if (!note) return;
  try {
    await updateNote(State.user.uid, noteId, { pinned: !note.pinned });
    toast(note.pinned ? 'Unpinned' : '📌 Pinned', 'info');
  } catch { toast('Failed to pin note.', 'error'); }
}

async function toggleFav(noteId) {
  const note = State.notes.find(n => n.id === noteId);
  if (!note) return;
  try {
    await updateNote(State.user.uid, noteId, { favorite: !note.favorite });
    toast(note.favorite ? 'Removed from favourites' : '⭐ Added to favourites', 'info');
  } catch { toast('Failed to update.', 'error'); }
}

async function confirmDeleteNote(noteId) {
  if (!confirm('Delete this note? This cannot be undone.')) return;
  await doDeleteNote(noteId);
}

async function doDeleteNote(noteId) {
  try {
    await deleteNote(State.user.uid, noteId);
    closeDetailModal();
    toast('Note deleted', 'info');
  } catch { toast('Failed to delete note.', 'error'); }
}

function copyNoteToClipboard(noteId) {
  const note = State.notes.find(n => n.id === noteId);
  if (!note) return;
  const text = [
    note.title,
    note.subject ? `Subject: ${note.subject}` : '',
    '',
    note.content,
    note.keywords?.length ? `Keywords: ${note.keywords.join(', ')}` : '',
    note.tags?.length ? `Tags: ${note.tags.join(', ')}` : '',
  ].filter(Boolean).join('\n');
  navigator.clipboard.writeText(text)
    .then(() => toast('Note copied to clipboard 📋', 'success'))
    .catch(() => toast('Could not copy.', 'error'));
}

/* ═══════════════════════════════════════════════════════════
   SUBJECTS
═══════════════════════════════════════════════════════════ */
async function addSubject(name) {
  if (!name) return;
  if (State.subjects.includes(name)) { toast('Subject already exists.', 'warn'); return; }
  const updated = [...State.subjects, name].sort();
  try {
    await saveSubjects(State.user.uid, updated);
    toast(`Subject "${name}" added`, 'success');
  } catch { toast('Failed to add subject.', 'error'); }
}

/* ═══════════════════════════════════════════════════════════
   REVISION MODE
═══════════════════════════════════════════════════════════ */
function startRevisionMode() {
  // Use current filtered view for revision
  const notes = getFilteredNotes();
  if (notes.length === 0) {
    toast('No notes to revise. Apply a filter first!', 'warn');
    revisionModeToggle.checked = false;
    return;
  }
  State.revisionNotes = notes;
  State.revisionIndex = 0;
  State.revAnswerShown = false;
  renderRevisionCard();
  revisionOverlay.classList.remove('hidden');
}

function stopRevisionMode() {
  revisionOverlay.classList.add('hidden');
  revisionModeToggle.checked = false;
}

function renderRevisionCard() {
  const notes = State.revisionNotes;
  const idx   = State.revisionIndex;
  const note  = notes[idx];
  if (!note) return;

  const pct = ((idx + 1) / notes.length) * 100;
  revProgFill.style.width = pct + '%';
  revProgText.textContent = `${idx + 1} / ${notes.length}`;

  revSubject.textContent = note.subject || '';
  revTitle.textContent   = note.title || 'Untitled';

  revContent.classList.add('hidden');
  revKeywords.classList.add('hidden');
  State.revAnswerShown = false;
  revShow.textContent = 'Show Answer';

  // Animate card
  revisionCard.style.animation = 'none';
  revisionCard.offsetHeight; // reflow
  revisionCard.style.animation = '';
}

function showRevisionAnswer() {
  const note = State.revisionNotes[State.revisionIndex];
  if (!note) return;
  revContent.textContent  = note.content || '';
  revKeywords.innerHTML   = (note.keywords || []).map(k => `<span class="kw-highlighted">${esc(k)}</span>`).join('');
  revContent.classList.remove('hidden');
  if (note.keywords?.length) revKeywords.classList.remove('hidden');
  State.revAnswerShown = true;
  revShow.textContent = '✓ Shown';
}

/* ═══════════════════════════════════════════════════════════
   FILTERS & SEARCH
═══════════════════════════════════════════════════════════ */
function setActiveFilter(filter) {
  State.activeFilter = filter;

  // Update sidebar active state
  $$('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.filter === filter);
  });

  renderNotes();
}

/* ═══════════════════════════════════════════════════════════
   THEME
═══════════════════════════════════════════════════════════ */
function restoreTheme() {
  const saved = localStorage.getItem('sn_theme') || 'dark';
  applyTheme(saved);
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('sn_theme', theme);
  const svg = themeToggle?.querySelector('svg path');
  if (theme === 'light' && svg) {
    themeToggle.title = 'Switch to dark mode (Ctrl+D)';
  } else if (svg) {
    themeToggle.title = 'Switch to light mode (Ctrl+D)';
  }
}

function toggleTheme() {
  const cur = document.documentElement.getAttribute('data-theme');
  applyTheme(cur === 'dark' ? 'light' : 'dark');
}

/* ═══════════════════════════════════════════════════════════
   LOADING
═══════════════════════════════════════════════════════════ */
function showLoading(show) {
  loadingState.classList.toggle('hidden', !show);
  notesGrid.classList.toggle('hidden', show);
}

/* ═══════════════════════════════════════════════════════════
   USER DROPDOWN
═══════════════════════════════════════════════════════════ */
function openDropdown()  { userDropdown.classList.add('open'); }
function closeDropdown() { userDropdown.classList.remove('open'); }
function toggleDropdown(){ userDropdown.classList.toggle('open'); }

/* ═══════════════════════════════════════════════════════════
   BIND APP EVENTS
═══════════════════════════════════════════════════════════ */
function bindAppEvents() {
  /* ── Topbar ── */
  themeToggle.addEventListener('click', toggleTheme);
  quickAddBtn.addEventListener('click', () => openNoteModal());

  userAvatar.addEventListener('click', (e) => { e.stopPropagation(); toggleDropdown(); });
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.user-menu')) closeDropdown();
  });

  sidebarToggle.addEventListener('click', () => {
    if (window.innerWidth < 768) {
      sidebar.classList.toggle('mobile-open');
    } else {
      sidebar.classList.toggle('collapsed');
    }
  });

  /* ── Search ── */
  globalSearch.addEventListener('input', (e) => {
    State.searchQuery = e.target.value.trim();
    renderNotes();
  });

  /* ── Sort ── */
  sortSelect.addEventListener('change', (e) => {
    State.sortBy = e.target.value;
    renderNotes();
  });

  /* ── Priority chips ── */
  $$('.filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      $$('.filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      State.priorityFilter = chip.dataset.priority;
      renderNotes();
    });
  });

  /* ── Sidebar nav ── */
  $$('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      setActiveFilter(item.dataset.filter);
    });
  });

  /* ── Add Subject ── */
  addSubjectBtn.addEventListener('click', () => {
    newSubjectInput.value = '';
    subjectModalOverlay.classList.remove('hidden');
    setTimeout(() => newSubjectInput.focus(), 80);
  });
  subjectModalCancel.addEventListener('click', () => subjectModalOverlay.classList.add('hidden'));
  subjectModalSave.addEventListener('click', async () => {
    const name = newSubjectInput.value.trim();
    if (name) { await addSubject(name); subjectModalOverlay.classList.add('hidden'); }
  });
  newSubjectInput.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter') {
      const name = newSubjectInput.value.trim();
      if (name) { await addSubject(name); subjectModalOverlay.classList.add('hidden'); }
    }
    if (e.key === 'Escape') subjectModalOverlay.classList.add('hidden');
  });

  /* ── Note modal ── */
  modalClose.addEventListener('click', closeNoteModal);
  modalCancelBtn.addEventListener('click', closeNoteModal);
  modalSaveBtn.addEventListener('click', saveNoteModal);

  noteContent.addEventListener('input', () => {
    updateCharCounter();
    scheduleAutosave();
  });
  noteTitle.addEventListener('input', scheduleAutosave);
  noteSubject.addEventListener('input', scheduleAutosave);
  noteKeywords.addEventListener('input', scheduleAutosave);
  noteTags.addEventListener('input', scheduleAutosave);
  notePriority.addEventListener('change', scheduleAutosave);
  noteStatus.addEventListener('change', scheduleAutosave);
  notePin.addEventListener('change', scheduleAutosave);
  noteFav.addEventListener('change', scheduleAutosave);

  noteModalOverlay.addEventListener('click', (e) => {
    if (e.target === noteModalOverlay) closeNoteModal();
  });

  /* ── Color picker ── */
  $$('#colorPicker .color-swatch').forEach(swatch => {
    swatch.addEventListener('click', () => {
      $$('#colorPicker .color-swatch').forEach(s => s.classList.remove('active'));
      swatch.classList.add('active');
      State.selectedColor = swatch.dataset.color;
    });
  });

  /* ── Detail modal ── */
  detailClose.addEventListener('click', closeDetailModal);
  detailOverlay.addEventListener('click', (e) => { if (e.target === detailOverlay) closeDetailModal(); });
  detailEdit.addEventListener('click', () => { closeDetailModal(); openNoteModal(detailNoteId); });
  detailDelete.addEventListener('click', () => confirmDeleteNote(detailNoteId));
  detailCopy.addEventListener('click', () => copyNoteToClipboard(detailNoteId));

  /* ── Revision mode ── */
  revisionModeToggle.addEventListener('change', (e) => {
    if (e.target.checked) startRevisionMode();
    else stopRevisionMode();
  });
  revisionClose.addEventListener('click', stopRevisionMode);
  revShow.addEventListener('click', showRevisionAnswer);
  revNext.addEventListener('click', () => {
    if (State.revisionIndex < State.revisionNotes.length - 1) {
      State.revisionIndex++;
      renderRevisionCard();
    } else {
      toast('🎉 Revision complete!', 'success');
      stopRevisionMode();
    }
  });
  revPrev.addEventListener('click', () => {
    if (State.revisionIndex > 0) {
      State.revisionIndex--;
      renderRevisionCard();
    }
  });

  /* ── Overlay escapes ── */
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (!revisionOverlay.classList.contains('hidden')) { stopRevisionMode(); return; }
      if (!noteModalOverlay.classList.contains('hidden')) { closeNoteModal(); return; }
      if (!detailOverlay.classList.contains('hidden'))   { closeDetailModal(); return; }
      if (!subjectModalOverlay.classList.contains('hidden')) { subjectModalOverlay.classList.add('hidden'); return; }
    }
  });
}

/* ═══════════════════════════════════════════════════════════
   KEYBOARD SHORTCUTS
═══════════════════════════════════════════════════════════ */
function bindKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    const tag = document.activeElement.tagName;
    const typing = ['INPUT','TEXTAREA','SELECT'].includes(tag);

    // Ctrl+N — New note
    if (e.ctrlKey && e.key === 'n') {
      e.preventDefault();
      openNoteModal();
    }

    // Ctrl+K — Focus search
    if (e.ctrlKey && e.key === 'k') {
      e.preventDefault();
      globalSearch.focus();
      globalSearch.select();
    }

    // Ctrl+D — Toggle dark mode
    if (e.ctrlKey && e.key === 'd') {
      e.preventDefault();
      toggleTheme();
    }

    // Ctrl+B — Toggle sidebar
    if (e.ctrlKey && e.key === 'b') {
      e.preventDefault();
      sidebar.classList.toggle('collapsed');
    }

    // Ctrl+S — Save note (when modal is open)
    if (e.ctrlKey && e.key === 's' && !noteModalOverlay.classList.contains('hidden')) {
      e.preventDefault();
      saveNoteModal();
    }

    // Arrow keys in revision mode
    if (!revisionOverlay.classList.contains('hidden') && !typing) {
      if (e.key === 'ArrowRight') revNext.click();
      if (e.key === 'ArrowLeft')  revPrev.click();
      if (e.key === ' ') { e.preventDefault(); revShow.click(); }
    }
  });
}

/* ═══════════════════════════════════════════════════════════
   TOAST
═══════════════════════════════════════════════════════════ */
const toastContainer = $('toastContainer');
const TOAST_ICONS = {
  success: '✓',
  error:   '✕',
  info:    'ℹ',
  warn:    '⚠',
};

function toast(message, type = 'info') {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `
    <span class="toast-icon">${TOAST_ICONS[type] || 'ℹ'}</span>
    <span>${esc(message)}</span>
    <button class="toast-close">✕</button>`;
  el.querySelector('.toast-close').addEventListener('click', () => removeToast(el));
  toastContainer.appendChild(el);
  setTimeout(() => removeToast(el), 3500);
}

function removeToast(el) {
  el.classList.add('toast-out');
  setTimeout(() => el.remove(), 220);
}

/* ═══════════════════════════════════════════════════════════
   UTILITIES
═══════════════════════════════════════════════════════════ */
function esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function splitCSV(str) {
  return str.split(',').map(s => s.trim()).filter(Boolean);
}

function timeAgo(date) {
  const sec = Math.round((Date.now() - date.getTime()) / 1000);
  if (sec < 60)   return 'just now';
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400)return `${Math.floor(sec / 3600)}h ago`;
  if (sec < 604800)return `${Math.floor(sec / 86400)}d ago`;
  return date.toLocaleDateString('en-IN', { day:'numeric', month:'short' });
}

/* ═══════════════════════════════════════════════════════════
   BOOT
═══════════════════════════════════════════════════════════ */
init();
