/**
 * TRIP MANAGEMENT SYSTEM - CONFIGURATION
 * Using Supabase Backend (NO CORS ISSUES)
 */

const CONFIG = {
    // Supabase Configuration
    SUPABASE_URL: 'https://dbqemexpynmbpikybbqd.supabase.co',  // Replace with your URL
    SUPABASE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRicWVtZXhweW5tYnBpa3liYnFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxNzYwNDYsImV4cCI6MjA4Mjc1MjA0Nn0.dGinSLwVoG1gk8QXZ8wrEbt80FILJqoT8KSvkj5o7lk',                    // Replace with your anon key
    
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

// Supabase API Helper
async function callSupabase(table, method, data = null, filter = null) {
    const headers = {
        'apikey': CONFIG.SUPABASE_KEY,
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CONFIG.SUPABASE_KEY}`
    };

    let url = `${CONFIG.SUPABASE_URL}/rest/v1/${table}`;
    let options = { headers };

    if (method === 'GET') {
        if (filter) url += filter;
        options.method = 'GET';
    } else if (method === 'POST') {
        options.method = 'POST';
        options.body = JSON.stringify(data);
    } else if (method === 'PATCH') {
        if (filter) url += filter;
        options.method = 'PATCH';
        options.body = JSON.stringify(data);
    }

    const response = await fetch(url, options);
    const result = await response.json();
    return result;
}
