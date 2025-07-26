// DOM Elements
let mapElement = document.getElementById('map');
let reportModal = document.getElementById('report-modal');
let modalTitle = document.getElementById('modal-title');
let closeModalBtn = document.querySelector('.close');
let reportForm = document.getElementById('report-form');
let incidentImageInput = document.getElementById('incident-image');
let imagePreview = document.getElementById('image-preview');
let locationDisplay = document.getElementById('location-display');
let reportPotholeBtn = document.getElementById('report-pothole');
let reportAccidentBtn = document.getElementById('report-accident');
let reportAmbulanceBtn = document.getElementById('report-ambulance');
let reportMunicipalityBtn = document.getElementById('report-municipality');
let busServicesBtn = document.getElementById('bus-services');
let trafficOverlay = document.getElementById('traffic-overlay');
let locationButtons = document.querySelectorAll('.location-btn');
let trafficSummary = document.getElementById('traffic-summary');
let summaryContent = document.getElementById('summary-content');
let closeSummaryBtn = document.getElementById('close-summary');
let loginContainer = document.getElementById('login-container');
let mainContainer = document.getElementById('main-container');
let loginBtn = document.getElementById('login-btn');
let signupBtn = document.getElementById('signup-btn');
let logoutBtn = document.getElementById('logout-btn');
let emailInput = document.getElementById('email');
let passwordInput = document.getElementById('password');
let userDisplayName = document.getElementById('user-display-name');
let leaderboardList = document.getElementById('leaderboard-list');

// Variables to store incident data
let currentIncidentType = '';
let selectedLocation = null;
let map;
let geocoder;
let googleMarkers = {};
let tempMarker = null;
let currentUser = null;
let directionsService;
let directionsRenderer;
let ambulanceRoutePolyline = null;
let ambulanceRouteInfoWindow = null;
window.ambulanceRouteDirection = null;

// Hardcoded hospital location (using coordinates from second program for consistency)
const hospitalLocation = { lat: 11.000112, lng: 75.998833 }; // MIMS Kottakkal

// Custom icons for different incident types
const icons = {
    pothole: { url: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png' },
    accident: { url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png' },
    ambulance: { url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png' }
};

// Traffic analysis data
const trafficData = {
    "Kottakkal Puthur Chanda": {
        daysActive: "Saturday",
        peakTimes: "4:00 PM – 9:00 PM",
        dangerLevel: "High",
        colorCode: "Red"
    },
    "Arya Vaidya Shala": {
        daysActive: "Daily",
        peakTimes: "8:00 AM – 7:00 PM",
        dangerLevel: "Moderate-High",
        colorCode: "Orange"
    },
    "Aster MIMS Hospital": {
        daysActive: "Daily",
        peakTimes: "11:00 AM – 12:00 PM, 10:30 AM – 11:30 AM, 4:00 – 6:00 PM",
        dangerLevel: "High",
        colorCode: "Red"
    },
    "Almas Hospital": {
        daysActive: "Daily",
        peakTimes: "8:00 AM – 5:00/9:00 PM",
        dangerLevel: "Moderate-High",
        colorCode: "Orange"
    },
    "Govt. Rajas Higher Secondary School": {
        daysActive: "Mon – Friday",
        peakTimes: "8:30 – 9:00 AM, 3:30 – 4:00 PM",
        dangerLevel: "High",
        colorCode: "Red"
    }
};

// Coordinates for traffic locations
const locationCoordinates = {
    "Kottakkal Puthur Chanda": { lat: 10.997, lng: 75.992 },
    "Arya Vaidya Shala": { lat: 10.998, lng: 75.991 },
    "Aster MIMS Hospital": { lat: 10.996, lng: 75.993 },
    "Almas Hospital": { lat: 10.995, lng: 75.994 },
    "Govt. Rajas Higher Secondary School": { lat: 10.994, lng: 75.995 }
};

// Initialize Firebase
document.addEventListener('DOMContentLoaded', () => {
    try {
        firebase.initializeApp(firebaseConfig);

        // Check authentication state
        firebase.auth().onAuthStateChanged((user) => {
            if (user) {
                currentUser = user;
                showMainInterface();
            } else {
                window.ambulanceRouteDirection = null;
                showLoginInterface();
            }
        });

        // Real-time incident listeners
        firebase.database().ref('incidents').on('child_added', (snapshot) => {
            if (!map) {
                console.warn("Map not initialized, cannot create incident marker.");
                return;
            }
            const incidentId = snapshot.key;
            const incident = snapshot.val();
            if (!googleMarkers[incidentId]) {
                createIncidentMarker(incident, incidentId);
            }
        });

        firebase.database().ref('incidents').on('child_removed', (snapshot) => {
            const incidentId = snapshot.key;
            if (googleMarkers[incidentId]) {
                googleMarkers[incidentId].marker.setMap(null);
                delete googleMarkers[incidentId];
            }
        });

        // Event Listeners
        if (reportPotholeBtn) reportPotholeBtn.addEventListener('click', () => openReportModal('pothole'));
        if (reportAccidentBtn) reportAccidentBtn.addEventListener('click', () => openReportModal('accident'));
        if (reportAmbulanceBtn) reportAmbulanceBtn.addEventListener('click', () => openReportModal('ambulance'));
        if (reportMunicipalityBtn) reportMunicipalityBtn.addEventListener('click', () => openMunicipalityReportModal());
        if (busServicesBtn) busServicesBtn.addEventListener('click', () => window.location.href = 'time.html');
        if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);

        if (loginBtn) {
            loginBtn.addEventListener('click', () => {
                const email = emailInput.value.trim();
                const password = passwordInput.value.trim();
                if (!email || !password) {
                    alert('Please enter both email and password');
                    return;
                }
                loginUser(email, password);
            });
        }

        if (signupBtn) {
            signupBtn.addEventListener('click', () => {
                const email = emailInput.value.trim();
                const password = passwordInput.value.trim();
                if (!email || !password) {
                    alert('Please enter both email and password');
                    return;
                }
                if (password.length < 6) {
                    alert('Password must be at least 6 characters long');
                    return;
                }
                signupUser(email, password);
            });
        }

        if (logoutBtn) logoutBtn.addEventListener('click', logoutUser);

        window.addEventListener('click', (e) => {
            if (e.target === reportModal) {
                closeModal();
            }
        });

        if (incidentImageInput) {
            incidentImageInput.addEventListener('change', function() {
                const file = this.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = function(e) {
                        imagePreview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
                    };
                    reader.readAsDataURL(file);
                } else {
                    imagePreview.innerHTML = '';
                }
            });
        }

        if (reportForm) {
            reportForm.addEventListener('submit', function(e) {
                e.preventDefault();
                if (!selectedLocation) {
                    alert('Please select a location on the map');
                    return;
                }
                if (currentIncidentType === 'municipality') {
                    submitMunicipalityReport();
                } else {
                    submitReport();
                }
            });
        }

        locationButtons.forEach(button => {
            button.addEventListener('click', () => {
                const locationName = button.dataset.location;
                showTrafficSummary(locationName);
                locationButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                if (locationCoordinates[locationName] && map) {
                    map.setCenter(locationCoordinates[locationName]);
                    map.setZoom(16);
                }
            });
        });

        if (closeSummaryBtn) {
            closeSummaryBtn.addEventListener('click', () => {
                trafficSummary.style.display = 'none';
                locationButtons.forEach(btn => btn.classList.remove('active'));
            });
        }

    } catch (error) {
        console.error("Firebase initialization error:", error);
    }
});

// Authentication Functions
function loginUser(email, password) {
    firebase.auth().signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            currentUser = userCredential.user;
            console.log("User logged in:", currentUser.email);
            showMainInterface();
        })
        .catch((error) => {
            console.error("Login error:", error);
            alert(`Login failed: ${error.message}`);
        });
}

function signupUser(email, password) {
    firebase.auth().createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            currentUser = userCredential.user;
            console.log("User created:", currentUser.email);
            const userRef = firebase.database().ref('users/' + currentUser.uid);
            userRef.set({
                email: currentUser.email,
                displayName: currentUser.email.split('@')[0],
                reportCount: 0,
                joinDate: Date.now()
            });
            showMainInterface();
        })
        .catch((error) => {
            console.error("Signup error:", error);
            alert(`Signup failed: ${error.message}`);
        });
}

function logoutUser() {
    firebase.auth().signOut()
        .then(() => {
            currentUser = null;
            showLoginInterface();
            clearAllMarkers();
        })
        .catch((error) => {
            console.error("Logout error:", error);
        });
}

function showMainInterface() {
    if (loginContainer) loginContainer.style.display = 'none';
    if (mainContainer) mainContainer.style.display = 'flex';

    if (currentUser) {
        const userRef = firebase.database().ref('users/' + currentUser.uid);
        userRef.once('value', (snapshot) => {
            const userData = snapshot.val();
            if (userDisplayName) {
                userDisplayName.textContent = `Welcome, ${userData && userData.displayName ? userData.displayName : currentUser.email}`;
            }
            const adminPanelLink = document.getElementById('admin-panel-link');
            if (adminPanelLink && userData && userData.isAdmin) {
                adminPanelLink.style.display = 'inline-block';
            } else if (adminPanelLink) {
                adminPanelLink.style.display = 'none';
            }
        });
    }

    if (!map && mapElement) {
        initMap();
    }

    loadLeaderboard();
}

function showLoginInterface() {
    if (mainContainer) mainContainer.style.display = 'none';
    if (loginContainer) loginContainer.style.display = 'flex';
    if (emailInput) emailInput.value = '';
    if (passwordInput) passwordInput.value = '';
}

function loadLeaderboard() {
    const usersRef = firebase.database().ref('users');
    usersRef.orderByChild('reportCount').limitToLast(5).once('value', (snapshot) => {
        const users = [];
        snapshot.forEach((childSnapshot) => {
            const userData = childSnapshot.val();
            users.push({
                displayName: userData.displayName || userData.email.split('@')[0],
                reportCount: userData.reportCount || 0
            });
        });

        users.sort((a, b) => b.reportCount - a.reportCount);
        updateLeaderboardUI(users);
    });
}

function updateLeaderboardUI(users) {
    if (leaderboardList) {
        leaderboardList.innerHTML = '';
        if (users.length === 0) {
            leaderboardList.innerHTML = '<p>No data available</p>';
            return;
        }
        users.forEach((user, index) => {
            const leaderboardItem = document.createElement('div');
            leaderboardItem.className = 'leaderboard-item';
            const rankSpan = document.createElement('span');
            rankSpan.className = 'leaderboard-rank';
            rankSpan.textContent = `#${index + 1}`;
            const nameSpan = document.createElement('span');
            nameSpan.className = 'leaderboard-name';
            nameSpan.textContent = user.displayName;
            const countSpan = document.createElement('span');
            countSpan.className = 'leaderboard-count';
            countSpan.textContent = user.reportCount;
            leaderboardItem.appendChild(rankSpan);
            leaderboardItem.appendChild(nameSpan);
            leaderboardItem.appendChild(countSpan);
            leaderboardList.appendChild(leaderboardItem);
        });
    }
}

function clearAllMarkers() {
    for (const id in googleMarkers) {
        if (googleMarkers.hasOwnProperty(id)) {
            googleMarkers[id].marker.setMap(null);
        }
    }
    googleMarkers = {};
}

window.initMap = function() {
    console.log("Initializing map...");
    const kottakkalCoords = { lat: 10.997576, lng: 75.992382 };

    map = new google.maps.Map(mapElement, {
        center: kottakkalCoords,
        zoom: 14,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        fullscreenControl: false,
        gestureHandling: 'greedy',
        styles: [
            {
                featureType: "poi",
                elementType: "labels",
                stylers: [{ visibility: "off" }]
            }
        ]
    });

    geocoder = new google.maps.Geocoder();
    const trafficLayer = new google.maps.TrafficLayer();
    trafficLayer.setMap(map);

    directionsService = new google.maps.DirectionsService();
    directionsRenderer = new google.maps.DirectionsRenderer({
        map: map,
        polylineOptions: {
            strokeColor: '#FF0000',
            strokeOpacity: 0.8,
            strokeWeight: 6
        },
        suppressMarkers: true
    });

    addTrafficMarkers();
    loadExistingIncidents();

    map.addListener('click', (e) => {
        if (tempMarker) {
            tempMarker.setMap(null);
        }
        tempMarker = new google.maps.Marker({
            position: e.latLng,
            map: map,
            icon: {
                url: 'https://maps.google.com/mapfiles/ms/icons/yellow-dot.png',
                scaledSize: new google.maps.Size(40, 40)
            },
            animation: google.maps.Animation.BOUNCE,
            zIndex: 1000
        });

        setTimeout(() => {
            if (tempMarker) {
                tempMarker.setAnimation(null);
            }
        }, 2000);
    });

    console.log("Map initialized");
}

function addTrafficMarkers() {
    if (!map) return;
    if (window.trafficMarkers) {
        window.trafficMarkers.forEach(marker => marker.setMap(null));
    }
    window.trafficMarkers = [];

    Object.entries(trafficData).forEach(([locationName, data]) => {
        const coords = locationCoordinates[locationName];
        if (!coords) return;

        const iconColor = data.colorCode === 'Red' ? '#EA4335' : '#FBBC05';
        const marker = new google.maps.Marker({
            position: coords,
            map: map,
            icon: {
                path: google.maps.SymbolPath.CIRCLE,
                fillColor: iconColor,
                fillOpacity: 0.8,
                strokeColor: 'white',
                strokeWeight: 1,
                scale: 8
            },
            title: locationName,
            optimized: true
        });

        const infoContent = `
            <div style="min-width: 150px; font-size: 12px;">
                <h3 style="margin: 5px 0; font-size: 14px;">${locationName}</h3>
                <p><strong>Days:</strong> ${data.daysActive}</p>
                <p><strong>Peak Times:</strong> ${data.peakTimes}</p>
                <p><strong>Danger Level:</strong> 
                    <span style="color: ${iconColor}; font-weight: bold;">${data.dangerLevel}</span>
                </p>
            </div>
        `;

        const infoWindow = new google.maps.InfoWindow({
            content: infoContent
        });

        marker.addListener('click', () => {
            infoWindow.open(map, marker);
            showTrafficSummary(locationName);
            locationButtons.forEach(btn => {
                btn.classList.toggle('active', btn.dataset.location === locationName);
            });
        });

        window.trafficMarkers.push(marker);
    });
}

function openReportModal(incidentType) {
    if (!currentUser) {
        alert('Please log in to report an incident');
        return;
    }

    currentIncidentType = incidentType;
    modalTitle.textContent = `Report ${incidentType.charAt(0).toUpperCase() + incidentType.slice(1)}`;
    reportModal.style.display = 'none';
    reportModal.classList.add('modal-transparent-click');

    reportForm.reset();
    imagePreview.innerHTML = '';
    selectedLocation = null;
    locationDisplay.textContent = 'Click on the map to select the incident location';

    if (tempMarker) {
        tempMarker.setMap(null);
        tempMarker = null;
    }

    google.maps.event.clearListeners(map, 'click');
    google.maps.event.addListener(map, 'click', handleMapClick);
    alert('Please click on the map to select the incident location.');
}

function openMunicipalityReportModal() {
    if (!currentUser) {
        alert('Please log in to report a problem');
        return;
    }

    currentIncidentType = 'municipality';
    modalTitle.textContent = 'Report to Municipality';
    reportModal.style.display = 'none';
    reportModal.classList.add('modal-transparent-click');

    reportForm.reset();
    imagePreview.innerHTML = '';
    selectedLocation = null;
    locationDisplay.textContent = 'Click on the map to select the problem location';

    if (tempMarker) {
        tempMarker.setMap(null);
        tempMarker = null;
    }

    google.maps.event.clearListeners(map, 'click');
    google.maps.event.addListener(map, 'click', handleMapClick);
    alert('Please click on the map to select the problem location.');
}

function showReportDetailsModal() {
    reportModal.style.display = 'block';
    reportModal.classList.remove('modal-transparent-click');
}

function closeModal() {
    reportModal.style.display = 'none';
    reportModal.classList.remove('modal-transparent-click');
    if (map) {
        google.maps.event.clearListeners(map, 'click');
    }
    if (tempMarker) {
        tempMarker.setMap(null);
        tempMarker = null;
    }
}

function handleMapClick(e) {
    if (tempMarker) {
        tempMarker.setMap(null);
    }

    selectedLocation = {
        lat: e.latLng.lat(),
        lng: e.latLng.lng()
    };

    locationDisplay.textContent = `Latitude: ${selectedLocation.lat.toFixed(6)}, Longitude: ${selectedLocation.lng.toFixed(6)}`;

    tempMarker = new google.maps.Marker({
        position: selectedLocation,
        map: map,
        icon: {
            url: 'https://maps.google.com/mapfiles/ms/icons/yellow-dot.png',
            scaledSize: new google.maps.Size(40, 40)
        },
        animation: google.maps.Animation.BOUNCE
    });

    setTimeout(() => {
        if (tempMarker) {
            tempMarker.setAnimation(null);
        }
    }, 2000);

    google.maps.event.clearListeners(map, 'click');
    showReportDetailsModal();
}

async function submitReport() {
    const description = document.getElementById('incident-description').value;
    const imageFile = incidentImageInput.files[0];

    if (!description || !selectedLocation) {
        alert('Please fill all fields and select a location');
        return;
    }

    if (currentIncidentType !== 'ambulance' && !imageFile) {
        alert('Please fill all fields and select a location');
        return;
    }

    if (!currentUser) {
        alert('You must be logged in to submit a report');
        return;
    }

    try {
        const submitBtn = document.getElementById('submit-report');
        const originalBtnText = submitBtn.textContent;
        submitBtn.textContent = 'Submitting...';
        submitBtn.disabled = true;

        const timestamp = Date.now();
        let downloadURL = '';
        if (imageFile) {
            const storageRef = firebase.storage().ref(`incident_images/${timestamp}_${imageFile.name}`);
            const uploadTask = storageRef.put(imageFile);
            const snapshot = await uploadTask;
            downloadURL = await snapshot.ref.getDownloadURL();
        }

        const incident = {
            type: currentIncidentType,
            description: description,
            location: {
                lat: selectedLocation.lat,
                lng: selectedLocation.lng
            },
            imageURL: downloadURL,
            timestamp: timestamp,
            userId: currentUser.uid,
            userEmail: currentUser.email,
            status: 'pending' // Add status field for Citizens Wall feature
        };

        const incidentRef = await firebase.database().ref('incidents').push(incident);

        if (incident.type === 'ambulance') {
            const routeDetails = await displayAmbulanceRoute(incident.location);
            if (routeDetails) {
                incident.ambulanceRoute = {
                    origin: incident.location,
                    destination: hospitalLocation,
                    distance: routeDetails.distance,
                    duration: routeDetails.duration
                };
            }
        }

        let telegramMessage = `<b>New Incident Reported!</b>\nType: ${incident.type.charAt(0).toUpperCase() + incident.type.slice(1)}\nDescription: ${incident.description}\nLocation: <a href="http://www.google.com/maps/place/${incident.location.lat},${incident.location.lng}">View on Map</a>\nReported by: ${incident.userEmail}${incident.imageURL ? `\nImage: <a href="${incident.imageURL}">View Image</a>` : ''}`;
        if (incident.type === 'ambulance' && incident.ambulanceRoute) {
            telegramMessage += `\n\n<b>Ambulance Route:</b>\nFrom: ${incident.ambulanceRoute.origin.lat.toFixed(4)}, ${incident.ambulanceRoute.origin.lng.toFixed(4)}\nTo: ${incident.ambulanceRoute.destination.lat.toFixed(4)}, ${incident.ambulanceRoute.destination.lng.toFixed(4)}\nDistance: ${incident.ambulanceRoute.distance}\nDuration: ${incident.ambulanceRoute.duration}\nPlease clear the way!`;
        }
        await sendTelegramMessage(telegramMessage);

        const userRef = firebase.database().ref('users/' + currentUser.uid);
        userRef.transaction((userData) => {
            if (userData) {
                userData.reportCount = (userData.reportCount || 0) + 1;
            }
            return userData;
        });

        loadLeaderboard();
        closeModal();
        submitBtn.textContent = originalBtnText;
        submitBtn.disabled = false;
    } catch (error) {
        console.error('Error submitting report:', error);
        alert('Error submitting report. Please try again.');
        document.getElementById('submit-report').textContent = 'Submit Report';
        document.getElementById('submit-report').disabled = false;
    }
}

async function submitMunicipalityReport() {
    const problemType = document.getElementById('problem-type').value;
    const description = document.getElementById('incident-description').value;
    const imageFile = incidentImageInput.files[0];

    if (!problemType || !description || !selectedLocation) {
        alert('Please fill all required fields and select a location');
        return;
    }

    if (!currentUser) {
        alert('You must be logged in to submit a report');
        return;
    }

    try {
        const submitBtn = document.getElementById('submit-report');
        const originalBtnText = submitBtn.textContent;
        submitBtn.textContent = 'Submitting...';
        submitBtn.disabled = true;

        const timestamp = Date.now();
        let downloadURL = '';
        if (imageFile) {
            const storageRef = firebase.storage().ref(`municipality_reports/${timestamp}_${imageFile.name}`);
            const uploadTask = storageRef.put(imageFile);
            const snapshot = await uploadTask;
            downloadURL = await snapshot.ref.getDownloadURL();
        }

        const report = {
            type: problemType,
            description: description,
            location: {
                lat: selectedLocation.lat,
                lng: selectedLocation.lng
            },
            imageURL: downloadURL,
            timestamp: timestamp,
            userId: currentUser.uid,
            userEmail: currentUser.email,
            status: 'pending'
        };

        const newReportRef = await firebase.database().ref('municipalityReports').push(report);
        const reportId = newReportRef.key;

        await sendMunicipalityReportToTelegram(report);
        closeModal();
        submitBtn.textContent = originalBtnText;
        submitBtn.disabled = false;
        alert('Report submitted to municipality successfully!');
    } catch (error) {
        console.error('Error submitting report:', error);
        alert('Error submitting report. Please try again.');
        document.getElementById('submit-report').textContent = 'Submit Report';
        document.getElementById('submit-report').disabled = false;
    }
}

async function sendMunicipalityReportToTelegram(report) {
    const botToken = telegramConfig.botToken;
    const chatId = telegramConfig.municipalityChatId;
    try {
        const messageUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
        const messageText = `🚨 <b>New Municipality Report</b> 🚨\n\n` +
                           `Type: ${report.type}\n` +
                           `Description: ${report.description}\n` +
                           `Location: ${report.location.lat}, ${report.location.lng}\n` +
                           `Reported by: ${report.userEmail}\n\n` +
                           `<a href="http://www.google.com/maps/place/${report.location.lat},${report.location.lng}">View on Map</a>` +
                           (report.imageURL ? `\n\n<a href="${report.imageURL}">View Image</a>` : '');
        
        await fetch(messageUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                chat_id: chatId,
                text: messageText,
                parse_mode: 'HTML'
            })
        });
    } catch (error) {
        console.error('Error sending to Telegram:', error);
    }
}

window.getPlaceName = async function(lat, lng) {
    if (!geocoder) {
        console.error("Geocoder not initialized.");
        return `Lat ${lat.toFixed(4)}, Lng ${lng.toFixed(4)}`;
    }
    return new Promise((resolve) => {
        const latlng = { lat: lat, lng: lng };
        geocoder.geocode({ 'location': latlng }, (results, status) => {
            if (status === 'OK') {
                resolve(results[0] ? results[0].formatted_address : `Lat ${lat.toFixed(4)}, Lng ${lng.toFixed(4)}`);
            } else {
                console.error('Geocoder failed due to: ' + status);
                resolve(`Lat ${lat.toFixed(4)}, Lng ${lng.toFixed(4)}`);
            }
        });
    });
}

async function displayAmbulanceRoute(incidentLocation) {
    if (!directionsService || !directionsRenderer) {
        console.error("Directions Service or Renderer not initialized.");
        return null;
    }

    const request = {
        origin: incidentLocation,
        destination: hospitalLocation,
        travelMode: google.maps.TravelMode.DRIVING
    };

    return new Promise((resolve) => {
        directionsService.route(request, (result, status) => {
            if (status === google.maps.DirectionsStatus.OK) {
                directionsRenderer.setDirections(result);
                const routeStart = result.routes[0].legs[0].start_location;
                const routeEnd = result.routes[0].legs[0].end_location;
                window.ambulanceRouteDirection = determineRouteDirection(routeStart, routeEnd);

                const routePath = result.routes[0].overview_path;
                ambulanceRoutePolyline = new google.maps.Polyline({
                    path: routePath,
                    geodesic: true,
                    strokeColor: '#FF0000',
                    strokeOpacity: 0.8,
                    strokeWeight: 6,
                    map: map
                });

                let flash = true;
                const flashInterval = setInterval(() => {
                    if (ambulanceRoutePolyline) {
                        ambulanceRoutePolyline.setOptions({ strokeOpacity: flash ? 0.2 : 0.8 });
                        flash = !flash;
                    }
                }, 500);

                ambulanceRoutePolyline.flashInterval = flashInterval;

                const distance = result.routes[0].legs[0].distance.text;
                const duration = result.routes[0].legs[0].duration.text;
                const infoContent = `
                    <div class="ambulance-route-info">
                        <h3>Ambulance Route Active!</h3>
                        <p>Fastest route to hospital: <b>${distance}</b> (${duration})</p>
                        <p>Please clear the way.</p>
                        <button onclick="clearAmbulanceRoute(window.ambulanceRouteDirection)">Clear this route</button>
                    </div>
                `;

                ambulanceRouteInfoWindow = new google.maps.InfoWindow({
                    content: infoContent,
                    position: map.getCenter()
                });
                ambulanceRouteInfoWindow.open(map);

                google.maps.event.addListener(ambulanceRouteInfoWindow, 'closeclick', () => {
                    clearAmbulanceRoute();
                });

                resolve({ distance, duration });
            } else {
                console.error('Directions request failed due to ' + status);
                alert('Could not find a route to the hospital.');
                resolve(null);
            }
        });
    });
}

function determineRouteDirection(startLocation, endLocation) {
    const latDiff = endLocation.lat() - startLocation.lat();
    const lngDiff = endLocation.lng() - startLocation.lng();

    if (Math.abs(latDiff) > Math.abs(lngDiff)) {
        return latDiff > 0 ? 'north' : 'south';
    } else {
        return lngDiff > 0 ? 'east' : 'west';
    }
}

function clearAmbulanceRoute(directionToOverride = null) {
    console.log('clearAmbulanceRoute called with direction:', directionToOverride);
    if (ambulanceRoutePolyline) {
        clearInterval(ambulanceRoutePolyline.flashInterval);
        ambulanceRoutePolyline.setMap(null);
        ambulanceRoutePolyline = null;
    }
    if (ambulanceRouteInfoWindow) {
        if (directionToOverride) {
            console.log('Calling window.manualOverride with direction:', directionToOverride);
            try {
                if (typeof window.manualOverride === 'function') {
                    window.manualOverride(directionToOverride);
                } else {
                    console.error('window.manualOverride is not a function:', window.manualOverride);
                }
            } catch (error) {
                console.error('Error calling window.manualOverride:', error);
            }
        }
        ambulanceRouteInfoWindow.close();
        ambulanceRouteInfoWindow = null;
    }
}

window.clearAmbulanceRoute = clearAmbulanceRoute;

window.manualOverride = function(direction) {
    console.log('Main page manualOverride called with direction:', direction);
    const isAdminPage = document.getElementById('junction-simulator') !== null;
    if (isAdminPage) {
        console.log('On admin page, using original manualOverride');
        return;
    }
    localStorage.setItem('pendingManualOverride', direction);
    console.log('Stored pendingManualOverride in localStorage:', direction);
    alert(`Traffic lights will be adjusted for ambulance route in the ${direction} direction.`);
}

function createIncidentMarker(incident, incidentId) {
    if (!map) {
        console.error("Map not initialized yet");
        return;
    }

    const { type, location, description, imageURL, timestamp, userId } = incident;
    const icon = icons[type] || icons.pothole;

    const marker = new google.maps.Marker({
        position: location,
        map: map,
        icon: icon.url,
        title: description
    });

    googleMarkers[incidentId] = { marker: marker, incident: incident };

    let infoContent = `
        <div class="info-window-content">
            <h3>${type.charAt(0).toUpperCase() + type.slice(1)} Incident</h3>
            <p><b>Description:</b> ${description}</p>
            ${imageURL ? `<p><img src="${imageURL}" alt="Incident Image" style="max-width:100px; max-height:100px;"></p>` : ''}
            <p><b>Reported:</b> ${new Date(timestamp).toLocaleString()}</p>
            <p><b>Location:</b> ${location.lat.toFixed(4)}, ${location.lat.toFixed(4)}</p>
    `;

    if (currentUser && currentUser.uid === userId) {
        infoContent += `<button class="delete-report-btn" onclick="deleteIncident('${incidentId}')">Delete Report</button>`;
    }
    infoContent += `</div>`;

    const infoWindow = new google.maps.InfoWindow({
        content: infoContent
    });

    marker.addListener('click', () => {
        infoWindow.open(map, marker);
    });

    return marker;
}

async function deleteIncident(incidentId) {
    if (!confirm('Are you sure you want to delete this report?')) {
        return;
    }

    try {
        const incidentRef = firebase.database().ref('incidents/' + incidentId);
        const incidentSnapshot = await incidentRef.once('value');
        const incidentData = incidentSnapshot.val();

        if (!incidentData) {
            alert('Incident not found.');
            return;
        }

        if (currentUser.uid !== incidentData.userId) {
            alert('You are not authorized to delete this report.');
            return;
        }

        if (incidentData.imageURL) {
            const imageRef = firebase.storage().refFromURL(incidentData.imageURL);
            await imageRef.delete();
            console.log('Image deleted from storage.');
        }

        await incidentRef.remove();
        console.log('Incident deleted from database.');

        if (googleMarkers[incidentId]) {
            googleMarkers[incidentId].marker.setMap(null);
            delete googleMarkers[incidentId];
        }

        const userRef = firebase.database().ref('users/' + currentUser.uid);
        userRef.transaction((userData) => {
            if (userData && userData.reportCount > 0) {
                userData.reportCount--;
            }
            return userData;
        });

        loadLeaderboard();
        alert('Report deleted successfully!');
    } catch (error) {
        console.error('Error deleting report:', error);
        alert('Error deleting report. Please try again.');
    }
}

function loadExistingIncidents() {
    if (!map) {
        console.warn("Map not initialized, deferring incident loading.");
        return;
    }
    clearAllMarkers();
    firebase.database().ref('incidents').once('value', (snapshot) => {
        snapshot.forEach((childSnapshot) => {
            const incidentId = childSnapshot.key;
            const incident = childSnapshot.val();
            createIncidentMarker(incident, incidentId);
        });
    }).catch(error => {
        console.error("Error loading incidents:", error);
    });
}

function showTrafficSummary(locationName) {
    const data = trafficData[locationName];
    if (!data) return;

    let dangerClass = 'danger-high';
    if (data.dangerLevel.includes('Moderate')) {
        dangerClass = 'danger-moderate';
    }

    summaryContent.innerHTML = `
        <div class="traffic-detail"><strong>Location:</strong> ${locationName}</div>
        <div class="traffic-detail"><strong>Days Active:</strong> ${data.daysActive}</div>
        <div class="traffic-detail"><strong>Peak Times:</strong> ${data.peakTimes}</div>
        <div class="traffic-detail"><strong>Danger Level:</strong> <span class="${dangerClass}">${data.dangerLevel}</span></div>
        <div class="traffic-detail"><strong>Color Code:</strong> <span class="color-code-${data.colorCode.toLowerCase()}">${data.colorCode}</span></div>
    `;

    trafficSummary.style.display = 'block';
}

async function sendTelegramMessage(message) {
    const botToken = telegramConfig.botToken;
    const chatId = telegramConfig.chatId;
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                chat_id: chatId,
                text: message,
                parse_mode: 'HTML'
            })
        });

        const data = await response.json();
        if (!response.ok) {
            console.error('Error sending Telegram message:', data);
        }
    } catch (error) {
        console.error('Network error sending Telegram message:', error);
    }
}