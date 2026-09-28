-- =====================================================================
-- Smart City Citizen System Portal
-- Database Schema for MySQL / PostgreSQL / SQLite
-- =====================================================================

-- 1. Users Table (Citizens, Department Officers, Municipal Admins)
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(120) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(30),
    national_id VARCHAR(50),
    role VARCHAR(20) DEFAULT 'citizen', -- 'citizen', 'officer', 'admin'
    department VARCHAR(80),             -- 'Public Works', 'Water Board', 'Electricity', 'Sanitation', etc.
    address TEXT,
    ward VARCHAR(50) DEFAULT 'Ward 1 - Central Zone',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Complaints / Grievance Redressal (City 311)
CREATE TABLE IF NOT EXISTS complaints (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_no VARCHAR(40) NOT NULL UNIQUE,
    user_id INTEGER NOT NULL,
    title VARCHAR(200) NOT NULL,
    category VARCHAR(60) NOT NULL,       -- Roads, Sanitation, Water, Electricity, Transport, etc.
    description TEXT NOT NULL,
    ward VARCHAR(80) NOT NULL,
    landmark VARCHAR(150),
    latitude REAL,
    longitude REAL,
    priority VARCHAR(20) DEFAULT 'medium', -- low, medium, high, emergency
    status VARCHAR(30) DEFAULT 'submitted', -- submitted, under_review, in_progress, resolved, rejected
    assigned_to VARCHAR(100),
    department VARCHAR(80),
    image_url VARCHAR(255),
    resolution_notes TEXT,
    rating INTEGER,
    feedback TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. Complaint Activity Timeline / Audit Trail
CREATE TABLE IF NOT EXISTS complaint_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    complaint_id INTEGER NOT NULL,
    action VARCHAR(80) NOT NULL,
    notes TEXT,
    performed_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE
);

-- 4. Municipal Utility Bills & Payments
CREATE TABLE IF NOT EXISTS bills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bill_no VARCHAR(40) NOT NULL UNIQUE,
    user_id INTEGER NOT NULL,
    utility_type VARCHAR(50) NOT NULL,   -- electricity, water, property_tax, sanitation
    amount REAL NOT NULL,
    billing_period VARCHAR(50),
    due_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'unpaid', -- unpaid, paid
    payment_date TIMESTAMP,
    transaction_ref VARCHAR(60),
    payment_method VARCHAR(40),          -- Card, UPI, NetBanking
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 5. Citizen Permits & Certificates (E-Governance Services)
CREATE TABLE IF NOT EXISTS permits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    application_no VARCHAR(40) NOT NULL UNIQUE,
    user_id INTEGER NOT NULL,
    permit_type VARCHAR(60) NOT NULL,    -- birth_certificate, trade_license, construction_permit, event_permit
    applicant_name VARCHAR(120) NOT NULL,
    details TEXT,
    status VARCHAR(30) DEFAULT 'pending', -- pending, under_review, approved, rejected
    remarks TEXT,
    certificate_no VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 6. Emergency Broadcasts & Public Announcements
CREATE TABLE IF NOT EXISTS announcements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title VARCHAR(200) NOT NULL,
    category VARCHAR(50) NOT NULL,       -- emergency, weather, traffic, civic_works, advisory
    severity VARCHAR(20) DEFAULT 'info', -- info, warning, critical
    content TEXT NOT NULL,
    active INTEGER DEFAULT 1,
    created_by VARCHAR(100) DEFAULT 'City Municipal Council',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Civic Polls (Citizen Engagement)
CREATE TABLE IF NOT EXISTS polls (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(60),
    active INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. Civic Poll Options
CREATE TABLE IF NOT EXISTS poll_options (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    poll_id INTEGER NOT NULL,
    option_text VARCHAR(150) NOT NULL,
    vote_count INTEGER DEFAULT 0,
    FOREIGN KEY (poll_id) REFERENCES polls(id) ON DELETE CASCADE
);

-- 9. Poll Votes Tracker (prevents double-voting)
CREATE TABLE IF NOT EXISTS poll_votes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    poll_id INTEGER NOT NULL,
    option_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    voted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (poll_id, user_id),
    FOREIGN KEY (poll_id) REFERENCES polls(id) ON DELETE CASCADE,
    FOREIGN KEY (option_id) REFERENCES poll_options(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 10. Smart Mobility & Real-time Parking
CREATE TABLE IF NOT EXISTS parking_lots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) NOT NULL,
    zone VARCHAR(80) NOT NULL,
    total_spots INTEGER NOT NULL,
    available_spots INTEGER NOT NULL,
    hourly_rate REAL NOT NULL,
    latitude REAL,
    longitude REAL
);
