# SAFEWORK Mobile App

## 📱 Two Ways to Use This App

### Option 1: Web App (Works on Mobile Browser Too!)
**No install needed** — just run the server and open in browser:

```bash
# From the main hackathon folder:
node backend/server.js
```

Then open **http://YOUR_IP:5000** on any phone/computer on same WiFi.

Features:
- ✅ Login/Register with email+password
- ✅ SOS with GPS location
- ✅ Audio/Video evidence recording
- ✅ Complaints with case tracking
- ✅ SOS History with map links
- ✅ Email alerts sent to 2k23cse176@kiot.ac.in
- ✅ All data stored in SQLite database
- ✅ **Install as PWA** — Chrome will show "Add to Home Screen"

### Option 2: React Native Mobile App (Expo)
For a **standalone APK** or **Expo Go** app:

```bash
# 1. Go to mobile folder
cd safework-mobile

# 2. Install dependencies (already done)
npm install

# 3. Start Expo
npx expo start

# 4. Scan QR code with Expo Go app (Android Play Store / iOS App Store)
```

## How to Build Standalone APK
```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo (free account at expo.dev)
eas login

# Build Android APK
eas build -p android --profile preview
```

## Hosting
**NO hosting needed!** SQLite is file-based. The app runs on:
- **Your computer** → Share your IP with others on same WiFi
- **Your phone** → Fully offline mobile app (Expo)

## Features
- User Authentication (SQLite)
- SOS Emergency with GPS + Audio/Video evidence
- Complaint Filing with case ID tracking
- SOS History with Google Maps links
- Live Location Tracking every 2 minutes
- Chatbot Assistant
- Email notifications to 2k23cse176@kiot.ac.in