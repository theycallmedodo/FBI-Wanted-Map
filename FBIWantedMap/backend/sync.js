// === Importy wymaganych bibliotek ===
const fs = require('fs'); // do zapisu JSON do pliku
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args)); // fetch (dynamiczny import)
const admin = require("firebase-admin"); // Firebase Admin SDK
const serviceAccount = require("./firebase-key.json"); // klucz serwisowy do Firestore
const statesList = require('./data/us-states-list.json'); // lista stanów USA
const crypto = require('crypto'); // do haszowania URL jako ID dokumentów

// === Inicjalizacja Firestore ===
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}
const db = admin.firestore();

// === Konfiguracja ===
const baseUrl = 'https://api.fbi.gov/wanted/v1/list'; // źródło danych FBI
let allPersons = []; // wszystkie przetworzone rekordy

// === Punkt wejścia (główna funkcja synchronizacji) ===
main();

async function main() {
  console.log("rozpoczęcie funkcji main w sync.js");

  const pages = await calculatePages(baseUrl);
  console.log(`pages obliczone: ${pages}`);

  await collectAllWanted(baseUrl, pages);
  console.log(`collectAllWanted() ;)`);
  console.log("gotowe dane:", allPersons);

  exportToJsonFile(allPersons); // eksport lokalny
  await exportToFirestore(allPersons); // eksport do Firestore
}

// === Funkcja opóźniająca ===
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// === Ekstrakcja stanu z tytułu (gdy brak info o FBI) ===
function extractStateFromTitle(title) {
  if (!title) return 'Unknown';
  const normalized = title.toLowerCase();

  for (const state of statesList) {
    const compactState = state.toLowerCase();
    const afterComma = `, ${compactState}`;
    const afterDash = `- ${compactState}`;
    if (normalized.includes(afterComma) || normalized.includes(afterDash)) {
      return compactState;
    }
  }
  return 'Unknown';
}

// === Kategoryzacja osoby na podstawie URL ===
function extractCategoryFromUrl(url) {
  if (!url) return 'Unknown';
  const lowerUrl = url.toLowerCase();

  if (lowerUrl.includes('/murders/')) return 'Murder';
  if (lowerUrl.includes('/kidnap/')) return 'Kidnapping';
  if (lowerUrl.includes('vicap/homicides-and-sexual-assaults/')) return 'Homicides and sexual assaults';
  if (lowerUrl.includes('/cei/')) return 'Criminal Enterprise Investigations';
  if (lowerUrl.includes('/seeking-info/')) return 'Seeking info';
  if (lowerUrl.includes('/counterintelligence/')) return 'Counterintelligence';
  if (lowerUrl.includes('/topten/')) return 'Top ten wanted';
  if (lowerUrl.includes('/wcc/')) return 'White Collars Crimes';
  if (lowerUrl.includes('vicap/missing-persons/')) return 'Related to missing persons';
  if (lowerUrl.includes('/cyber/')) return 'Cyber';
  if (lowerUrl.includes('/human-trafficking/')) return 'Human Trafficking';
  if (lowerUrl.includes('vicap/unidentified-persons/')) return 'Related to undefined persons';
  if (lowerUrl.includes('/cac/')) return 'Crimes against children';
  if (lowerUrl.includes('/wanted_terrorists/') || lowerUrl.includes('/dt/') || lowerUrl.includes('/terrorinfo/')) return 'Terrorism';
  if (lowerUrl.includes('/parental-kidnappings/')) return 'Parental kidnappings';
  if (lowerUrl.includes('/ecap/')) return 'Related to children sexual assaults and pornography';
  if (lowerUrl.includes('/additional/')) return 'Other';
  if (lowerUrl.includes('/law-enforcement-assistance/')) return 'Law enforcement assistance';

  return 'Other';
}

// === Obliczanie ile stron wyników zawiera API ===
async function calculatePages(url) {
  console.log("calculate pages");
  const response = await fetch(url);
  const data = await response.json();
  const total = data.total;
  const pageSize = data.items.length;
  const pages = Math.ceil(total / pageSize);
  return pages;
}

// === Pobranie danych z API i przypisanie stanu i kategorii ===
async function collectAllWanted(url, totalPages) {
  const fbiOfficeToState = {
    // mapowanie biur FBI na stany
    "albany": "New York", "albuquerque": "New Mexico", "anchorage": "Alaska", "atlanta": "Georgia",
    "baltimore": "Maryland", "birmingham": "Alabama", "boston": "Massachusetts", "buffalo": "New York",
    "charlotte": "North Carolina", "chicago": "Illinois", "cincinnati": "Ohio", "cleveland": "Ohio",
    "columbia": "South Carolina", "dallas": "Texas", "denver": "Colorado", "detroit": "Michigan",
    "elpaso": "Texas", "honolulu": "Hawaii", "houston": "Texas", "indianapolis": "Indiana",
    "jackson": "Mississippi", "jacksonville": "Florida", "kansascity": "Missouri", "knoxville": "Tennessee",
    "lasvegas": "Nevada", "littlerock": "Arkansas", "losangeles": "California", "louisville": "Kentucky",
    "memphis": "Tennessee", "miami": "Florida", "milwaukee": "Wisconsin", "minneapolis": "Minnesota",
    "mobile": "Alabama", "nashville": "Tennessee", "newark": "New Jersey", "newhaven": "Connecticut",
    "neworleans": "Louisiana", "newyork": "New York", "norfolk": "Virginia", "oklahomacity": "Oklahoma",
    "omaha": "Nebraska", "philadelphia": "Pennsylvania", "phoenix": "Arizona", "pittsburgh": "Pennsylvania",
    "portland": "Oregon", "richmond": "Virginia", "sacramento": "California", "saltlakecity": "Utah",
    "sanantonio": "Texas", "sandiego": "California", "sanfrancisco": "California", "sanjuan": "Puerto Rico",
    "seattle": "Washington", "springfield": "Illinois", "stlouis": "Missouri", "tampa": "Florida",
    "washingtondc": "District of Columbia", "idaho": "Idaho"
  };

  for (let i = 1; i <= totalPages; i++) {
    const res = await fetch(`${baseUrl}?page=${i}`);
    const data = await res.json();

    const filtered = data.items.map(person => {
      let state = 'Unknown';

      // 1. Próba uzyskania stanu z biura FBI
      if (Array.isArray(person.field_offices) && person.field_offices.length > 0) {
        const office = person.field_offices[0].toLowerCase();
        if (fbiOfficeToState[office]) {
          state = fbiOfficeToState[office];
        }
      }

      // 2. Jeśli nadal Unknown, sprawdza tytuł
      if (state === 'Unknown') {
        const titleState = extractStateFromTitle(person.title);
        if (titleState && titleState !== 'Unknown') state = titleState;
      }

      // 3. Jeśli nadal Unknown, sprawdza description
      if (state === 'Unknown' && person.description) {
        const descState = extractStateFromTitle(person.description);
        if (descState && descState !== 'Unknown') state = descState;
      }

      return {
        url: person.url || '',
        title: person.title || '',
        race: person.race || 'Unknown',
        state: toTitleCase(state), // normalizacja zapisu stanu
        value: 1,
        category: extractCategoryFromUrl(person.url),
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      };
    });

    allPersons.push(...filtered);
    console.log(`strona ${i} – osób dodanych: ${filtered.length}`);
    await delay(1500); // opóźnienie, żeby nie zamulić API
  }
}

// === Zapis danych do pliku lokalnego (na potrzeby testów) ===
function exportToJsonFile(data) {
  const fileName = "dbtest.json";
  fs.writeFileSync(fileName, JSON.stringify(data, null, 2), 'utf8');
  console.log(`Zapisano dane do pliku ${fileName}`);
}

// === Eksport danych do kolekcji testData_v5 w Firestore ===
async function exportToFirestore(data) {
  const batch = db.batch();
  const dbCollectionName = 'testData_v5';
  const collectionRef = db.collection(dbCollectionName);

  data.forEach(person => {
    if (!person.url) return; // pomijaj jeśli brak URL

    const hash = crypto.createHash('sha256').update(person.url).digest('hex'); // tworzenie ID na podstawie URL
    const docRef = collectionRef.doc(hash); // ID dokumentu = hash(URL)

    batch.set(docRef, person); // nadpisuje jeśli już istnieje
    console.log(`Zapisuje dane do Firestore: ${person.title}`);
  });

  await batch.commit();
  console.log(`Zapisano dane do Cloud Firestore (kolekcja: ${dbCollectionName})`);
}

// === Funkcja pomocnicza – normalizuje string do Title Case żeby w db filtorwanie było kompatybilne ===
function toTitleCase(str) {
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}