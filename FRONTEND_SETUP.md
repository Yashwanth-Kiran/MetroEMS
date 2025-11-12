# MetroEMS Frontend Setup & Run Guide

## Prerequisites

Before running the frontend, make sure you have:
- **Node.js** installed (version 14 or higher recommended)
- **npm** (comes with Node.js)

### Check if Node.js is installed:
```bash
node --version
npm --version
```

If not installed, download from: https://nodejs.org/

---

## Step-by-Step Setup

### 1. Navigate to Frontend Directory
```bash
cd /home/varam/project/MetroEMS/MetroEMS-main
```

### 2. Install Dependencies (First Time Only)
```bash
npm install
```

This will install all required packages:
- React & React DOM (v19.1.1)
- React Router DOM (v7.7.1)
- Recharts (v3.2.1) - for charts
- Lucide React (v0.532.0) - for icons
- Tailwind CSS (v3.4.17) - for styling
- And other dependencies

**Note**: This may take a few minutes the first time.

### 3. Start the Development Server
```bash
npm start
```

This will:
- Compile the React application
- Start a development server
- Automatically open your browser to `http://localhost:3000`
- Enable hot-reload (changes auto-refresh)

---

## What to Expect

### Terminal Output:
```
Compiled successfully!

You can now view frontend in the browser.

  Local:            http://localhost:3000
  On Your Network:  http://192.168.x.x:3000

Note that the development build is not optimized.
To create a production build, use npm run build.

webpack compiled successfully
```

### Browser:
- Opens automatically to `http://localhost:3000`
- You'll see the **Login Page**
- Backend status indicator will show if backend is connected

---

## Available npm Scripts

### Start Development Server
```bash
npm start
```
- Runs on: `http://localhost:3000`
- Hot-reload enabled
- Development mode (with debugging)

### Build for Production
```bash
npm run build
```
- Creates optimized production build in `build/` folder
- Minified and optimized for deployment

### Run Tests
```bash
npm test
```
- Runs the test suite
- Interactive watch mode

---

## Troubleshooting

### Problem: Port 3000 Already in Use
**Error**: `Something is already running on port 3000`

**Solution**:
```bash
# Option 1: Kill the process using port 3000
lsof -ti:3000 | xargs kill -9

# Option 2: Use a different port
PORT=3001 npm start
```

### Problem: Module Not Found Errors
**Error**: `Module not found: Can't resolve 'react'` or similar

**Solution**:
```bash
# Delete node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Reinstall dependencies
npm install
```

### Problem: Tailwind CSS Not Working
**Error**: Styles not applying

**Solution**:
```bash
# Make sure tailwind.config.js and postcss.config.js exist
ls tailwind.config.js postcss.config.js

# Restart the dev server
npm start
```

### Problem: Compilation Errors
**Error**: Syntax errors or compilation failures

**Solution**:
1. Check the terminal for specific error messages
2. Make sure all imports are correct
3. Clear cache and restart:
```bash
rm -rf node_modules/.cache
npm start
```

---

## Running Frontend + Backend Together

### Option 1: Two Terminals (Recommended)

**Terminal 1 - Backend:**
```bash
cd /home/varam/project/MetroEMS/Backend_for_station_Radios
python real_backend.py
# or
python3 real_backend.py
```

**Terminal 2 - Frontend:**
```bash
cd /home/varam/project/MetroEMS/MetroEMS-main
npm start
```

### Option 2: Using tmux or screen
```bash
# Install tmux if not installed
sudo apt install tmux

# Start tmux session
tmux new -s metroems

# Split window (Ctrl+B then ")
# In first pane: run backend
# In second pane: run frontend
```

---

## Environment Configuration

### Backend API URL
The frontend connects to backend at `http://localhost:8000` by default.

To change this, update `/src/services/apiService.js`:
```javascript
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
```

Or set environment variable:
```bash
REACT_APP_API_URL=http://your-backend-ip:8000 npm start
```

---

## Testing the Transcoder Dashboard

1. **Start Backend**:
   ```bash
   cd Backend_for_station_Radios
   python real_backend.py
   ```

2. **Start Frontend**:
   ```bash
   cd MetroEMS-main
   npm start
   ```

3. **Access Application**:
   - Open browser to `http://localhost:3000`
   - Login (or click "Demo Mode")
   - Click **"Transcoder"** card
   - Click on a discovered transcoder device
   - You'll see the new Transcoder detail UI!

---

## Quick Start Commands (Copy-Paste)

### First Time Setup:
```bash
cd /home/varam/project/MetroEMS/MetroEMS-main
npm install
npm start
```

### Daily Development:
```bash
# Terminal 1
cd /home/varam/project/MetroEMS/Backend_for_station_Radios
python real_backend.py

# Terminal 2
cd /home/varam/project/MetroEMS/MetroEMS-main
npm start
```

---

## Stopping the Servers

### Stop Frontend:
- Press `Ctrl + C` in the terminal running `npm start`

### Stop Backend:
- Press `Ctrl + C` in the terminal running `python real_backend.py`

---

## Production Deployment

### Build Production Files:
```bash
npm run build
```

This creates a `build/` folder with optimized files.

### Serve Production Build:
```bash
# Option 1: Using serve package
npx serve -s build -l 3000

# Option 2: Using python http server
cd build
python -m http.server 3000
```

---

## Development Tips

### Hot Reload
- Save any file → Browser auto-refreshes
- Works for JS, CSS, and component changes

### Browser Developer Tools
- Press `F12` to open DevTools
- Check Console for errors
- Network tab shows API calls
- React DevTools extension recommended

### Code Formatting
```bash
# Optional: Install prettier for code formatting
npm install --save-dev prettier
npx prettier --write "src/**/*.{js,jsx,json,css}"
```

---

## File Structure
```
MetroEMS-main/
├── public/              # Static files
│   ├── index.html       # Main HTML file
│   └── favicon.ico      # App icon
├── src/                 # Source code
│   ├── components/      # React components
│   │   ├── Dashboard.jsx
│   │   ├── DeviceManagement.jsx
│   │   ├── TranscoderDetail.jsx  ← NEW!
│   │   └── DeviceSummary.jsx
│   ├── pages/           # Page components
│   │   ├── LoginPage.jsx
│   │   └── MonitoringPage.jsx
│   ├── services/        # API services
│   │   └── apiService.js
│   ├── schema/          # Data schemas
│   │   └── deviceSchemas.js
│   ├── App.js           # Main app component
│   ├── index.js         # Entry point
│   └── index.css        # Global styles
├── package.json         # Dependencies
├── tailwind.config.js   # Tailwind config
└── postcss.config.js    # PostCSS config
```

---

## Next Steps After Starting

1. ✅ Frontend runs on `http://localhost:3000`
2. ✅ Backend runs on `http://localhost:8000`
3. ✅ Login to dashboard
4. ✅ Discover devices
5. ✅ Click Transcoder → See new UI!

---

## Support

If you encounter issues:
1. Check terminal for error messages
2. Check browser console (F12)
3. Verify backend is running
4. Clear browser cache
5. Restart both frontend and backend

Happy coding! 🚀
