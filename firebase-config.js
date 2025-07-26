// Firebase configuration
// Replace with your Firebase project configuration
const firebaseConfig = {
  apiKey: "AIzaSyAJPINjgTpL0uaT6z6njrBMGYDH2j0jEsw",
  authDomain: "trafic-98e23.firebaseapp.com",
  databaseURL: "https://trafic-98e23-default-rtdb.firebaseio.com/",
  projectId: "trafic-98e23",
  storageBucket: "trafic-98e23.firebasestorage.app",
  messagingSenderId: "413791634162",
  appId: "1:413791634162:web:db0105a67b9e08a62b466b"
};

// Telegram Bot Configuration (for demonstration purposes - consider server-side for production)
window.telegramConfig = {
  botToken: '8021979712:AAGq1_DUk10wwkDWHzyL9YV8KWSgcJAmKJU',
  chatId: '1921751672' // Can be a group chat ID (e.g., -123456789) or user ID
};

// Firebase will be initialized in app.js