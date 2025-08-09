// Firebase initialization for PokéJournal
// Uses modular v9 SDK with placeholder config values.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js';
import { getFirestore, enableIndexedDbPersistence } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js';

// TODO: Replace the following placeholders with real project settings.
const firebaseConfig = {
  apiKey: 'YOUR_API_KEY',
  authDomain: 'YOUR_AUTH_DOMAIN',
  projectId: 'YOUR_PROJECT_ID',
  appId: 'YOUR_APP_ID'
};

// Initialize Firebase services.
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Enable offline data persistence; ignore if the browser doesn't support it.
enableIndexedDbPersistence(db).catch(() => {});

// Export handles for use in other modules.
export { auth, db };
