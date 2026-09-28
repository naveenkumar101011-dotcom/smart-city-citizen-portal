const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db, initDatabase } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'smart_city_super_secret_jwt_key_2026';

// Initialize Database
initDatabase();

// Ensure uploads folder exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer storage for grievance photos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'evidence-' + uniqueSuffix + ext);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB max
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(uploadsDir));
app.use(express.static(path.join(__dirname, 'public')));

// Authentication Helper / Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentication required. Please log in.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Invalid or expired session token.' });
    }
    req.user = user;
    next();
  });
}

function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return next();

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (!err) req.user = user;
    next();
  });
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Unauthorized. Insufficient permissions.' });
    }
    next();
  };
}

// ==========================================
// 1. AUTHENTICATION & PROFILE ROUTES
// ==========================================

// Register Citizen
app.post('/api/auth/register', (req, res) => {
  try {
    const { name, email, password, phone, national_id, ward, address } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required.' });
    }

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return res.status(400).json({ success: false, message: 'An account with this email already exists.' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    const assignedWard = ward || 'Ward 1 - Central Zone';
    const assignedNationalId = national_id || ('CTZN-' + Math.floor(100000 + Math.random() * 900000));

    const result = db.prepare(`
      INSERT INTO users (name, email, password, phone, national_id, role, department, address, ward)
      VALUES (?, ?, ?, ?, ?, 'citizen', NULL, ?, ?)
    `).run(name, email, hashedPassword, phone || '', assignedNationalId, address || '', assignedWard);

    const userId = Number(result.lastInsertRowid);
    const token = jwt.sign({ id: userId, email, role: 'citizen', name }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      success: true,
      message: 'Citizen registration successful! Welcome to Smart City Portal.',
      token,
      user: {
        id: userId,
        name,
        email,
        phone,
        national_id: assignedNationalId,
        role: 'citizen',
        ward: assignedWard,
        address
      }
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ success: false, message: 'Server error registering user.' });
  }
});

// Login
app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide both email and password.' });
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email address or password.' });
    }

    const isMatch = bcrypt.compareSync(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email address or password.' });
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        department: user.department,
        name: user.name
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const safeUser = { ...user };
    delete safeUser.password;

    res.json({
      success: true,
      message: `Welcome back, ${user.name}!`,
      token,
      user: safeUser
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Server error during login.' });
  }
});

// Current User Profile
app.get('/api/auth/me', authenticateToken, (req, res) => {
  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    delete user.password;
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch user profile.' });
  }
});

// Update Profile
app.put('/api/auth/profile', authenticateToken, (req, res) => {
  try {
    const { name, phone, address, ward } = req.body;
    db.prepare(`
      UPDATE users SET name = COALESCE(?, name), phone = COALESCE(?, phone),
             address = COALESCE(?, address), ward = COALESCE(?, ward)
      WHERE id = ?
    `).run(name, phone, address, ward, req.user.id);

    const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    delete updated.password;

    res.json({ success: true, message: 'Profile updated successfully.', user: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update profile.' });
  }
});

// ==========================================
// 2. GRIEVANCE & COMPLAINTS MANAGEMENT
// ==========================================

// Get Complaints List
app.get('/api/complaints', authenticateToken, (req, res) => {
  try {
    const { status, category, ward, priority, search } = req.query;
    let query = `
      SELECT c.*, u.name as citizen_name, u.phone as citizen_phone, u.email as citizen_email
      FROM complaints c
      JOIN users u ON c.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    // If citizen, only see their own complaints unless 'public=true' is set
    if (req.user.role === 'citizen' && req.query.scope !== 'public') {
      query += ` AND c.user_id = ?`;
      params.push(req.user.id);
    }

    if (status && status !== 'all') {
      query += ` AND c.status = ?`;
      params.push(status);
    }
    if (category && category !== 'all') {
      query += ` AND c.category = ?`;
      params.push(category);
    }
    if (ward && ward !== 'all') {
      query += ` AND c.ward = ?`;
      params.push(ward);
    }
    if (priority && priority !== 'all') {
      query += ` AND c.priority = ?`;
      params.push(priority);
    }
    if (search) {
      query += ` AND (c.title LIKE ? OR c.ticket_no LIKE ? OR c.description LIKE ? OR c.landmark LIKE ?)`;
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }

    query += ` ORDER BY c.id DESC`;

    const complaints = db.prepare(query).all(...params);
    res.json({ success: true, count: complaints.length, complaints });
  } catch (err) {
    console.error('Fetch complaints error:', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve complaints.' });
  }
});

// Public Complaints (for City Map & transparency)
app.get('/api/public/complaints-map', (req, res) => {
  try {
    const list = db.prepare(`
      SELECT id, ticket_no, title, category, ward, landmark, latitude, longitude, priority, status, created_at
      FROM complaints
      WHERE latitude IS NOT NULL AND longitude IS NOT NULL
      ORDER BY id DESC LIMIT 50
    `).all();
    res.json({ success: true, complaints: list });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch map data.' });
  }
});

// Get Single Complaint with Timeline Logs
app.get('/api/complaints/:id', authenticateToken, (req, res) => {
  try {
    const complaint = db.prepare(`
      SELECT c.*, u.name as citizen_name, u.phone as citizen_phone, u.email as citizen_email
      FROM complaints c
      JOIN users u ON c.user_id = u.id
      WHERE c.id = ?
    `).get(req.params.id);

    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found.' });
    }

    // Citizens can only view their own complaints
    if (req.user.role === 'citizen' && complaint.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const logs = db.prepare(`
      SELECT * FROM complaint_logs
      WHERE complaint_id = ?
      ORDER BY id ASC
    `).all(req.params.id);

    res.json({ success: true, complaint, timeline: logs });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch complaint details.' });
  }
});

// Submit New Complaint
app.post('/api/complaints', authenticateToken, upload.single('evidence_image'), (req, res) => {
  try {
    const { title, category, description, ward, landmark, priority, latitude, longitude } = req.body;

    if (!title || !category || !description || !ward) {
      return res.status(400).json({ success: false, message: 'Please provide Title, Category, Ward, and Description.' });
    }

    const ticketNo = 'GRV-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000);
    let imageUrl = null;
    if (req.file) {
      imageUrl = '/uploads/' + req.file.filename;
    } else if (req.body.image_url) {
      imageUrl = req.body.image_url;
    }

    // Auto-map category to municipal department
    const deptMap = {
      'Roads & Infrastructure': 'Public Works Department',
      'Water Supply & Drainage': 'Water Supply Board',
      'Streetlights & Electricity': 'Electricity Board',
      'Waste & Sanitation': 'Sanitation Department',
      'Public Transit & Traffic': 'Traffic & Transit',
      'Parks & Environment': 'Parks & Recreation',
      'Public Safety & Health': 'Public Health & Safety'
    };
    const department = deptMap[category] || 'General Municipal Services';

    const result = db.prepare(`
      INSERT INTO complaints (
        ticket_no, user_id, title, category, description, ward, landmark,
        latitude, longitude, priority, status, department, image_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'submitted', ?, ?)
    `).run(
      ticketNo,
      req.user.id,
      title,
      category,
      description,
      ward,
      landmark || '',
      latitude ? parseFloat(latitude) : 12.9716,
      longitude ? parseFloat(longitude) : 77.5946,
      priority || 'medium',
      department,
      imageUrl
    );

    const complaintId = Number(result.lastInsertRowid);

    // Initial log entry
    db.prepare(`
      INSERT INTO complaint_logs (complaint_id, action, notes, performed_by)
      VALUES (?, 'Grievance Submitted', ?, ?)
    `).run(complaintId, 'Complaint registered through online citizen portal.', req.user.name);

    res.status(201).json({
      success: true,
      message: `Grievance registered successfully! Your tracking ticket is ${ticketNo}`,
      complaintId,
      ticketNo
    });
  } catch (err) {
    console.error('Complaint creation error:', err);
    res.status(500).json({ success: false, message: 'Failed to file grievance.' });
  }
});

// Update Complaint Status (Officer / Admin)
app.put('/api/complaints/:id/status', authenticateToken, requireRole('officer', 'admin'), (req, res) => {
  try {
    const { status, assigned_to, department, resolution_notes } = req.body;
    const complaintId = req.params.id;

    const existing = db.prepare('SELECT * FROM complaints WHERE id = ?').get(complaintId);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Complaint not found.' });
    }

    db.prepare(`
      UPDATE complaints
      SET status = COALESCE(?, status),
          assigned_to = COALESCE(?, assigned_to),
          department = COALESCE(?, department),
          resolution_notes = COALESCE(?, resolution_notes),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(status, assigned_to, department, resolution_notes, complaintId);

    // Action label for audit log
    const actionLabel = `Status Updated to: ${status.replace('_', ' ').toUpperCase()}`;
    const logNote = resolution_notes || `Status modified by ${req.user.name} (${req.user.role}).`;

    db.prepare(`
      INSERT INTO complaint_logs (complaint_id, action, notes, performed_by)
      VALUES (?, ?, ?, ?)
    `).run(complaintId, actionLabel, logNote, req.user.name);

    res.json({ success: true, message: `Complaint status updated to ${status}.` });
  } catch (err) {
    console.error('Status update error:', err);
    res.status(500).json({ success: false, message: 'Failed to update complaint status.' });
  }
});

// Citizen Feedback & Rating
app.post('/api/complaints/:id/feedback', authenticateToken, (req, res) => {
  try {
    const { rating, feedback } = req.body;
    const complaintId = req.params.id;

    const existing = db.prepare('SELECT * FROM complaints WHERE id = ? AND user_id = ?').get(complaintId, req.user.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Complaint not found or not owned by you.' });
    }

    db.prepare(`
      UPDATE complaints
      SET rating = ?, feedback = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(rating, feedback, complaintId);

    db.prepare(`
      INSERT INTO complaint_logs (complaint_id, action, notes, performed_by)
      VALUES (?, 'Citizen Feedback Submitted', ?, ?)
    `).run(complaintId, `Rated ${rating}/5 Stars: "${feedback || 'No remarks'}"`, req.user.name);

    res.json({ success: true, message: 'Thank you for your feedback!' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to submit feedback.' });
  }
});

// ==========================================
// 3. UTILITY BILLS & PAYMENTS
// ==========================================

// Get Bills
app.get('/api/bills', authenticateToken, (req, res) => {
  try {
    let query = `
      SELECT b.*, u.name as citizen_name, u.email as citizen_email
      FROM bills b
      JOIN users u ON b.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (req.user.role === 'citizen') {
      query += ` AND b.user_id = ?`;
      params.push(req.user.id);
    }

    if (req.query.status) {
      query += ` AND b.status = ?`;
      params.push(req.query.status);
    }

    query += ` ORDER BY b.id DESC`;

    const bills = db.prepare(query).all(...params);
    res.json({ success: true, bills });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch utility bills.' });
  }
});

// Pay Bill (Simulated Payment Gateway)
app.post('/api/bills/pay/:id', authenticateToken, (req, res) => {
  try {
    const billId = req.params.id;
    const { payment_method } = req.body;

    const bill = db.prepare('SELECT * FROM bills WHERE id = ?').get(billId);
    if (!bill) {
      return res.status(404).json({ success: false, message: 'Bill record not found.' });
    }

    if (req.user.role === 'citizen' && bill.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized bill payment.' });
    }

    if (bill.status === 'paid') {
      return res.status(400).json({ success: false, message: 'This bill has already been paid.' });
    }

    const txnRef = 'TXN-SMART-' + Math.floor(100000 + Math.random() * 900000);
    const method = payment_method || 'Online Payment (UPI/Card)';

    db.prepare(`
      UPDATE bills
      SET status = 'paid', payment_date = datetime('now'), transaction_ref = ?, payment_method = ?
      WHERE id = ?
    `).run(txnRef, method, billId);

    const updatedBill = db.prepare('SELECT * FROM bills WHERE id = ?').get(billId);

    res.json({
      success: true,
      message: `Payment of ₹${bill.amount.toFixed(2)} successful!`,
      receipt: {
        bill_no: bill.bill_no,
        utility_type: bill.utility_type,
        amount: bill.amount,
        transaction_ref: txnRef,
        payment_method: method,
        payment_date: updatedBill.payment_date,
        billing_period: bill.billing_period
      }
    });
  } catch (err) {
    console.error('Payment error:', err);
    res.status(500).json({ success: false, message: 'Payment transaction failed.' });
  }
});

// ==========================================
// 4. CITIZEN PERMITS & CERTIFICATES
// ==========================================

// Get Permits
app.get('/api/permits', authenticateToken, (req, res) => {
  try {
    let query = `
      SELECT p.*, u.name as citizen_name, u.email as citizen_email
      FROM permits p
      JOIN users u ON p.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (req.user.role === 'citizen') {
      query += ` AND p.user_id = ?`;
      params.push(req.user.id);
    }

    if (req.query.status) {
      query += ` AND p.status = ?`;
      params.push(req.query.status);
    }

    query += ` ORDER BY p.id DESC`;

    const permits = db.prepare(query).all(...params);
    res.json({ success: true, permits });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch permits.' });
  }
});

// Apply for Permit
app.post('/api/permits', authenticateToken, (req, res) => {
  try {
    const { permit_type, applicant_name, details } = req.body;
    if (!permit_type || !applicant_name) {
      return res.status(400).json({ success: false, message: 'Permit type and applicant name are required.' });
    }

    const typePrefix = {
      'Birth Certificate': 'APP-BC',
      'Death Certificate': 'APP-DC',
      'Trade License Renewal': 'APP-TL',
      'Building Construction Permit': 'APP-BP',
      'Public Event & Loudspeaker Permit': 'APP-EV'
    }[permit_type] || 'APP-GEN';

    const appNo = `${typePrefix}-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;

    const result = db.prepare(`
      INSERT INTO permits (application_no, user_id, permit_type, applicant_name, details, status)
      VALUES (?, ?, ?, ?, ?, 'pending')
    `).run(appNo, req.user.id, permit_type, applicant_name, typeof details === 'object' ? JSON.stringify(details) : (details || '{}'));

    res.status(201).json({
      success: true,
      message: `Permit application submitted successfully! Application ID: ${appNo}`,
      application_no: appNo,
      permitId: Number(result.lastInsertRowid)
    });
  } catch (err) {
    console.error('Permit application error:', err);
    res.status(500).json({ success: false, message: 'Failed to submit application.' });
  }
});

// Approve / Reject Permit (Officer / Admin)
app.put('/api/permits/:id/status', authenticateToken, requireRole('officer', 'admin'), (req, res) => {
  try {
    const { status, remarks } = req.body;
    const permitId = req.params.id;

    let certNo = null;
    if (status === 'approved') {
      certNo = 'CERT-' + Math.floor(100000 + Math.random() * 900000);
    }

    db.prepare(`
      UPDATE permits
      SET status = ?, remarks = ?, certificate_no = COALESCE(?, certificate_no), updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(status, remarks || '', certNo, permitId);

    res.json({ success: true, message: `Permit status updated to ${status}.`, certificate_no: certNo });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update permit.' });
  }
});

// ==========================================
// 5. ANNOUNCEMENTS & CITY BROADCASTS
// ==========================================

// Get Announcements
app.get('/api/announcements', (req, res) => {
  try {
    const list = db.prepare('SELECT * FROM announcements WHERE active = 1 ORDER BY id DESC').all();
    res.json({ success: true, announcements: list });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to load announcements.' });
  }
});

// Create Announcement (Admin / Officer)
app.post('/api/announcements', authenticateToken, requireRole('officer', 'admin'), (req, res) => {
  try {
    const { title, category, severity, content } = req.body;
    if (!title || !content) {
      return res.status(400).json({ success: false, message: 'Title and content are required.' });
    }

    const result = db.prepare(`
      INSERT INTO announcements (title, category, severity, content, created_by)
      VALUES (?, ?, ?, ?, ?)
    `).run(title, category || 'general', severity || 'info', content, req.user.name);

    res.status(201).json({ success: true, message: 'City announcement broadcasted successfully!' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to broadcast announcement.' });
  }
});

// ==========================================
// 6. CIVIC POLLS & PARTICIPATORY BUDGETING
// ==========================================

// Get Polls
app.get('/api/polls', optionalAuth, (req, res) => {
  try {
    const polls = db.prepare('SELECT * FROM polls WHERE active = 1 ORDER BY id DESC').all();

    const results = polls.map(p => {
      const options = db.prepare('SELECT * FROM poll_options WHERE poll_id = ?').all(p.id);
      let userVotedOption = null;

      if (req.user) {
        const userVote = db.prepare('SELECT option_id FROM poll_votes WHERE poll_id = ? AND user_id = ?').get(p.id, req.user.id);
        if (userVote) userVotedOption = userVote.option_id;
      }

      const totalVotes = options.reduce((sum, opt) => sum + opt.vote_count, 0);

      return {
        ...p,
        options,
        totalVotes,
        hasVoted: !!userVotedOption,
        userVotedOption
      };
    });

    res.json({ success: true, polls: results });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to load polls.' });
  }
});

// Vote in Poll
app.post('/api/polls/:id/vote', authenticateToken, (req, res) => {
  try {
    const pollId = req.params.id;
    const { option_id } = req.body;

    if (!option_id) {
      return res.status(400).json({ success: false, message: 'Option selection is required.' });
    }

    const existingVote = db.prepare('SELECT id FROM poll_votes WHERE poll_id = ? AND user_id = ?').get(pollId, req.user.id);
    if (existingVote) {
      return res.status(400).json({ success: false, message: 'You have already voted in this poll.' });
    }

    db.prepare('INSERT INTO poll_votes (poll_id, option_id, user_id) VALUES (?, ?, ?)').run(pollId, option_id, req.user.id);
    db.prepare('UPDATE poll_options SET vote_count = vote_count + 1 WHERE id = ?').run(option_id);

    res.json({ success: true, message: 'Your vote has been counted! Thank you for participating in municipal governance.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to record vote.' });
  }
});

// ==========================================
// 7. SMART MOBILITY & REAL-TIME PARKING
// ==========================================

app.get('/api/mobility/parking', (req, res) => {
  try {
    const spots = db.prepare('SELECT * FROM parking_lots ORDER BY id ASC').all();
    res.json({ success: true, parking: spots });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to load parking data.' });
  }
});

app.get('/api/mobility/transit', (req, res) => {
  // Live mock public transit route lines & ETA
  const transitRoutes = [
    { id: 'BUS-101', name: 'Metro Green Link', route: 'Central Railway Stn ➔ Tech Hub Phase 2', nextDeparture: '4 mins', status: 'On Time', frequency: 'Every 8 mins', type: 'Electric AC Bus' },
    { id: 'BUS-204', name: 'Airport Express Shuttle', route: 'City Civic Centre ➔ International Airport', nextDeparture: '11 mins', status: 'On Time', frequency: 'Every 20 mins', type: 'Superfast Express' },
    { id: 'METRO-L1', name: 'Purple Metro Corridor', route: 'West Gate Terminal ➔ East Knowledge City', nextDeparture: '2 mins', status: 'High Frequency', frequency: 'Every 4 mins', type: 'Rapid Rail Metro' },
    { id: 'BUS-305', name: 'Circular Heritage Loop', route: 'Old Fort ➔ Botanical Gardens ➔ City Hall', nextDeparture: '8 mins', status: 'Mild Traffic Delay (3 min)', frequency: 'Every 15 mins', type: 'Smart EV Shuttle' }
  ];
  res.json({ success: true, routes: transitRoutes });
});

// ==========================================
// 8. ADMIN DASHBOARD & ANALYTICS METRICS
// ==========================================

app.get('/api/admin/stats', authenticateToken, requireRole('officer', 'admin'), (req, res) => {
  try {
    const totalComplaints = db.prepare('SELECT COUNT(*) as c FROM complaints').get().c;
    const pendingComplaints = db.prepare("SELECT COUNT(*) as c FROM complaints WHERE status IN ('submitted', 'under_review')").get().c;
    const inProgressComplaints = db.prepare("SELECT COUNT(*) as c FROM complaints WHERE status = 'in_progress'").get().c;
    const resolvedComplaints = db.prepare("SELECT COUNT(*) as c FROM complaints WHERE status = 'resolved'").get().c;

    const totalCitizens = db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'citizen'").get().c;

    const billsStats = db.prepare(`
      SELECT 
        SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) as collected,
        SUM(CASE WHEN status = 'unpaid' THEN amount ELSE 0 END) as pending
      FROM bills
    `).get();

    const categoryBreakdown = db.prepare(`
      SELECT category, COUNT(*) as count
      FROM complaints
      GROUP BY category
      ORDER BY count DESC
    `).all();

    const wardBreakdown = db.prepare(`
      SELECT ward, COUNT(*) as count
      FROM complaints
      GROUP BY ward
      ORDER BY count DESC
    `).all();

    const recentActivity = db.prepare(`
      SELECT l.*, c.ticket_no, c.title
      FROM complaint_logs l
      JOIN complaints c ON l.complaint_id = c.id
      ORDER BY l.id DESC
      LIMIT 8
    `).all();

    res.json({
      success: true,
      stats: {
        totalComplaints,
        pendingComplaints,
        inProgressComplaints,
        resolvedComplaints,
        resolutionRate: totalComplaints > 0 ? Math.round((resolvedComplaints / totalComplaints) * 100) : 0,
        totalCitizens,
        revenueCollected: billsStats.collected || 0,
        revenuePending: billsStats.pending || 0,
        categoryBreakdown,
        wardBreakdown,
        recentActivity
      }
    });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ success: false, message: 'Failed to load system stats.' });
  }
});

// Admin Users List
app.get('/api/admin/users', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const users = db.prepare('SELECT id, name, email, phone, role, department, ward, created_at FROM users ORDER BY id DESC').all();
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to load users.' });
  }
});

// Root Page redirects / rewrites
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/citizen', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'citizen-dashboard.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin-dashboard.html'));
});

// Fallback 404
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Endpoint not found.' });
});

// Start Server
app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🏙️  Smart City Citizen System Portal is Running!`);
  console.log(`🌐 Server URL: http://localhost:${PORT}`);
  console.log(`👤 Citizen Portal: http://localhost:${PORT}/citizen`);
  console.log(`🏛️  Admin & Officer Portal: http://localhost:${PORT}/admin`);
  console.log(`=======================================================`);
});
