/**
 * Central API Configuration
 * 
 * To switch between local and production backends:
 * 1. If running backend locally (npm run dev in /server), use 'http://localhost:5000'
 * 2. For production/live, use 'https://feedback-uc-urbancode.onrender.com'
 */

const isLocalhost = window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname.startsWith('192.168.');

const API_BASE_URL = isLocalhost
    ? 'http://localhost:5000'
    : 'https://feedback-uc-urbancode.onrender.com';

// If you want to use the live backend even on localhost, 
// uncomment the line below and comment the one above.
// const API_BASE_URL = 'https://feedback-uc-urbancode.onrender.com';

export default API_BASE_URL;
