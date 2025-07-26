// Initialize Firebase


// Check if we're on the admin page or the main page
const isAdminPage = document.querySelector('.junction-simulator') !== null;

// DOM Elements - Only initialize if we're on the admin page
const adminContainer = isAdminPage ? document.getElementById('admin-container') : null;
const userDisplayName = isAdminPage ? document.getElementById('user-display-name') : null;

// Traffic Signal Elements
const currentGreenDisplay = isAdminPage ? document.getElementById('current-green') : null;
const timeRemainingDisplay = isAdminPage ? document.getElementById('time-remaining') : null;
const nextDirectionDisplay = isAdminPage ? document.getElementById('next-direction') : null;

// Direction Buttons
const northBtn = isAdminPage ? document.getElementById('north-btn') : null;
const eastBtn = isAdminPage ? document.getElementById('east-btn') : null;
const southBtn = isAdminPage ? document.getElementById('south-btn') : null;
const westBtn = isAdminPage ? document.getElementById('west-btn') : null;
const emergencyBtn = isAdminPage ? document.getElementById('emergency-btn') : null;
const resetBtn = isAdminPage ? document.getElementById('reset-btn') : null;

// Settings Elements
const baseTimeInput = isAdminPage ? document.getElementById('base-time') : null;
const congestionWeightInput = isAdminPage ? document.getElementById('congestion-weight') : null;
const yellowTimeInput = isAdminPage ? document.getElementById('yellow-time') : null;
const applySettingsBtn = isAdminPage ? document.getElementById('apply-settings') : null;

// Congestion Sliders
const northSlider = isAdminPage ? document.getElementById('north-slider') : null;
const eastSlider = isAdminPage ? document.getElementById('east-slider') : null;
const southSlider = isAdminPage ? document.getElementById('south-slider') : null;
const westSlider = isAdminPage ? document.getElementById('west-slider') : null;
const northValue = isAdminPage ? document.getElementById('north-value') : null;
const eastValue = isAdminPage ? document.getElementById('east-value') : null;
const southValue = isAdminPage ? document.getElementById('south-value') : null;
const westValue = isAdminPage ? document.getElementById('west-value') : null;

// Incident Counters
const northIncidents = isAdminPage ? document.getElementById('north-incidents') : null;
const eastIncidents = isAdminPage ? document.getElementById('east-incidents') : null;
const southIncidents = isAdminPage ? document.getElementById('south-incidents') : null;
const westIncidents = isAdminPage ? document.getElementById('west-incidents') : null;

// Traffic Signal Variables

// Initialize Firebase
if (typeof firebase !== 'undefined' && firebase.apps.length === 0) {
    firebase.initializeApp(firebaseConfig);
}

// Add getPlaceName function to window object for use in displayReport
window.getPlaceName = async function(lat, lng) {
    // For demo purposes, return a placeholder name
    // In a real application, this would use the Google Maps Geocoding API
    return `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
}

// Notification Elements
const reportsList = isAdminPage ? document.getElementById('reports-list') : null;
let currentDirection = 'north';
let nextDirection = 'east';
let timeRemaining = 30;
let baseTime = 20;
let congestionWeight = 5;
let yellowTime = 3;
let isManualOverride = false;
let isEmergencyMode = false;
let timerInterval = null;
let yellowTimerTimeout = null;
let directionSequence = ['north', 'east', 'south', 'west'];
let currentSequenceIndex = 0;

// Congestion levels
let congestionLevels = {
    north: 2,
    east: 2,
    south: 2,
    west: 2
};

// Incident counts
let incidentCounts = {
    north: 0,
    east: 0,
    south: 0,
    west: 0
};

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    if (isAdminPage) {
        initializeTrafficSignal();
        showAdminInterface();
    }

    // Check for pending manual overrides from the main page
    const pendingOverride = localStorage.getItem('pendingManualOverride');
    if (pendingOverride) {
        console.log('Found pending manual override:', pendingOverride);
        // Clear the pending override
        localStorage.removeItem('pendingManualOverride');
        // Apply the override after a short delay to ensure the UI is ready
        setTimeout(() => {
            manualOverride(pendingOverride);
            console.log('Applied pending manual override for direction:', pendingOverride);
        }, 2000);
    }

    // Only add event listeners if we're on the admin page
    if (isAdminPage) {
        // Direction buttons
        northBtn.addEventListener('click', () => manualOverride('north'));
        eastBtn.addEventListener('click', () => manualOverride('east'));
        southBtn.addEventListener('click', () => manualOverride('south'));
        westBtn.addEventListener('click', () => manualOverride('west'));
        
        // Emergency and reset buttons
        emergencyBtn.addEventListener('click', toggleEmergencyMode);
        resetBtn.addEventListener('click', resetToAuto);
    }
    
    // Only add these event listeners if we're on the admin page
    if (isAdminPage) {
        // Apply settings button
        applySettingsBtn.addEventListener('click', applySettings);
        
        // Congestion sliders
        northSlider.addEventListener('input', () => updateCongestionValue('north'));
        eastSlider.addEventListener('input', () => updateCongestionValue('east'));
        southSlider.addEventListener('input', () => updateCongestionValue('south'));
        westSlider.addEventListener('input', () => updateCongestionValue('west'));
    }


});



// Interface Functions
function showAdminInterface() {
    if (adminContainer) {
        adminContainer.style.display = 'block';
    }
    if (userDisplayName) {
        userDisplayName.textContent = `Welcome, Traffic Police Official`;
    }
}

// Traffic Signal Functions
function initializeTrafficSignal() {
    // Load settings from Firebase if available
    loadSettings();
    
    // Set initial signal state
    updateSignalDisplay();
    
    // Start the timer
    loadIncidents();
    startTimer();

    // Start listening for new reports
    listenForNewReports();
}

// Load incidents from Firebase
function loadIncidents() {
    firebase.database().ref('incidents').once('value')
        .then((snapshot) => {
            // Reset incident counts
            incidentCounts = {
                north: 0,
                east: 0,
                south: 0,
                west: 0
            };
            
            // Process each incident
            snapshot.forEach((childSnapshot) => {
                const report = childSnapshot.val();
                if (report.location) {
                    const direction = determineDirection(report.location);
                    if (direction) {
                        incidentCounts[direction]++;
                    }
                }
            });
            
            // Update displays
            updateIncidentDisplays();
            updateCongestionFromIncidents();
        })
        .catch((error) => {
            console.error("Error loading incidents:", error);
        });
}

// Determine direction based on location
function determineDirection(location) {
    // For demo purposes, randomly assign a direction
    // In a real application, this would use actual geographic calculations
    const directions = ['north', 'east', 'south', 'west'];
    return directions[Math.floor(Math.random() * directions.length)];
}

// Update incident displays
function updateIncidentDisplays() {
    if (northIncidents) northIncidents.textContent = incidentCounts.north;
    if (eastIncidents) eastIncidents.textContent = incidentCounts.east;
    if (southIncidents) southIncidents.textContent = incidentCounts.south;
    if (westIncidents) westIncidents.textContent = incidentCounts.west;
}

// Update congestion levels based on incidents
function updateCongestionFromIncidents() {
    // For demo purposes, set congestion level based on incident count
    // In a real application, this would use more sophisticated algorithms
    for (const direction in incidentCounts) {
        const count = incidentCounts[direction];
        const slider = document.getElementById(`${direction}-slider`);
        if (slider) {
            // Set congestion level (0-10) based on incident count
            // For demo, we'll use a simple formula: min(count, 10)
            const level = Math.min(count, 10);
            slider.value = level;
            updateCongestionValue(direction);
        }
    }
}

// Notification Functions
function listenForNewReports() {
    const incidentsRef = firebase.database().ref('incidents');
    incidentsRef.on('child_added', (snapshot) => {
        const report = snapshot.val();
        displayReport(report);

        if (report.location) {
            const direction = determineDirection(report.location);
            if (direction) {
                incidentCounts[direction]++;
                updateIncidentDisplays();
                updateCongestionFromIncidents();

                // If the new incident is in the current direction, restart the timer
                if (direction === currentDirection && !isManualOverride && !isEmergencyMode) {
                    stopTimer();
                    startTimer();
                }
            }
        }
    });
}

async function displayReport(report) {
    const reportItem = document.createElement('div');
    reportItem.className = 'report-item';

    const reportDetails = document.createElement('div');
    reportDetails.className = 'report-details';

    const reportType = document.createElement('div');
    reportType.className = 'report-type';
    reportType.textContent = `Type: ${report.type.charAt(0).toUpperCase() + report.type.slice(1)}`;

    const reportDescription = document.createElement('div');
    reportDescription.textContent = `Description: ${report.description}`;

    const reportLocation = document.createElement('div');
    reportLocation.className = 'report-location';
    const locationName = await window.getPlaceName(report.location.lat, report.location.lng);
    reportLocation.textContent = `Location: ${locationName}`;

    const incidentDirection = determineDirection(report.location);
    const reportDirection = document.createElement('div');
    reportDirection.textContent = `Direction: ${incidentDirection.charAt(0).toUpperCase() + incidentDirection.slice(1)}`;

    const reportTime = document.createElement('div');
    reportTime.className = 'report-time';
    reportTime.textContent = new Date(report.timestamp).toLocaleString();

    reportDetails.appendChild(reportType);
    reportDetails.appendChild(reportDescription);
    reportDetails.appendChild(reportLocation);
    reportDetails.appendChild(reportDirection);
    reportDetails.appendChild(reportTime);

    if (report.type === 'ambulance' && report.ambulanceRoute) {
        const originName = await window.getPlaceName(report.ambulanceRoute.origin.lat, report.ambulanceRoute.origin.lng);
        const destinationName = await window.getPlaceName(report.ambulanceRoute.destination.lat, report.ambulanceRoute.destination.lng);
        const reportAmbulanceRoute = document.createElement('p');
        reportAmbulanceRoute.innerHTML = `<b>Ambulance Route:</b><br>From: ${originName}<br>To: ${destinationName}<br>Distance: ${report.ambulanceRoute.distance}<br>Duration: ${report.ambulanceRoute.duration}`;
        reportDetails.appendChild(reportAmbulanceRoute);
    }

    reportItem.appendChild(reportDetails);

    if (report.imageURL) {
        const viewImageLink = document.createElement('a');
        viewImageLink.href = report.imageURL;
        viewImageLink.textContent = 'View Image';
        viewImageLink.target = '_blank';
        viewImageLink.style.marginLeft = '10px';
        reportItem.appendChild(viewImageLink);
    }

    if (reportsList) {
        reportsList.prepend(reportItem);
    }
}
    // Load settings from Firebase if available
    loadSettings();
    
    // Set initial signal state
    updateSignalDisplay();
    
    // Start the timer
    startTimer();
function initializeTrafficSignal() {
    // Load settings from Firebase if available
    loadSettings();
    
    // Set initial signal state
    updateSignalDisplay();
    
    // Start the timer
    startTimer();

    // Start listening for new reports
    listenForNewReports();
}

function loadSettings() {
    firebase.database().ref('trafficSignalSettings').once('value')
        .then((snapshot) => {
            const settings = snapshot.val();
            if (settings) {
                baseTime = settings.baseTime || 20;
                congestionWeight = settings.congestionWeight || 5;
                yellowTime = settings.yellowTime || 3;
                
                // Update input fields
                if (baseTimeInput) baseTimeInput.value = baseTime;
                if (congestionWeightInput) congestionWeightInput.value = congestionWeight;
                if (yellowTimeInput) yellowTimeInput.value = yellowTime;
            }
        })
        .catch((error) => {
            console.error("Error loading settings:", error);
        });
}

function saveSettings() {
    const settings = {
        baseTime: baseTime,
        congestionWeight: congestionWeight,
        yellowTime: yellowTime
    };
    
    firebase.database().ref('trafficSignalSettings').set(settings)
        .then(() => {
            console.log("Settings saved successfully");
        })
        .catch((error) => {
            console.error("Error saving settings:", error);
        });
}

function applySettings() {
    baseTime = baseTimeInput ? (parseInt(baseTimeInput.value) || 20) : 20;
    congestionWeight = congestionWeightInput ? (parseInt(congestionWeightInput.value) || 5) : 5;
    yellowTime = yellowTimeInput ? (parseInt(yellowTimeInput.value) || 3) : 3;
    
    // Validate values
    baseTime = Math.max(10, Math.min(60, baseTime));
    congestionWeight = Math.max(1, Math.min(10, congestionWeight));
    yellowTime = Math.max(1, Math.min(10, yellowTime));
    
    // Update input fields with validated values
    if (baseTimeInput) baseTimeInput.value = baseTime;
    if (congestionWeightInput) congestionWeightInput.value = congestionWeight;
    if (yellowTimeInput) yellowTimeInput.value = yellowTime;
    
    // Save settings to Firebase
    saveSettings();
    
    // Restart timer with new settings
    resetToAuto();
    
    alert('Settings applied successfully');
}

function startTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
    }
    
    // Calculate green time based on congestion level
    const congestionLevel = congestionLevels[currentDirection];
    timeRemaining = baseTime + (congestionLevel * congestionWeight);
    
    // Update displays
    updateTimeDisplay();
    
    // Start countdown
    timerInterval = setInterval(() => {
        timeRemaining--;
        updateTimeDisplay();
        
        if (timeRemaining <= 0) {
            clearInterval(timerInterval);
            changeToYellow();
        }
    }, 1000);
}

function changeToYellow() {
    // Turn current direction to yellow
    const currentGreen = document.getElementById(`${currentDirection}-green`);
    const currentYellow = document.getElementById(`${currentDirection}-yellow`);
    if (currentGreen) {
        currentGreen.classList.remove('active');
    }
    if (currentYellow) {
        currentYellow.classList.add('active');
    }
    
    // Wait for yellow time then change to next direction
    yellowTimerTimeout = setTimeout(() => {
        moveToNextDirection();
    }, yellowTime * 1000);
}

function moveToNextDirection() {
    // Turn off current direction
    const currentYellow = document.getElementById(`${currentDirection}-yellow`);
    const currentRed = document.getElementById(`${currentDirection}-red`);
    
    if (currentYellow) currentYellow.classList.remove('active');
    if (currentRed) currentRed.classList.add('active');
    
    // Move to next direction in sequence
    if (!isManualOverride) {
        currentSequenceIndex = (currentSequenceIndex + 1) % directionSequence.length;
        currentDirection = directionSequence[currentSequenceIndex];
        nextDirection = directionSequence[(currentSequenceIndex + 1) % directionSequence.length];
    } else {
        currentDirection = nextDirection;
        // In manual mode, next is determined by the button pressed
    }
    
    // Update signal display
    updateSignalDisplay();
    
    // Start timer for new direction
    startTimer();
}

function updateSignalDisplay() {
    // Only proceed if we're on the admin page
    if (!isAdminPage) return;
    
    // Reset all signals to red
    document.querySelectorAll('.light').forEach(light => {
        light.classList.remove('active');
    });
    document.querySelectorAll('.light.red').forEach(light => {
        light.classList.add('active');
    });
    
    // Set current direction to green
    const currentRed = document.getElementById(`${currentDirection}-red`);
    const currentGreen = document.getElementById(`${currentDirection}-green`);
    
    if (currentRed) currentRed.classList.remove('active');
    if (currentGreen) currentGreen.classList.add('active');
    
    // Update info displays
    if (currentGreenDisplay) currentGreenDisplay.textContent = capitalizeFirstLetter(currentDirection);
    if (nextDirectionDisplay) nextDirectionDisplay.textContent = capitalizeFirstLetter(nextDirection);
    
    // Update congestion displays
    updateCongestionDisplay();
}

function updateTimeDisplay() {
    // Only update the display if we're on the admin page
    if (!isAdminPage) return;
    
    if (timeRemainingDisplay) timeRemainingDisplay.textContent = timeRemaining;
    
    const directionTimer = document.getElementById(`${currentDirection}-timer`);
    if (directionTimer) directionTimer.textContent = timeRemaining;
}

function updateCongestionDisplay() {
    // Only update the display if we're on the admin page
    if (!isAdminPage) return;
    
    const directions = ['north', 'east', 'south', 'west'];
    
    directions.forEach(direction => {
        const level = congestionLevels[direction];
        let congestionText = 'Low';
        
        if (level >= 7) {
            congestionText = 'High';
        } else if (level >= 4) {
            congestionText = 'Medium';
        }
        
        const congestionElement = document.getElementById(`${direction}-congestion`);
        if (congestionElement) congestionElement.textContent = congestionText;
    });
}

function updateCongestionValue(direction) {
    // Only update the value if we're on the admin page
    if (!isAdminPage) return;
    
    const slider = document.getElementById(`${direction}-slider`);
    const valueDisplay = document.getElementById(`${direction}-value`);
    
    if (!slider) return;
    
    congestionLevels[direction] = parseInt(slider.value);
    if (valueDisplay) valueDisplay.textContent = slider.value;
    
    // Update congestion display
    updateCongestionDisplay();
    
    // If current direction, restart timer with new congestion level
    if (direction === currentDirection && !isManualOverride) {
        stopTimer();
        startTimer();
    }
}

window.manualOverride = function(direction) {
    console.log('Admin manualOverride called with direction:', direction);
    
    // If we're not on the admin page, store the direction in localStorage and return
    if (!isAdminPage) {
        console.log('Not on admin page, storing in localStorage:', direction);
        localStorage.setItem('pendingManualOverride', direction);
        return;
    }
    
    if (direction === currentDirection) {
        console.log('Already on this direction:', direction);
        return; // Already on this direction
    }
    
    isManualOverride = true;
    nextDirection = direction;
    
    // Stop current timers
    stopTimer();
    
    // If currently in green phase, change to yellow
    const currentGreen = document.getElementById(`${currentDirection}-green`);
    const currentYellow = document.getElementById(`${currentDirection}-yellow`);
    
    if (currentGreen && currentGreen.classList.contains('active')) {
        changeToYellow();
    } 
    // If in yellow phase, wait for it to complete
    else if (currentYellow && currentYellow.classList.contains('active')) {
        // Yellow phase will automatically move to next direction (which is now our manual direction)
    }
    // If changing directions during red, move immediately
    else {
        moveToNextDirection();
    }
}

function toggleEmergencyMode() {
    isEmergencyMode = !isEmergencyMode;
    
    if (isEmergencyMode) {
        // Enter emergency mode (all directions red except one)
        if (emergencyBtn) {
            emergencyBtn.textContent = 'Cancel Emergency';
            emergencyBtn.style.backgroundColor = '#ff9800';
        }
        
        // Stop current timers
        stopTimer();
        
        // Set all directions to red
        document.querySelectorAll('.light').forEach(light => {
            light.classList.remove('active');
        });
        document.querySelectorAll('.light.red').forEach(light => {
            light.classList.add('active');
        });
        
        // Set north to green (default emergency direction)
        const northRed = document.getElementById('north-red');
        const northGreen = document.getElementById('north-green');
        const northTimer = document.getElementById('north-timer');
        
        if (northRed) northRed.classList.remove('active');
        if (northGreen) northGreen.classList.add('active');
        
        currentDirection = 'north';
        if (currentGreenDisplay) currentGreenDisplay.textContent = 'North (Emergency)';
        if (nextDirectionDisplay) nextDirectionDisplay.textContent = 'N/A';
        if (timeRemainingDisplay) timeRemainingDisplay.textContent = '∞';
        if (northTimer) northTimer.textContent = '∞';
    } else {
        // Exit emergency mode
        if (emergencyBtn) {
            emergencyBtn.textContent = 'Emergency Override';
            emergencyBtn.style.backgroundColor = '#f44336';
        }
        
        // Reset to auto mode
        resetToAuto();
    }
}

function resetToAuto() {
    isManualOverride = false;
    isEmergencyMode = false;
    
    // Reset emergency button
    if (emergencyBtn) {
        emergencyBtn.textContent = 'Emergency Override';
        emergencyBtn.style.backgroundColor = '#f44336';
    }
    
    // Stop current timers
    stopTimer();
    
    // Reset sequence index to current direction
    currentSequenceIndex = directionSequence.indexOf(currentDirection);
    if (currentSequenceIndex === -1) currentSequenceIndex = 0;
    
    // Set next direction based on sequence
    nextDirection = directionSequence[(currentSequenceIndex + 1) % directionSequence.length];
    
    // Update signal display
    updateSignalDisplay();
    
    // Start timer
    startTimer();
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    
    if (yellowTimerTimeout) {
        clearTimeout(yellowTimerTimeout);
        yellowTimerTimeout = null;
    }
}

// Incident Management Functions
function loadIncidents() {
    console.log("loadIncidents function called.");
    // Reset incident counts
    incidentCounts = {
        north: 0,
        east: 0,
        south: 0,
        west: 0
    };
    
    // Get incidents from Firebase
    firebase.database().ref('incidents').once('value')
        .then((snapshot) => {
            console.log("Incidents data received:", snapshot.val());
            snapshot.forEach((childSnapshot) => {
                const incident = childSnapshot.val();
                if (incident.location) {
                    const direction = determineDirection(incident.location);
                    if (direction) {
                        incidentCounts[direction]++;
                    }
                }
            });
            
            // Update incident displays
            updateIncidentDisplays();
            
            // Set congestion levels based on incidents
            updateCongestionFromIncidents();
        })
        .catch(error => {
            console.error("Error loading incidents:", error);
        });
}

function determineDirection(location) {
    // Kottakkal center coordinates
    const centerLat = 10.997576;
    const centerLng = 75.992382;
    
    // Calculate angle from center
    const angle = Math.atan2(location.lat - centerLat, location.lng - centerLng) * 180 / Math.PI;
    
    // Determine direction based on angle
    if (angle >= -45 && angle < 45) {
        return 'east';
    } else if (angle >= 45 && angle < 135) {
        return 'north';
    } else if (angle >= -135 && angle < -45) {
        return 'south';
    } else {
        return 'west';
    }
}

function updateIncidentDisplays() {
    // Only update the display if we're on the admin page
    if (!isAdminPage) return;
    
    if (northIncidents) northIncidents.textContent = incidentCounts.north;
    if (eastIncidents) eastIncidents.textContent = incidentCounts.east;
    if (southIncidents) southIncidents.textContent = incidentCounts.south;
    if (westIncidents) westIncidents.textContent = incidentCounts.west;
}

function updateCongestionFromIncidents() {
    // Only update the congestion if we're on the admin page
    if (!isAdminPage) return;
    
    const directions = ['north', 'east', 'south', 'west'];
    
    directions.forEach(direction => {
        // Calculate congestion level based on incidents (max 10)
        const incidentCount = incidentCounts[direction];
        let congestionLevel = Math.min(Math.floor(incidentCount / 2) + 2, 10);
        
        // Update slider and value display
        const slider = document.getElementById(`${direction}-slider`);
        const valueDisplay = document.getElementById(`${direction}-value`);
        
        if (slider) slider.value = congestionLevel;
        if (valueDisplay) valueDisplay.textContent = congestionLevel;
        congestionLevels[direction] = congestionLevel;
    });
    
    // Update congestion display
    updateCongestionDisplay();
}

// Helper Functions
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

// Listen for new incidents in real-time
firebase.database().ref('incidents').on('child_added', (snapshot) => {
    const incident = snapshot.val();
    if (incident.location) {
        const direction = determineDirection(incident.location);
        if (direction) {
            incidentCounts[direction]++;
            updateIncidentDisplays();
            
            // Update congestion if auto-adjustment is enabled
            updateCongestionFromIncidents();
            
            // If current direction, restart timer with new congestion level
            if (direction === currentDirection && !isManualOverride && !isEmergencyMode) {
                stopTimer();
                startTimer();
            }
        }
    }
});

// Listen for removed incidents in real-time
firebase.database().ref('incidents').on('child_removed', (snapshot) => {
    // Reload all incidents when one is removed
    loadIncidents();
});

// Add link to main app in index.html
document.addEventListener('DOMContentLoaded', () => {
    // Only add the link if we're on the admin page
    if (!isAdminPage) return;
    
    // Add link to main app if not in admin container
    if (adminContainer && adminContainer.style.display !== 'none') {
        const header = document.querySelector('.admin-header');
        if (header) {
            const mainAppLink = document.createElement('a');
            mainAppLink.href = 'index.html';
            mainAppLink.className = 'main-app-link';
            mainAppLink.innerHTML = '<i class="fas fa-map-marked-alt"></i> Back to Map';
            mainAppLink.style.marginLeft = '20px';
            mainAppLink.style.color = '#1a73e8';
            mainAppLink.style.textDecoration = 'none';
            header.appendChild(mainAppLink);
        }
    }
});