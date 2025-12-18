import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getAnalytics } from "firebase/analytics";

// Firebase configuration
// TODO: Replace these with your actual Firebase project credentials
// Get these from Firebase Console > Project Settings > General > Your apps
const firebaseConfig = {
  apiKey: "AIzaSyBnzyQzmjAX9RY0GU4A_ruyuNgEJwHZD1U",
  authDomain: "chanyikchong-page.firebaseapp.com",
  databaseURL: "https://chanyikchong-page-default-rtdb.firebaseio.com",
  projectId: "chanyikchong-page",
  storageBucket: "chanyikchong-page.firebasestorage.app",
  messagingSenderId: "906989698736",
  appId: "1:906989698736:web:8379b9ddfa3819e0998575",
  measurementId: "G-RQTXFW4CER"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Realtime Database
const database = getDatabase(app);
const analytics = getAnalytics(app);

export { app, database, analytics };