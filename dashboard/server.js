require('dotenv').config();

const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');

const {
    getApplicationCounts,
    getRecentApplications,
    getStaffStats,
    getApplicationById
} = require('../database/db');

const app = express();
const PORT = process.env.DASHBOARD_PORT || 3000;

app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: process.env.SESSION_SECRET || 'fade-dashboard-secret',
    resave: false,
    saveUninitialized: false
}));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

function requireAuth(req, res, next) {
    if (req.session.authenticated) return next();
    res.redirect('/login');
}

app.get('/login', (req, res) => {
    res.send(`
        <body style="background:#111318;color:white;font-family:Arial;display:flex;align-items:center;justify-content:center;height:100vh;">
            <form method="POST" action="/login" style="background:#1b1e26;padding:30px;border-radius:14px;width:320px;">
                <h2>FADE Dashboard</h2>
                <input name="password" type="password" placeholder="Пароль" style="width:100%;padding:12px;margin:15px 0;background:#111318;color:white;border:1px solid #333;border-radius:8px;">
                <button style="width:100%;padding:12px;background:#5865f2;color:white;border:0;border-radius:8px;">Войти</button>
            </form>
        </body>
    `);
});

app.post('/login', (req, res) => {
    if (req.body.password === process.env.DASHBOARD_PASSWORD) {
        req.session.authenticated = true;
        return res.redirect('/');
    }

    res.redirect('/login');
});

app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/login');
    });
});

app.use('/transcripts', requireAuth, express.static(path.join(process.cwd(), 'transcripts')));

app.get('/', requireAuth, (req, res) => {
    const counts = getApplicationCounts();
    const recent = getRecentApplications(20);
    const stats = getStaffStats();

    const transcriptsDir = path.join(process.cwd(), 'transcripts');

    const transcripts = fs.existsSync(transcriptsDir)
        ? fs.readdirSync(transcriptsDir).filter(file => file.endsWith('.html'))
        : [];

    res.render('index', {
        counts,
        recent,
        stats,
        transcripts
    });
});

app.get('/applications/:id', requireAuth, (req, res) => {
    const application = getApplicationById(req.params.id);

    if (!application) {
        return res.status(404).send('Заявка не найдена');
    }

    res.render('application', {
        application
    });
});

app.listen(PORT, () => {
    console.log(`🌐 Dashboard запущен: http://localhost:${PORT}`);
});