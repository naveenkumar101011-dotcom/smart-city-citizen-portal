const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'smart_city.db');
const db = new DatabaseSync(dbPath);

// Enable foreign keys
db.exec('PRAGMA foreign_keys = ON;');

function initDatabase() {
  // Execute schema definitions
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name VARCHAR(120) NOT NULL,
      email VARCHAR(120) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      phone VARCHAR(30),
      national_id VARCHAR(50),
      role VARCHAR(20) DEFAULT 'citizen',
      department VARCHAR(80),
      address TEXT,
      ward VARCHAR(80) DEFAULT 'Ward 1 - Central Zone',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS complaints (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_no VARCHAR(40) NOT NULL UNIQUE,
      user_id INTEGER NOT NULL,
      title VARCHAR(200) NOT NULL,
      category VARCHAR(60) NOT NULL,
      description TEXT NOT NULL,
      ward VARCHAR(80) NOT NULL,
      landmark VARCHAR(150),
      latitude REAL,
      longitude REAL,
      priority VARCHAR(20) DEFAULT 'medium',
      status VARCHAR(30) DEFAULT 'submitted',
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

    CREATE TABLE IF NOT EXISTS complaint_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      complaint_id INTEGER NOT NULL,
      action VARCHAR(80) NOT NULL,
      notes TEXT,
      performed_by VARCHAR(100),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS bills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bill_no VARCHAR(40) NOT NULL UNIQUE,
      user_id INTEGER NOT NULL,
      utility_type VARCHAR(50) NOT NULL,
      amount REAL NOT NULL,
      billing_period VARCHAR(50),
      due_date DATE NOT NULL,
      status VARCHAR(20) DEFAULT 'unpaid',
      payment_date TIMESTAMP,
      transaction_ref VARCHAR(60),
      payment_method VARCHAR(40),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS permits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      application_no VARCHAR(40) NOT NULL UNIQUE,
      user_id INTEGER NOT NULL,
      permit_type VARCHAR(60) NOT NULL,
      applicant_name VARCHAR(120) NOT NULL,
      details TEXT,
      status VARCHAR(30) DEFAULT 'pending',
      remarks TEXT,
      certificate_no VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS announcements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title VARCHAR(200) NOT NULL,
      category VARCHAR(50) NOT NULL,
      severity VARCHAR(20) DEFAULT 'info',
      content TEXT NOT NULL,
      active INTEGER DEFAULT 1,
      created_by VARCHAR(100) DEFAULT 'City Municipal Council',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS polls (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title VARCHAR(200) NOT NULL,
      description TEXT,
      category VARCHAR(60),
      active INTEGER DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS poll_options (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      poll_id INTEGER NOT NULL,
      option_text VARCHAR(150) NOT NULL,
      vote_count INTEGER DEFAULT 0,
      FOREIGN KEY (poll_id) REFERENCES polls(id) ON DELETE CASCADE
    );

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
  `);

  // Check if initial users exist
  const existingUsers = db.prepare('SELECT COUNT(*) as count FROM users').get();
  if (existingUsers.count === 0) {
    seedInitialData();
  }
}

function seedInitialData() {
  console.log('Seeding initial smart city database records...');

  const hashedAdmin = bcrypt.hashSync('admin123', 10);
  const hashedOfficer = bcrypt.hashSync('officer123', 10);
  const hashedCitizen = bcrypt.hashSync('citizen123', 10);

  // 1. Seed Users
  const insertUser = db.prepare(`
    INSERT INTO users (name, email, password, phone, national_id, role, department, address, ward)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Admin
  insertUser.run(
    'Commissioner Rajesh Sharma',
    'admin@smartcity.gov',
    hashedAdmin,
    '+91 98000 00001',
    'GOV-ADM-001',
    'admin',
    'Municipal Administration',
    'City Municipal Corporation HQ, Civic Centre',
    'City HQ'
  );

  // Officers
  insertUser.run(
    'Eng. Anita Desai',
    'officer@smartcity.gov',
    hashedOfficer,
    '+91 98000 00002',
    'GOV-ENG-104',
    'officer',
    'Public Works Department',
    'Sub-Division Office, Zone 1',
    'Ward 1 - Central Zone'
  );

  insertUser.run(
    'Sunil Verma',
    'water.officer@smartcity.gov',
    hashedOfficer,
    '+91 98000 00003',
    'GOV-WTR-209',
    'officer',
    'Water Supply Board',
    'Water Reservoir Compound, Zone 3',
    'Ward 3 - East Zone'
  );

  // Citizens
  const citizenRes = insertUser.run(
    'Priya Sundaram',
    'citizen@smartcity.gov',
    hashedCitizen,
    '+91 98765 43210',
    'CTZN-984210',
    'citizen',
    null,
    'Flat 402, Greenview Heights, MG Road',
    'Ward 1 - Central Zone'
  );
  const citizenId = citizenRes.lastInsertRowid;

  insertUser.run(
    'Arun Kumar',
    'arun.kumar@gmail.com',
    hashedCitizen,
    '+91 98111 22334',
    'CTZN-551289',
    'citizen',
    null,
    '14B, Lakeview Colony, Outer Ring Road',
    'Ward 2 - North Zone'
  );

  // 2. Seed Complaints
  const insertComplaint = db.prepare(`
    INSERT INTO complaints (
      ticket_no, user_id, title, category, description, ward, landmark,
      latitude, longitude, priority, status, assigned_to, department,
      image_url, resolution_notes, rating, feedback, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', ?), datetime('now', ?))
  `);

  const insertLog = db.prepare(`
    INSERT INTO complaint_logs (complaint_id, action, notes, performed_by, created_at)
    VALUES (?, ?, ?, ?, datetime('now', ?))
  `);

  // Complaint 1: Pothole (In Progress)
  const c1 = insertComplaint.run(
    'GRV-2026-1001',
    citizenId,
    'Deep hazardous pothole on MG Road near Metro Pillar 42',
    'Roads & Infrastructure',
    'Large pothole measuring approx 3 feet across. Multiple two-wheelers have skidded here during night time. Immediate tarring required.',
    'Ward 1 - Central Zone',
    'Near Metro Pillar 42, opposite State Bank',
    12.9716, 77.5946,
    'high',
    'in_progress',
    'Eng. Anita Desai',
    'Public Works Department',
    'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600&auto=format&fit=crop',
    'Asphalt patch repair team dispatched. Bitumen laying scheduled for today afternoon.',
    null,
    null,
    '-2 days',
    '-4 hours'
  );
  insertLog.run(c1.lastInsertRowid, 'Grievance Submitted', 'Complaint logged via Smart City Web Portal by citizen Priya Sundaram', 'Priya Sundaram', '-2 days');
  insertLog.run(c1.lastInsertRowid, 'Assigned to Department', 'Assigned to Public Works Department (Officer: Eng. Anita Desai)', 'System Dispatch', '-1 days');
  insertLog.run(c1.lastInsertRowid, 'Status Updated to In Progress', 'Site inspected. Asphalt team on site with compacting roller.', 'Eng. Anita Desai', '-4 hours');

  // Complaint 2: Water Supply (Under Review)
  const c2 = insertComplaint.run(
    'GRV-2026-1002',
    citizenId,
    'Contaminated & muddy tap water in Block C',
    'Water Supply & Drainage',
    'Since yesterday morning, tap water coming out with brownish silt and mild odor. Affecting more than 40 families in our apartment lane.',
    'Ward 1 - Central Zone',
    'Greenview Heights Avenue, MG Road',
    12.9780, 77.6400,
    'high',
    'under_review',
    'Sunil Verma',
    'Water Supply Board',
    'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=600&auto=format&fit=crop',
    'Preliminary pipeline inspection scheduled. Checking for junction cross-leakage.',
    null,
    null,
    '-1 days',
    '-6 hours'
  );
  insertLog.run(c2.lastInsertRowid, 'Grievance Submitted', 'Complaint registered under Water Supply & Drainage', 'Priya Sundaram', '-1 days');
  insertLog.run(c2.lastInsertRowid, 'Under Review', 'Water quality sampling kit requisitioned.', 'Sunil Verma', '-6 hours');

  // Complaint 3: Streetlight (Resolved & Rated)
  const c3 = insertComplaint.run(
    'GRV-2026-1003',
    citizenId,
    'Flickering and non-functional streetlights at 5th Cross Corner',
    'Streetlights & Electricity',
    'Three consecutive LED street poles were dark for 4 nights, making the junction unsafe for pedestrians.',
    'Ward 1 - Central Zone',
    'Corner of 5th Cross & 2nd Main',
    12.9650, 77.6000,
    'medium',
    'resolved',
    'Eng. Anita Desai',
    'Electricity Board',
    'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=600&auto=format&fit=crop',
    'Faulty circuit breaker and 2 LED luminaire fixtures replaced with 90W smart LED fittings.',
    5,
    'Rapid response! Repaired within 24 hours and street is bright and safe now. Thank you!',
    '-5 days',
    '-3 days'
  );
  insertLog.run(c3.lastInsertRowid, 'Grievance Submitted', 'Complaint lodged', 'Priya Sundaram', '-5 days');
  insertLog.run(c3.lastInsertRowid, 'Assigned', 'Assigned to Electrical Maintenance Team B', 'System Admin', '-4 days');
  insertLog.run(c3.lastInsertRowid, 'Work Completed', 'LED fixtures replaced. Tested and verified.', 'Maintenance Tech', '-3 days');
  insertLog.run(c3.lastInsertRowid, 'Citizen Feedback', 'Rated 5 Stars by citizen Priya Sundaram', 'Priya Sundaram', '-3 days');

  // Complaint 4: Waste Management (Submitted)
  const c4 = insertComplaint.run(
    'GRV-2026-1004',
    citizenId,
    'Overflowing community garbage container near Central Market',
    'Waste & Sanitation',
    'Solid waste not cleared for 2 days. Stray dogs scattering litter onto the main road.',
    'Ward 2 - North Zone',
    'Adjacent to Central Vegetable Market Gate 2',
    12.9900, 77.5700,
    'emergency',
    'submitted',
    null,
    'Sanitation Department',
    'https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=600&auto=format&fit=crop',
    null,
    null,
    null,
    '-3 hours',
    '-3 hours'
  );
  insertLog.run(c4.lastInsertRowid, 'Grievance Submitted', 'Priority flagged as Emergency', 'Priya Sundaram', '-3 hours');

  // 3. Seed Bills
  const insertBill = db.prepare(`
    INSERT INTO bills (bill_no, user_id, utility_type, amount, billing_period, due_date, status, payment_date, transaction_ref, payment_method)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertBill.run(
    'BILL-ELEC-2026-09',
    citizenId,
    'Electricity',
    1420.50,
    'September 2026',
    '2026-10-15',
    'unpaid',
    null,
    null,
    null
  );

  insertBill.run(
    'BILL-WATR-2026-09',
    citizenId,
    'Water Supply',
    480.00,
    'September 2026',
    '2026-10-10',
    'unpaid',
    null,
    null,
    null
  );

  insertBill.run(
    'BILL-PROP-2026-Q2',
    citizenId,
    'Property Tax',
    8250.00,
    'FY 2026-27 Q2',
    '2026-11-30',
    'paid',
    '2026-09-15 11:24:00',
    'TXN-SMART-984210',
    'UPI (Google Pay / PhonePe)'
  );

  insertBill.run(
    'BILL-SANI-2026-08',
    citizenId,
    'Sanitation & Waste Fee',
    350.00,
    'August 2026',
    '2026-09-05',
    'paid',
    '2026-09-02 16:40:12',
    'TXN-SMART-772194',
    'Credit Card (Visa)'
  );

  // 4. Seed Permits & Certificates
  const insertPermit = db.prepare(`
    INSERT INTO permits (application_no, user_id, permit_type, applicant_name, details, status, remarks, certificate_no)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertPermit.run(
    'APP-BC-2026-441',
    citizenId,
    'Birth Certificate',
    'Priya Sundaram',
    JSON.stringify({
      childName: 'Aarav Sundaram',
      dob: '2026-06-12',
      placeOfBirth: 'City Government General Hospital',
      fatherName: 'Karthik Sundaram',
      motherName: 'Priya Sundaram'
    }),
    'approved',
    'Digital certificate issued and digitally signed by Registrar of Vital Statistics.',
    'CERT-BC-2026-09412'
  );

  insertPermit.run(
    'APP-TL-2026-892',
    citizenId,
    'Trade License Renewal',
    'Priya Sundaram',
    JSON.stringify({
      businessName: 'GreenRoots Organic Retail',
      licenseType: 'Retail Commercial Trade',
      premisesAddress: 'Shop #12, MG Road Plaza',
      annualTurnover: '₹24,00,000'
    }),
    'under_review',
    'Documents verified. Field sanitary inspector site inspection scheduled.',
    null
  );

  insertPermit.run(
    'APP-EV-2026-103',
    citizenId,
    'Public Event & Loudspeaker Permit',
    'Priya Sundaram',
    JSON.stringify({
      eventName: 'Neighborhood Eco Green Fair & Tree Planting',
      venue: 'Ward 1 Community Park',
      eventDate: '2026-10-18',
      expectedAttendees: 300,
      soundSystemHours: '10:00 AM to 06:00 PM'
    }),
    'approved',
    'Permitted within decibel limits (max 55 dB) as per City Noise Regulation Act.',
    'PERM-EV-2026-031'
  );

  // 5. Seed Announcements
  const insertAnnouncement = db.prepare(`
    INSERT INTO announcements (title, category, severity, content, active, created_by)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  insertAnnouncement.run(
    'Heavy Rainfall & Thunderstorm Warning for Next 48 Hours',
    'emergency',
    'critical',
    'Meteorological Dept issues Orange Alert. Citizens are advised to avoid waterlogged underpasses. 24x7 Emergency Flood Helpline 1916 is operational.',
    1,
    'City Disaster Management Authority'
  );

  insertAnnouncement.run(
    'Scheduled Water Supply Maintenance in Ward 1 & Ward 3 on Thursday',
    'maintenance',
    'warning',
    'Periodic feeder pipeline desilting will occur on Thursday from 08:00 AM to 02:00 PM. Please store adequate potable water in advance.',
    1,
    'City Water Board'
  );

  insertAnnouncement.run(
    'Launch of 20 New Electric City Buses on Green Transit Corridors',
    'traffic',
    'info',
    'Smart City initiative expands zero-emission fleet with air-conditioned low-floor e-buses connecting Metro lines to tech parks. Concession passes available on portal.',
    1,
    'City Transport Corporation'
  );

  insertAnnouncement.run(
    'Digital Property Tax Rebate: 5% Early Bird Discount',
    'advisory',
    'info',
    'Avail a 5% discount on residential property tax dues when paying online before October 31, 2026 via the Smart City Citizen Portal.',
    1,
    'Municipal Revenue Department'
  );

  // 6. Seed Civic Polls
  const insertPoll = db.prepare(`
    INSERT INTO polls (title, description, category, active)
    VALUES (?, ?, ?, ?)
  `);

  const insertPollOption = db.prepare(`
    INSERT INTO poll_options (poll_id, option_text, vote_count)
    VALUES (?, ?, ?)
  `);

  const poll1 = insertPoll.run(
    'Corridor Selection for the Next Dedicated Smart Bicycle Track',
    'Help the municipal town planning commission prioritize the next protected two-way bicycle superhighway.',
    'Urban Mobility',
    1
  );
  insertPollOption.run(poll1.lastInsertRowid, 'MG Road to East Tech Park (7.2 km)', 412);
  insertPollOption.run(poll1.lastInsertRowid, 'Riverside Promenade to University North (5.8 km)', 589);
  insertPollOption.run(poll1.lastInsertRowid, 'Central Station to Old Town Heritage Circle (4.1 km)', 230);
  insertPollOption.run(poll1.lastInsertRowid, 'Lakeview Ring Road Circuit (8.5 km)', 375);

  const poll2 = insertPoll.run(
    'Mandatory Doorstep Waste Segregation & Home Composting Subsidy',
    'Should the city mandate 3-way waste segregation at source with a 75% municipal subsidy on home composters?',
    'Sanitation & Environment',
    1
  );
  insertPollOption.run(poll2.lastInsertRowid, 'Strongly Support with Subsidized Bin Distribution', 840);
  insertPollOption.run(poll2.lastInsertRowid, 'Support only for Gated Communities & Commercial Areas', 215);
  insertPollOption.run(poll2.lastInsertRowid, 'Neutral / Need more citizen awareness campaigns first', 110);
  insertPollOption.run(poll2.lastInsertRowid, 'Oppose mandatory enforcement', 45);

  // 7. Seed Smart Parking Lots
  const insertParking = db.prepare(`
    INSERT INTO parking_lots (name, zone, total_spots, available_spots, hourly_rate, latitude, longitude)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  insertParking.run('Central Metro Multi-Level Smart Deck', 'Ward 1 - Central Zone', 250, 48, 30.0, 12.9716, 77.5946);
  insertParking.run('City Civic Centre Visitor Parking', 'Ward 1 - Central Zone', 120, 19, 20.0, 12.9740, 77.6000);
  insertParking.run('East Tech Park Automated Tower', 'Ward 3 - East Zone', 500, 185, 40.0, 12.9820, 77.6450);
  insertParking.run('North Market Plaza Surface Lot', 'Ward 2 - North Zone', 100, 12, 25.0, 12.9920, 77.5750);
  insertParking.run('West Riverside Park & Ride Depot', 'Ward 4 - West Zone', 350, 192, 15.0, 12.9600, 77.5600);

  console.log('Database seeded successfully with realistic smart city sample data!');
}

// Helper methods for queries
module.exports = {
  db,
  initDatabase
};
