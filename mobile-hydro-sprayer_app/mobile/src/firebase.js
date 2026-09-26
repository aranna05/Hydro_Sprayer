import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// Replace with your actual Firebase project config (Project settings -> General -> Your apps).

const firebaseConfig = {
  apiKey: "AIzaSyAG0mG682Sk0ArIUc-BMWyT3h2w3vNv38o",
  authDomain: "watermonitoringsystem-8f344.firebaseapp.com",
  projectId: "watermonitoringsystem-8f344",
  storageBucket: "watermonitoringsystem-8f344.firebasestorage.app",
  messagingSenderId: "515329373736",
  appId: "1:515329373736:web:d1169e1b14fd9e8cff271d"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export default app;
