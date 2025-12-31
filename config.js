/**
 * TRIP MANAGEMENT SYSTEM - CONFIGURATION
 * Using Supabase Backend (NO CORS ISSUES)
 * Updated: December 31, 2025
 */

const CONFIG = {
    // ⭐ REPLACE THESE WITH YOUR SUPABASE DETAILS
    SUPABASE_URL: 'https://dbqemexpynmbpikybbqd.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRicWVtZXhweW5tYnBpa3liYnFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxNzYwNDYsImV4cCI6MjA4Mjc1MjA0Nn0.dGinSLwVoG1gk8QXZ8wrEbt80FILJqoT8KSvkj5o7lk',
    
    // App Settings
    VERSION: '1.0.0',
    API_TIMEOUT: 30000,
    
    FEATURES: {
        OFFLINE_SUPPORT: true,
        PUSH_NOTIFICATIONS: true,
        GPS_TRACKING: true
    },
    
    RETRY: {
        MAX_ATTEMPTS: 3,
        DELAY: 1000
    }
};

/**
 * Universal Supabase API caller
 */
async function supabaseAPI(method, table, data = null, filter = null) {
    const headers = {
        'apikey': CONFIG.SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${CONFIG.SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
    };

    let url = `${CONFIG.SUPABASE_URL}/rest/v1/${table}`;
    let options = { headers, method };

    // Add filter for GET/PATCH requests
    if (filter) {
        url += `?${filter}`;
    }

    // Add body for POST/PATCH
    if ((method === 'POST' || method === 'PATCH') && data) {
        options.body = JSON.stringify(data);
    }

    try {
        const response = await fetch(url, options);
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || `HTTP ${response.status}`);
        }

        const result = await response.json();
        return result;
    } catch (error) {
        console.error(`Supabase ${method} error:`, error);
        throw error;
    }
}

/**
 * Helper functions for common operations
 */

async function getAdminByEmail(email) {
    return await supabaseAPI('GET', 'admins', null, `admin_email=eq.${encodeURIComponent(email)}`);
}

async function getDriverByEmail(email) {
    return await supabaseAPI('GET', 'drivers', null, `driver_email=eq.${encodeURIComponent(email)}`);
}

async function getAllTrips() {
    return await supabaseAPI('GET', 'trips');
}

async function getTripsByDriver(driverId) {
    return await supabaseAPI('GET', 'trips', null, `driver_id=eq.${encodeURIComponent(driverId)}`);
}

async function getAllCustomers() {
    return await supabaseAPI('GET', 'customers');
}

async function createNewTrip(tripData) {
    return await supabaseAPI('POST', 'trips', tripData);
}

async function updateTrip(tripId, updateData) {
    return await supabaseAPI('PATCH', 'trips', updateData, `trip_id=eq.${encodeURIComponent(tripId)}`);
}

async function recordNewPayment(paymentData) {
    return await supabaseAPI('POST', 'payments', paymentData);
}

async function updatePayment(paymentId, updateData) {
    return await supabaseAPI('PATCH', 'payments', updateData, `payment_id=eq.${encodeURIComponent(paymentId)}`);
}

async function logUserAction(actionData) {
    try {
        await supabaseAPI('POST', 'logs', actionData);
    } catch (err) {
        console.error('Logging error (non-blocking):', err);
    }
}
