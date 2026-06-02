// ═══════════════════════════════════════════════════════════
// firebase.js — Firebase init, Auth & Firestore services
// Replace the firebaseConfig values with your own project's
// config from Firebase Console → Project Settings → Your Apps
// ═══════════════════════════════════════════════════════════

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

/* ── YOUR FIREBASE CONFIG ──────────────────────────────────
   Replace every value below with your real Firebase project
   config (Firebase Console → Project Settings → Web App).
────────────────────────────────────────────────────────── */
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyC30qHrnaP9tTqc31tYrslFToEsgU0Kpig",
  authDomain: "exam-short-notes.firebaseapp.com",
  projectId: "exam-short-notes",
  storageBucket: "exam-short-notes.firebasestorage.app",
  messagingSenderId: "112667242977",
  appId: "1:112667242977:web:36298cb233280917cae2a0",
  measurementId: "G-B175YLQ1KL"
};

/* ── INIT ─────────────────────────────────────────────────── */
const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

/* ═══════════════════════════════════════════════════════════
   AUTH SERVICES
═══════════════════════════════════════════════════════════ */

/**
 * Create a new user account and set their display name.
 * @param {string} name
 * @param {string} email
 * @param {string} password
 * @returns {Promise<import('firebase/auth').UserCredential>}
 */
export async function registerUser(name, email, password) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName: name });
  return cred;
}

/**
 * Sign in an existing user.
 * @param {string} email
 * @param {string} password
 */
export async function loginUser(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

/**
 * Sign out the current user.
 */
export async function logoutUser() {
  return signOut(auth);
}

/**
 * Listen for auth state changes.
 * @param {function} callback  — called with (user | null)
 * @returns {function} unsubscribe
 */
export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}

/**
 * Return the currently signed-in user (or null).
 */
export function currentUser() {
  return auth.currentUser;
}

/* ═══════════════════════════════════════════════════════════
   FIRESTORE NOTE SERVICES
   Path: users/{userId}/notes/{noteId}
═══════════════════════════════════════════════════════════ */

/**
 * Get a reference to the notes collection for a given user.
 * @param {string} uid
 */
function notesCol(uid) {
  return collection(db, 'users', uid, 'notes');
}

/**
 * Get a reference to a specific note document.
 * @param {string} uid
 * @param {string} noteId
 */
function noteDoc(uid, noteId) {
  return doc(db, 'users', uid, 'notes', noteId);
}

/**
 * Subscribe to real-time note updates for a user.
 * Notes are ordered by updatedAt descending.
 * @param {string}   uid
 * @param {function} onUpdate  — called with array of note objects
 * @param {function} onError
 * @returns {function} unsubscribe
 */
export function subscribeToNotes(uid, onUpdate, onError) {
  const q = query(notesCol(uid), orderBy('updatedAt', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const notes = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      onUpdate(notes);
    },
    onError
  );
}

/**
 * Add a new note document.
 * @param {string} uid
 * @param {Object} data  — note fields (without id/timestamps)
 * @returns {Promise<string>} the new note's Firestore ID
 */
export async function addNote(uid, data) {
  const payload = {
    ...sanitizeNote(data),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const ref = await addDoc(notesCol(uid), payload);
  return ref.id;
}

/**
 * Update an existing note document.
 * @param {string} uid
 * @param {string} noteId
 * @param {Object} data  — partial note fields
 */
export async function updateNote(uid, noteId, data) {
  const payload = {
    ...sanitizeNote(data),
    updatedAt: serverTimestamp(),
  };
  return updateDoc(noteDoc(uid, noteId), payload);
}

/**
 * Delete a note document.
 * @param {string} uid
 * @param {string} noteId
 */
export async function deleteNote(uid, noteId) {
  return deleteDoc(noteDoc(uid, noteId));
}

/* ═══════════════════════════════════════════════════════════
   FIRESTORE SUBJECT SERVICES
   Path: users/{userId}/subjects/{subjectId}
   We store subjects as a simple list document for efficiency.
═══════════════════════════════════════════════════════════ */

function subjectsDoc(uid) {
  return doc(db, 'users', uid, 'meta', 'subjects');
}

/**
 * Subscribe to the user's subject list in real time.
 * @param {string}   uid
 * @param {function} onUpdate — called with array of subject strings
 * @returns {function} unsubscribe
 */
export function subscribeToSubjects(uid, onUpdate) {
  return onSnapshot(subjectsDoc(uid), (snap) => {
    onUpdate(snap.exists() ? (snap.data().list || []) : []);
  });
}

/**
 * Overwrite the entire subject list for a user.
 * @param {string}   uid
 * @param {string[]} subjects
 */
export async function saveSubjects(uid, subjects) {
  return setDoc(subjectsDoc(uid), { list: subjects }, { merge: true });
}

/* ── INTERNAL HELPERS ────────────────────────────────────── */

/**
 * Strip unknown fields and enforce schema before writing to Firestore.
 */
function sanitizeNote(data) {
  return {
    title:    String(data.title    || '').slice(0, 100),
    subject:  String(data.subject  || ''),
    content:  String(data.content  || '').slice(0, 1200),
    keywords: Array.isArray(data.keywords) ? data.keywords : [],
    tags:     Array.isArray(data.tags)     ? data.tags     : [],
    priority: ['high','medium','low'].includes(data.priority) ? data.priority : 'medium',
    status:   ['none','important','to-revise','memorized'].includes(data.status) ? data.status : 'none',
    pinned:   Boolean(data.pinned),
    favorite: Boolean(data.favorite),
    color:    String(data.color || '#6c8aff'),
  };
}
