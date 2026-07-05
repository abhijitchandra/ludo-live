/**
 * firebase-config.js
 * -------------------------------------------------------
 * REPLACE the values below with your own Firebase project's
 * web app config. See README.md -> "Firebase Setup" for the
 * exact step-by-step instructions (it's free, takes ~3 minutes).
 *
 * Project Settings -> General -> Your apps -> SDK setup and
 * configuration -> "Config"
 * -------------------------------------------------------
 */
const firebaseConfig = {
  apiKey: "AIzaSyC9o_1yc-noQyqaNXuQyUr_60WctrjYcxo",
  authDomain: "ludo-live-5a89f.firebaseapp.com",
  databaseURL: "https://ludo-live-5a89f-default-rtdb.firebaseio.com",
  projectId: "ludo-live-5a89f",
  storageBucket: "ludo-live-5a89f.firebasestorage.app",
  messagingSenderId: "335282383069",
  appId: "1:335282383069:web:01a2d3cdbf9bd5162cd334",
  measurementId: "G-HDC2L45GPP"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();
