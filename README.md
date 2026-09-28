# 🏙️ Smart City Citizen System Portal

A comprehensive, production-ready Full-Stack **Smart City Citizen Service & Municipal E-Governance Platform**.

This platform bridges citizens and municipal authorities, providing digital municipal services including **City 311 Grievance Redressal**, **Utility Bills & Instant Online Payments**, **Citizen Certificates & Permits**, **Real-Time Urban Mobility & Smart Parking**, **Civic Referendums & Polls**, and a **Municipal Administration & Department Dispatch Console**.

---

## 🌟 Key Architecture & Capabilities

### 1. 🖥️ Frontend (Citizen & Official Interfaces)
* **Responsive HTML5 / Modern CSS3 & Vanilla JavaScript (ES6+)**:
  * Clean, accessible UI following modern web guidelines (48px touch targets, contrast compliance, logical properties).
  * Dark & Light theme switcher with local storage persistence.
  * Native Toast notifications, accessible modals, and animated progress timelines.
* **Interactive City GIS Incident Map (Leaflet.js & OpenStreetMap)**:
  * Public incident tracking across city wards (Potholes, water leaks, sanitation bins, smart parking decks).
* **Citizen Self-Service Dashboard (`/citizen`)**:
  * **City 311 Grievance Redressal**: File civic complaints with photo evidence, ward tagging, GPS geolocation, and 5-stage live status tracking (`Submitted` ➔ `Under Review` ➔ `In Progress` ➔ `Resolved`).
  * **Citizen Feedback**: 5-star rating and comment submission upon resolution.
  * **Utility Bills & Instant Payments**: View electricity, water, and property tax dues. Integrated mock payment gateway (UPI, Credit/Debit Card, NetBanking) with instant printable receipt generation (`window.print()`).
  * **E-Permits & Vital Records**: Apply for Birth/Death Certificates, Trade License Renewals, and Public Event Permits. View and print approved digital certificates with verification IDs.
  * **Smart Mobility**: Real-time multi-level parking deck availability with capacity progress bars, EV hub finder, and live public transit bus & metro schedules.
  * **Civic Referendums**: Vote in municipal civic polls with live percentage vote calculations.
* **Municipal Administration & Department Officer Console (`/admin`)**:
  * **Executive KPIs & Analytics**: Resolution rates, total revenues collected, open grievances.
  * **Chart.js Visualizations**: Grievance breakdown by department category (Doughnut chart) and ward distribution (Bar chart).
  * **Grievance Dispatcher**: Filter by status/category/ward, reassign department officers, update lifecycle status, and append internal resolution notes.
  * **E-Permits Approvals**: Review and approve/reject permit applications with auto-generated certificate IDs.
  * **Emergency Broadcast Publisher**: Broadcast urgent weather alerts, flood warnings, or civic maintenance notices.
  * **Citizen Master Directory**: View registered citizen accounts and ward locations.

---

### 2. ⚙️ Backend & API Engine
* **Node.js & Express.js Framework**:
  * Modular RESTful API architecture.
  * JWT (JSON Web Token) authentication with bearer token validation.
  * Password security using industry-standard `bcryptjs` salt hashing.
  * Multipart file uploads for complaint photo evidence using `multer`.
  * Role-based access control (`citizen`, `officer`, `admin`).

---

### 3. 🗄️ Database Management
* **SQLite (via Node.js Native `node:sqlite`)**:
  * Zero-configuration, lightning-fast synchronous SQLite storage in `smart_city.db`.
  * Pre-seeded with realistic municipal demo data (grievances, bills, permits, polls, parking).
* **Universal SQL Schema (`schema.sql`)**:
  * Fully compatible with **MySQL** and **PostgreSQL** if enterprise database migration is preferred.

---

## 🚀 Quick Start Guide

### Prerequisites
* [Node.js](https://nodejs.org/) (v18, v20, v22, or v24)
* npm (comes bundled with Node.js)

### Step 1: Install Dependencies
Open PowerShell or Terminal in the project root folder and execute:
```bash
npm install
```

### Step 2: Start the Server
```bash
npm start
```
*Or on Windows, simply double-click `start.bat`!*

### Step 3: Open in Browser
* **Public City Portal & Landing Page:** [http://localhost:3000](http://localhost:3000)
* **Citizen Self-Service Dashboard:** [http://localhost:3000/citizen](http://localhost:3000/citizen)
* **Admin & Officer Dispatch Portal:** [http://localhost:3000/admin](http://localhost:3000/admin)

---

## 🔑 Pre-Seeded Demo Credentials

You can use the **1-Click Instant Demo Login** buttons on the login modal or enter the credentials below:

| Role | Email Address | Password | Department / Ward |
| :--- | :--- | :--- | :--- |
| **Citizen** | `citizen@smartcity.gov` | `citizen123` | Priya Sundaram (Ward 1 - Central Zone) |
| **Municipal Officer** | `officer@smartcity.gov` | `officer123` | Eng. Anita Desai (Public Works Dept) |
| **Municipal Admin** | `admin@smartcity.gov` | `admin123` | Commissioner Rajesh Sharma (City HQ) |

*(You can also click **Register** to create a brand new citizen account!)*

---

## 📂 Project Directory Structure

```text
smart-city-citizen-system-portal/
├── server.js                     # Express REST API server & routing
├── database.js                   # SQLite database setup & seed data
├── schema.sql                    # SQL DDL for SQLite, MySQL & PostgreSQL
├── package.json                  # Dependencies and execution scripts
├── start.bat                     # 1-Click launcher script for Windows
├── smart-city-citizen-portal.zip # Packaged distribution ZIP archive
├── uploads/                      # Grievance photo attachments
├── public/                       # Web frontend assets
│   ├── index.html                # Landing page with interactive GIS map
│   ├── citizen-dashboard.html    # Full-featured Citizen Dashboard
│   ├── admin-dashboard.html      # Municipal Admin & Officer Portal
│   ├── css/
│   │   └── style.css             # Modern stylesheet, accessible forms, responsive layout
│   └── js/
│       ├── common.js             # API fetch wrapper, toasts, modals, theme toggler
│       ├── auth.js               # JWT login, registration, quick demo buttons
│       ├── citizen.js            # Grievance filing, bill payments, permits, mobility
│       └── admin.js              # Analytics, Chart.js, complaints dispatch, broadcasts
└── README.md                     # Comprehensive documentation
```

---

## 📡 REST API Reference Summary

### Authentication (`/api/auth`)
* `POST /api/auth/register` - Create new citizen profile
* `POST /api/auth/login` - Authenticate user & return JWT token
* `GET  /api/auth/me` - Fetch profile of logged-in user
* `PUT  /api/auth/profile` - Update address, phone, and ward

### Grievances / City 311 (`/api/complaints`)
* `GET  /api/complaints` - Fetch grievances (filtered by status/category/ward)
* `GET  /api/complaints/:id` - Fetch complaint details with full activity audit trail
* `POST /api/complaints` - Lodge new grievance with photo attachment
* `PUT  /api/complaints/:id/status` - (Officer/Admin) Update status, assign officer & notes
* `POST /api/complaints/:id/feedback` - (Citizen) Submit 1-5 star satisfaction rating

### Utility Bills (`/api/bills`)
* `GET  /api/bills` - Fetch citizen's unpaid and paid utility bills
* `POST /api/bills/pay/:id` - Simulate secure instant payment & generate official receipt

### Permits & Certificates (`/api/permits`)
* `GET  /api/permits` - View permit applications
* `POST /api/permits` - Apply for Birth Certificate, Trade License, Event Permit
* `PUT  /api/permits/:id/status` - (Officer/Admin) Approve/Reject with certificate ID

### Mobility & Transit (`/api/mobility`)
* `GET /api/mobility/parking` - Live parking lots and available spot counts
* `GET /api/mobility/transit` - High-frequency electric bus & metro live ETAs

### Civic Polls (`/api/polls`)
* `GET  /api/polls` - Active municipal polls & live vote counts
* `POST /api/polls/:id/vote` - Cast authenticated vote in a poll

### Municipal Admin Telemetry (`/api/admin/stats`)
* `GET /api/admin/stats` - Departmental KPIs, resolution percentages, and financial metrics
* `GET /api/admin/users` - Master list of registered citizens

---

## 📄 License
This project is open-source and licensed under the **MIT License**.
