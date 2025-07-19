'use strict';

document.addEventListener('DOMContentLoaded', () => {

    // --- AUTHENTICATION CHECK & PERSONALIZATION ---
    const userId = localStorage.getItem('sjt_userId');
    const userName = localStorage.getItem('sjt_userName');
    const userEmail = localStorage.getItem('sjt_userEmail'); // Get the email


    if (!userId) {
        // If no user is logged in, redirect to the login page.
        window.location.href = '/login.html';
        return; // Stop the script from running further on this page.
    }
    // --- NEW: Profile Dropdown Elements ---
    const profileIcon = document.getElementById('profile-icon');
    const profileDropdown = document.getElementById('profile-dropdown');
    const profileName = document.getElementById('profile-name');
    const profileEmail = document.getElementById('profile-email');
    const logoutBtn = document.getElementById('logout-btn');

     // Populate the dropdown with user info
    profileName.textContent = userName;
    profileEmail.textContent = userEmail;
    
    
    // Adjust main header greeting
    document.querySelector('h1').innerHTML = `<i class="fas fa-shield-alt"></i> Journey Tracker`;
    
    // --- Profile Dropdown Logic ---
    profileIcon.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevents the window click listener from firing immediately
        profileDropdown.classList.toggle('show');
    });

    logoutBtn.addEventListener('click', () => {
        // Clear all user data from storage
        localStorage.removeItem('sjt_userId');
        localStorage.removeItem('sjt_userName');
        localStorage.removeItem('sjt_userEmail');
        // Redirect to login page
        window.location.href = '/login.html';
    });

    // Close dropdown if user clicks outside of it
    window.addEventListener('click', (e) => {
        if (profileDropdown.classList.contains('show')) {
            if (!profileIcon.contains(e.target) && !profileDropdown.contains(e.target)) {
                profileDropdown.classList.remove('show');
            }
        }
    });

    // Welcome the logged-in user
    document.querySelector('h1').innerHTML = `<i class="fas fa-shield-alt"></i> Welcome, ${userName}!`;
    
    // --- CONSTANTS ---
    const API_BASE_URL = '/api'; // Use relative path to our own server

    // --- STATE VARIABLES ---
    let journeyId = null;
    let startCoords = null;
    let endCoords = null;
    let routePolyline = null;
    let locationInterval = null;
    let aiInterval = null;
    let autoCheckInterval = null;
    let lastCheckInTime = null;
    let alertSentInCycle = false;

    // --- DOM ELEMENTS ---
    // This section is identical to your working code.
    const step1 = document.getElementById('step1');
    const step2 = document.getElementById('step2');
    const step3 = document.getElementById('step3');
    const notificationEl = document.getElementById('notification');
    const journeyStatusIndicator = document.getElementById('journey-status');
    const startGeocoderContainer = document.getElementById('start-geocoder');
    const endGeocoderContainer = document.getElementById('end-geocoder');
    const addDestinationBtn = document.getElementById('add-destination-btn');
    const addDestinationGroup = document.getElementById('add-destination-group');
    const plotContinueGroup = document.getElementById('plot-continue-group');
    const plotRouteBtn = document.getElementById('plot-route-btn');
    const continueStep1Btn = document.getElementById('continue-step1-btn');
    const backToStep1Btn = document.getElementById('back-to-step1-btn');
    const startJourneyBtn = document.getElementById('start-journey-btn');
    const checkInBtn = document.getElementById('check-in-btn');
    const startVoiceBtn = document.getElementById('start-voice-btn');
    const stopVoiceBtn = document.getElementById('stop-voice-btn');
    const startTrackingBtn = document.getElementById('start-tracking-btn');
    const stopTrackingBtn = document.getElementById('stop-tracking-btn');
    const confirmArrivalBtn = document.getElementById('confirm-arrival-btn');
    const sendHelpBtn = document.getElementById('send-help-btn');

    // --- MAP & GEOCODER INITIALIZATION ---
    // This section is also identical to your working code.
    const map = L.map('map').setView([20.5937, 78.9629], 5);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
    let startMarker = null, endMarker = null, locationMarker = null;
    const createGeocoder = (placeholder) => L.Control.geocoder({ defaultMarkGeocode: false, placeholder, geocoder: L.Control.Geocoder.nominatim() });
    const startGeocoder = createGeocoder('🚩 Enter Start Location').on('markgeocode', function(e) {
        startCoords = [e.geocode.center.lat, e.geocode.center.lng];
        if (startMarker) map.removeLayer(startMarker);
        startMarker = L.marker(e.geocode.center).addTo(map).bindPopup(`<b>Start:</b> ${e.geocode.name}`).openPopup();
        map.panTo(e.geocode.center);
        drawRoute();
    });
    startGeocoder.onAdd(map);
    startGeocoderContainer.appendChild(startGeocoder.getContainer());
    const endGeocoder = createGeocoder('🏁 Enter Destination').on('markgeocode', function(e) {
        endCoords = [e.geocode.center.lat, e.geocode.center.lng];
        if (endMarker) map.removeLayer(endMarker);
        endMarker = L.marker(e.geocode.center).addTo(map).bindPopup(`<b>Destination:</b> ${e.geocode.name}`).openPopup();
        map.panTo(e.geocode.center);
        drawRoute();
    });
    endGeocoder.onAdd(map);
    endGeocoderContainer.appendChild(endGeocoder.getContainer());

    // --- CORE FUNCTIONS (UPGRADED) ---
    function drawRoute() {
        if (startCoords && endCoords) {
            const latlngs = [startCoords, endCoords];
            if (routePolyline) map.removeLayer(routePolyline);
            routePolyline = L.polyline(latlngs, { color: '#4299e1', weight: 5, opacity: 0.8 }).addTo(map);
            map.fitBounds(routePolyline.getBounds().pad(0.1));
        }
    }

    // UPGRADED: Uses real user ID and communicates with the real backend.
    async function startJourney() {
        if (!startCoords || !endCoords) {
            showNotification("Please set both start and end locations first.", "error");
            return;
        }
        
        const journeyData = {
            userId: userId, // The real, logged-in user's ID
            from: startCoords.join(','),
            to: endCoords.join(',')
        };

        try {
            const res = await fetch(`${API_BASE_URL}/journeys/start`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(journeyData)
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Failed to start journey');

            journeyId = data.journeyId; // Store the REAL journey ID from MongoDB
            lastCheckInTime = Date.now();
            showNotification("Journey started successfully! Tracking is active.", "success");
            updateUIState('step3');
            startLocationTracking();
            startAutoCheckMonitor();
        } catch (err) {
            console.error("Journey start failed:", err);
            showNotification(err.message, "error");
        }
    }
    
    // UPGRADED & FIXED: Real API calls and correct icon display.
    function startLocationTracking() {
        if (locationInterval) return;
        startTrackingBtn.disabled = true;
        startTrackingBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Tracking...';
        stopTrackingBtn.disabled = false;

        const updatePosition = (position) => {
            const { latitude, longitude } = position.coords;
            const latLng = [latitude, longitude];

            if (!locationMarker) {
                // This is the fix for the icon not appearing
                const icon = L.divIcon({ className: 'user-location-icon', html: '<i class="fas fa-walking"></i>', iconSize: [24, 24] });
                locationMarker = L.marker(latLng, { icon }).addTo(map).bindPopup("Your current location");
            } else {
                locationMarker.setLatLng(latLng);
            }
            map.panTo(latLng, 16); // Pan and zoom to a reasonable level

            if (journeyId) {
                // Send location to the REAL backend
                fetch(`${API_BASE_URL}/journeys/location`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ journeyId, lat: latitude, lon: longitude })
                }).catch(err => console.error("Location update failed:", err));
            }
        };

        const handleError = (error) => {
            console.error('Geolocation error:', error);
            showNotification(`Location Error: ${error.message}. Please enable location access.`, "error");
            stopLocationTracking(); // Stop trying if there's an error
        };

        // Get location once immediately for a quick response
        navigator.geolocation.getCurrentPosition(updatePosition, handleError, { enableHighAccuracy: true });
        // Then set the interval
        locationInterval = setInterval(() => {
            navigator.geolocation.getCurrentPosition(updatePosition, handleError, { enableHighAccuracy: true });
        }, 15000);

        showNotification("Live location tracking has started.", "info");
    }

    // UPGRADED: Sends check-in to the real backend.
    async function sendCheckIn() {
        if (!journeyId) return;
        try {
            const res = await fetch(`${API_BASE_URL}/journeys/checkin`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ journeyId })
            });
            if (!res.ok) throw new Error('Check-in failed on server.');
            
            lastCheckInTime = Date.now();
            alertSentInCycle = false;
            showNotification("Check-in successful! We know you're safe.", "success");
        } catch (err) {
            console.error("Check-in failed:", err);
            showNotification("Check-in failed. Please try again.", "error");
        }
    }

    // UPGRADED: Completes the journey on the real backend.
    async function confirmArrival() {
        if (!journeyId) return;
        try {
            const res = await fetch(`${API_BASE_URL}/journeys/complete`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ journeyId })
            });
            if (!res.ok) throw new Error('Failed to complete journey.');

            showNotification("Congratulations on arriving safely! 🎉", "success");
            resetJourneyState();
        } catch (err) {
            showNotification("Could not complete the journey. Please try again.", "error");
        }
    }
    
    // UPGRADED: Calls the real /help endpoint on the backend.
    async function sendHelpSignal() {
        if (!journeyId) {
            showNotification("Cannot send help without an active journey.", "error");
            return;
        }

        sendHelpBtn.disabled = true;
        sendHelpBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> SENDING...';

        try {
            const res = await fetch(`${API_BASE_URL}/journeys/help`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ journeyId })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);
            
            // Display the success message from the backend (e.g., "Help signal sent to 3 contacts.")
            showNotification(`🚨 ${data.message}`, 'success');

        } catch (error) {
            showNotification(`Help signal failed: ${error.message}`, 'error');
        } finally {
            sendHelpBtn.disabled = false;
            sendHelpBtn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> SEND HELP';
        }
    }

    // --- UNCHANGED HELPER FUNCTIONS ---
    // These functions do not interact with the backend and are identical to your working code.
    function stopLocationTracking() {
        if (locationInterval) {
            clearInterval(locationInterval);
            locationInterval = null;
            startTrackingBtn.disabled = false;
            startTrackingBtn.innerHTML = '<i class="fas fa-play"></i> Start';
            stopTrackingBtn.disabled = true;
            showNotification("Location tracking stopped.", "info");
        }
    }

    function startVoiceCompanion() {
        if (!('speechSynthesis' in window)) {
            showNotification("Sorry, your browser doesn't support the voice companion.", "error");
            return;
        }
        if (aiInterval) return;
        const messages = ["Hey, I'm your AI companion for this journey. I'm here to ensure you're safe.", "How are you feeling? Remember, your safety is the top priority.", "If you feel unsafe at any point, don't hesitate to use the emergency button.", "I'm monitoring your route. Everything looks fine from here.", "Stay aware of your surroundings. You're doing great."];
        let index = 0;
        const speak = (text) => {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'en-US';
            utterance.rate = 0.9;
            speechSynthesis.speak(utterance);
        };
        speak("AI companion activated. I'll be with you on your journey.");
        aiInterval = setInterval(() => {
            speak(messages[index]);
            index = (index + 1) % messages.length;
        }, 45000);
        showNotification("AI Voice Companion started.", "info");
    }

    function stopVoiceCompanion() {
        if (aiInterval) {
            clearInterval(aiInterval);
            aiInterval = null;
            if ('speechSynthesis' in window) { speechSynthesis.cancel(); }
            showNotification("AI Voice Companion stopped.", "info");
        }
    }

    function startAutoCheckMonitor() {
        if (autoCheckInterval) return;
        autoCheckInterval = setInterval(() => {
            if (!journeyId || !lastCheckInTime) return;
            const minutesSinceCheckIn = (Date.now() - lastCheckInTime) / 60000;
            if (minutesSinceCheckIn > 2 && !alertSentInCycle) {
                const warningMsg = "It's been a while since your last check-in. Are you okay? Please check in.";
                if ('speechSynthesis' in window) { speechSynthesis.speak(new SpeechSynthesisUtterance(warningMsg)); }
                showNotification(warningMsg, "error");
                alertSentInCycle = true;
            }
            if (minutesSinceCheckIn > 3) {
                 const helpMsg = "No response received. Triggering emergency alert automatically.";
                 if ('speechSynthesis' in window) { speechSynthesis.speak(new SpeechSynthesisUtterance(helpMsg)); }
                sendHelpSignal();
                stopAutoCheckMonitor();
            }
        }, 30000);
    }
    
    function stopAutoCheckMonitor() {
        if(autoCheckInterval) { clearInterval(autoCheckInterval); autoCheckInterval = null; }
    }

    function updateUIState(currentState) {
        const states = { step1, step2, step3 };
        Object.values(states).forEach(el => el.style.display = 'none');
        if (states[currentState]) {
            states[currentState].style.display = 'block';
            states[currentState].classList.add('fade-in');
            setTimeout(() => states[currentState].classList.remove('fade-in'), 500);
        }
        journeyStatusIndicator.className = (currentState === 'step3') ? 'status-indicator status-active' : 'status-indicator status-inactive';
    }

    let notificationTimeout;
    function showNotification(message, type = 'info') {
        clearTimeout(notificationTimeout);
        notificationEl.textContent = message;
        notificationEl.className = 'show';
        notificationEl.classList.add(type);
        notificationTimeout = setTimeout(() => {
            notificationEl.className = notificationEl.className.replace('show', '');
        }, 5000);
    }

    function resetJourneyState() {
        stopLocationTracking(); stopVoiceCompanion(); stopAutoCheckMonitor();
        journeyId = null; startCoords = null; endCoords = null; lastCheckInTime = null;
        if(startMarker) map.removeLayer(startMarker);
        if(endMarker) map.removeLayer(endMarker);
        if(locationMarker) map.removeLayer(locationMarker);
        if(routePolyline) map.removeLayer(routePolyline);
        startMarker = endMarker = locationMarker = routePolyline = null;
        startGeocoder.getContainer().querySelector('input').value = '';
        endGeocoder.getContainer().querySelector('input').value = '';
        endGeocoderContainer.style.display = 'none';
        plotContinueGroup.style.display = 'none';
        addDestinationGroup.style.display = 'flex';
        updateUIState('step1');
    }

    // --- EVENT LISTENERS (UNCHANGED) ---
    // This block is identical to your working code.
    addDestinationBtn.addEventListener('click', () => {
        addDestinationGroup.style.display = 'none';
        endGeocoderContainer.style.display = 'block';
        plotContinueGroup.style.display = 'flex';
    });
    plotRouteBtn.addEventListener('click', () => { if (startCoords && endCoords) { drawRoute(); showNotification("Route plotted successfully!", "success"); } else { showNotification("Please select both a start and end location first.", "error"); } });
    continueStep1Btn.addEventListener('click', () => { if (!startCoords || !endCoords) { showNotification("Please plot your route first!", "error"); return; } updateUIState('step2'); });
    backToStep1Btn.addEventListener('click', () => updateUIState('step1'));
    startJourneyBtn.addEventListener('click', startJourney);
    checkInBtn.addEventListener('click', sendCheckIn);
    startVoiceBtn.addEventListener('click', startVoiceCompanion);
    stopVoiceBtn.addEventListener('click', stopVoiceCompanion);
    startTrackingBtn.addEventListener('click', startLocationTracking);
    stopTrackingBtn.addEventListener('click', stopLocationTracking);
    confirmArrivalBtn.addEventListener('click', confirmArrival);
    sendHelpBtn.addEventListener('click', sendHelpSignal); // This now calls the upgraded function

    // --- INITIALIZE ---
    updateUIState('step1');
    stopTrackingBtn.disabled = true;
});