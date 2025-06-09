// === Podstawowe importy: Express do serwera, path do ścieżek, cors do polityki CORS, fs do odczytu plików ===
const express = require('express');
const path = require('path');
const cors = require('cors');
const fs = require('fs');

// === Inicjalizacja Firestore (baza danych Firebase) ===
const admin = require("firebase-admin");
const serviceAccount = require("./firebase-key.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

// === Inicjalizacja aplikacji Express i konfiguracja portu ===
const app = express();
const PORT = process.env.PORT || 8080;

// === Middleware (pośrednicy między requestem a odpowiedzią) ===

// Zezwala na zapytania z innych domen (np. frontend lokalny)
app.use(cors());

// Umożliwia przetwarzanie JSON-a przesyłanego w ciele zapytań POST
app.use(express.json());

// Serwowanie plików statycznych z folderu "frontend" (HTML, JS, CSS)
app.use(express.static(path.join(__dirname, '../frontend')));

// === ROUTES (czyli API – punkty wejścia) ===

// GET / – testowy endpoint, po wejściu na localhost:8080 wypisuje tekst
app.get('/', (req, res) => {
  res.send('Hello World from Backend!');
});

// GET /data – tylko do lokalnych testów, zwraca surowy plik JSON z frontend/dbtest.json
app.get('/data', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dbtest.json'));
});

// POST /api/save – zapisuje dane (np. z formularza użytkownika) do kolekcji "filteredData"
app.post('/api/save', async (req, res) => {
  try {
    const data = req.body; // oczekuje JSON-a w body
    const docRef = await db.collection('filteredData').add(data); // dodaje nowy dokument
    res.status(200).json({ success: true, id: docRef.id });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/test – zapisuje dane zsynchronizowane z FBI API (z pliku sync.js) do kolekcji "testData_v5"
app.post('/api/test', async (req, res) => {
  try {
    const data = req.body;
    const docRef = await db.collection('testData_v5').add(data);
    res.status(200).json({ success: true, id: docRef.id, message: 'Dane zapisane do testData.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/test – pobiera wszystkie dane z kolekcji "testData_v5" i zwraca je w tablicy
app.get('/api/test', async (req, res) => {
  try {
    const snapshot = await db.collection('testData_v5').get(); // pobiera wszystkie dokumenty
    const results = [];
    snapshot.forEach(doc => {
      results.push({ id: doc.id, ...doc.data() }); // dodaje każdy dokument jako obiekt z id
    });
    res.status(200).json(results); // zwraca tablicę obiektów JSON
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// === Uruchomienie serwera ===
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});