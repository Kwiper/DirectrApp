import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDdmfRzRlYAaXFa_BPG5sCoe-qZyCc-5No",
  authDomain: "moverecapp.firebaseapp.com",
  projectId: "moverecapp",
  storageBucket: "moverecapp.firebasestorage.app",
  messagingSenderId: "572156967563",
  appId: "1:572156967563:web:357b39f251512cf146f28e"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});
const db = getFirestore(app);
export { auth, db };
