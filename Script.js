// Initialize the OpenLayers map
const map = new ol.Map({
    target: 'map',
    layers: [
        new ol.layer.Tile({
            source: new ol.source.OSM() // OpenStreetMap Layer
        })
    ],
    view: new ol.View({
        center: ol.proj.fromLonLat([-73.1235, 40.9126]), // Stony Brook University
        zoom: 15
    })
});

// Study spots data
const studySpots = {
    "library": { lat: 40.9153, lon: -73.1230, name: "Frank Melville Jr. Memorial Library" },
    "union": { lat: 40.91692536813923, lon: -73.12029592147844, name: "Stony Brook Union" }
};

// Function to add a marker
function addMarker(lat, lon, title) {
    let marker = new ol.Feature({
        geometry: new ol.geom.Point(ol.proj.fromLonLat([lon, lat])),
        name: title
    });

    let vectorSource = new ol.source.Vector({ features: [marker] });
    let vectorLayer = new ol.layer.Vector({
        source: vectorSource,
        style: new ol.style.Style({
            image: new ol.style.Icon({
                anchor: [0.5, 1],
                src: "https://maps.gstatic.com/mapfiles/ms2/micons/red-dot.png" // Default marker
            }),
            text: new ol.style.Text({
                text: title,
                offsetY: -25,
                fill: new ol.style.Fill({ color: "#fff" }),
                stroke: new ol.style.Stroke({ color: "#000", width: 2 })
            })
        })
    });

    map.addLayer(vectorLayer);
}

// Add markers for study spots
Object.values(studySpots).forEach(spot => addMarker(spot.lat, spot.lon, spot.name));


addMarker(studySpots.library.lat, studySpots.library.lon, "Frank Melville Jr. Memorial Library");
addMarker(studySpots.union.lat, studySpots.union.lon, "Stony Brook Union");
// User location marker
let userMarkerLayer = new ol.layer.Vector({ source: new ol.source.Vector() });
map.addLayer(userMarkerLayer);

function updateUserLocation(lat, lon) {
    console.log(`📡 Updating user location: ${lat}, ${lon}`); // Debugging log
    userMarkerLayer.getSource().clear();

    let userMarker = new ol.Feature({
        geometry: new ol.geom.Point(ol.proj.fromLonLat([lon, lat])),
        name: "You are here"
    });

    userMarker.setStyle(new ol.style.Style({
        image: new ol.style.Icon({
            anchor: [0.5, 1],
            src: "https://maps.gstatic.com/mapfiles/ms2/micons/blue-dot.png"
        }),
        text: new ol.style.Text({
            text: "You are here",
            offsetY: -25,
            fill: new ol.style.Fill({ color: "#fff" }),
            stroke: new ol.style.Stroke({ color: "#000", width: 2 })
        })
    }));

    userMarkerLayer.getSource().addFeature(userMarker);
    map.getView().setCenter(ol.proj.fromLonLat([lon, lat]));
    map.getView().setZoom(16); // Adjust zoom level for better visibility

    console.log("✅ User location marker updated & map centered!");
    checkProximity(lat, lon);
}

// Function to check if user is near a study spot
function checkProximity(userLat, userLon) {
    const proximityThreshold = 0.0008; // ~90 meters

    Object.keys(studySpots).forEach(spot => {
        const { lat, lon, name } = studySpots[spot];
        if (Math.abs(userLat - lat) < proximityThreshold && Math.abs(userLon - lon) < proximityThreshold) {
            showStatusUpdatePopup(spot, name);
        } else {
            hideStatusUpdateOption(spot);
        }
    });
}
function showStatusUpdateOption(spot, name) {
        let existingDiv = document.getElementById(`${spot}-status-update`);
        if (!existingDiv) {
            let div = document.createElement("div");
            div.id = `${spot}-status-update`;
            div.innerHTML = `
                <h3>${name} - Update Status</h3>
                <select id="${spot}-status-select">
                    <option value="Vacant">Vacant</option>
                    <option value="Little Busy">Little Busy</option>
                    <option value="Busy">Busy</option>
                </select>
                <button onclick="updateSpotStatus('${spot}')">Update</button>
            `;
            div.style.position = "fixed";
            div.style.bottom = "20px";
            div.style.right = "20px";
            div.style.padding = "15px";
            div.style.background = "#0D253F";
            div.style.color = "#F5E6C4";
            div.style.borderRadius = "10px";
            div.style.boxShadow = "0 0 10px rgba(0, 0, 0, 0.3)";
            document.body.appendChild(div);
        }
    }
function hideStatusUpdatePopup() {
    let modal = document.getElementById("userPrompt");
    if (modal) modal.classList.add("hidden");
}
// Function to hide the notification
function hideStatusUpdateOption(spot) {
    let div = document.getElementById(`${spot}-status-update`);
    if (div) {
        div.remove();
    }
}


function updateSpotStatus(spot) {
    let newStatus = document.getElementById(`${spot}-status-select`).value;
    localStorage.setItem(`${spot}Status`, newStatus);
    updateSidebarStatus(); // Update the UI
    hideStatusUpdateOption(spot);
}

// Function to show status update pop-up
function showStatusUpdatePopup(spot, name) {
    let modal = document.getElementById("userPrompt");
    modal.classList.remove("hidden");

    document.getElementById("submitPrompt").addEventListener("click", async () => {
        let selectedStatus = document.querySelector(`input[name="${spot}"]:checked`)?.value;

        if (!selectedStatus) {
            alert("Please select a status!");
            return;
        }

        try {
            await fetch("http://localhost:5001/submit-response", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, status: selectedStatus })
            });

            alert("✅ Your input has been recorded!");
            modal.classList.add("hidden");
        } catch (error) {
            console.error("❌ Error submitting response:", error);
        }
    });
}
async function fetchAndUpdateStatus() {
    try {
        let response = await fetch("http://localhost:5001/study-spots"); // Fetch latest data
        let spots = await response.json();

        spots.forEach(spot => {
            let statusSpan = document.getElementById(`${spot.name.toLowerCase()}-status`);
            if (statusSpan) {
                // Update the text content
                statusSpan.textContent = spot.status;

                // Remove previous status class
                statusSpan.classList.remove("vacant", "little-busy", "busy");

                // Add new status class based on response
                statusSpan.classList.add(spot.status.toLowerCase().replace(" ", "-"));
            }
        });

        console.log("✅ Status updated on frontend!");

    } catch (error) {
        console.error("❌ Error fetching study spot status:", error);
    }
}

// Fetch status on page load
fetchAndUpdateStatus();

// Update status every 5 minutes (300,000 ms)
setInterval(fetchAndUpdateStatus, 300000);


// Fetch updates every 30 seconds
setInterval(fetchAndUpdateStatus, 30000);

document.getElementById("submitPrompt").addEventListener("click", async () => {
    let libraryStatus = document.querySelector('input[name="library"]:checked')?.value;
    let unionStatus = document.querySelector('input[name="union"]:checked')?.value;

    if (!libraryStatus || !unionStatus) {
        alert("Please select a status for both locations!");
        return;
    }

    try {
        // Send response for Library
        await fetch("http://localhost:5001/submit-response", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: "Library", status: libraryStatus })
        });

        // Send response for Union
        await fetch("http://localhost:5001/submit-response", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: "Union", status: unionStatus })
        });

        alert("✅ Your input has been recorded!");
        location.reload();
    } catch (error) {
        console.error("❌ Error submitting response:", error);
    }
});


// Get user location

if (navigator.geolocation) {
    navigator.geolocation.watchPosition(
        (position) => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            updateUserLocation(lat, lon);
        },
        (error) => {
            console.error("Error getting location: ", error);
        },
        {
            enableHighAccuracy: true, 
            maximumAge: 0, 
            timeout: 10000 
        }
    );
} else {
    console.log("Geolocation is not supported by this browser.");
}

// Update UI when page loads
document.addEventListener("DOMContentLoaded", updateSidebarStatus);

