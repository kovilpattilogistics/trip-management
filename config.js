/**
 * TRIP MANAGEMENT SYSTEM - CONFIGURATION
 * Update the API_URL with your Google Apps Script deployment URL
 */

const CONFIG = {
    // YOUR GOOGLE APPS SCRIPT DEPLOYMENT URL
    // Replace with your actual deployment URL from Google Apps Script
    API_URL: 'https://script.google.com/macros/s/AKfycbzzdkH3bzUwJwhcB85kRE_uLGeUNQgwftNaih4L48Pgqipr27Mv-XnOSt_JVNd7lek/exec',
    
    // App version for cache busting
    VERSION: '1.0.0',
    
    // Features
    FEATURES: {
        OFFLINE_SUPPORT: true,
        PUSH_NOTIFICATIONS: true,
        GPS_TRACKING: true
    },
    
    // API timeout (ms)
    API_TIMEOUT: 30000,
    
    // Retry settings
    RETRY: {
        MAX_ATTEMPTS: 3,
        DELAY: 1000
    }
};

/**
 * HOW TO SETUP:
 * 
 * 1. Create Google Sheet named "TripManagementDB"
 * 2. Create sheets: Drivers, Admins, Customers, Trips, Payments, Logs
 * 3. Open Extensions > Apps Script
 * 4. Copy the gas-script.js code into the editor
 * 5. Click Deploy > New Deployment
 *    - Type: Web app
 *    - Execute as: Your account
 *    - Who has access: Anyone
 * 6. Copy the deployment URL
 * 7. Replace 'YOUR_SCRIPT_ID' above with the actual ID from the URL
 *    URL format: https://script.google.com/macros/d/SCRIPT_ID/usercallable
 * 
 * Demo Credentials:
 * Admin: rajesh.admin@gmail.com / Admin@123
 * Driver: john.driver@gmail.com / Driver@123
 */
