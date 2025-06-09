let exampleData = {}; // Obiekt przechowujący liczbę przypadków na stan

// === Mapowanie biur FBI na stany ===
// Wykorzystywane do przypisania danych do właściwego stanu na mapie
const fbiOfficeToState = {
    "albany": "New York",
    "albuquerque": "New Mexico",
    "anchorage": "Alaska",
    "atlanta": "Georgia",
    "baltimore": "Maryland",
    "birmingham": "Alabama",
    "boston": "Massachusetts",
    "buffalo": "New York",
    "charlotte": "North Carolina",
    "chicago": "Illinois",
    "cincinnati": "Ohio",
    "cleveland": "Ohio",
    "columbia": "South Carolina",
    "dallas": "Texas",
    "denver": "Colorado",
    "detroit": "Michigan",
    "elpaso": "Texas",
    "honolulu": "Hawaii",
    "houston": "Texas",
    "indianapolis": "Indiana",
    "jackson": "Mississippi",
    "jacksonville": "Florida",
    "kansascity": "Missouri",
    "knoxville": "Tennessee",
    "lasvegas": "Nevada",
    "littlerock": "Arkansas",
    "losangeles": "California",
    "louisville": "Kentucky",
    "memphis": "Tennessee",
    "miami": "Florida",
    "milwaukee": "Wisconsin",
    "minneapolis": "Minnesota",
    "mobile": "Alabama",
    "nashville": "Tennessee",
    "newark": "New Jersey",
    "newhaven": "Connecticut",
    "neworleans": "Louisiana",
    "newyork": "New York",
    "norfolk": "Virginia",
    "oklahomacity": "Oklahoma",
    "omaha": "Nebraska",
    "philadelphia": "Pennsylvania",
    "phoenix": "Arizona",
    "pittsburgh": "Pennsylvania",
    "portland": "Oregon",
    "richmond": "Virginia",
    "sacramento": "California",
    "saltlakecity": "Utah",
    "sanantonio": "Texas",
    "sandiego": "California",
    "sanfrancisco": "California",
    "sanjuan": "Puerto Rico",
    "seattle": "Washington",
    "springfield": "Illinois",
    "stlouis": "Missouri",
    "tampa": "Florida",
    "washingtondc": "District of Columbia",
    "idaho": "Idaho"
};

// === Funkcja: Pobieranie danych z Firestore ===
async function fetchData() {
    try {
        console.log('Próba pobrania danych z Firestore...');
        const response = await fetch('http://localhost:8080/api/test');

        if (!response.ok) {
            console.error('Błąd HTTP:', response.status, response.statusText);
            throw new Error(`Błąd pobierania danych z Firestore: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log('Pobrano rekordów z Firestore:', data.length);

        // Czyszczenie poprzednich danych
        exampleData = {};

        // === Przetwarzanie danych ===
        for (const item of data) {
            let state = null;

            // Przypisanie stanu na podstawie biura FBI
            if (item.field_offices && item.field_offices.length > 0 && item.field_offices[0] !== 'Unknown') {
                const office = item.field_offices[0].toLowerCase();
                state = fbiOfficeToState[office];
            }

            // Jeśli nie ma biura, używamy bezpośredniego pola `state`
            if (!state && item.state && item.state !== 'Unknown') {
                state = item.state;
            }

            // Jeśli stan istnieje, normalizujemy jego zapis i zliczamy
            if (state) {
                state = state.trim();
                state = state
                    .split(' ')
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                    .join(' ');

                exampleData[state] = (exampleData[state] || 0) + 1;
            }
        }

        console.log('Przetworzone dane:', exampleData);
    } catch (err) {
        console.error('Szczegóły błędu:', err);
        exampleData = {};
    }
}

// === Inicjalizacja mapy i render ===
(async function() {
    await fetchData(); // Najpierw pobieramy dane z backendu

    const map = L.map('map').setView([37.8, -96], 4); // Inicjalizacja mapy z widokiem na USA

    // Warstwa kafelkowa (OpenStreetMap)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // === Kolorowanie stanów w zależności od wartości ===
    function getColor(value) {
        return value > 20 ? '#800026' :
               value > 15 ? '#BD0026' :
               value > 10 ? '#E31A1C' :
               value > 5  ? '#FC4E2A' :
                            '#FFEDA0';
    }

    // Stylizacja warstwy geojson (czyli wygląd stanów)
    function style(feature) {
        const name = feature.properties.name;
        const value = exampleData[name] || 0;

        return {
            fillColor: getColor(value),
            weight: 2,
            opacity: 1,
            color: '#666',
            fillOpacity: 0.7
        };
    }

    // Efekt podświetlenia po najechaniu myszą
    function highlightFeature(e) {
        const layer = e.target;
        layer.setStyle({
            weight: 3,
            color: '#000',
            fillOpacity: 0.7
        });
    }

    // Reset stylu po opuszczeniu stanu
    function resetHighlight(e) {
        geojson.resetStyle(e.target);
    }

    // Przypięcie tooltipów i zdarzeń do każdego stanu
    function onEachFeature(feature, layer) {
        const name = feature.properties.name;
        const value = exampleData[name] || 0;

        layer.bindTooltip(`${name}: ${value}`); // Pokazuje tooltip

        layer.on({
            mouseover: highlightFeature,
            mouseout: resetHighlight
        });
    }

    let geojson;

    // === Pobranie danych GeoJSON i dodanie do mapy ===
    fetch('https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json')
        .then(res => res.json())
        .then(geojsonData => {
            geojson = L.geoJson(geojsonData, {
                style: style,
                onEachFeature: onEachFeature
            }).addTo(map);
        });
})();