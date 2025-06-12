/**
 * API module for handling requests to the Transport.opendata.ch API
 */
const TransportAPI = {
    /**
     * Base URL for the Transport API
     */
    baseUrl: 'https://transport.opendata.ch/v1',

    /**
     * Fetches connections between two locations
     * 
     * @param {string} from - Departure location (station name)
     * @param {string} to - Arrival location (station name)
     * @param {Object} options - Additional options
     * @param {Date} [options.date] - Date of the connection
     * @param {string} [options.time] - Time of the connection (HH:MM)
     * @param {boolean} [options.isArrivalTime] - Whether the time is arrival time
     * @returns {Promise<Object>} - Connection data
     */
    async getConnections(from, to, options = {}) {
        try {
            const params = new URLSearchParams({
                from,
                to,
                limit: 3 // We now need the next 3 connections
            });

            if (options.date) {
                const date = options.date;
                params.append('date', `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`);
            }

            if (options.time) {
                params.append('time', options.time);
            }

            if (options.isArrivalTime) {
                params.append('isArrivalTime', '1');
            }

            const response = await fetch(`${this.baseUrl}/connections?${params.toString()}`);
            
            if (!response.ok) {
                throw new Error(`API request failed with status ${response.status}`);
            }

            const data = await response.json();
            console.log('API response:', data); // Log the response to see the structure
            return data;
        } catch (error) {
            console.error('Error fetching connections:', error);
            throw error;
        }
    },

    /**
     * Fetches locations (stations) based on a search query
     * 
     * @param {string} query - Search query
     * @returns {Promise<Object>} - Location data
     */
    async searchLocations(query) {
        try {
            const params = new URLSearchParams({
                query,
                type: 'station'
            });

            const response = await fetch(`${this.baseUrl}/locations?${params.toString()}`);
            
            if (!response.ok) {
                throw new Error(`API request failed with status ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error searching locations:', error);
            throw error;
        }
    },

    /**
     * Fetches the current location using the Geolocation API
     * 
     * @returns {Promise<{latitude: number, longitude: number}>} - Current coordinates
     */
    getCurrentLocation() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation is not supported by your browser'));
                return;
            }

            navigator.geolocation.getCurrentPosition(
                position => {
                    resolve({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude
                    });
                },
                error => {
                    reject(error);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0
                }
            );
        });
    },

    /**
     * Fetches the nearest stations to the given coordinates
     * 
     * @param {number} latitude - Latitude
     * @param {number} longitude - Longitude
     * @returns {Promise<Object>} - Nearest stations data
     */
    async getNearestStations(latitude, longitude) {
        try {
            const params = new URLSearchParams({
                x: latitude,
                y: longitude,
                type: 'station'
            });

            const response = await fetch(`${this.baseUrl}/locations?${params.toString()}`);
            
            if (!response.ok) {
                throw new Error(`API request failed with status ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error fetching nearest stations:', error);
            throw error;
        }
    }
}; 