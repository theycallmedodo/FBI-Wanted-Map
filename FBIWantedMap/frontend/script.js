// Inicjalizacja mapy i ustawienie widoku na środek USA (szerokość geograficzna, długość geograficzna, zoom)
const map = L.map('map').setView([37.8, -96], 4);

// Dodanie warstwy mapy bazowej z OpenStreetMap
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors' // przypisanie autorstwa
}).addTo(map);

// Przykładowe dane liczbowego "wyniku" czyli liczby osób poszukiwanych dla każdego stanu USA
const exampleData = {
    "Alabama": 0, "Alaska": 0, "Arizona": 0, "Arkansas": 0, "California": 100,
    "Colorado": 0, "Connecticut": 0, "Delaware": 0, "Florida": 0, "Georgia": 0,
    "Hawaii": 0, "Idaho": 0, "Illinois": 0, "Indiana": 0, "Iowa": 0,
    "Kansas": 0, "Kentucky": 0, "Louisiana": 0, "Maine": 0, "Maryland": 0,
    "Massachusetts": 0, "Michigan": 0, "Minnesota": 0, "Mississippi": 0, "Missouri": 25,
    "Montana": 0, "Nebraska": 0, "Nevada": 0, "New Hampshire": 0, "New Jersey": 0,
    "New Mexico": 0, "New York": 75, "North Carolina": 0, "North Dakota": 0, "Ohio": 0,
    "Oklahoma": 0, "Oregon": 0, "Pennsylvania": 0, "Rhode Island": 0, "South Carolina": 0,
    "South Dakota": 0, "Tennessee": 0, "Texas": 80, "Utah": 0, "Vermont": 0,
    "Virginia": 0, "Washington": 0, "West Virginia": 0, "Wisconsin": 0, "Wyoming": 0
};

// Funkcja przypisująca kolor na podstawie wartości
function getColor(value) {
    return value > 80 ? '#800026' :
        value > 60 ? '#BD0026' :
            value > 40 ? '#E31A1C' :
                value > 20 ? '#FC4E2A' :
                    '#FFEDA0';
}

// Stylowanie każdego stanu na podstawie danych
function style(feature) {
    const name = feature.properties.name;
    const value = exampleData[name] || 0; // jeżeli brak danych, domyślnie 0

    return {
        fillColor: getColor(value),  // kolor wypełnienia na podstawie wartości
        weight: 2.5,                  // grubość obramowania
        opacity: 1,                   // przezroczystość linii
        color: '#333333',            // kolor obramowania
        dashArray: '3',              // kreskowanie
        fillOpacity: 0.4             // przezroczystość wypełnienia
    };
}

// Funkcja podświetlająca stan po najechaniu kursorem
function highlightFeature(e) {
    const layer = e.target;
    layer.setStyle({
        weight: 4,
        color: '#000',     // czarna obwódka
        dashArray: '',
        fillOpacity: 0.4
    });

    // przynoszenie warstwy na wierzch w niektórych przeglądarkach
    if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
        layer.bringToFront();
    }
}

// Resetowanie stylu po usunięciu kursora z danego stanu
function resetHighlight(e) {
    geojson.resetStyle(e.target);
}

let selectedState = null; // zmienna do przechowywania klikniętego stanu

// Funkcja przypisująca akcje do każdego stanu
function onEachFeature(feature, layer) {
    const name = feature.properties.name;
    const value = exampleData[name] || 0;

    // Dodanie podpowiedzi z nazwą stanu i wartością
    layer.bindTooltip(`${name}: ${value}`);

    // Reakcje na zdarzenia myszki
    layer.on({
        mouseover: function (e) {
            highlightFeature(e); // podświetl
        },
        mouseout: function (e) {
            if (selectedState !== e.target) {
                resetHighlight(e); // zresetuj, jeśli to nie zaznaczony stan
            }
        },
        click: function (e) {
            // Jeżeli wcześniej zaznaczony stan istnieje, zresetuj jego styl
            if (selectedState && selectedState !== e.target) {
                geojson.resetStyle(selectedState);
            }

            // Ustaw obecnie kliknięty stan jako zaznaczony
            selectedState = e.target;
            selectedState.setStyle({
                weight: 4,
                color: '#000',
                dashArray: '',
                fillOpacity: 0.4
            });

            selectedState.bringToFront(); // przenieś na wierzch
        }
    });
}

let geojson; // zmienna globalna do przechowywania warstwy stanów

// Pobranie danych geojson z GitHub i dodanie ich do mapy
fetch('https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json')
    .then(res => res.json()) // konwersja odpowiedzi na JSON
    .then(geojsonData => {
        geojson = L.geoJson(geojsonData, {
            style: style,             // przypisanie stylów
            onEachFeature: onEachFeature // przypisanie interakcji
        }).addTo(map); // dodanie do mapy
    });
