# ShortNotes — Setup & Deployment Guide

## File Structure

```
shortnotes-app/
├── index.html        ← Main HTML (all UI markup)
├── style.css         ← All styling (dark/light, responsive)
├── app.js            ← Application logic (ES6 module)
├── firebase.js       ← Firebase Auth + Firestore services
├── firestore.rules   ← Firestore security rules
└── SETUP.md          ← This file
```

---

## Step 1 — Create a Firebase Project

1. Go to **https://console.firebase.google.com**
2. Click **Add project** → give it a name (e.g. `shortnotes-app`)
3. Disable Google Analytics (optional) → click **Create project**

---

## Step 2 — Enable Authentication

1. In Firebase Console, go to **Build → Authentication**
2. Click **Get started**
3. Under **Sign-in method**, enable **Email/Password**
4. Click **Save**

---

## Step 3 — Create Firestore Database

1. Go to **Build → Firestore Database**
2. Click **Create database**
3. Choose **Start in production mode** (we will add rules next)
4. Select your preferred region → click **Enable**

---

## Step 4 — Apply Firestore Security Rules

1. In Firestore, click the **Rules** tab
2. Replace the content with the rules from `firestore.rules`:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null
                         && request.auth.uid == userId;
    }
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

3. Click **Publish**

---

## Step 5 — Register a Web App & Get Config

1. In Firebase Console, go to **Project Settings** (gear icon)
2. Scroll to **Your apps** → click **Add app** → choose **Web** (</>)
3. Give the app a nickname (e.g. `ShortNotes Web`)
4. Click **Register app**
5. Copy the `firebaseConfig` object shown:

```js
const firebaseConfig = {
  apiKey:            "AIza...",
  authDomain:        "your-project.firebaseapp.com",
  projectId:         "your-project",
  storageBucket:     "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId:             "1:123456789:web:abc123",
};
```

6. Open **`firebase.js`** and replace the placeholder values:

```js
const firebaseConfig = {
  apiKey:            "PASTE_YOUR_API_KEY_HERE",
  authDomain:        "PASTE_YOUR_AUTH_DOMAIN_HERE",
  projectId:         "PASTE_YOUR_PROJECT_ID_HERE",
  storageBucket:     "PASTE_YOUR_STORAGE_BUCKET_HERE",
  messagingSenderId: "PASTE_YOUR_SENDER_ID_HERE",
  appId:             "PASTE_YOUR_APP_ID_HERE",
};
```

---

## Step 6 — Test Locally

Because `app.js` and `firebase.js` use **ES6 modules** (`import`/`export`),
you cannot open `index.html` directly with `file://` in your browser.
Use a local dev server instead:

**Option A — VS Code Live Server**
- Install the "Live Server" extension
- Right-click `index.html` → **Open with Live Server**

**Option B — Python**
```bash
cd shortnotes-app
python3 -m http.server 5500
# Open http://localhost:5500
```

**Option C — Node.js / npx**
```bash
cd shortnotes-app
npx serve .
# Open the URL shown in terminal
```

---

## Step 7 — Deploy to Netlify

### Option A — Netlify Drop (simplest, no CLI)

1. Go to **https://app.netlify.com/drop**
2. Drag and drop the entire `shortnotes-app/` folder onto the page
3. Netlify will give you a live URL instantly (e.g. `https://random-name.netlify.app`)
4. To use a custom domain, go to **Domain settings** in your Netlify dashboard

### Option B — Netlify CLI

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# From inside your project folder
cd shortnotes-app
netlify deploy --prod --dir .
```

### Option C — GitHub + Netlify (recommended for ongoing updates)

1. Push your code to a GitHub repository
2. In **https://app.netlify.com**, click **Add new site → Import an existing project**
3. Connect GitHub and select your repo
4. Set **Publish directory** to `.` (root)
5. Click **Deploy site**

Every `git push` to `main` will auto-deploy.

---

## Step 8 — Add Authorized Domains (Firebase Auth)

After deploying to Netlify:

1. Go to **Firebase Console → Authentication → Settings → Authorized domains**
2. Click **Add domain**
3. Add your Netlify domain: `your-app.netlify.app`
4. If using a custom domain, add that too

Without this step, login will be blocked by Firebase.

---

## Firestore Data Structure

```
users/
  {userId}/
    notes/
      {noteId}/
        title:      string
        subject:    string
        content:    string       ← max 1200 chars
        keywords:   string[]
        tags:       string[]
        priority:   "high" | "medium" | "low"
        status:     "none" | "important" | "to-revise" | "memorized"
        pinned:     boolean
        favorite:   boolean
        color:      string       ← hex color label
        createdAt:  Timestamp
        updatedAt:  Timestamp
    meta/
      subjects/
        list:       string[]     ← user's subject list
```

---

## Keyboard Shortcuts

| Shortcut   | Action                        |
|------------|-------------------------------|
| `Ctrl+N`   | Open "New Note" modal         |
| `Ctrl+K`   | Focus the search bar          |
| `Ctrl+S`   | Save note (when modal is open)|
| `Ctrl+D`   | Toggle dark / light mode      |
| `Ctrl+B`   | Toggle sidebar                |
| `Esc`      | Close any open modal          |
| `→` / `←` | Next / Prev in Revision Mode  |
| `Space`    | Show answer in Revision Mode  |

---

## Features Summary

- 🔐 **Auth** — Email/password sign-up and login, sessions persist
- 📝 **Notes** — Create, edit, delete with title, subject, content, keywords, tags, priority, status, color label
- 📌 **Pin & Favourite** — Quick access to important notes
- 🔍 **Search** — Real-time full-text search across title, content, keywords, tags
- 🗂️ **Filters** — By subject, status (important / to-revise / memorized), priority
- 👁️ **Quick Revision Mode** — Flashcard-style review of any filtered set
- ⌨️ **Keyword Highlighting** — Keywords highlighted in note detail view
- 🔄 **Real-time sync** — Firestore snapshot listeners; updates across devices instantly
- 🌙 **Dark / Light mode** — Persisted in localStorage
- 📱 **Responsive** — Works on mobile, tablet, and desktop
- ⚡ **Auto-save** — Edits to existing notes save automatically after 1.8s idle

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Blank page on `file://` | Use a local dev server (see Step 6) |
| "Firebase: Error (auth/unauthorized-domain)" | Add your domain in Firebase Auth → Authorized Domains |
| Notes not loading | Check Firestore rules are published; check browser console for errors |
| CORS errors | Ensure you're serving from `http://` not `file://` |
| Module import errors | Confirm `<script type="module" src="app.js">` in HTML |
