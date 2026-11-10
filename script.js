// ==========================================
// DAYBLOOM - COMPLETE SCRIPT
// Weather, location names, map pinning and temperature graph
// ==========================================

// 1. USER NAME, PROFILE INITIAL AND GREETING

const savedName = localStorage.getItem("daybloomName") || "Guest";

const username = document.getElementById("username");
const greeting = document.getElementById("greeting");
const headerInitial = document.getElementById("headerInitial");

const profileInitial = savedName.trim().charAt(0).toUpperCase() || "V";

if (username) {
    username.textContent =
        savedName.charAt(0).toUpperCase() + savedName.slice(1);
}

// Update profile initial on Home, Weather and Calendar.
if (headerInitial) {
    headerInitial.textContent = profileInitial;
}

function updateGreeting() {
    const hour = new Date().getHours();

    if (greeting) {
        greeting.textContent =
            hour < 12 ? "Good Morning!" :
            hour < 17 ? "Good Afternoon!" :
            "Good Evening!";
    }
}

updateGreeting();

// 2. WEATHER CONDITIONS

function getWeatherInfo(code) {
    if (code === 0) return ["Sunny", "☀️"];
    if (code === 1) return ["Mainly Clear", "🌤️"];
    if (code === 2) return ["Partly Cloudy", "⛅"];
    if (code === 3) return ["Overcast", "☁️"];

    if ([45, 48].includes(code)) return ["Foggy", "🌫️"];

    if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code))
        return ["Rainy", "🌧️"];

    if ([71, 73, 75, 77, 85, 86].includes(code))
        return ["Snowy", "❄️"];

    if ([95, 96, 99].includes(code))
        return ["Thunderstorm", "⛈️"];

    return ["Unknown", "🌡️"];
}

// 3. MAP SETUP

let map = null;
let marker = null;
let selectedLocation = null;
let weatherChart = null;

const mapModal = document.getElementById("mapModal");
const mapElement = document.getElementById("map");

if (mapElement) {
    mapElement.style.pointerEvents = "auto";
    mapElement.style.touchAction = "none";
    mapElement.style.cursor = "grab";
}

function initializeMap() {

    if (!mapElement) {
        console.error('Map element "#map" was not found.');
        alert("The map area was not found. Please check weather.html.");
        return;
    }

    if (typeof L === "undefined") {
        alert("The map library did not load. Please check your internet connection.");
        return;
    }

    if (map) {
        map.invalidateSize();
        map.dragging.enable();
        return;
    }

    map = L.map("map", {
        dragging: true,
        scrollWheelZoom: true,
        touchZoom: true,
        doubleClickZoom: true,
        boxZoom: true,
        keyboard: true
    }).setView([20, 0], 2);

    L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
        {
            attribution: "Tiles © Esri",
            maxZoom: 19
        }
    ).addTo(map);

    map.dragging.enable();
    map.scrollWheelZoom.enable();
    map.touchZoom.enable();

    map.on("click", function(event) {

        selectedLocation = event.latlng;

        if (marker) {
            marker.setLatLng(event.latlng);
        } else {
            marker = L.marker(event.latlng, {
                draggable: true
            }).addTo(map);
        }

        const coordinates = document.getElementById("selectedCoordinates");

        if (coordinates) {
            coordinates.textContent =
                event.latlng.lat.toFixed(4) + ", " +
                event.latlng.lng.toFixed(4);
        }

        marker.off("dragend");

        marker.on("dragend", function(markerEvent) {

            selectedLocation = markerEvent.target.getLatLng();

            if (coordinates) {
                coordinates.textContent =
                    selectedLocation.lat.toFixed(4) + ", " +
                    selectedLocation.lng.toFixed(4);
            }
        });
    });
}

// 4. OPEN AND CLOSE MAP

const openMapButton = document.getElementById("openMap");
const closeMapButton = document.getElementById("closeMap");

if (openMapButton) {
    openMapButton.addEventListener("click", function() {

        if (mapModal) {
            mapModal.classList.add("show");
        }

        setTimeout(function() {
            initializeMap();

            if (map) {
                map.invalidateSize();
            }
        }, 250);
    });
}

if (closeMapButton) {
    closeMapButton.addEventListener("click", function() {

        if (mapModal) {
            mapModal.classList.remove("show");
        }
    });
}

// 5. USE MY LOCATION

const myLocationButton = document.getElementById("myLocation");

if (myLocationButton) {
    myLocationButton.addEventListener("click", function() {

        if (!navigator.geolocation) {
            alert("Location is not supported by your browser.");
            return;
        }

        navigator.geolocation.getCurrentPosition(

            function(position) {

                selectedLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };

                if (mapModal) {
                    mapModal.classList.remove("show");
                }

                loadWeather(
                    selectedLocation.lat,
                    selectedLocation.lng
                );
            },

            function(error) {
                console.error("Geolocation error:", error);

                alert(
                    "Could not access your location. Please allow location permission or choose a place on the map."
                );
            },

            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 60000
            }
        );
    });
}

// 6. CONFIRM MAP LOCATION

const confirmLocationButton =
    document.getElementById("confirmLocation");

if (confirmLocationButton) {

    confirmLocationButton.addEventListener("click", function() {

        if (!selectedLocation) {
            alert("Please click a place on the map to drop a pin first.");
            return;
        }

        if (mapModal) {
            mapModal.classList.remove("show");
        }

        loadWeather(
            selectedLocation.lat,
            selectedLocation.lng
        );
    });
}

// 7. LOCATION NAME

async function getLocationName(latitude, longitude) {

    try {

        const url =
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`;

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error("Location lookup failed");
        }

        const data = await response.json();

        const locality = data.locality ||
            data.localityInfo?.administrative?.[2]?.name || "";

        const city = data.city || "";

        const district =
            data.localityInfo?.administrative?.[1]?.name || "";

        const state = data.principalSubdivision || "";
        const country = data.countryName || "";

        const parts = [
            locality,
            city,
            district,
            state,
            country
        ]
        .filter(Boolean)
        .filter((value, index, array) =>
            array.indexOf(value) === index
        );

        return parts.length
            ? parts.join(", ")
            : "Selected Location";

    } catch (error) {

        console.error("Reverse geocoding error:", error);

        return "Selected Location";
    }
}

// 8. FETCH WEATHER

async function loadWeather(latitude, longitude) {

    const cityNameElement =
        document.getElementById("cityName");

    if (cityNameElement) {
        cityNameElement.textContent = "Loading weather...";
    }

    const url =
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
        `&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,pressure_msl,wind_speed_10m,uv_index` +
        `&hourly=temperature_2m` +
        `&daily=weather_code,temperature_2m_max,temperature_2m_min` +
        `&forecast_days=5&timezone=auto`;

    try {

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error("Weather service unavailable");
        }

        const data = await response.json();

        await displayWeather(data, latitude, longitude);

    } catch (error) {

        console.error("Weather error:", error);

        if (cityNameElement) {
            cityNameElement.textContent = "Unable to load weather";
        }

        alert(
            "Could not load weather. Please check your internet connection and try again."
        );
    }
}

// 9. DISPLAY WEATHER

async function displayWeather(data, latitude, longitude) {

    const current = data.current;
    const info = getWeatherInfo(current.weather_code);

    const cityNameElement =
        document.getElementById("cityName");

    if (cityNameElement) {
        cityNameElement.textContent = "Loading location name...";
    }

    const placeName =
        await getLocationName(latitude, longitude);

    if (cityNameElement) {
        cityNameElement.textContent = placeName;
    }

    const setText = (id, value) => {

        const element = document.getElementById(id);

        if (element) {
            element.textContent = value;
        }
    };

    setText(
        "coordinates",
        `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
    );

    setText(
        "temperature",
        `${Math.round(current.temperature_2m)}°C`
    );

    setText("weatherIcon", info[1]);
    setText("weatherDescription", info[0]);

    setText(
        "feelsLike",
        `Feels like ${Math.round(current.apparent_temperature)}°C`
    );

    setText("humidity", `${current.relative_humidity_2m}%`);
    setText("wind", `${current.wind_speed_10m} km/h`);
    setText("pressure", `${current.pressure_msl} hPa`);
    setText("uv", current.uv_index);

    setText(
        "highlightFeels",
        `${Math.round(current.apparent_temperature)}°C`
    );

    setText(
        "highlightHumidity",
        `${current.relative_humidity_2m}%`
    );

    setText(
        "highlightWind",
        `${current.wind_speed_10m} km/h`
    );

    setText("highlightUV", current.uv_index);

    displayForecast(data.daily);
    displayGraph(data);
}

// 10. FIVE-DAY FORECAST

function displayForecast(daily) {

    const container =
        document.getElementById("forecastContainer");

    if (!container) return;

    container.innerHTML = "";

    daily.time.forEach((date, index) => {

        const day = new Date(date + "T12:00:00")
            .toLocaleDateString("en-US", {
                weekday: "short"
            });

        const info =
            getWeatherInfo(daily.weather_code[index]);

        const card = document.createElement("div");

        card.className = "forecast-card";

        card.innerHTML = `
            <strong>${day}</strong>
            <div class="forecast-icon">${info[1]}</div>
            <p>${info[0]}</p>
            <h3>
                ${Math.round(daily.temperature_2m_max[index])}° /
                ${Math.round(daily.temperature_2m_min[index])}°
            </h3>
        `;

        container.appendChild(card);
    });
}

// 11. TEMPERATURE GRAPH

function displayGraph(data) {

    const chartModeElement =
        document.getElementById("chartMode");

    const chartCanvas =
        document.getElementById("weatherChart");

    if (!chartCanvas) return;

    if (typeof Chart === "undefined") {
        console.error("Chart.js did not load.");
        return;
    }

    const mode = chartModeElement
        ? chartModeElement.value
        : "hourly";

    let labels = [];
    let temperatures = [];

    if (mode === "hourly") {

        const hourly = data.hourly;

        let currentHour = hourly.time.findIndex(time =>
            time.slice(0, 13) === data.current.time.slice(0, 13)
        );

        if (currentHour < 0) {
            currentHour = 0;
        }

        labels = hourly.time
            .slice(currentHour, currentHour + 24)
            .map(time => time.slice(11, 16));

        temperatures = hourly.temperature_2m
            .slice(currentHour, currentHour + 24);

    } else {

        labels = data.daily.time.map(date =>
            new Date(date + "T12:00:00")
                .toLocaleDateString("en-US", {
                    weekday: "short"
                })
        );

        temperatures = data.daily.temperature_2m_max;
    }

    if (weatherChart) {
        weatherChart.destroy();
    }

    weatherChart = new Chart(chartCanvas, {

        type: "line",

        data: {
            labels: labels,

            datasets: [{
                label: "Temperature °C",
                data: temperatures,
                borderColor: "#52684E",
                backgroundColor: "rgba(82,104,78,0.13)",
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointBackgroundColor: "#52684E"
            }]
        },

        options: {
            responsive: true,
            maintainAspectRatio: false,

            plugins: {
                legend: {
                    display: false
                }
            },

            scales: {
                y: {
                    title: {
                        display: true,
                        text: "Temperature °C"
                    }
                }
            }
        }
    });
}

// 12. GRAPH VIEW SWITCH

const chartModeElement =
    document.getElementById("chartMode");

if (chartModeElement) {

    chartModeElement.addEventListener("change", function() {

        if (selectedLocation) {
            loadWeather(
                selectedLocation.lat,
                selectedLocation.lng
            );
        }
    });
}

// ==========================================
// DAYBLOOM - END
// ==========================================