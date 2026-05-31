import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyD4W-SgbheyeuWZ25D6gdIFbQXO6hzJr7s",
  authDomain: "timetrack-empresa.firebaseapp.com",
  projectId: "timetrack-empresa",
  storageBucket: "timetrack-empresa.firebasestorage.app",
  messagingSenderId: "668736307548",
  appId: "1:668736307548:web:dbe694dcdb716a522b4199"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);