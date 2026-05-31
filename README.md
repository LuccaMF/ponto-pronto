# TimeTrack ⏱

A web application for tracking employee work hours and project assignments, built with React and Firebase.

## Features

- 🔐 Role-based authentication (Admin & Employee)
- ⏱ Clock-in/clock-out with project and location selection (office or external site)
- 📊 Admin dashboard with per-employee hours summary
- 🔴 Automatic overtime detection (outside 08:00–18:00)
- 📋 Full records history with filtering by employee
- 🏗 Project management (create, edit, archive, delete)
- 👥 Employee management panel
- 📄 Monthly PDF reports with normal vs. overtime breakdown

## Tech Stack

- **Frontend:** React.js
- **Backend/Database:** Firebase (Authentication + Firestore)
- **Styling:** Inline styles with a consistent design system

## Getting Started

```bash
git clone https://github.com/your-username/timetrack.git
cd timetrack
npm install
npm start
```

> Configure your own Firebase project and update `src/firebase.js` with your credentials.