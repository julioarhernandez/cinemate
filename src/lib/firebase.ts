// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, getAdditionalUserInfo } from "firebase/auth";
import { getFirestore, doc, setDoc, serverTimestamp } from "firebase/firestore";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  "projectId": "cinemate-l1ksh",
  "appId": "1:605311089524:web:85f4e72781f37f05a04a21",
  "storageBucket": "cinemate-l1ksh.firebasestorage.app",
  "apiKey": "AIzaSyAqQEdxRJPAxp4eaav5sQ3IIjtu5ZbJ9lA",
  "authDomain": "cinemate-l1ksh.firebaseapp.com",
  "measurementId": "",
  "messagingSenderId": "605311089524"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

export { app, auth, db, googleProvider, signInWithPopup, doc, setDoc, serverTimestamp, getAdditionalUserInfo };
