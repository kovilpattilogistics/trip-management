/**
 * TRIP MANAGEMENT SYSTEM - MAIN APPLICATION
 * Frontend logic for admin and driver interfaces
 * Handles UI interactions, API calls, and offline data management
 */

// ============================================================================
// GLOBAL STATE
// ============================================================================

let appState = {
    user: null,
    token: null,
    role: null,
    allTrips: [],
    allCustomers: [],
    currentTrip: null,
    isOnline: navigator.onLine,
    requestQueue: []
};

async function apiCall(action, params = {}) {
  try {
    // Handle login separately
    if (action === 'login') {
      return await loginSupabase(params.email, params.password);
    }
    
    // ... rest of your functions use Supabase similarly
    throw new Error('Unknown action');
  } catch (error) {
    console.error('API Error:', error);
    showNotification(error.message, 'error');
    return { error: error.message, success: false };
  }
}

async function loginSupabase(email, password) {
  try {
    // Check Admins
    const admins = await callSupabase('admins', 'GET', null, `?admin_email=eq.${email}`);
    
    if (admins.length > 0) {
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
    const drivers = await callSupabase('drivers', 'GET', null, `?driver_email=eq.${email}`);
    
    if (drivers.length > 0) {
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

    return { error: 'Invalid email or password', success: false };
  } catch (err) {
    return { error: err.message, success: false };
  }
}


// ============================================================================
// SCREEN NAVIGATION
// ============================================================================

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
}

function loadDashboard() {
    // Update user info
    document.getElementById('userName').textContent = appState.user;
    document.getElementById('userRole').textContent = appState.role === 'admin' ? '👤 Admin' : '🚗 Driver';

    // Show appropriate dashboard
    if (appState.role === 'admin') {
        document.getElementById('adminDashboard').classList.remove('hidden');
        document.getElementById('driverDashboard').classList.add('hidden');
        document.getElementById('screenTitle').textContent = 'Admin Dashboard';
        loadAdminDashboard();
    } else {
        document.getElementById('driverDashboard').classList.remove('hidden');
        document.getElementById('adminDashboard').classList.add('hidden');
        document.getElementById('screenTitle').textContent = 'Driver Dashboard';
        loadDriverDashboard();
    }
}

// ============================================================================
// ADMIN DASHBOARD
// ============================================================================

async function loadAdminDashboard() {
    const response = await apiCall('getAdminDashboard');
    if (!response) return;

    // Update stats
    document.getElementById('totalTrips').textContent = response.stats.totalTrips;
    document.getElementById('activeTrips').textContent = response.stats.activeTrips;
    document.getElementById('completedTrips').textContent = response.stats.completedTrips;
    document.getElementById('pendingTrips').textContent = response.stats.pendingApprovalTrips;

    // Load all trips
    const allTripsResponse = await apiCall('getAllTrips');
    if (allTripsResponse) {
        appState.allTrips = allTripsResponse.trips || [];
        renderTripsList(appState.allTrips);
    }

    // Load customers
    const customersResponse = await apiCall('getCustomers');
    if (customersResponse) {
        appState.allCustomers = customersResponse.customers || [];
        renderCustomerDropdown(appState.allCustomers);
        renderCustomersList(appState.allCustomers);
    }
}

function renderTripsList(trips) {
    const container = document.getElementById('tripsList');
    
    if (trips.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📭</div><p>No trips yet</p></div>';
        return;
    }

    container.innerHTML = trips.map(trip => `
        <div class="card" onclick="showTripModal('${trip.tripId}')">
            <div class="card-header">
                <div>
                    <div class="card-title">Trip ${trip.tripId.slice(-6)}</div>
                    <div class="card-subtitle">${trip.customerId || 'N/A'}</div>
                </div>
                <span class="card-badge badge-${trip.tripStatus.toLowerCase().replace(/_/g, '-')}">${formatStatus(trip.tripStatus)}</span>
            </div>
            <div class="trip-detail">
                <span class="trip-detail-label">📍 From</span>
                <span class="trip-detail-value">${trip.pickupAddress.substring(0, 30)}</span>
            </div>
            <div class="trip-detail">
                <span class="trip-detail-label">📍 To</span>
                <span class="trip-detail-value">${trip.dropAddress.substring(0, 30)}</span>
            </div>
            <div class="trip-detail">
                <span class="trip-detail-label">🕐 Pickup</span>
                <span class="trip-detail-value">${trip.scheduledPickupTime}</span>
            </div>
        </div>
    `).join('');
}

function renderCustomerDropdown(customers) {
    const select = document.getElementById('tripCustomer');
    const options = customers.map(c => 
        `<option value="${c.customerId}">${c.customerName}</option>`
    ).join('');
    select.innerHTML = '<option value="">Select customer...</option>' + options;
}

function renderCustomersList(customers) {
    const container = document.getElementById('customersList');
    
    if (customers.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>No customers yet</p></div>';
        return;
    }

    container.innerHTML = customers.map(customer => `
        <div class="card">
            <div class="card-title">${customer.customerName}</div>
            <div class="trip-detail">
                <span class="trip-detail-label">📱 Phone</span>
                <span class="trip-detail-value">${customer.customerPhone || 'N/A'}</span>
            </div>
            <div class="trip-detail">
                <span class="trip-detail-label">📍 City</span>
                <span class="trip-detail-value">${customer.customerCity}</span>
            </div>
        </div>
    `).join('');
}

async function handleCreateTrip() {
    const customerId = document.getElementById('tripCustomer').value;
    const pickupAddress = document.getElementById('tripPickup').value;
    const dropAddress = document.getElementById('tripDrop').value;
    const scheduledPickupTime = document.getElementById('tripPickupTime').value;
    const expectedDeliveryTime = document.getElementById('tripDeliveryTime').value;
    const goodsDetails = document.getElementById('tripGoods').value;
    const notes = document.getElementById('tripNotes').value;

    if (!customerId || !pickupAddress || !dropAddress || !scheduledPickupTime) {
        showNotification('Please fill all required fields', 'error');
        return;
    }

    const response = await apiCall('createTrip', {
        customerId,
        pickupAddress,
        dropAddress,
        scheduledPickupTime,
        expectedDeliveryTime,
        goodsDetails,
        notes,
        createdBy: appState.userId
    });

    if (response && response.success) {
        showNotification('Trip created successfully!', 'success');
        
        // Clear form
        document.getElementById('tripCustomer').value = '';
        document.getElementById('tripPickup').value = '';
        document.getElementById('tripDrop').value = '';
        document.getElementById('tripPickupTime').value = '';
        document.getElementById('tripDeliveryTime').value = '';
        document.getElementById('tripGoods').value = '';
        document.getElementById('tripNotes').value = '';
        
        // Reload
        loadAdminDashboard();
    }
}

async function handleCreateCustomer() {
    const customerName = document.getElementById('newCustomerName').value;
    const customerPhone = document.getElementById('newCustomerPhone').value;
    const customerCity = document.getElementById('newCustomerCity').value;
    const customerArea = document.getElementById('newCustomerArea').value;

    if (!customerName || !customerCity) {
        showNotification('Name and city are required', 'error');
        return;
    }

    const response = await apiCall('createCustomer', {
        customerName,
        customerPhone,
        customerCity,
        customerArea
    });

    if (response && response.success) {
        showNotification('Customer created!', 'success');
        document.getElementById('customerModal').classList.remove('active');
        loadAdminDashboard();
    }
}

async function handleGenerateReport() {
    const startDate = document.getElementById('reportStartDate').value;
    const endDate = document.getElementById('reportEndDate').value;

    const response = await apiCall('getTripReports', {
        startDate,
        endDate
    });

    if (response && response.success) {
        const report = response.report;
        const html = `
            <div class="card">
                <div class="card-title">Report Summary</div>
                <div class="trip-detail">
                    <span class="trip-detail-label">Total Trips</span>
                    <span class="trip-detail-value">${report.totalTrips}</span>
                </div>
                <div class="trip-detail">
                    <span class="trip-detail-label">Completed with Payment</span>
                    <span class="trip-detail-value">${report.completedTripsWithPayment}</span>
                </div>
                <div class="trip-detail">
                    <span class="trip-detail-label">Total Revenue</span>
                    <span class="trip-detail-value">₹${report.totalPaymentsReceived}</span>
                </div>
                <div class="trip-detail">
                    <span class="trip-detail-label">UPI Payments</span>
                    <span class="trip-detail-value">${report.paymentBreakdown.UPI || 0}</span>
                </div>
                <div class="trip-detail">
                    <span class="trip-detail-label">Cash Payments</span>
                    <span class="trip-detail-value">${report.paymentBreakdown.CASH || 0}</span>
                </div>
            </div>
        `;
        document.getElementById('reportContent').innerHTML = html;
    }
}

// ============================================================================
// DRIVER DASHBOARD
// ============================================================================

async function loadDriverDashboard() {
    const response = await apiCall('getDriverTrips', {
        driverId: appState.userId
    });

    if (!response) return;

    const trips = response.trips || [];
    appState.allTrips = trips;

    // Split trips into available and active
    const availableTrips = trips.filter(t => 
        t.tripStatus === 'SCHEDULED' || t.tripStatus === 'PENDING_APPROVAL'
    );
    const activeTrip = trips.find(t => 
        t.tripStatus === 'STARTED' || 
        t.tripStatus === 'PICKUP_COMPLETED' || 
        t.tripStatus === 'IN_TRANSIT'
    );

    // Render available trips
    const availableContainer = document.getElementById('availableTrips');
    if (availableTrips.length === 0) {
        availableContainer.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📭</div><p>No available trips</p></div>';
    } else {
        availableContainer.innerHTML = availableTrips.map(trip => `
            <div class="card" onclick="showDriverTripModal('${trip.tripId}')">
                <div class="card-header">
                    <div>
                        <div class="card-title">Trip ${trip.tripId.slice(-6)}</div>
                        <div class="card-subtitle">${formatDateTime(trip.scheduledPickupTime)}</div>
                    </div>
                    <span class="card-badge badge-${trip.tripStatus.toLowerCase().replace(/_/g, '-')}">${formatStatus(trip.tripStatus)}</span>
                </div>
                <div class="trip-detail">
                    <span class="trip-detail-label">📍 From</span>
                    <span class="trip-detail-value">${trip.pickupAddress.substring(0, 30)}</span>
                </div>
                <div class="trip-detail">
                    <span class="trip-detail-label">📍 To</span>
                    <span class="trip-detail-value">${trip.dropAddress.substring(0, 30)}</span>
                </div>
            </div>
        `).join('');
    }

    // Render active trip
    const activeContainer = document.getElementById('activeTrip');
    if (!activeTrip) {
        activeContainer.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📭</div><p>No active trip</p></div>';
    } else {
        appState.currentTrip = activeTrip;
        activeContainer.innerHTML = renderActiveTrip(activeTrip);
    }
}

function renderActiveTrip(trip) {
    let actionButtons = '';
    
    if (trip.tripStatus === 'STARTED') {
        actionButtons = `
            <button class="btn btn-success btn-full mb-8" onclick="markPickupCompleted('${trip.tripId}')">
                ✓ Mark Pickup Completed
            </button>
            <a href="https://www.google.com/maps/search/${encodeURIComponent(trip.pickupAddress)}" class="map-button" target="_blank">
                📍 Open Pickup Location in Maps
            </a>
        `;
    } else if (trip.tripStatus === 'PICKUP_COMPLETED') {
        actionButtons = `
            <button class="btn btn-success btn-full mb-8" onclick="startDelivery('${trip.tripId}')">
                ▶ Start Delivery
            </button>
            <a href="https://www.google.com/maps/search/${encodeURIComponent(trip.dropAddress)}" class="map-button" target="_blank">
                📍 Open Drop Location in Maps
            </a>
        `;
    } else if (trip.tripStatus === 'IN_TRANSIT') {
        actionButtons = `
            <button class="btn btn-success btn-full mb-8" onclick="completeTrip('${trip.tripId}')">
                ✓ Complete Delivery
            </button>
            <a href="https://www.google.com/maps/search/${encodeURIComponent(trip.dropAddress)}" class="map-button" target="_blank">
                📍 Navigate to Drop Location
            </a>
        `;
    }

    return `
        <div class="card">
            <div class="card-header">
                <div>
                    <div class="card-title">Active Trip: ${trip.tripId.slice(-6)}</div>
                    <div class="card-subtitle">${formatStatus(trip.tripStatus)}</div>
                </div>
                <span class="card-badge badge-${trip.tripStatus.toLowerCase().replace(/_/g, '-')}">${trip.tripStatus}</span>
            </div>

            <div class="trip-detail">
                <span class="trip-detail-label">📍 Pickup</span>
                <span class="trip-detail-value">${trip.pickupAddress}</span>
            </div>
            <div class="trip-detail">
                <span class="trip-detail-label">📍 Drop</span>
                <span class="trip-detail-value">${trip.dropAddress}</span>
            </div>
            <div class="trip-detail">
                <span class="trip-detail-label">🕐 Scheduled</span>
                <span class="trip-detail-value">${formatDateTime(trip.scheduledPickupTime)}</span>
            </div>
            ${trip.goodsDetails ? `
                <div class="trip-detail">
                    <span class="trip-detail-label">📦 Goods</span>
                    <span class="trip-detail-value">${trip.goodsDetails}</span>
                </div>
            ` : ''}

            <div class="mt-12">
                ${actionButtons}
            </div>
        </div>
    `;
}

async function markPickupCompleted(tripId) {
    if (!confirm('Mark pickup as completed?')) return;

    const response = await apiCall('markPickupCompleted', {
        tripId: tripId,
        driverId: appState.userId
    });

    if (response && response.success) {
        showNotification('Pickup completed! Now start delivery.', 'success');
        loadDriverDashboard();
    }
}

async function startDelivery(tripId) {
    if (!confirm('Start delivery to drop location?')) return;

    const response = await apiCall('startDelivery', {
        tripId: tripId,
        driverId: appState.userId
    });

    if (response && response.success) {
        showNotification('Delivery started! Navigate to drop location.', 'success');
        loadDriverDashboard();
    }
}

async function completeTrip(tripId) {
    if (!confirm('Complete trip? You will need to submit payment details.')) return;

    const response = await apiCall('completeTrip', {
        tripId: tripId,
        driverId: appState.userId
    });

    if (response && response.success) {
        showNotification('Trip completed! Please submit payment details.', 'success');
        // Show payment modal
        setTimeout(() => {
            showPaymentModal(tripId);
        }, 500);
        loadDriverDashboard();
    }
}

function showPaymentModal(tripId) {
    const paymentHtml = `
        <div class="card">
            <h3 class="card-title">Payment Details</h3>
            <p class="card-subtitle">Submit payment received for this trip</p>
            
            <div class="mt-12">
                <div class="radio-group">
                    <div class="radio-option">
                        <input type="radio" id="paymentUPI" name="paymentMethod" value="UPI" required>
                        <label for="paymentUPI">UPI Transfer</label>
                    </div>
                    <div class="radio-option">
                        <input type="radio" id="paymentCash" name="paymentMethod" value="CASH" required>
                        <label for="paymentCash">Cash</label>
                    </div>
                </div>

                <div class="form-group">
                    <label for="amountReceived">Amount Received (₹) *</label>
                    <input type="number" id="amountReceived" placeholder="0" required>
                </div>

                <div id="upiSection" class="hidden">
                    <div class="form-group">
                        <label for="upiProof">UPI Transaction Screenshot *</label>
                        <div class="file-input-wrapper">
                            <input type="file" id="upiProof" accept="image/*">
                            <label for="upiProof" class="file-label">📸 Tap to upload screenshot</label>
                        </div>
                        <small style="color: var(--text-secondary);">Capture transaction confirmation</small>
                    </div>
                </div>

                <button class="btn btn-success btn-full" onclick="submitPayment('${tripId}')">
                    Submit Payment
                </button>
            </div>
        </div>
    `;

    document.getElementById('tripModalContent').innerHTML = paymentHtml;
    document.getElementById('tripModal').classList.add('active');

    // Show/hide UPI section based on selection
    document.querySelectorAll('input[name="paymentMethod"]').forEach(radio => {
        radio.addEventListener('change', function() {
            const upiSection = document.getElementById('upiSection');
            if (this.value === 'UPI') {
                upiSection.classList.remove('hidden');
            } else {
                upiSection.classList.add('hidden');
            }
        });
    });
}

async function submitPayment(tripId) {
    const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked')?.value;
    const amount = document.getElementById('amountReceived').value;

    if (!paymentMethod || !amount) {
        showNotification('Please select payment method and enter amount', 'error');
        return;
    }

    if (amount <= 0) {
        showNotification('Amount must be greater than 0', 'error');
        return;
    }

    let transactionProof = '';
    
    if (paymentMethod === 'UPI') {
        const fileInput = document.getElementById('upiProof');
        if (!fileInput.files.length) {
            showNotification('Please upload UPI transaction screenshot', 'error');
            return;
        }

        // Read file and convert to base64
        const file = fileInput.files[0];
        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            showNotification('Screenshot must be less than 5MB', 'error');
            return;
        }

        transactionProof = await fileToBase64(file);
    }

    const response = await apiCall('submitPayment', {
        tripId: tripId,
        driverId: appState.userId,
        paymentMethod: paymentMethod,
        amountReceived: amount,
        transactionProof: transactionProof
    });

    if (response && response.success) {
        showNotification('Payment submitted! Waiting for admin verification.', 'success');
        document.getElementById('tripModal').classList.remove('active');
        loadDriverDashboard();
    }
}

async function handleRequestTripApproval() {
    const pickupAddress = document.getElementById('reqPickup').value;
    const dropAddress = document.getElementById('reqDrop').value;
    const scheduledPickupTime = document.getElementById('reqPickupTime').value;
    const expectedDeliveryTime = document.getElementById('reqDeliveryTime').value;
    const goodsDetails = document.getElementById('reqGoods').value;

    if (!pickupAddress || !dropAddress || !scheduledPickupTime) {
        showNotification('Please fill all required fields', 'error');
        return;
    }

    const response = await apiCall('requestTripApproval', {
        driverId: appState.userId,
        pickupAddress,
        dropAddress,
        scheduledPickupTime,
        expectedDeliveryTime,
        goodsDetails
    });

    if (response && response.success) {
        showNotification('Trip approval request submitted! Admin will review soon.', 'success');
        
        // Clear form
        document.getElementById('reqPickup').value = '';
        document.getElementById('reqDrop').value = '';
        document.getElementById('reqPickupTime').value = '';
        document.getElementById('reqDeliveryTime').value = '';
        document.getElementById('reqGoods').value = '';
        
        loadDriverDashboard();
    }
}

// ============================================================================
// MODALS & UI
// ============================================================================

function showTripModal(tripId) {
    const trip = appState.allTrips.find(t => t.tripId === tripId);
    if (!trip) return;

    const html = `
        <div class="card">
            <div class="card-header">
                <div>
                    <div class="card-title">Trip ${trip.tripId}</div>
                    <div class="card-subtitle">${trip.customerId}</div>
                </div>
                <span class="card-badge badge-${trip.tripStatus.toLowerCase().replace(/_/g, '-')}">${formatStatus(trip.tripStatus)}</span>
            </div>

            <div class="trip-detail">
                <span class="trip-detail-label">📍 Pickup</span>
                <span class="trip-detail-value">${trip.pickupAddress}</span>
            </div>
            <a href="https://www.google.com/maps/search/${encodeURIComponent(trip.pickupAddress)}" class="map-button" target="_blank">
                📍 Open Pickup Location
            </a>

            <div class="trip-detail" style="margin-top: 12px;">
                <span class="trip-detail-label">📍 Drop</span>
                <span class="trip-detail-value">${trip.dropAddress}</span>
            </div>
            <a href="https://www.google.com/maps/search/${encodeURIComponent(trip.dropAddress)}" class="map-button" target="_blank">
                📍 Open Drop Location
            </a>

            <div class="trip-detail" style="margin-top: 12px;">
                <span class="trip-detail-label">🕐 Scheduled</span>
                <span class="trip-detail-value">${formatDateTime(trip.scheduledPickupTime)}</span>
            </div>

            ${trip.expectedDeliveryTime ? `
                <div class="trip-detail">
                    <span class="trip-detail-label">🕐 Expected Delivery</span>
                    <span class="trip-detail-value">${formatDateTime(trip.expectedDeliveryTime)}</span>
                </div>
            ` : ''}

            ${trip.goodsDetails ? `
                <div class="trip-detail">
                    <span class="trip-detail-label">📦 Goods</span>
                    <span class="trip-detail-value">${trip.goodsDetails}</span>
                </div>
            ` : ''}

            ${trip.notes ? `
                <div class="trip-detail">
                    <span class="trip-detail-label">📝 Notes</span>
                    <span class="trip-detail-value">${trip.notes}</span>
                </div>
            ` : ''}
        </div>
    `;

    document.getElementById('tripModalContent').innerHTML = html;
    document.getElementById('tripModal').classList.add('active');
}

function showDriverTripModal(tripId) {
    const trip = appState.allTrips.find(t => t.tripId === tripId);
    if (!trip) return;

    const html = `
        <div class="card">
            <div class="card-header">
                <div>
                    <div class="card-title">Trip ${trip.tripId}</div>
                    <div class="card-subtitle">Scheduled: ${formatDateTime(trip.scheduledPickupTime)}</div>
                </div>
                <span class="card-badge badge-${trip.tripStatus.toLowerCase().replace(/_/g, '-')}">${formatStatus(trip.tripStatus)}</span>
            </div>

            <div class="trip-detail">
                <span class="trip-detail-label">📍 Pickup</span>
                <span class="trip-detail-value">${trip.pickupAddress}</span>
            </div>
            <a href="https://www.google.com/maps/search/${encodeURIComponent(trip.pickupAddress)}" class="map-button" target="_blank">
                📍 Navigate to Pickup
            </a>

            <div class="trip-detail" style="margin-top: 12px;">
                <span class="trip-detail-label">📍 Drop</span>
                <span class="trip-detail-value">${trip.dropAddress}</span>
            </div>
            <a href="https://www.google.com/maps/search/${encodeURIComponent(trip.dropAddress)}" class="map-button" target="_blank">
                📍 View Drop Location
            </a>

            ${trip.goodsDetails ? `
                <div class="trip-detail" style="margin-top: 12px;">
                    <span class="trip-detail-label">📦 Goods</span>
                    <span class="trip-detail-value">${trip.goodsDetails}</span>
                </div>
            ` : ''}

            <div class="mt-12">
                <button class="btn btn-primary btn-full" onclick="acceptTrip('${trip.tripId}')">
                    ✓ Accept & Start Trip
                </button>
            </div>
        </div>
    `;

    document.getElementById('tripModalContent').innerHTML = html;
    document.getElementById('tripModal').classList.add('active');
}

async function acceptTrip(tripId) {
    if (!confirm('Accept this trip? You will start immediately.')) return;

    const response = await apiCall('startTrip', {
        tripId: tripId,
        driverId: appState.userId
    });

    if (response && response.success) {
        showNotification('Trip accepted! You are now in transit to pickup location.', 'success');
        document.getElementById('tripModal').classList.remove('active');
        loadDriverDashboard();
    }
}

// ============================================================================
// TAB NAVIGATION
// ============================================================================

function setupTabNavigation() {
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');
            const container = this.closest('.tabs').nextElementSibling;
            
            // Hide all panels
            const panels = container.parentElement.querySelectorAll('.tab-panel');
            panels.forEach(p => p.classList.add('hidden'));

            // Show selected panel
            const selectedPanel = container.parentElement.querySelector('#' + tabName + 'Tab');
            if (selectedPanel) {
                selectedPanel.classList.remove('hidden');
            }

            // Update active tab
            this.parentElement.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
        });
    });
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 3000);
}

function showAlert(elementId, message, type) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = message;
        element.className = `alert alert-${type}`;
        element.classList.remove('hidden');
    }
}

function formatStatus(status) {
    const map = {
        'SCHEDULED': '📅 Scheduled',
        'STARTED': '🚗 Started',
        'PICKUP_COMPLETED': '✓ Pickup Done',
        'IN_TRANSIT': '🚗 In Transit',
        'COMPLETED': '✓ Completed',
        'PENDING_APPROVAL': '⏳ Pending',
        'CANCELLED': '❌ Cancelled'
    };
    return map[status] || status;
}

function formatDateTime(datetime) {
    if (!datetime) return 'N/A';
    const date = new Date(datetime);
    return date.toLocaleDateString('en-IN') + ' ' + date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

async function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// ============================================================================
// INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
        const user = JSON.parse(savedUser);
        appState.user = user.name;
        appState.token = user.token;
        appState.role = user.role;
        appState.userId = user.userId;
        appState.userEmail = user.email;
        
        showScreen('mainScreen');
        loadDashboard();
    }

    // Event Listeners
    document.getElementById('loginBtn').addEventListener('click', handleLogin);
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);

    // Tab navigation
    setupTabNavigation();

    // Admin event listeners
    document.getElementById('createTripBtn')?.addEventListener('click', handleCreateTrip);
    document.getElementById('addCustomerBtn')?.addEventListener('click', () => {
        document.getElementById('customerModal').classList.add('active');
    });
    document.getElementById('saveCustomerBtn')?.addEventListener('click', handleCreateCustomer);
    document.getElementById('generateReportBtn')?.addEventListener('click', handleGenerateReport);

    // Driver event listeners
    document.getElementById('requestApprovalBtn')?.addEventListener('click', handleRequestTripApproval);

    // Modal close buttons
    document.getElementById('closeModalBtn')?.addEventListener('click', () => {
        document.getElementById('tripModal').classList.remove('active');
    });
    document.getElementById('closeCustomerModalBtn')?.addEventListener('click', () => {
        document.getElementById('customerModal').classList.remove('active');
    });

    // Modal close on background click
    document.getElementById('tripModal')?.addEventListener('click', (e) => {
        if (e.target === e.currentTarget) {
            document.getElementById('tripModal').classList.remove('active');
        }
    });
    document.getElementById('customerModal')?.addEventListener('click', (e) => {
        if (e.target === e.currentTarget) {
            document.getElementById('customerModal').classList.remove('active');
        }
    });

    // Online/offline handling
    window.addEventListener('online', () => {
        appState.isOnline = true;
        showNotification('You are back online!', 'success');
    });
    window.addEventListener('offline', () => {
        appState.isOnline = false;
        showNotification('You are offline. Data will sync when online.', 'error');
    });
});
