// ============================================
// FIREBASE CONFIGURATION
// ============================================

/**
 * Firebase configuration for Steel and Sigils PVP mode.
 * 
 * To set up your own Firebase project:
 * 1. Go to https://console.firebase.google.com/
 * 2. Create a new project
 * 3. Enable Realtime Database
 * 4. Copy your config object from Project Settings
 * 5. Replace the values below
 */

export const firebaseConfig = {
    // Replace these with your actual Firebase config
    apiKey: "YOUR_API_KEY_HERE",
    authDomain: "your-project-id.firebaseapp.com",
    databaseURL: "https://your-project-id-default-rtdb.firebaseio.com",
    projectId: "your-project-id",
    storageBucket: "your-project-id.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

/**
 * For testing/development, you can use the Firebase emulator:
 * 
 * 1. Install Firebase CLI: npm install -g firebase-tools
 * 2. Login: firebase login
 * 3. Init: firebase init
 * 4. Start emulator: firebase emulators:start
 * 5. Uncomment the line below:
 */
// export const useEmulator = true;
// export const emulatorHost = "localhost:9000";
