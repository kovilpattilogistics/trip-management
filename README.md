# 🚚 Trip Management System

A real-time trip management system for commercial vehicle operations. Enables seamless trip scheduling, execution tracking, and payment collection between drivers and admin teams.

**Built with:**
- 📱 **Frontend**: HTML5, CSS3, Vanilla JavaScript (Mobile-first)
- 🔧 **Backend**: Google Apps Script (Serverless)
- 📊 **Database**: Google Sheets (Zero-cost)
- 🌐 **Hosting**: GitHub Pages (Free)
- 🔔 **Notifications**: Service Worker Push API (Free)

---

## ✨ Features

### Admin/Accounts Team
- ✅ **Trip Management**: Create, publish, and track trips
- ✅ **Real-time Dashboard**: View trip status (Scheduled → Completed)
- ✅ **Customer Management**: Create and manage customer profiles
- ✅ **Payment Tracking**: Verify UPI screenshots and cash payments
- ✅ **Reports**: Daily/weekly trip and payment reports
- ✅ **Notifications**: Real-time alerts for trip status changes

### Driver
- ✅ **Trip Acceptance**: View assigned trips and accept with one click
- ✅ **Navigation**: Direct integration with Google Maps
- ✅ **Trip Execution**: 5-step workflow (Scheduled → Pickup → In Transit → Completed)
- ✅ **Payment Collection**: UPI screenshot capture or manual cash entry
- ✅ **Trip Requests**: Driver can request approval for custom trips
- ✅ **Offline Support**: Data syncs automatically when online

### System Features
- ✅ **Mobile-Optimized**: Responsive design for all phones
- ✅ **Offline-First**: Works without internet (Service Worker caching)
- ✅ **Zero Cost**: Google Sheets + Apps Script + GitHub Pages
- ✅ **Instant Notifications**: Push alerts for both admin and drivers
- ✅ **Secure Login**: Email/Phone + Password authentication
- ✅ **Error Handling**: Network failures, file uploads, edge cases

---

## 🚀 Quick Start (5 Minutes)

### Prerequisites
- Google Account (for Sheets & Apps Script)
- GitHub Account (for hosting)
- Web browser on mobile phone

### Step 1: Setup Google Sheets Database

1. Create a new Google Sheet (name it `TripManagementDB`)
2. Create these tabs: `Drivers`, `Admins`, `Customers`, `Trips`, `Payments`, `Logs`
3. Copy the schema from `EXCEL-SCHEMA.md` into each tab
4. Add initial data:
   ```
   Drivers Tab:
   - driverId: DR001
   - driverName: John Sharma
   - driverEmail: john.driver@gmail.com
   - driverPhone: 9876543210
   - password: Driver@123
   
   Admins Tab:
   - adminId: AD001
   - adminName: Rajesh Kumar
   - adminEmail: rajesh.admin@gmail.com
   - adminPhone: 9123456789
   - password: Admin@123
   ```

### Step 2: Setup Google Apps Script

1. Open your Google Sheet
2. Go to **Extensions → Apps Script**
3. Delete the default code
4. Copy code from `gas-script.js`
5. Click **Deploy → New Deployment**
   - Type: **Web app**
   - Execute as: Your account
   - Who has access: **Anyone**
6. Copy the deployment URL

### Step 3: Deploy to GitHub Pages

1. Create new GitHub repository: `trip-management-app`
2. Make it **PUBLIC**
3. Clone: `git clone https://github.com/YOUR_USERNAME/trip-management-app.git`
4. Copy these files:
   - `index.html`
   - `app.js`
   - `service-worker.js`
   - `config.js`
   - `manifest.json`

5. In `config.js`, update:
   ```javascript
   API_URL: 'https://script.google.com/macros/d/YOUR_SCRIPT_ID/usercallable'
   ```

6. Push to GitHub:
   ```bash
   git add .
   git commit -m "Initial commit: Trip management app"
   git push origin main
   ```

7. Go to **Settings → Pages**
   - Source: `main` branch
   - Save

8. Your app is live at: `https://YOUR_USERNAME.github.io/trip-management-app/`

---

## 📱 Demo Credentials

**Admin Account:**
- Email: `rajesh.admin@gmail.com`
- Password: `Admin@123`

**Driver Account:**
- Email: `john.driver@gmail.com`
- Password: `Driver@123`

---

## 📊 Architecture

```
┌─────────────────────────────────────────────────────┐
│           Driver/Admin Mobile Browser               │
│  (index.html + app.js + Service Worker)             │
└────────────────────┬────────────────────────────────┘
                     │ HTTP POST (JSON)
                     ↓
         ┌──────────────────────────┐
         │  Google Apps Script      │
         │  (Backend API)           │
         │  - Authentication        │
         │  - Trip Management       │
         │  - Payment Processing    │
         │  - Logging               │
         └────────────┬─────────────┘
                      │ Read/Write
                      ↓
         ┌──────────────────────────┐
         │  Google Sheets           │
         │  - Drivers               │
         │  - Admins                │
         │  - Customers             │
         │  - Trips                 │
         │  - Payments              │
         │  - Logs                  │
         └──────────────────────────┘
```

---

## 🔄 Trip Workflow

### Admin Creates Trip
```
1. Login to app
2. Dashboard → Create Trip Tab
3. Enter: Customer, Pickup Address, Drop Address, Time
4. Click "Create Trip"
5. Trip assigned to Driver automatically
6. Admin gets real-time notification when driver starts
```

### Driver Executes Trip
```
1. Login to app
2. See "Available Trips"
3. Click trip → Opens details with Google Maps
4. Click "Accept & Start Trip"
5. Navigate to pickup location
6. Click "Reached Pickup" after collecting goods
7. Click "Start Delivery"
8. Navigate to drop location
9. Click "Complete Delivery"
10. Upload UPI screenshot or enter cash amount
11. Submit → Trip complete, payment pending admin verification
```

### Admin Verifies Payment
```
1. Dashboard shows completed trip
2. Click trip details
3. View payment proof (UPI screenshot)
4. Manually verify in Google Sheets
5. Update payment status to "VERIFIED"
```

---

## 🗂️ File Structure

```
trip-management-app/
├── index.html              # Main app UI (complete single file)
├── app.js                  # Frontend logic & API calls
├── service-worker.js       # Offline support & notifications
├── config.js               # API configuration
├── manifest.json           # PWA manifest
├── gas-script.js           # Google Apps Script backend
├── SETUP-GUIDE.md          # Detailed setup instructions
├── EXCEL-SCHEMA.md         # Database schema documentation
└── README.md              # This file
```

---

## 🔐 Authentication

All credentials stored in Google Sheets (Phase 1 only):

**Drivers Sheet Columns:**
- driverId, driverName, driverEmail, driverPhone, password, status, joinDate

**Admins Sheet Columns:**
- adminId, adminName, adminEmail, adminPhone, password, role, department, joinDate

**For Phase 2:** Migrate to Google OAuth or Firebase Auth

---

## 📊 Database Schema

### Trips Table
| Column | Type | Purpose |
|--------|------|---------|
| tripId | String | Unique trip identifier |
| customerId | String | Reference to customer |
| driverId | String | Assigned driver |
| pickupAddress | String | Full pickup address |
| dropAddress | String | Full drop address |
| tripStatus | Enum | SCHEDULED, STARTED, PICKUP_COMPLETED, IN_TRANSIT, COMPLETED |
| scheduledPickupTime | DateTime | When driver should start |
| pickupCompletedTime | DateTime | When goods collected |
| deliveryStartTime | DateTime | When delivery journey started |
| completedTime | DateTime | When delivered |

### Payments Table
| Column | Type | Purpose |
|--------|------|---------|
| paymentId | String | Unique payment ID |
| tripId | String | Reference to trip |
| driverId | String | Driver who received payment |
| paymentMethod | Enum | UPI, CASH |
| amountReceived | Number | Payment amount |
| transactionProof | String | Base64 image or Google Drive link |
| paymentStatus | Enum | PENDING, VERIFIED, REJECTED |

---

## 🌐 API Endpoints

All API calls go to Google Apps Script:

### Authentication
```javascript
// Login
POST {API_URL}
{
  "action": "login",
  "params": {
    "email": "rajesh.admin@gmail.com",
    "password": "Admin@123"
  }
}
```

### Admin Actions
```javascript
// Get dashboard stats
"action": "getAdminDashboard"

// Create trip
"action": "createTrip",
"params": { customerId, pickupAddress, dropAddress, scheduledPickupTime, ... }

// Get all trips
"action": "getAllTrips"

// Get trip details
"action": "getTripDetails",
"params": { "tripId": "TRIP001" }
```

### Driver Actions
```javascript
// Get driver's trips
"action": "getDriverTrips",
"params": { "driverId": "DR001" }

// Start trip
"action": "startTrip",
"params": { "tripId": "TRIP001", "driverId": "DR001" }

// Complete trip
"action": "completeTrip",
"params": { "tripId": "TRIP001", "driverId": "DR001" }

// Submit payment
"action": "submitPayment",
"params": { "tripId": "TRIP001", "paymentMethod": "UPI", "amountReceived": 2500, ... }
```

---

## ⚙️ Configuration

Edit `config.js`:

```javascript
const CONFIG = {
    // Your Google Apps Script deployment URL
    API_URL: 'https://script.google.com/macros/d/YOUR_SCRIPT_ID/usercallable',
    
    // App version
    VERSION: '1.0.0',
    
    // Features
    FEATURES: {
        OFFLINE_SUPPORT: true,      // Cache requests when offline
        PUSH_NOTIFICATIONS: true,    // Show notifications
        GPS_TRACKING: true          // Use geolocation
    },
    
    // API timeout
    API_TIMEOUT: 30000,
    
    // Retry failed requests
    RETRY: {
        MAX_ATTEMPTS: 3,
        DELAY: 1000
    }
};
```

---

## 🚨 Error Handling & Edge Cases

### Network Failures
- ✅ Offline detection with automatic retry
- ✅ Data queuing when offline, sync when online
- ✅ User-friendly error messages
- ✅ Automatic connection recovery

### Upload Failures
- ✅ File size validation (5MB limit)
- ✅ Automatic retry (3 attempts)
- ✅ Progress indicator
- ✅ User can manually retry

### Session/Auth Errors
- ✅ Token validation on each request
- ✅ Auto-logout on invalid token
- ✅ Permission denied handling
- ✅ Login screen redirect

### Google Sheets Quota
- ✅ Rate limiting: 500 requests/100 seconds per project
- ✅ Solution: Batch operations, request caching
- ✅ Monitor: Check Execution logs in Apps Script

### Payment Edge Cases
- ✅ Duplicate payment rejection
- ✅ Invalid amount validation
- ✅ Missing proof detection
- ✅ Trip already completed check

### Browser Compatibility
- ✅ Chrome/Android (Recommended)
- ✅ Firefox (Full support)
- ✅ Safari 15+ (Limited geolocation)
- ✅ Edge (Full support)

---

## 📈 Performance Tips

1. **Reduce API Calls**: Batch operations when possible
2. **Cache Data**: Service Worker caches successful responses
3. **Optimize Images**: Keep screenshot size < 5MB
4. **Lazy Load**: Load data on demand, not all at once
5. **Monitor Sheet Size**: Archive old trips/payments quarterly

---

## 🔄 Updates & Maintenance

### To Update App Code
```bash
# Edit index.html / app.js
git add .
git commit -m "v1.1: Added feature X"
git push origin main
# Changes live in 2-3 minutes
```

### To Update Backend
1. Edit `gas-script.js` in Apps Script editor
2. Click **Deploy → New Deployment**
3. Update `config.js` with new URL
4. Push to GitHub

### To Backup Data
1. Google Sheets → File → Download → Excel (.xlsx)
2. Save locally every week
3. Consider setting up Google Sheets backup automation

---

## 🐛 Troubleshooting

### App Not Loading
- Clear browser cache: `Ctrl+Shift+Delete`
- Check GitHub Pages settings
- Verify `config.js` API_URL is correct

### Google Apps Script Errors
- Open Apps Script → Execution logs
- Check for authorization errors
- Verify sheet names match exactly (case-sensitive)

### Notifications Not Working
- Check browser notification permissions
- Service Worker must be registered (F12 → Application)
- Only works on HTTPS (GitHub Pages is HTTPS ✓)

### Payment Upload Fails
- Check file size (max 5MB)
- Verify file format (JPG, PNG supported)
- Check internet connection
- Try again after 30 seconds

---

## 📞 Support

### Documentation
- **Setup Guide**: See `SETUP-GUIDE.md`
- **Database Schema**: See `EXCEL-SCHEMA.md`
- **Code Comments**: Check inline comments in files

### Common Issues
1. **API returns 403**: Check Apps Script deployment permissions
2. **Sheets returns error**: Verify sheet tab names are exact
3. **Payment screenshot blank**: Browser may not support FileReader API
4. **GPS not working**: Check location permissions in browser settings

---

## 🚀 Phase 2 Roadmap

- [ ] Multiple drivers management
- [ ] Real-time GPS tracking with map updates
- [ ] Multi-language support (Hindi, English, etc.)
- [ ] Payment gateway integration (Razorpay/Stripe)
- [ ] SMS notifications (Twilio)
- [ ] Trip route optimization
- [ ] Driver performance analytics
- [ ] Customer mobile app
- [ ] Subscription billing module
- [ ] Database migration to PostgreSQL

---

## 📜 License

This is a custom-built system for commercial vehicle operations. Modify and use as needed for your business.

---

## 👥 Contributors

Built with 🔥 for real-world logistics operations.

---

**Last Updated:** December 31, 2025  
**Version:** 1.0  
**Status:** ✅ Production Ready for Phase 1
