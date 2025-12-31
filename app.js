/**
 * TRIP MANAGEMENT SYSTEM - MAIN APPLICATION
 * Using Supabase Backend
 * Updated: December 31, 2025
 */

// ============================================================================
// GLOBAL STATE
// ============================================================================

let appState = {
    isAuthenticated: false,
    user: null,
    currentView: 'login',
    trips: [],
    customers: [],
    payments: []
};

// ============================================================================
// INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    registerServiceWorker();
});

function initializeApp() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLoginSubmit);
    }
}

// ============================================================================
// LOGIN HANDLER
// ============================================================================

async function handleLoginSubmit(e) {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail')?.value?.trim() || '';
    const password = document.getElementById('loginPassword')?.value || '';

    if (!email || !password) {
        showNotification('Please enter email and password', 'error');
        return;
    }

    const button = e.target.querySelector('button');
    button.disabled = true;
    button.textContent = 'Logging in...';

    try {
        const result = await loginUser(email, password);
        
        if (result.success) {
            appState.isAuthenticated = true;
            appState.user = result;
            
            // Store user in localStorage
            localStorage.setItem('trip_app_user', JSON.stringify(result));
            
            // Log action
            await logUserAction({
                user_id: result.userId,
                user_role: result.userRole,
                action: 'LOGIN',
                details: `${result.userRole} ${result.userName} logged in`,
                status: 'SUCCESS'
            });

            showNotification(`Welcome, ${result.userName}!`, 'success');
            
            // Redirect to dashboard
            setTimeout(() => {
                loadDashboard(result.userRole);
            }, 1000);
        } else {
            showNotification(result.error || 'Login failed', 'error');
        }
    } catch (err) {
        console.error('Login error:', err);
        showNotification('Login error: ' + err.message, 'error');
    } finally {
        button.disabled = false;
        button.textContent = 'Sign In';
    }
}

async function loginUser(email, password) {
    try {
        // Check Admins
        const admins = await getAdminByEmail(email);
        
        if (admins && admins.length > 0) {
            const admin = admins[0];
            if (admin.password === password) {
                return {
                    success: true,
                    token: 'token_' + Date.now(),
                    userId: admin.admin_id,
                    userName: admin.admin_name,
                    userRole: 'admin',
                    userEmail: admin.admin_email,
                    department: admin.department
                };
            }
        }

        // Check Drivers
        const drivers = await getDriverByEmail(email);
        
        if (drivers && drivers.length > 0) {
            const driver = drivers[0];
            if (driver.password === password) {
                return {
                    success: true,
                    token: 'token_' + Date.now(),
                    userId: driver.driver_id,
                    userName: driver.driver_name,
                    userRole: 'driver',
                    userEmail: driver.driver_email,
                    userPhone: driver.driver_phone
                };
            }
        }

        return { success: false, error: 'Invalid email or password' };
    } catch (err) {
        console.error('Login error:', err);
        return { success: false, error: err.message };
    }
}

// ============================================================================
// DASHBOARD LOADER
// ============================================================================

async function loadDashboard(userRole) {
    try {
        if (userRole === 'admin') {
            // Load admin dashboard
            appState.customers = await getAllCustomers();
            appState.trips = await getAllTrips();
            showAdminDashboard();
        } else if (userRole === 'driver') {
            // Load driver dashboard
            appState.trips = await getTripsByDriver(appState.user.userId);
            showDriverDashboard();
        }
    } catch (err) {
        showNotification('Error loading dashboard: ' + err.message, 'error');
    }
}

function showAdminDashboard() {
    const app = document.getElementById('app');
    app.innerHTML = `
        <div class="dashboard admin-dashboard">
            <header class="header">
                <div class="header-content">
                    <h1>🚚 Trip Manager</h1>
                    <p>Admin Dashboard</p>
                </div>
                <div class="user-info">
                    <span>${appState.user.userName}</span>
                    <button onclick="logout()" class="btn btn--secondary btn--sm">Logout</button>
                </div>
            </header>

            <nav class="tabs">
                <button class="tab active" onclick="switchTab('trips-tab')">📋 All Trips</button>
                <button class="tab" onclick="switchTab('create-trip-tab')">➕ Create Trip</button>
                <button class="tab" onclick="switchTab('payments-tab')">💳 Payments</button>
            </nav>

            <main class="content">
                <!-- Trips Tab -->
                <section id="trips-tab" class="tab-content active">
                    <h2>All Trips</h2>
                    <div id="tripsList" class="trips-list">
                        ${renderTripsList(appState.trips)}
                    </div>
                </section>

                <!-- Create Trip Tab -->
                <section id="create-trip-tab" class="tab-content">
                    <h2>Create New Trip</h2>
                    <form id="createTripForm" onsubmit="handleCreateTrip(event)" class="form">
                        <div class="form-group">
                            <label class="form-label">Customer</label>
                            <select id="customerId" class="form-control" required>
                                <option value="">Select Customer</option>
                                ${appState.customers.map(c => `<option value="${c.customer_id}">${c.customer_name}</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Pickup Address</label>
                            <input type="text" id="pickupAddress" class="form-control" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Drop Address</label>
                            <input type="text" id="dropAddress" class="form-control" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Scheduled Pickup Time</label>
                            <input type="datetime-local" id="scheduledPickupTime" class="form-control">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Goods Details</label>
                            <textarea id="goodsDetails" class="form-control" rows="3"></textarea>
                        </div>
                        <button type="submit" class="btn btn--primary btn--full-width">Create Trip</button>
                    </form>
                </section>

                <!-- Payments Tab -->
                <section id="payments-tab" class="tab-content">
                    <h2>Payment Verification</h2>
                    <div id="paymentsList" class="payments-list">
                        Loading payments...
                    </div>
                </section>
            </main>
        </div>
    `;
    
    // Load payments when tab is shown
    loadPaymentsForAdmin();
}

function showDriverDashboard() {
    const app = document.getElementById('app');
    app.innerHTML = `
        <div class="dashboard driver-dashboard">
            <header class="header">
                <div class="header-content">
                    <h1>🚚 Trip Manager</h1>
                    <p>Driver Dashboard</p>
                </div>
                <div class="user-info">
                    <span>${appState.user.userName}</span>
                    <button onclick="logout()" class="btn btn--secondary btn--sm">Logout</button>
                </div>
            </header>

            <main class="content">
                <h2>My Trips</h2>
                <div id="driverTripsList" class="trips-list">
                    ${renderDriverTripsList(appState.trips)}
                </div>
            </main>
        </div>
    `;
}

// ============================================================================
// TRIP MANAGEMENT
// ============================================================================

async function handleCreateTrip(e) {
    e.preventDefault();

    const tripId = 'TRIP_' + Date.now();
    const customerId = document.getElementById('customerId').value;
    const pickupAddress = document.getElementById('pickupAddress').value;
    const dropAddress = document.getElementById('dropAddress').value;
    const scheduledPickupTime = document.getElementById('scheduledPickupTime').value;
    const goodsDetails = document.getElementById('goodsDetails').value;

    if (!customerId || !pickupAddress || !dropAddress) {
        showNotification('Please fill all required fields', 'error');
        return;
    }

    try {
        const tripData = {
            trip_id: tripId,
            customer_id: customerId,
            driver_id: '',
            pickup_address: pickupAddress,
            drop_address: dropAddress,
            scheduled_pickup_time: scheduledPickupTime || new Date().toISOString(),
            trip_status: 'SCHEDULED',
            goods_details: goodsDetails,
            created_by: appState.user.userId,
            created_date: new Date().toISOString(),
            last_updated_date: new Date().toISOString()
        };

        await createNewTrip(tripData);

        // Log action
        await logUserAction({
            user_id: appState.user.userId,
            user_role: 'admin',
            action: 'CREATE_TRIP',
            trip_id: tripId,
            details: `Trip created: ${pickupAddress} → ${dropAddress}`,
            status: 'SUCCESS'
        });

        showNotification('Trip created successfully!', 'success');
        
        // Reset form and reload trips
        e.target.reset();
        appState.trips = await getAllTrips();
        loadDashboard('admin');
    } catch (err) {
        showNotification('Error creating trip: ' + err.message, 'error');
    }
}

async function updateTripStatus(tripId, newStatus) {
    try {
        await updateTrip(tripId, {
            trip_status: newStatus,
            last_updated_date: new Date().toISOString()
        });

        // Log action
        await logUserAction({
            user_id: appState.user.userId,
            user_role: appState.user.userRole,
            action: 'UPDATE_TRIP',
            trip_id: tripId,
            details: `Trip status updated to ${newStatus}`,
            status: 'SUCCESS'
        });

        showNotification(`Trip updated to ${newStatus}`, 'success');
        
        // Reload trips
        if (appState.user.userRole === 'admin') {
            appState.trips = await getAllTrips();
            loadDashboard('admin');
        } else {
            appState.trips = await getTripsByDriver(appState.user.userId);
            loadDashboard('driver');
        }
    } catch (err) {
        showNotification('Error updating trip: ' + err.message, 'error');
    }
}

// ============================================================================
// PAYMENT MANAGEMENT
// ============================================================================

async function loadPaymentsForAdmin() {
    try {
        // Get all payments from Supabase
        const payments = await supabaseAPI('GET', 'payments');
        
        const paymentsList = document.getElementById('paymentsList');
        if (payments && payments.length > 0) {
            paymentsList.innerHTML = payments.map(p => `
                <div class="card">
                    <div class="card__body">
                        <h3>Payment ${p.payment_id}</h3>
                        <p><strong>Trip:</strong> ${p.trip_id}</p>
                        <p><strong>Driver:</strong> ${p.driver_id}</p>
                        <p><strong>Method:</strong> ${p.payment_method}</p>
                        <p><strong>Amount:</strong> ₹${p.amount_received || 'Pending'}</p>
                        <p><strong>Status:</strong> <span class="status status--${p.payment_status.toLowerCase()}">${p.payment_status}</span></p>
                        ${p.payment_status === 'PENDING' ? `
                            <button onclick="verifyPayment('${p.payment_id}', 'VERIFIED')" class="btn btn--primary btn--sm">Verify</button>
                            <button onclick="verifyPayment('${p.payment_id}', 'REJECTED')" class="btn btn--secondary btn--sm">Reject</button>
                        ` : ''}
                    </div>
                </div>
            `).join('');
        } else {
            paymentsList.innerHTML = '<p>No payments yet</p>';
        }
    } catch (err) {
        console.error('Error loading payments:', err);
        document.getElementById('paymentsList').innerHTML = '<p>Error loading payments</p>';
    }
}

async function verifyPayment(paymentId, status) {
    try {
        await updatePayment(paymentId, {
            payment_status: status,
            notes: `Verified as ${status} by ${appState.user.userName}`
        });

        await logUserAction({
            user_id: appState.user.userId,
            user_role: 'admin',
            action: 'VERIFY_PAYMENT',
            details: `Payment ${paymentId} verified as ${status}`,
            status: 'SUCCESS'
        });

        showNotification(`Payment ${status.toLowerCase()}`, 'success');
        loadPaymentsForAdmin();
    } catch (err) {
        showNotification('Error verifying payment: ' + err.message, 'error');
    }
}

// ============================================================================
// UI HELPERS
// ============================================================================

function renderTripsList(trips) {
    if (!trips || trips.length === 0) {
        return '<p>No trips created yet</p>';
    }

    return trips.map(trip => `
        <div class="card">
            <div class="card__body">
                <h3>${trip.trip_id}</h3>
                <p><strong>From:</strong> ${trip.pickup_address}</p>
                <p><strong>To:</strong> ${trip.drop_address}</p>
                <p><strong>Status:</strong> <span class="status status--${trip.trip_status.toLowerCase()}">${trip.trip_status}</span></p>
                <p><strong>Scheduled:</strong> ${trip.scheduled_pickup_time ? new Date(trip.scheduled_pickup_time).toLocaleString() : 'Not set'}</p>
                ${trip.goods_details ? `<p><strong>Goods:</strong> ${trip.goods_details}</p>` : ''}
            </div>
        </div>
    `).join('');
}

function renderDriverTripsList(trips) {
    if (!trips || trips.length === 0) {
        return '<p>No trips assigned to you</p>';
    }

    return trips.map(trip => `
        <div class="card">
            <div class="card__body">
                <h3>${trip.trip_id}</h3>
                <p><strong>From:</strong> ${trip.pickup_address}</p>
                <p><strong>To:</strong> ${trip.drop_address}</p>
                <p><strong>Status:</strong> <span class="status status--${trip.trip_status.toLowerCase()}">${trip.trip_status}</span></p>
                <p><strong>Pickup Time:</strong> ${trip.scheduled_pickup_time ? new Date(trip.scheduled_pickup_time).toLocaleString() : 'Not set'}</p>
                <div class="mt-8">
                    ${trip.trip_status === 'SCHEDULED' ? `
                        <button onclick="updateTripStatus('${trip.trip_id}', 'STARTED')" class="btn btn--primary btn--sm">Accept & Start</button>
                    ` : trip.trip_status === 'STARTED' ? `
                        <button onclick="updateTripStatus('${trip.trip_id}', 'PICKUP_COMPLETED')" class="btn btn--primary btn--sm">Mark Pickup Done</button>
                    ` : trip.trip_status === 'PICKUP_COMPLETED' ? `
                        <button onclick="updateTripStatus('${trip.trip_id}', 'IN_TRANSIT')" class="btn btn--primary btn--sm">Start Delivery</button>
                    ` : trip.trip_status === 'IN_TRANSIT' ? `
                        <button onclick="updateTripStatus('${trip.trip_id}', 'COMPLETED')" class="btn btn--primary btn--sm">Complete Delivery</button>
                    ` : ''}
                </div>
            </div>
        </div>
    `).join('');
}

function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    document.getElementById(tabId).classList.add('active');
    event.target.classList.add('active');
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification--${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background: ${type === 'success' ? '#4caf50' : type === 'error' ? '#f44336' : '#2196f3'};
        color: white;
        border-radius: 4px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        z-index: 1000;
        max-width: 400px;
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

function logout() {
    localStorage.removeItem('trip_app_user');
    appState.isAuthenticated = false;
    appState.user = null;
    location.reload();
}

// ============================================================================
// SERVICE WORKER
// ============================================================================

async function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        try {
            await navigator.serviceWorker.register('service-worker.js');
            console.log('Service Worker registered');
        } catch (err) {
            console.log('Service Worker registration failed:', err);
        }
    }
}

// ============================================================================
// LOGGING
// ============================================================================

async function logUserActionToSupabase(actionData) {
    try {
        const logEntry = {
            log_id: 'LOG_' + Date.now(),
            timestamp: new Date().toISOString(),
            ...actionData
        };
        await supabaseAPI('POST', 'logs', logEntry);
    } catch (err) {
        console.error('Logging error:', err);
    }
}
