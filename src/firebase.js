import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

export const firebaseConfig = {
  apiKey: "AIzaSyDAI46UYQMVMCnNqQD9MqR3yhiHUzghYuA",
  authDomain: "timebomb-game.firebaseapp.com",
  databaseURL: "https://timebomb-game-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "timebomb-game",
  storageBucket: "timebomb-game.firebasestorage.app",
  messagingSenderId: "752842528482",
  appId: "1:752842528482:web:f97dd6bead7bb6bca4f0bb"
};

const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);