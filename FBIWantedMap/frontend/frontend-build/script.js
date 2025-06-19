
let exampleData = {}; // Obiekt przechowujący liczbę przypadków na stan

const BACKEND_URL = 'http://34.116.160.243';


// === Funkcja: Pobieranie danych z Firestore ===
async function fetchData() {
    try {
        console.log('Próba pobrania danych z Firestore...');
        const response = await fetch(`${BACKEND_URL}/api/test`);

        if (!response.ok) {
            console.error('Błąd HTTP:', response.status, response.statusText);
            throw new Error(`Błąd pobierania danych z Firestore: ${response.status} ${response.statusText}`);
        }
        // sprawdza skąd są dane, jeżeli firestore będzie działał można tu zostawić 'const data = await response.json();'
        const result = await response.json();
        const source = result.source || 'nieznane źródło';
        console.log('Źródło danych:', source);
        const data = result.data || [];

        console.log('Pobrano rekordów z Firestore:', data.length);

        // Czyszczenie poprzednich danych
        exampleData = {};

        // === Przetwarzanie danych ===
        for (const item of data) {
            let state = item.state;

            // Jeśli stan istnieje, normalizujemy jego zapis i zliczamy
            if (state && state !== 'Unknown') {
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
(async function () {
    await fetchData(); // pobranie danych z backendu

    window.map = L.map('map').setView([37.8, -96], 4); // Inicjalizacja mapy z widokiem na USA

    // Warstwa kafelkowa (OpenStreetMap)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // === Kolorowanie stanów w zależności od wartości ===
    function getColor(value) {
        return value > 20 ? '#800026' :
            value > 15 ? '#BD0026' :
                value > 10 ? '#E31A1C' :
                    value > 5 ? '#FC4E2A' :
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
    mouseout: resetHighlight,
    click: () => setDashboardState(name)
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

    // === Dodanie legendy ===
    const legend = L.control({ position: 'bottomright' });

    legend.onAdd = function () {
        const div = L.DomUtil.create('div', 'info legend');
        const ranges = [
            { label: '0–5', color: '#FFEDA0' },
            { label: '6–10', color: '#FC4E2A' },
            { label: '11–15', color: '#E31A1C' },
            { label: '16–20', color: '#BD0026' },
            { label: '21+', color: '#800026' }
        ];

        let html = `
        <h4>Legend</h4>
        <div class="legend-subtitle">Number of reports</div>
    `;
        ranges.forEach(r => {
            html += `
            <div class="legend-item">
                <span class="legend-color" style="background:${r.color}"></span>
                ${r.label}
            </div>`;
        });

        div.innerHTML = html;
        return div;
    };

    legend.addTo(map);

    // === wysyła zapytanie o ping ===
    fetch(`${BACKEND_URL}/ping`)
        .then(res => res.text())
        .then(data => {
            console.log('✅ Backend odpowiedział:', data);
            alert('✅ Działa: ' + data);
        })
        .catch(err => {
            console.error('❌ Brak komunikacji z backendem:', err);
            alert('❌ Nie działa: brak połączenia z backendem');
        });

}
)();