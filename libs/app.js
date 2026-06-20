const express = require('express');
const mysql = require('mysql');
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const port = process.env.PORT || 3000;

// Health check endpoint for quick availability checks
app.get('/health', (req, res) => {
    res.json({ success: true, now: new Date().toISOString() });
});

// Middleware
const ALLOWED_ORIGINS = [
    process.env.APP_ORIGIN || 'http://localhost:3000',
    'http://localhost',
    'http://127.0.0.1',
    'http://127.0.0.1:3000'
];
app.use(cors({
    origin: function(origin, callback) {
        if (!origin) return callback(null, true); // allow local file:// or tools without origin
        if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
        callback(new Error('CORS origin not allowed: ' + origin));
    },
    credentials: true
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/uploaded', express.static(path.join(__dirname, '..', 'uploaded')));

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '..', 'uploaded');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Serve frontend static files from project root so pages are on same origin
app.use(express.static(path.join(__dirname, '..')));

// MySQL Connection pool
const pool = mysql.createPool({
    connectionLimit: 10,
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: '',
    database: 'buais'
});

pool.on('connection', (connection) => {
    connection.on('error', (err) => {
        console.error('MySQL connection error:', err);
    });
});

pool.getConnection((err, connection) => {
    if (err) {
        console.error('Error connecting to the database:', err);
        return;
    }
    console.log('Connected to the database');
    connection.release();
});

// Ensure users table exists
function ensureUsersTable(){
    const createTable = `CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(100) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'user'
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`;
    pool.query(createTable, (err) => {
        if(err) return console.error('Error creating users table:', err);
        console.log('Users table ensured.');
    });
}
ensureUsersTable();

// Ensure colleges and departments exist for admin control panel and request routing
function ensureCollegesTable(){
    const createTable = `CREATE TABLE IF NOT EXISTS colleges (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`;
    pool.query(createTable, (err) => {
        if(err) return console.error('Error creating colleges table:', err);
        console.log('Colleges table ensured.');
    });
}

function ensureDepartmentsTable(){
    const createTable = `CREATE TABLE IF NOT EXISTS departments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        college_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        UNIQUE KEY uq_department_college (college_id, name),
        FOREIGN KEY (college_id) REFERENCES colleges(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`;
    pool.query(createTable, (err) => {
        if(err) return console.error('Error creating departments table:', err);
        console.log('Departments table ensured.');
    });
}

function ensureRequestsTable(){
    const createTable = `CREATE TABLE IF NOT EXISTS requests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        Reqrev VARCHAR(50) NOT NULL UNIQUE,
        Astdname VARCHAR(255),
        Estdname VARCHAR(255),
        Nationality VARCHAR(100),
        Unino VARCHAR(100),
        phone VARCHAR(50) NULL,
        Gyear VARCHAR(10),
        Dno INT,
        Certype VARCHAR(100),
        Lang VARCHAR(100),
        Ccno INT,
        Status VARCHAR(100),
        Notes TEXT NULL,
        Reqdate DATE,
        Pic VARCHAR(255),
        ident VARCHAR(255),
        bill VARCHAR(255),
        FOREIGN KEY (Dno) REFERENCES departments(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`;
    pool.query(createTable, (err) => {
        if(err) return console.error('Error creating requests table:', err);
        console.log('Requests table ensured.');
    });
}

function ensureRequestsNotesColumn(){
    pool.query("SHOW COLUMNS FROM requests LIKE 'Notes'", (err, rows) => {
        if (err) {
            console.error('Error checking requests Notes column:', err);
            return;
        }
        if (rows.length === 0) {
            pool.query('ALTER TABLE requests ADD COLUMN Notes TEXT NULL AFTER Status', (alterErr) => {
                if (alterErr) {
                    console.error('Error adding requests Notes column:', alterErr);
                    return;
                }
                console.log('Requests Notes column ensured.');
            });
        }
    });
}

function ensureRequestsBillColumn(){
    pool.query("SHOW COLUMNS FROM requests LIKE 'bill'", (err, rows) => {
        if (err) {
            console.error('Error checking requests bill column:', err);
            return;
        }
        if (rows.length === 0) {
            pool.query('ALTER TABLE requests ADD COLUMN bill VARCHAR(255) NULL AFTER ident', (alterErr) => {
                if (alterErr) {
                    console.error('Error adding requests bill column:', alterErr);
                    return;
                }
                console.log('Requests bill column ensured.');
            });
        }
    });
}

function ensureRequestsPhoneColumn(){
    pool.query("SHOW COLUMNS FROM requests LIKE 'phone'", (err, rows) => {
        if (err) {
            console.error('Error checking requests phone column:', err);
            return;
        }
        if (rows.length === 0) {
            pool.query("ALTER TABLE requests ADD COLUMN phone VARCHAR(50) NULL AFTER Unino", (alterErr) => {
                if (alterErr) {
                    console.error('Error adding requests phone column:', alterErr);
                    return;
                }
                console.log('Requests phone column ensured.');
            });
        }
    });
}

ensureCollegesTable();
ensureDepartmentsTable();
ensureRequestsTable();
ensureRequestsNotesColumn();
ensureRequestsBillColumn();
ensureRequestsPhoneColumn();

// Multer setup for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '..', 'uploaded'));
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|pdf/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only images and PDFs are allowed!'));
        }
    }
});

// Function to generate Reqrev
function generateReqrev() {
    const date = new Date();
    const formatTwoDigits = (value) => {
        const text = value.toString().padStart(2, '0');
        return text.startsWith('0') ? text.slice(1) : text;
    };

    const year = formatTwoDigits(date.getFullYear() % 100);
    const month = formatTwoDigits(date.getMonth() + 1);
    const day = formatTwoDigits(date.getDate());
    const sequence = formatTwoDigits(Math.floor(Math.random() * 100));

    return year + month + day + sequence;
}

// Route to upload attachments once and keep server-side filenames for later submission
app.post('/upload-attachments', upload.fields([
    { name: 'identity', maxCount: 1 },
    { name: 'photo', maxCount: 1 },
    { name: 'bill', maxCount: 1 }
]), (req, res) => {
    // Safely access files
    const identityFile = (req.files && req.files['identity']) ? req.files['identity'][0].filename : null;
    const photoFile = (req.files && req.files['photo']) ? req.files['photo'][0].filename : null;
    const billFile = (req.files && req.files['bill']) ? req.files['bill'][0].filename : null;

    if (!identityFile || !photoFile || !billFile) {
        return res.status(400).json({ success: false, message: 'يرجى رفع الهوية، الصورة الشخصية، وإشعار الدفع.' });
    }

    res.json({ success: true, identityFile, photoFile, billFile });
});

// Route to handle form submission
app.post('/submit-request', upload.fields([
    { name: 'identity', maxCount: 1 },
    { name: 'photo', maxCount: 1 },
    { name: 'bill', maxCount: 1 }
]), (req, res) => {
    const {
        faculty, department, doc_type, language, copies,
        arabic_name, english_name, nationality, university_id, phone, graduation_year,
        identityFile: storedIdentityFile, photoFile: storedPhotoFile, billFile: storedBillFile,
        bill: storedBillString
    } = req.body;

    // Debug: log incoming doc_type to verify frontend sends the subtype literal
    console.log('submit-request received doc_type:', JSON.stringify(doc_type));
    console.log('=== FULL REQ.BODY DEBUG ===');
    console.log('req.body:', JSON.stringify(req.body, null, 2));
    console.log('========================');

    // Use newly uploaded files if available, otherwise use previously stored file names
    const identityFile = req.files && req.files['identity'] ? req.files['identity'][0].filename : (storedIdentityFile || null);
    const photoFile = req.files && req.files['photo'] ? req.files['photo'][0].filename : (storedPhotoFile || null);
    const billFile = req.files && req.files['bill'] ? req.files['bill'][0].filename : (storedBillFile || storedBillString || null);

    if (!identityFile || !photoFile || !billFile) {
        return res.status(400).json({ success: false, message: 'فشل في الحصول على الهوية أو الصورة الشخصية أو إشعار الدفع. يرجى التأكد من رفع جميع الملفات.' });
    }

    const reqrev = generateReqrev();
    const reqdate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const status = 'قيد الاجراء';
    const ccno = copies || 1;

    // Debug: Show exact doc_type value received
    console.log('=== DOC_TYPE DEBUG ===');
    console.log('Received doc_type:', doc_type);
    console.log('Type of doc_type:', typeof doc_type);
    console.log('Is string:', typeof doc_type === 'string');
    console.log('Trimmed length:', typeof doc_type === 'string' ? doc_type.trim().length : 'N/A');
    console.log('======================');

    // Map doc_type to Certype.
    // If frontend now sends a specific subtype (e.g. Arabic labels like "شهادة عامة فقط" or "إفادة إكمال"),
    // store that subtype as the Certype to preserve specificity. Otherwise, fall back to legacy codes.
    let certype = 'وثيقة تخرج';
    if (typeof doc_type === 'string' && doc_type.trim()) {
        certype = doc_type;
        console.log('✓ Using string doc_type as certype:', certype);
    } else {
        console.log('✗ Doc_type is not valid string, using fallback logic');
        switch (doc_type) {
            case 'graduation':
                certype = 'وثيقة تخرج';
                break;
            case 'transcript':
                certype = 'بيان درجات';
                break;
            case 'enrollment':
                certype = 'إفادة قيد';
                break;
            default:
                certype = 'وثيقة تخرج';
        }
        console.log('Using fallback certype:', certype);
    }

    // Map language
    let lang;
    switch (language) {
        case 'arabic':
            lang = 'العربية';
            break;
        case 'english':
            lang = 'الإنجليزية';
            break;
        case 'both':
            lang = 'العربية والإنجليزية';
            break;
        default:
            lang = 'العربية';
    }

    // Get Dno from department name (assuming department is Dno)
    const dno = department;

    const query = `INSERT INTO requests (Reqrev, Astdname, Estdname, Nationality, Unino, phone, Gyear, Dno, Certype, Lang, Ccno, Status, Reqdate, Pic, ident, bill) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    pool.query(query, [
        reqrev, arabic_name, english_name, nationality, university_id || null, phone || null, graduation_year, dno, certype, lang, ccno, status, reqdate, photoFile, identityFile, billFile
    ], (err, results) => {
        if (err) {
            console.error('Error inserting data:', err);
            const errorMessage = err.sqlMessage || err.message || 'حدث خطأ في حفظ البيانات.';
            return res.status(500).json({ success: false, message: 'حدث خطأ في حفظ البيانات. ' + errorMessage });
        }
        res.json({ success: true, message: 'تم حفظ الطلب بنجاح.', reqrev: reqrev });
    });
});

// Route to update request status and store a reason note
app.post('/admin/update-request-status', (req, res) => {
    const { reqrev, status, notes } = req.body || {};

    if (!reqrev || !status) {
        return res.status(400).json({ success: false, message: 'رقم الطلب والحالة مطلوبان.' });
    }

    const allowedStatuses = ['قيد الاجراء', 'إيقاف مؤقت', 'مكتمل'];
    if (!allowedStatuses.includes(status)) {
        return res.status(400).json({ success: false, message: 'الحالة غير مدعومة.' });
    }

    if (status === 'إيقاف مؤقت') {
        const trimmedNotes = typeof notes === 'string' ? notes.trim() : '';
        if (!trimmedNotes) {
            return res.status(400).json({ success: false, message: 'يرجى إدخال سبب الإيقاف المؤقت.' });
        }
    }

    const checkQuery = 'SELECT Status, Notes FROM requests WHERE Reqrev = ?';
    pool.query(checkQuery, [reqrev], (checkErr, rows) => {
        if (checkErr) {
            console.error('Error checking request status:', checkErr);
            return res.status(500).json({ success: false, message: 'حدث خطأ عند تحديث حالة الطلب.' });
        }

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'لم يتم العثور على الطلب.' });
        }

        const currentStatus = String(rows[0].Status || '').trim();
        const editableStatuses = ['قيد الاجراء', 'إيقاف مؤقت'];
        if (!editableStatuses.includes(currentStatus)) {
            return res.status(409).json({ success: false, message: 'يمكن تعديل الحالة فقط عندما تكون الطلبات في وضع قيد الاجراء أو إيقاف مؤقت.' });
        }

        if (status === 'إيقاف مؤقت') {
            const trimmedNotes = typeof notes === 'string' ? notes.trim() : '';
            if (!trimmedNotes) {
                return res.status(400).json({ success: false, message: 'يرجى إدخال سبب الإيقاف المؤقت.' });
            }
        }

        const updateQuery = 'UPDATE requests SET Status = ?, Notes = ? WHERE Reqrev = ? AND Status = ?';
        const previousNotes = typeof rows[0].Notes === 'string' ? rows[0].Notes : null;
        const safeNotes = status === 'إيقاف مؤقت'
            ? String(notes || '').trim()
            : currentStatus === 'إيقاف مؤقت' && status === 'مكتمل'
                ? previousNotes
                : null;

        pool.query(updateQuery, [status, safeNotes, reqrev, currentStatus], (updateErr, result) => {
            if (updateErr) {
                console.error('Error updating request status:', updateErr);
                return res.status(500).json({ success: false, message: 'حدث خطأ عند تحديث حالة الطلب.' });
            }

            if (result.affectedRows === 0) {
                return res.status(409).json({ success: false, message: 'لم يتم تحديث الحالة. ربما تغيرت الحالة منذ لحظة التعديل.' });
            }

            res.json({ success: true, message: 'تم تحديث حالة الطلب وحفظ التعليق بنجاح.', status });
        });
    });
});

// Route to track a request by Reqrev
app.get('/track-request', (req, res) => {
    const reqrev = req.query.reqrev;
    if (!reqrev) {
        return res.status(400).json({ success: false, message: 'يرجى تقديم رقم الطلب للبحث.' });
    }

    const query = `
        SELECT
            r.Reqrev,
            r.Astdname,
            r.Estdname,
            r.Nationality,
            r.Unino,
            r.Gyear,
            r.Dno,
            r.Certype,
            r.Lang,
            r.Ccno,
            r.Status,
            r.Notes,
            r.Reqdate AS Reqdate,
            r.Reqdate AS reqdate,
            r.Reqdate AS requestDate,
            d.dname AS DepartmentName,
            d.dname AS department,
            f.fa_araname AS CollegeName,
            f.fa_araname AS college,
            f.fa_id AS faculty_id,
            d.dno AS department_id
        FROM requests r
        LEFT JOIN departments d ON r.Dno = d.dno
        LEFT JOIN faculties f ON d.dept_fa = f.fa_id
        WHERE r.Reqrev = ?
    `;

    pool.query(query, [reqrev], (err, results) => {
        if (err) {
            console.error('Error querying request:', err);
            return res.status(500).json({ success: false, message: 'حدث خطأ في البحث عن الطلب.' });
        }
        if (results.length === 0) {
            return res.status(404).json({ success: false, message: 'لم يتم العثور على الطلب برقم الطلب هذا.' });
        }
        res.json({ success: true, request: results[0] });
    });
});

app.get('/verify', (req, res) => {
    const input = String(req.query['university-id'] || req.query.unino || '').trim();
    if (!input) {
        return res.status(400).json({ success: false, message: 'يرجى تقديم الرقم الجامعي للتحقق.' });
    }

    const query = `
        SELECT
            student_id,
            full_name,
            entry_year,
            graduation_grade,
            DATE_FORMAT(degree_approval_date, '%Y-%m-%d') AS degree_approval_date
        FROM university_graduates
        WHERE student_id = ?
        LIMIT 1
    `;

    pool.query(query, [input], (err, results) => {
        if (err) {
            console.error('Error running verify query:', err);
            return res.status(500).json({ success: false, message: 'حدث خطأ في البحث عن السجل.' });
        }
        if (results.length === 0) {
            return res.status(404).json({ success: false, message: 'لم يتم العثور على سِجل خريج لهذا الرقم الجامعي.' });
        }
        res.json({ success: true, request: results[0] });
    });
});

app.post('/admin/login', async (req, res) => {
    const { username, password } = req.body || {};

    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'اسم المستخدم وكلمة المرور مطلوبان.' });
    }

    const query = 'SELECT id, username, password, role FROM lgours WHERE username = ? LIMIT 1';

    try {
        const rows = await new Promise((resolve, reject) => {
            pool.query(query, [username], (err, results) => {
                if (err) return reject(err);
                resolve(results);
            });
        });

        if (rows.length === 0) {
            return res.status(401).json({ success: false, message: 'بيانات الدخول غير صحيحة.' });
        }

        const user = rows[0];
        const isMatch = await bcrypt.compare(String(password), String(user.password || ''));
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'بيانات الدخول غير صحيحة.' });
        }

        const role = String(user.role || 'user').toLowerCase() === 'admin' ? 'admin' : 'user';
        return res.json({ success: true, username: user.username, role });
    } catch (err) {
        console.error('Error authenticating admin login:', err);
        return res.status(500).json({ success: false, message: 'حدث خطأ أثناء تسجيل الدخول.' });
    }
});

// Start server
const server = app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});

server.on('error', (err) => {
    if (err && err.code === 'EADDRINUSE') {
        console.error(`Port ${port} is already in use. Do NOT run the HTTP server on MySQL port 3306.`);
    } else {
        console.error('Server error:', err);
    }
    process.exit(1);
});
// Admin summary: counts by status and total
app.get('/admin/summary', (req, res) => {
    const summaryQuery = `SELECT Status, COUNT(*) as cnt FROM requests GROUP BY Status`;
    const totalQuery = `SELECT COUNT(*) as total FROM requests`;

    pool.query(summaryQuery, (err, rows) => {
        if (err) {
            console.error('Error querying summary:', err);
            return res.status(500).json({ success: false, message: 'حدث خطأ عند جلب ملخص الطلبات.' });
        }
        pool.query(totalQuery, (err2, tot) => {
            if (err2) {
                console.error('Error querying total:', err2);
                return res.status(500).json({ success: false, message: 'حدث خطأ عند جلب ملخص الطلبات.' });
            }
            const summary = {};
            let newRequests = 0;
            let completedRequests = 0;
            let pendingRequests = 0;
            rows.forEach(r => {
                const status = (r.Status || '').toString();
                summary[status] = r.cnt;
                const normalized = status.toLowerCase();
                if (/قيد|pending|processing|in progress/.test(normalized)) {
                    newRequests += r.cnt;
                    pendingRequests += r.cnt;
                }
                if (/مكتمل|completed|done/.test(normalized)) {
                    completedRequests += r.cnt;
                }
            });
            res.json({
                success: true,
                summary,
                total: (tot[0] && tot[0].total) || 0,
                newRequests,
                completedRequests,
                pendingRequests
            });
        });
    });
});

// Admin requests: return recent requests with optional filters and pagination
app.get('/admin/requests', (req, res) => {
    const limit = parseInt(req.query.limit, 10) || 20;
    const offset = parseInt(req.query.offset, 10) || 0;
    const statusFilter = req.query.status ? req.query.status.trim() : null;
    const collegeId = req.query.collegeId ? parseInt(req.query.collegeId, 10) : null;
    const departmentId = req.query.departmentId ? parseInt(req.query.departmentId, 10) : null;

    const conditions = [];
    const params = [];
    if (statusFilter) {
        conditions.push('Status LIKE ?');
        params.push('%' + statusFilter + '%');
    }
    if (departmentId) {
        conditions.push('Dno = ?');
        params.push(departmentId);
    }
    if (collegeId) {
        conditions.push('Dno IN (SELECT id FROM departments WHERE college_id = ?)');
        params.push(collegeId);
    }
    const whereClause = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    const query = `SELECT Reqrev, Astdname, Certype, Reqdate, Status, Pic, ident, bill FROM requests ${whereClause} ORDER BY Reqdate DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    pool.query(query, params, (err, results) => {
        if (err) {
            console.error('Error querying admin requests:', err);
            return res.status(500).json({ success: false, message: 'حدث خطأ عند جلب الطلبات.' });
        }
        res.json({ success: true, requests: results });
    });
});

// Admin colleges and departments management APIs
app.get('/admin/colleges', (req, res) => {
    pool.query('SELECT fa_id AS id, fa_araname AS name FROM faculties ORDER BY fa_araname', (err, rows) => {
        if (err) {
            console.error('Error querying colleges:', err);
            return res.status(500).json({ success: false, message: 'حدث خطأ عند جلب الكليات.' });
        }
        res.json({ success: true, colleges: rows });
    });
});

app.post('/admin/colleges', (req, res) => {
    const name = (req.body.name || '').trim();
    if (!name) return res.status(400).json({ success: false, message: 'اسم الكلية مطلوب.' });
    pool.query('INSERT INTO faculties (fa_araname, fa_enaname, uni_id) VALUES (?, ?, 1)', [name, name], (err, result) => {
        if (err) {
            console.error('Error inserting college:', err);
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({ success: false, message: 'الكلية موجودة بالفعل.' });
            }
            return res.status(500).json({ success: false, message: 'حدث خطأ عند إضافة الكلية.' });
        }
        res.json({ success: true, message: 'تمت إضافة الكلية بنجاح.', collegeId: result.insertId });
    });
});

app.put('/admin/colleges/:id', (req, res) => {
    const id = parseInt(req.params.id, 10);
    const name = (req.body.name || '').trim();
    if (!id || !name) return res.status(400).json({ success: false, message: 'بيانات الكلية غير صحيحة.' });
    pool.query('UPDATE faculties SET fa_araname = ?, fa_enaname = ? WHERE fa_id = ?', [name, name, id], (err, result) => {
        if (err) {
            console.error('Error updating college:', err);
            return res.status(500).json({ success: false, message: 'حدث خطأ عند تحديث الكلية.' });
        }
        if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'الكلية غير موجودة.' });
        res.json({ success: true, message: 'تم تحديث الكلية.' });
    });
});

app.delete('/admin/colleges/:id', (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ success: false, message: 'معرف الكلية غير صحيح.' });
    pool.query('DELETE FROM faculties WHERE fa_id = ?', [id], (err, result) => {
        if (err) {
            console.error('Error deleting college:', err);
            return res.status(500).json({ success: false, message: 'حدث خطأ عند حذف الكلية.' });
        }
        if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'الكلية غير موجودة.' });
        res.json({ success: true, message: 'تم حذف الكلية.' });
    });
});

app.get('/admin/departments', (req, res) => {
    const query = `SELECT d.dno AS id, d.dname AS name, d.dept_fa AS college_id, f.fa_araname AS collegeName
                   FROM departments d
                   LEFT JOIN faculties f ON f.fa_id = d.dept_fa
                   ORDER BY f.fa_araname, d.dname`;
    pool.query(query, (err, rows) => {
        if (err) {
            console.error('Error querying departments:', err);
            return res.status(500).json({ success: false, message: 'حدث خطأ عند جلب الأقسام.' });
        }
        res.json({ success: true, departments: rows });
    });
});

app.post('/admin/departments', (req, res) => {
    const name = (req.body.name || '').trim();
    const collegeId = parseInt(req.body.college_id, 10);
    if (!name || !collegeId) return res.status(400).json({ success: false, message: 'اسم القسم والكلية مطلوبان.' });
    pool.query('INSERT INTO departments (dname, dename, dept_Pro, dept_fa, dStatus) VALUES (?, ?, ?, ?, 1)', [name, name, 'بكالريوس', collegeId], (err, result) => {
        if (err) {
            console.error('Error inserting department:', err);
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({ success: false, message: 'القسم موجود بالفعل في هذه الكلية.' });
            }
            return res.status(500).json({ success: false, message: 'حدث خطأ عند إضافة القسم.' });
        }
        res.json({ success: true, message: 'تمت إضافة القسم بنجاح.', departmentId: result.insertId });
    });
});

app.put('/admin/departments/:id', (req, res) => {
    const id = parseInt(req.params.id, 10);
    const name = (req.body.name || '').trim();
    const collegeId = parseInt(req.body.college_id, 10);
    if (!id || !name || !collegeId) return res.status(400).json({ success: false, message: 'بيانات القسم غير صحيحة.' });
    pool.query('UPDATE departments SET dname = ?, dename = ?, dept_fa = ?, dept_Pro = ?, dStatus = 1 WHERE dno = ?', [name, name, collegeId, 'بكالريوس', id], (err, result) => {
        if (err) {
            console.error('Error updating department:', err);
            return res.status(500).json({ success: false, message: 'حدث خطأ عند تحديث القسم.' });
        }
        if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'القسم غير موجود.' });
        res.json({ success: true, message: 'تم تحديث القسم.' });
    });
});

app.delete('/admin/departments/:id', (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ success: false, message: 'معرف القسم غير صحيح.' });
    pool.query('DELETE FROM departments WHERE dno = ?', [id], (err, result) => {
        if (err) {
            console.error('Error deleting department:', err);
            return res.status(500).json({ success: false, message: 'حدث خطأ عند حذف القسم.' });
        }
        if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'القسم غير موجود.' });
        res.json({ success: true, message: 'تم حذف القسم.' });
    });
});

app.get('/admin/reports', (req, res) => {
    const statusQuery = `SELECT status, COUNT(*) AS cnt FROM requests GROUP BY status`;
    const topCollegesQuery = `SELECT f.fa_id AS id, f.fa_araname AS name, COUNT(r.reqno) AS requests
                              FROM faculties f
                              LEFT JOIN departments d ON d.dept_fa = f.fa_id
                              LEFT JOIN requests r ON r.dno = d.dno
                              GROUP BY f.fa_id
                              ORDER BY requests DESC
                              LIMIT 5`;
    const topDepartmentsQuery = `SELECT d.dno AS id, d.dname AS name, f.fa_araname AS collegeName, COUNT(r.reqno) AS requests
                                 FROM departments d
                                 LEFT JOIN faculties f ON f.fa_id = d.dept_fa
                                 LEFT JOIN requests r ON r.dno = d.dno
                                 GROUP BY d.dno
                                 ORDER BY requests DESC
                                 LIMIT 5`;
    const docsQuery = `SELECT certype, COUNT(*) AS cnt FROM requests GROUP BY certype`;
    const totalsQuery = `SELECT (SELECT COUNT(*) FROM faculties) AS colleges, (SELECT COUNT(*) FROM departments) AS departments, (SELECT COUNT(*) FROM requests) AS requests`;

    pool.query(statusQuery, (err, statusRows) => {
        if (err) {
            console.error('Error querying report status:', err);
            return res.status(500).json({ success: false, message: 'حدث خطأ عند جلب التقارير.' });
        }
        pool.query(topCollegesQuery, (err2, collegeRows) => {
            if (err2) {
                console.error('Error querying top colleges:', err2);
                return res.status(500).json({ success: false, message: 'حدث خطأ عند جلب التقارير.' });
            }
            pool.query(topDepartmentsQuery, (err3, departmentRows) => {
                if (err3) {
                    console.error('Error querying top departments:', err3);
                    return res.status(500).json({ success: false, message: 'حدث خطأ عند جلب التقارير.' });
                }
                pool.query(docsQuery, (err4, docRows) => {
                    if (err4) {
                        console.error('Error querying document types:', err4);
                        return res.status(500).json({ success: false, message: 'حدث خطأ عند جلب التقارير.' });
                    }
                    pool.query(totalsQuery, (err5, totalRows) => {
                        if (err5) {
                            console.error('Error querying totals:', err5);
                            return res.status(500).json({ success: false, message: 'حدث خطأ عند جلب التقارير.' });
                        }
                        res.json({
                            success: true,
                            statusSummary: statusRows.reduce((acc, row) => ({ ...acc, [row.status || 'غير معروف']: row.cnt }), {}),
                            topColleges: collegeRows,
                            topDepartments: departmentRows,
                            documentSummary: docRows,
                            totals: totalRows[0] || { colleges: 0, departments: 0, requests: 0 }
                        });
                    });
                });
            });
        });
    });
});

// Serve admin dashboard HTML through server
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'admincp.html'));
});

app.get('/admin/users-page', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'admin-users.html'));
});

// Users management API backed by lgours
app.get('/admin/users', (req, res) => {
    pool.query('SELECT id, username, role FROM lgours ORDER BY id', (err, rows) => {
        if(err) { console.error(err); return res.status(500).json({ success:false, message:'DB error' }); }
        res.json({ success:true, users: rows });
    });
});

app.post('/admin/users', async (req, res) => {
    const { username, password, role } = req.body || {};
    if(!username || !password) return res.status(400).json({ success:false, message: 'username and password required' });

    try {
        const hashedPassword = await bcrypt.hash(String(password), 10);
        const normalizedRole = role === 'admin' ? 'admin' : 'user';
        pool.query('INSERT INTO lgours (username, password, role) VALUES (?, ?, ?)', [username, hashedPassword, normalizedRole], (err) => {
            if(err){
                console.error(err);
                if(err.code === 'ER_DUP_ENTRY') return res.status(409).json({ success:false, message:'اسم المستخدم موجود بالفعل.' });
                return res.status(500).json({ success:false, message:'DB error' });
            }
            res.json({ success:true, message:'تمت الإضافة.' });
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success:false, message:'DB error' });
    }
});

app.put('/admin/users/:id', async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const { role, password } = req.body || {};
    if(!id) return res.status(400).json({ success:false, message:'Invalid id' });
    const updates = [];
    const params = [];
    if(role) { updates.push('role = ?'); params.push(role === 'admin' ? 'admin' : 'user'); }
    if(password) {
        const hashedPassword = await bcrypt.hash(String(password), 10);
        updates.push('password = ?');
        params.push(hashedPassword);
    }
    if(updates.length === 0) return res.status(400).json({ success:false, message:'Nothing to update' });
    params.push(id);
    const q = 'UPDATE lgours SET ' + updates.join(', ') + ' WHERE id = ?';
    pool.query(q, params, (err) => {
        if(err){ console.error(err); return res.status(500).json({ success:false, message:'DB error' }); }
        res.json({ success:true, message:'تم التحديث.' });
    });
});

app.delete('/admin/users/:id', (req, res) => {
    const id = parseInt(req.params.id, 10);
    if(!id) return res.status(400).json({ success:false, message:'Invalid id' });
    pool.query('DELETE FROM lgours WHERE id = ?', [id], (err, result) => {
        if(err){ console.error(err); return res.status(500).json({ success:false, message:'DB error' }); }
        if(result.affectedRows === 0) return res.status(404).json({ success:false, message:'المستخدم غير موجود.' });
        res.json({ success:true, message:'تم الحذف.' });
    });
});

// Global error handler for multer and other errors - return JSON so frontend can parse
app.use((err, req, res, next) => {
    if (!err) return next();
    console.error('Unhandled error:', err);
    if (err instanceof multer.MulterError) {
        return res.status(400).json({ success: false, message: err.message });
    }
    // Generic error (including from fileFilter)
    return res.status(400).json({ success: false, message: err.message || 'حدث خطأ في الخادم.' });
});

