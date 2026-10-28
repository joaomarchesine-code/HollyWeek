import { initializeApp } from 'firebase/app';
import { initializeFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyCJUe-1F8p150cOisdPZfvHMM7VPr1sKeQ',
  authDomain: 'my-week-app-d1456.firebaseapp.com',
  projectId: 'my-week-app-d1456',
  storageBucket: 'my-week-app-d1456.firebasestorage.app',
  messagingSenderId: '137227303740',
  appId: '1:137227303740:web:14fe72ea6bf396dffa7c39',
};

const app = initializeApp(firebaseConfig);

// experimentalForceLongPolling: necessário para Expo Go funcionar corretamente
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
});

export default app;
