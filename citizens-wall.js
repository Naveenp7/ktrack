// DOM Elements
const mainOptions = document.getElementById('main-options');
const potholeBtn = document.getElementById('pothole-btn');
const wasteDepositBtn = document.getElementById('waste-deposit-btn');
const wallOfFameBtn = document.getElementById('wall-of-fame-btn');

const potholeSection = document.getElementById('pothole-section');
const wasteDepositSection = document.getElementById('waste-deposit-section');
const wallOfFameSection = document.getElementById('wall-of-fame-section');

const potholeList = document.getElementById('pothole-list');
const wasteDepositList = document.getElementById('waste-deposit-list');
const wallOfFameList = document.getElementById('wall-of-fame-list');

const potholeBackBtn = document.getElementById('pothole-back-btn');
const wasteDepositBackBtn = document.getElementById('waste-deposit-back-btn');
const wallOfFameBackBtn = document.getElementById('wall-of-fame-back-btn');

// Initialize Firebase
function initializeFirebase() {
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    initializeFirebase();
    setupEventListeners();
    // Check if user is logged in
    firebase.auth().onAuthStateChanged(user => {
        if (user) {
            // User is signed in, load data
            loadData();
        } else {
            // User is signed out, redirect to login page
            window.location.href = 'index.html';
        }
    });
});

function setupEventListeners() {
    // Main option buttons
    potholeBtn.addEventListener('click', () => showSection(potholeSection));
    wasteDepositBtn.addEventListener('click', () => showSection(wasteDepositSection));
    wallOfFameBtn.addEventListener('click', () => showSection(wallOfFameSection));
    
    // Back buttons
    potholeBackBtn.addEventListener('click', showMainOptions);
    wasteDepositBackBtn.addEventListener('click', showMainOptions);
    wallOfFameBackBtn.addEventListener('click', showMainOptions);
}

// UI Functions
function showSection(section) {
    // Hide main options
    mainOptions.style.display = 'none';
    
    // Hide all sections
    potholeSection.style.display = 'none';
    wasteDepositSection.style.display = 'none';
    wallOfFameSection.style.display = 'none';
    
    // Show selected section
    section.style.display = 'block';
}

function showMainOptions() {
    // Hide all sections
    potholeSection.style.display = 'none';
    wasteDepositSection.style.display = 'none';
    wallOfFameSection.style.display = 'none';
    
    // Show main options
    mainOptions.style.display = 'block';
}

// Data Loading Functions
function loadData() {
    loadPotholes();
    loadWasteDeposits();
    loadWallOfFame();
}

function loadPotholes() {
    // Clear existing content
    potholeList.innerHTML = '';
    
    // Get pothole incidents from Firebase
    firebase.database().ref('incidents').orderByChild('type').equalTo('pothole').once('value', snapshot => {
        if (snapshot.exists()) {
            snapshot.forEach(childSnapshot => {
                const incident = childSnapshot.val();
                const incidentId = childSnapshot.key;
                
                // Create incident card
                const card = createIncidentCard(incident, incidentId, 'pothole');
                potholeList.appendChild(card);
            });
        } else {
            // No potholes found
            potholeList.innerHTML = '<p>No pothole reports found.</p>';
        }
    }).catch(error => {
        console.error('Error loading potholes:', error);
        potholeList.innerHTML = '<p>Error loading pothole data. Please try again later.</p>';
    });
}

function loadWasteDeposits() {
    // Clear existing content
    wasteDepositList.innerHTML = '';
    
    // Get waste deposit incidents from Firebase
    firebase.database().ref('incidents').orderByChild('type').equalTo('municipality').once('value', snapshot => {
        if (snapshot.exists()) {
            snapshot.forEach(childSnapshot => {
                const incident = childSnapshot.val();
                const incidentId = childSnapshot.key;
                
                // Create incident card
                const card = createIncidentCard(incident, incidentId, 'waste');
                wasteDepositList.appendChild(card);
            });
        } else {
            // No waste deposits found
            wasteDepositList.innerHTML = '<p>No waste deposit reports found.</p>';
        }
    }).catch(error => {
        console.error('Error loading waste deposits:', error);
        wasteDepositList.innerHTML = '<p>Error loading waste deposit data. Please try again later.</p>';
    });
}

function loadWallOfFame() {
    // Clear existing content
    wallOfFameList.innerHTML = '';
    
    // Get resolved incidents from Firebase
    firebase.database().ref('incidents').orderByChild('status').equalTo('resolved').once('value', snapshot => {
        if (snapshot.exists()) {
            snapshot.forEach(childSnapshot => {
                const incident = childSnapshot.val();
                const incidentId = childSnapshot.key;
                
                // Create wall of fame item
                const item = createWallOfFameItem(incident, incidentId);
                wallOfFameList.appendChild(item);
            });
        } else {
            // No resolved incidents found
            wallOfFameList.innerHTML = '<p>No resolved incidents found.</p>';
        }
    }).catch(error => {
        console.error('Error loading wall of fame:', error);
        wallOfFameList.innerHTML = '<p>Error loading wall of fame data. Please try again later.</p>';
    });
}

// Helper Functions
function createIncidentCard(incident, incidentId, type) {
    const card = document.createElement('div');
    card.className = 'incident-card';
    card.id = incidentId;
    
    // Format date
    const date = new Date(incident.timestamp);
    const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    
    // Get location using reverse geocoding if available, otherwise use coordinates
    let locationText = `${incident.location.lat.toFixed(6)}, ${incident.location.lng.toFixed(6)}`;
    
    // Create card content
    card.innerHTML = `
        <p><strong>Location:</strong> <span>${locationText}</span></p>
        <p><strong>Date:</strong> <span>${formattedDate}</span></p>
        <p><strong>Status:</strong> <span>${incident.status || 'Pending'}</span></p>
    `;
    
    // Add image if available
    if (incident.imageURL) {
        const img = document.createElement('img');
        img.src = incident.imageURL;
        img.alt = type === 'pothole' ? 'Pothole Image' : 'Waste Deposit Image';
        img.style.width = '100%';
        img.style.marginTop = '10px';
        img.style.borderRadius = '5px';
        card.appendChild(img);
    }
    
    return card;
}

function createWallOfFameItem(incident, incidentId) {
    const item = document.createElement('div');
    item.className = 'wall-of-fame-item';
    item.id = incidentId;
    
    // Create image element
    const img = document.createElement('img');
    img.src = incident.imageURL || 'https://via.placeholder.com/100';
    img.alt = incident.type === 'pothole' ? 'Fixed Pothole' : 'Cleared Waste';
    
    // Create content div
    const content = document.createElement('div');
    
    // Format date
    const date = new Date(incident.timestamp);
    const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    
    // Set content
    content.innerHTML = `
        <p><strong>${incident.type === 'pothole' ? 'Fixed Pothole' : 'Cleared Waste'}</strong></p>
        <p>Reported: ${formattedDate}</p>
        <p>Resolved: ${incident.resolvedDate || 'Unknown'}</p>
    `;
    
    // Append elements to item
    item.appendChild(img);
    item.appendChild(content);
    
    return item;
}

// Function to get address from coordinates using Google Maps Geocoding API
// Note: This would require a Google Maps API key and the Geocoding API enabled
// For simplicity, we're not implementing this here, but it would be a good enhancement
function getAddressFromCoordinates(lat, lng) {
    // Implementation would go here
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}