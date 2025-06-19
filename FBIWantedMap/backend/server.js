const express = require('express');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: '/secrets/.env' });

const app = express();
// app.use(cors({
//   origin: 'https://fbi-wanted-map-461514.web.app'
// }));
const cors = require('cors');

app.use(cors({
  origin: 'http://34.116.160.243'
}));

const PORT = process.env.PORT || 3000;

// === Inicjalizacja Firestore (z fallbackiem) ===
let db = null;
let firestoreAvailable = false;
try {
  const admin = require("firebase-admin");
  const serviceAccount = require('/secrets/firebase-key.json');

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  }

  db = admin.firestore();
  firestoreAvailable = true;
  console.log("✅ Firestore połączony");
} catch (error) {
  console.warn("⚠️ Firestore niedostępny. Przechodzę w tryb offline.");
}

// === Middleware ===

app.use(express.json());

if (process.env.NODE_ENV !== 'production') {
  app.use(express.static(path.join(__dirname, '../frontend')));
}

// === Trasy ===
app.get('/', (req, res) => {
  res.send('Hello World from Backend!');
});
// === Ping z servera na front ===
app.get('/ping', (req, res) => {
  res.send('pong');
});

app.get('/data', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dbtest.json'));
});

// === POST /api/save ===
app.post('/api/save', async (req, res) => {
  if (!firestoreAvailable) {
    return res.status(503).json({ success: false, error: 'Firestore niedostępny – tryb offline' });
  }

  try {
    const data = req.body;
    const docRef = await db.collection('filteredData').add(data);
    res.status(200).json({ success: true, id: docRef.id });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// === POST /api/test ===
app.post('/api/test', async (req, res) => {
  if (!firestoreAvailable) {
    return res.status(503).json({ success: false, error: 'Firestore niedostępny – tryb offline' });
  }

  try {
    const data = req.body;
    const docRef = await db.collection('testData_v5').add(data);
    res.status(200).json({ success: true, id: docRef.id, message: 'Dane zapisane do testData_v5.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// === GET /api/test ===
app.get('/api/test', async (req, res) => {
  if (!firestoreAvailable) {
    // Wersja offline – z pliku
    try {
      const filePath = path.join(__dirname, '../frontend/dbtest.json');
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(fileContent);
      return res.status(200).json({ source: 'dbtest.json', data });
    } catch (err) {
      console.warn("❌ Błąd przy czytaniu dbtest.json:", err.message);
      return res.status(500).json({ success: false, error: 'Błąd czytania danych offline' });
    }
  }

  try {
    const snapshot = await db.collection('testData_v5').get();
    const results = [];
    snapshot.forEach(doc => {
      results.push({ id: doc.id, ...doc.data() });
    });
    res.status(200).json({ source: 'firestore', data: results }); // wysyła żródło danych online 'return res.status(200).json(data);'
  } catch (err) {
    console.warn("⚠️ Błąd Firestore, przełączam na plik dbtest.json:", err.message);

    try {
      const filePath = path.join(__dirname, 'dbtest.json');
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(fileContent);
      return res.status(200).json({ source: 'dbtest.json', data }); //wysyła źródło danych offline 'return res.status(200).json(data);'
    } catch (fallbackErr) {
      console.error("❌ Awaria backupu:", fallbackErr.message);
      return res.status(500).json({ success: false, error: 'Błąd backupu z pliku' });
    }
  }
});


// === Start serwera ===
app.listen(PORT, () => {
  console.log(`✅ Serwer działa na porcie ${PORT}`);
});
