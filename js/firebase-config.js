// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);