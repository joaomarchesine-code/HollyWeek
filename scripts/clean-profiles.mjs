import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyCJUe-1F8p150cOisdPZfvHMM7VPr1sKeQ',
  authDomain: 'my-week-app-d1456.firebaseapp.com',
  projectId: 'my-week-app-d1456',
  storageBucket: 'my-week-app-d1456.firebasestorage.app',
  messagingSenderId: '137227303740',
  appId: '1:137227303740:web:14fe72ea6bf396dffa7c39',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  console.log('Limpando todas as agendas no Firestore...');
  await setDoc(doc(db, 'myweek', 'app_users'), { items: [] });
  console.log('✅ Pronto! Todas as agendas foram removidas.');
  process.exit(0);
}

run().catch((err) => {
  console.error('Erro:', err);
  process.exit(1);
});
