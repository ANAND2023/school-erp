# School ERP - React Native (Expo) Mobile App

Isolated, cross-platform mobile application for **School ERP**, built using **React Native** & **Expo SDK 58**.

---

## 📱 Features Included
1. **Authentication & Session Management**:
   - Secure login with JWT Token stored in `AsyncStorage`.
   - Seamless token injection with `X-Branch-Id` and `X-Academic-Year` in all requests.
   - Built-in server environment selector (toggle between **Live Render Cloud** and **Local Wi-Fi PC**).
2. **Dashboard Overview**:
   - Real-time statistics: Total Passes Today, Currently Out, Returned, Total All.
   - Recent passes quick list with color-coded status badges.
   - Quick one-tap shortcut to **Issue Gate Pass**.
3. **Student Gate Pass Module**:
   - **Student Search**: Real-time debounce search by student name, roll number, or admission number. Auto-populates student details and father name/contact.
   - **Escort Information**: Relationship options (Father, Mother, Guardian, Driver, Walker, etc.), Escort name, and mobile number.
   - **Live Photo Capture**:
     - Take live photo using device camera (`expo-image-picker`).
     - Choose escort photo from device photo library.
     - Live preview with retake and remove actions.
   - **Departure & Return Times**: Out time, expected return time, reason selector chips, and detailed notes.
4. **Gate Pass Register & Status Management**:
   - Filter by tabs: *All*, *Out / Departed*, *Returned*, *Cancelled*.
   - View complete digital pass slip.
   - One-tap status updates:
     - Mark as **Departed** (when student leaves campus).
     - Mark as **Returned** (when student returns to school).
     - Cancel Pass with remarks.
   - One-tap direct phone call button to escort.

---

## 🚀 How to Run the Mobile App

### Step 1: Open Terminal in `mobile/`
```bash
cd mobile
```

### Step 2: Start Expo Development Server
```bash
npx expo start
```
*(or `npm start`)*

### Step 3: Run on Your Phone
1. Install the free **Expo Go** app on your phone:
   - **Android**: [Google Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)
   - **iOS**: [Apple App Store](https://apps.apple.com/app/expo-go/id982107779)
2. Open **Expo Go** and scan the QR code displayed in your terminal.
3. The app will immediately load on your phone!

---

## 🌐 Connecting to Backend API

When you open the login screen, you can tap on the **Server:** status row to switch between:
1. **Live Cloud (Render)**:
   - `https://school-erp-api-fdjr.onrender.com/api` (Default - works anywhere on mobile internet/4G/5G).
2. **Local PC (Wi-Fi LAN)**:
   - `http://192.168.1.2:5171/api` (Works when your phone and PC are connected to the same Wi-Fi).
3. **Custom URL**:
   - Enter any IP or domain.

---

## 📁 File Structure
```
mobile/
├── assets/                  # Icons & splash images
├── src/
│   ├── api/
│   │   └── client.js        # Axios instance, interceptors, Gate Pass & Auth APIs
│   ├── context/
│   │   └── AuthContext.js   # Global auth state, session loading, login/logout
│   ├── navigation/
│   │   └── AppNavigator.js  # React Navigation Native Stack
│   └── screens/
│       ├── LoginScreen.js          # Clean login UI with server selector
│       ├── HomeScreen.js           # Dashboard with stats & quick actions
│       ├── GatePassListScreen.js   # Filterable list of student gate passes
│       ├── IssueGatePassScreen.js  # Form with live student search & camera photo capture
│       └── GatePassDetailScreen.js # Digital slip with Departed/Returned actions & direct phone call
├── App.js                   # Application root with providers
├── app.json                 # Expo project configuration & camera permissions
└── package.json             # Mobile dependencies
```
