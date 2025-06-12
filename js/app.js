/**
 * Office Transit PWA
 * Main application logic
 */
document.addEventListener('DOMContentLoaded', () => {
    /**
     * Gets the main transport line from a connection
     * @param {Object} connection - Connection data from the API
     * @returns {string|null} - Main transport line or null if not found
     */
    function getMainTransportLine(connection) {
        if (!connection.sections || !Array.isArray(connection.sections)) {
            return null;
        }
        
        // Find the first journey section (excluding walking)
        const journeySection = connection.sections.find(section => section.journey);
        
        if (!journeySection || !journeySection.journey) {
            return null;
        }
        
        const transport = journeySection.journey.category || '';
        const line = journeySection.journey.number || '';
        
        if (transport && line) {
            return `${transport} ${line}`.trim();
        } else if (transport) {
            return transport;
        } else if (line) {
            return line;
        }
        
        return null;
    }
    // DOM Elements
    const goToOfficeBtn = document.getElementById('go-to-office');
    const goHomeBtn = document.getElementById('go-home');
    const connectionResult = document.getElementById('connection-result');
    const connectionDetails = document.getElementById('connection-details');
    const connectionTitle = document.getElementById('connection-title');
    const closeConnectionBtn = document.getElementById('close-connection');
    const loadingIndicator = document.getElementById('loading');
    const settingsBtn = document.getElementById('settings-button');
    const settingsModal = document.getElementById('settings-modal');
    const closeSettingsBtn = document.getElementById('close-settings');
    const settingsForm = document.getElementById('settings-form');
    const homeStationInput = document.getElementById('home-station');
    const officeStationInput = document.getElementById('office-station');
    const directConnectionsCheckbox = document.getElementById('direct-connections');
    const homeStationSuggestions = document.getElementById('home-station-suggestions');
    const officeStationSuggestions = document.getElementById('office-station-suggestions');

    // App State
    const state = {
        homeStation: localStorage.getItem('homeStation') || '',
        officeStation: localStorage.getItem('officeStation') || '',
        directConnectionsOnly: localStorage.getItem('directConnectionsOnly') === 'true',
        isSettingsConfigured: false
    };

    let homeStationValid = true;
    let officeStationValid = true;

    // Initialize the app
    function init() {
        // Check if settings are configured
        state.isSettingsConfigured = Boolean(state.homeStation && state.officeStation);
        
        // Set input values from local storage
        homeStationInput.value = state.homeStation;
        officeStationInput.value = state.officeStation;
        directConnectionsCheckbox.checked = state.directConnectionsOnly;

        // Show settings modal if not configured
        if (!state.isSettingsConfigured) {
            openSettingsModal();
        }

        // Register service worker for PWA
        registerServiceWorker();
    }

    // Event Listeners
    goToOfficeBtn.addEventListener('click', () => getConnection('home-to-office'));
    goHomeBtn.addEventListener('click', () => getConnection('office-to-home'));
    closeConnectionBtn.addEventListener('click', hideConnectionResult);
    settingsBtn.addEventListener('click', openSettingsModal);
    closeSettingsBtn.addEventListener('click', closeSettingsModal);
    settingsForm.addEventListener('submit', saveSettings);

    // Autocomplete logic
    homeStationInput.addEventListener('input', () => handleStationInput(homeStationInput, homeStationSuggestions, 'home'));
    officeStationInput.addEventListener('input', () => handleStationInput(officeStationInput, officeStationSuggestions, 'office'));
    homeStationInput.addEventListener('blur', () => setTimeout(() => homeStationSuggestions.innerHTML = '', 200));
    officeStationInput.addEventListener('blur', () => setTimeout(() => officeStationSuggestions.innerHTML = '', 200));
    homeStationInput.addEventListener('focus', () => prepopulateNearestStations(homeStationInput, homeStationSuggestions, 'home'));
    officeStationInput.addEventListener('focus', () => prepopulateNearestStations(officeStationInput, officeStationSuggestions, 'office'));

    /**
     * Handles station input for autocomplete
     * @param {HTMLInputElement} input
     * @param {HTMLElement} suggestionsContainer
     * @param {string} type - 'home' or 'office'
     */
    function handleStationInput(input, suggestionsContainer, type) {
        const query = input.value.trim();
        if (query.length < 2) {
            suggestionsContainer.innerHTML = '';
            if (type === 'home') homeStationValid = false;
            if (type === 'office') officeStationValid = false;
            return;
        }
        showSuggestionSkeletons(suggestionsContainer);
        TransportAPI.searchLocations(query)
            .then(data => {
                // Use stations or locations array, fallback to empty array
                const arr = data.stations || data.locations || [];
                // Only show real stations: must have id and name, and either type is 'station' or type is missing
                const stations = arr.filter(station => station.id && station.name && (!station.type || station.type === 'station'));
                if (!stations.length) {
                    suggestionsContainer.innerHTML = '';
                    if (type === 'home') homeStationValid = false;
                    if (type === 'office') officeStationValid = false;
                    return;
                }
                suggestionsContainer.innerHTML = '';
                stations.forEach(station => {
                    const div = document.createElement('div');
                    div.className = 'autocomplete-suggestion';
                    div.textContent = station.name;
                    div.onclick = () => {
                        input.value = station.name;
                        suggestionsContainer.innerHTML = '';
                        if (type === 'home') homeStationValid = true;
                        if (type === 'office') officeStationValid = true;
                    };
                    suggestionsContainer.appendChild(div);
                });
            })
            .catch(() => {
                suggestionsContainer.innerHTML = '';
                if (type === 'home') homeStationValid = false;
                if (type === 'office') officeStationValid = false;
            });
    }

    // Prepopulate nearest stations using geolocation if input is empty
    function prepopulateNearestStations(input, suggestionsContainer, type) {
        if (input.value.trim().length > 0) return;
        suggestionsContainer.innerHTML = '';
        showSuggestionSkeletons(suggestionsContainer);
        TransportAPI.getCurrentLocation()
            .then(coords => TransportAPI.getNearestStations(coords.latitude, coords.longitude))
            .then(data => {
                suggestionsContainer.innerHTML = '';
                // Use stations or locations array, fallback to empty array
                const arr = data.stations || data.locations || [];
                // Only show real stations: must have id and name, and either type is 'station' or type is missing
                const stations = arr.filter(station => station.id && station.name && (!station.type || station.type === 'station'));
                if (!stations.length) {
                    suggestionsContainer.innerHTML = '<div class="autocomplete-suggestion">No nearby stations found</div>';
                    if (type === 'home') homeStationValid = false;
                    if (type === 'office') officeStationValid = false;
                    return;
                }
                stations.forEach(station => {
                    const div = document.createElement('div');
                    div.className = 'autocomplete-suggestion';
                    div.textContent = station.name;
                    div.onclick = () => {
                        input.value = station.name;
                        suggestionsContainer.innerHTML = '';
                        if (type === 'home') homeStationValid = true;
                        if (type === 'office') officeStationValid = true;
                    };
                    suggestionsContainer.appendChild(div);
                });
            })
            .catch(() => {
                suggestionsContainer.innerHTML = '<div class="autocomplete-suggestion">Could not get your location</div>';
                if (type === 'home') homeStationValid = false;
                if (type === 'office') officeStationValid = false;
            });
    }

    /**
     * Shows an error message with optional retry
     * @param {string} message - Error message to display
     * @param {boolean} [append=false] - Whether to append the error or replace content
     * @param {Function} [retryFn] - Optional retry function
     */
    function showError(message, append = false, retryFn) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.innerHTML = message;
        if (retryFn) {
            const retryBtn = document.createElement('button');
            retryBtn.textContent = 'Retry';
            retryBtn.className = 'retry-button';
            retryBtn.onclick = retryFn;
            errorDiv.appendChild(retryBtn);
        }
        if (append) {
            connectionDetails.insertAdjacentElement('afterbegin', errorDiv);
        } else {
            connectionDetails.innerHTML = '';
            connectionDetails.appendChild(errorDiv);
        }
        showConnectionResult();
    }

    /**
     * Fetches and displays a connection
     * @param {string} direction - Either 'home-to-office' or 'office-to-home'
     */
    async function getConnection(direction) {
        if (!state.isSettingsConfigured) {
            openSettingsModal();
            return;
        }

        showConnectionSkeletons();

        try {
            let from, to, title;
            
            if (direction === 'home-to-office') {
                from = state.homeStation;
                to = state.officeStation;
                title = 'Home to Office';
            } else {
                from = state.officeStation;
                to = state.homeStation;
                title = 'Office to Home';
            }

            connectionTitle.textContent = title;

            const data = await TransportAPI.getConnections(from, to);
            
            if (!data.connections || data.connections.length === 0) {
                showError('<b>No connections found.</b><br>Check your station names or try again later.', false, () => getConnection(direction));
                return;
            }

            // Filter for direct connections if the option is enabled
            let filteredConnections = [...data.connections];
            
            if (state.directConnectionsOnly) {
                filteredConnections = filteredConnections.filter(connection => {
                    // A direct connection has only one journey section (not counting walking)
                    const journeySections = connection.sections.filter(section => section.journey);
                    return journeySections.length <= 1;
                });
            }
            
            // If no connections match the filter, show all connections
            if (filteredConnections.length === 0 && state.directConnectionsOnly) {
                filteredConnections = [...data.connections];
                connectionDetails.innerHTML = '';
                showError('No direct connections found. Showing all available connections.', true);
            }
            
            // Sort connections by arrival time (fastest first)
            const sortedConnections = filteredConnections.sort((a, b) => {
                const arrivalA = new Date(a.to.arrival);
                const arrivalB = new Date(b.to.arrival);
                return arrivalA - arrivalB;
            });

            // Display the connections
            displayConnections(sortedConnections);
        } catch (error) {
            let userMessage = 'An error occurred while fetching connections.';
            if (error.message && error.message.includes('Failed to fetch')) {
                userMessage = 'Network error. Please check your internet connection.';
            } else if (error.message && error.message.match(/429|rate limit|too many requests/i)) {
                userMessage = 'API rate limit reached. Please try again in a few minutes.';
            } else if (error.message && error.message.match(/5\d\d/)) {
                userMessage = 'The public transport API is currently unavailable. Please try again later.';
            }
            showError(userMessage, false, () => getConnection(direction));
        } finally {
            hideLoading();
        }
    }

    /**
     * Displays multiple connections in the UI
     * @param {Array<Object>} connections - Array of connection data from the API
     */
    function displayConnections(connections) {
        // Clear previous results
        connectionDetails.innerHTML = '';
        
        // Add recommendation for fastest connection
        if (connections.length > 0) {
            const fastestConnection = connections[0];
            const mainLine = getMainTransportLine(fastestConnection);
            
            if (mainLine) {
                const recommendationDiv = document.createElement('div');
                recommendationDiv.className = 'recommendation';
                recommendationDiv.textContent = `Take the ${mainLine}`;
                connectionDetails.appendChild(recommendationDiv);
            }
        }
        
        // Process each connection
        connections.forEach(connection => {
            // Create connection summary
            const summary = document.createElement('div');
            summary.className = 'connection-summary';
            
            // Add departure and arrival times
            const timeDiv = document.createElement('div');
            timeDiv.className = 'connection-time';
            
            const departure = new Date(connection.from.departure);
            const arrival = new Date(connection.to.arrival);
            
            const departureTime = formatTime(departure);
            const arrivalTime = formatTime(arrival);
            
            timeDiv.innerHTML = `
                <span>${departureTime}</span>
                <span>→</span>
                <span>${arrivalTime}</span>
            `;
            
            // Add duration
            const durationDiv = document.createElement('div');
            durationDiv.className = 'connection-duration';
            
            // Calculate duration from departure and arrival times
            const durationMs = arrival - departure;
            const durationMinutes = Math.floor(durationMs / 60000);
            
            if (durationMinutes > 0) {
                if (durationMinutes >= 60) {
                    const hours = Math.floor(durationMinutes / 60);
                    const mins = durationMinutes % 60;
                    durationDiv.textContent = `${hours}h ${mins}min`;
                } else {
                    durationDiv.textContent = `${durationMinutes}min`;
                }
            } else {
                durationDiv.textContent = '';
            }
            
            // Create simplified transport lines info
            const linesDiv = document.createElement('div');
            linesDiv.className = 'transport-lines';
            
            // Extract only transport lines (no walking)
            let transportLines = '';
            
            if (connection.sections && Array.isArray(connection.sections)) {
                transportLines = connection.sections
                    .filter(section => section.journey)
                    .map(section => {
                        const transport = section.journey.category || '';
                        const line = section.journey.number || '';
                        return `${transport} ${line}`.trim();
                    })
                    .join(' → ');
            }
            
            linesDiv.textContent = transportLines;

            // Highlight delays and platform changes
            let hasDelay = false;
            let delayText = '';
            let platformChange = false;
            let platformText = '';
            if (connection.sections && Array.isArray(connection.sections)) {
                connection.sections.forEach(section => {
                    if (section.departure && section.departure.delay && section.departure.delay > 0) {
                        hasDelay = true;
                        delayText = `+${section.departure.delay} min delay`;
                    }
                    if (section.departure && section.departure.platform && section.arrival && section.arrival.platform && section.departure.platform !== section.arrival.platform) {
                        platformChange = true;
                        platformText = `Platform change: ${section.departure.platform} → ${section.arrival.platform}`;
                    }
                });
            }
            if (hasDelay) {
                const delayDiv = document.createElement('div');
                delayDiv.className = 'connection-delay';
                delayDiv.textContent = delayText;
                summary.appendChild(delayDiv);
            }
            if (platformChange) {
                const platformDiv = document.createElement('div');
                platformDiv.className = 'platform-change';
                platformDiv.textContent = platformText;
                summary.appendChild(platformDiv);
            }

            // Assemble the connection summary
            summary.appendChild(timeDiv);
            summary.appendChild(durationDiv);
            summary.appendChild(linesDiv);
            
            // Add to the connection details
            connectionDetails.appendChild(summary);
        });
        
        // Show the connection result
        showConnectionResult();
    }

    /**
     * Shows the connection result container
     */
    function showConnectionResult() {
        connectionResult.classList.remove('hidden');
    }

    /**
     * Hides the connection result container
     */
    function hideConnectionResult() {
        connectionResult.classList.add('hidden');
    }

    /**
     * Shows the loading indicator
     */
    function showLoading() {
        loadingIndicator.classList.remove('hidden');
    }

    /**
     * Hides the loading indicator
     */
    function hideLoading() {
        loadingIndicator.classList.add('hidden');
    }

    /**
     * Opens the settings modal
     */
    function openSettingsModal() {
        settingsModal.classList.remove('hidden');
    }

    /**
     * Closes the settings modal
     */
    function closeSettingsModal() {
        settingsModal.classList.add('hidden');
    }

    /**
     * Saves the settings from the form
     * @param {Event} event - Form submit event
     */
    function saveSettings(event) {
        event.preventDefault();
        
        const homeStation = homeStationInput.value.trim();
        const officeStation = officeStationInput.value.trim();
        const directConnectionsOnly = directConnectionsCheckbox.checked;
        
        if (!homeStation || !officeStation) {
            alert('Please enter both home and office stations');
            return;
        }
        if (!homeStationValid || !officeStationValid) {
            alert('Please select valid stations from the suggestions.');
            return;
        }
        
        // Save to state and local storage
        state.homeStation = homeStation;
        state.officeStation = officeStation;
        state.directConnectionsOnly = directConnectionsOnly;
        state.isSettingsConfigured = true;
        
        localStorage.setItem('homeStation', homeStation);
        localStorage.setItem('officeStation', officeStation);
        localStorage.setItem('directConnectionsOnly', directConnectionsOnly);
        
        closeSettingsModal();
    }

    /**
     * Formats a date object to a time string (HH:MM)
     * @param {Date} date - Date object
     * @returns {string} - Formatted time string
     */
    function formatTime(date) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    /**
     * Formats duration in seconds to a readable string
     * @param {number} seconds - Duration in seconds
     * @returns {string} - Formatted duration string
     */
    function formatDuration(seconds) {
        if (typeof seconds !== 'number' || isNaN(seconds)) {
            return '';
        }
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        if (hours > 0) {
            return `${hours}h ${remainingMinutes}min`;
        } else {
            return `${minutes}min`;
        }
    }

    /**
     * Registers the service worker for PWA functionality
     */
    function registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('./service-worker.js')
                    .then(registration => {
                        console.log('ServiceWorker registration successful with scope:', registration.scope);
                    })
                    .catch(error => {
                        console.error('ServiceWorker registration failed:', error);
                    });
            });
        }
    }

    /**
     * Shows skeleton loaders for connection results
     * @param {number} [count=3] - Number of skeletons to show
     */
    function showConnectionSkeletons(count = 3) {
        connectionDetails.innerHTML = '';
        for (let i = 0; i < count; i++) {
            const skeleton = document.createElement('div');
            skeleton.className = 'skeleton skeleton-connection';
            connectionDetails.appendChild(skeleton);
        }
        showConnectionResult();
    }

    /**
     * Shows skeleton loaders for autocomplete suggestions
     * @param {HTMLElement} container - The container to fill with skeletons
     * @param {number} [count=4] - Number of skeletons to show
     */
    function showSuggestionSkeletons(container, count = 4) {
        container.innerHTML = '';
        for (let i = 0; i < count; i++) {
            const skeleton = document.createElement('div');
            skeleton.className = 'skeleton skeleton-suggestion';
            container.appendChild(skeleton);
        }
    }

    // Initialize the app
    init();
}); 