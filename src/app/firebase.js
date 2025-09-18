import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBCDmHIWKcnP4r6lPM4JMiGrB1rX6Z-xqc",
  authDomain: "lista-compra-79d21.firebaseapp.com",
  projectId: "lista-compra-79d21",
  storageBucket: "lista-compra-79d21.firebasestorage.app",
  messagingSenderId: "905916593402",
  appId: "1:905916593402:web:b83406d7d2c87f95220543",
  measurementId: "G-YK99QSG28M"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);