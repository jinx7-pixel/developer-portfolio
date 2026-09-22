// server.js — Express + MySQL backend for the portfolio contact form,
// with optional Gmail SMTP notification.
//
// Responsibilities:
//   - Serve the static portfolio (index.html, css/, js/, assets/) from this same process
//   - Provide POST /api/contact to persist submissions into MySQL `portfolio_db.contact_messages`
//   - Send an email notification to EMAIL_TO after a successful DB insert (best-effort)
//   - Provide GET  /api/health for a quick DB-connection check
//
// Credentials live in .env (gitignored). Never hardcoded.

require('dotenv').config();

const path = require('path');
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const nodemailer = require('nodemailer');

// ---- Config ----------------------------------------------------------------
const PORT = parseInt(process.env.PORT, 10) || 3000;

const dbConfig = {
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'portfolio_db',
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0,
};

const emailConfig = {
    host: process.env.EMAIL_HOST || '',
    port: parseInt(process.env.EMAIL_PORT, 10) || 465,
    secure: String(process.env.EMAIL_SECURE || 'true').toLowerCase() !== 'false',
    user: process.env.EMAIL_USER || '',
    pass: process.env.EMAIL_APP_PASSWORD || '',
    to: process.env.EMAIL_TO || '',
};

const EMAIL_ENABLED = Boolean(emailConfig.host && emailConfig.user && emailConfig.pass);

// ---- DB pool ---------------------------------------------------------------
const pool = mysql.createPool(dbConfig);

// ---- Email transporter (only if all required creds present) -----------------
let transporter = null;
if (EMAIL_ENABLED) {
    transporter = nodemailer.createTransport({
        host: emailConfig.host,
        port: emailConfig.port,
        secure: emailConfig.secure,
        auth: {
            user: emailConfig.user,
            pass: emailConfig.pass,
        },
        // Reject self-signed / invalid certs is already nodemailer's default; left implicit.
    });
    console.log(`[email] transporter configured (host=${emailConfig.host}, port=${emailConfig.port}, secure=${emailConfig.secure}, to=${emailConfig.to})`);
    // Verify connectivity in the background; never block startup on this.
    transporter.verify()
        .then(() => console.log('[email] SMTP verify OK'))
        .catch((err) => console.warn('[email] SMTP verify failed (will retry on next send):', err.message));
} else {
    console.warn('[email] disabled — set EMAIL_HOST, EMAIL_USER, and EMAIL_APP_PASSWORD in .env to enable notifications.');
}

// ---- App -------------------------------------------------------------------
const app = express();

app.use(cors());                  // safe even when serving static from same origin
app.use(express.json({ limit: '64kb' }));
app.use(express.static(path.join(__dirname), { extensions: ['html'] }));

// ---- Validation ------------------------------------------------------------
const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateContactPayload(body) {
    const errors = [];
    const get = (k) => (typeof body?.[k] === 'string' ? body[k].trim() : '');

    const name = get('name');
    const email = get('email');
    const subject = get('subject');
    const message = get('message');

    if (!name) errors.push('Name is required.');
    else if (name.length > 100) errors.push('Name must be 100 characters or fewer.');

    if (!email) errors.push('Email is required.');
    else if (email.length > 255) errors.push('Email must be 255 characters or fewer.');
    else if (!EMAIL_RX.test(email)) errors.push('Email is not a valid address.');

    if (!message) errors.push('Message is required.');
    else if (message.length > 5000) errors.push('Message must be 5000 characters or fewer.');

    return { errors, name, email, subject, message };
}

function escapeHtml(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function formatIst(d) {
    return d.toLocaleString('en-IN', {
        weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        timeZone: 'Asia/Kolkata',
    });
}

async function sendNotificationEmail({ rowId, name, email, subject, message, submittedAt }) {
    if (!transporter) return;

    const submittedIst = formatIst(submittedAt);

    const text = [
        'New Portfolio Contact Form Submission',
        '======================================',
        '',
        `Row ID    : ${rowId}`,
        `Name      : ${name}`,
        `Email     : ${email}`,
        `Subject   : ${subject || '(none)'}`,
        `Submitted : ${submittedIst} IST`,
        '',
        'Message:',
        '--------',
        message,
    ].join('\n');

    const html = `
<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0f172a;">
    <div style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;padding:28px;">
      <h2 style="margin:0 0 6px;font-size:20px;color:#0f172a;">New Portfolio Contact Form Submission</h2>
      <p style="margin:0 0 20px;color:#64748b;font-size:13px;">A visitor submitted the contact form on your portfolio.</p>

      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <tr><td style="padding:6px 0;color:#64748b;width:120px;">Row ID</td><td style="padding:6px 0;color:#0f172a;">#${escapeHtml(rowId)}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b;">Name</td><td style="padding:6px 0;color:#0f172a;"><strong>${escapeHtml(name)}</strong></td></tr>
        <tr><td style="padding:6px 0;color:#64748b;">Email</td><td style="padding:6px 0;"><a href="mailto:${escapeHtml(email)}" style="color:#2563eb;text-decoration:none;">${escapeHtml(email)}</a></td></tr>
        <tr><td style="padding:6px 0;color:#64748b;">Subject</td><td style="padding:6px 0;color:#0f172a;">${escapeHtml(subject || '(none)')}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b;">Submitted</td><td style="padding:6px 0;color:#0f172a;">${escapeHtml(submittedIst)} <span style="color:#64748b;">IST</span></td></tr>
      </table>

      <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;" />

      <h3 style="margin:0 0 10px;font-size:14px;color:#64748b;text-transform:uppercase;letter-spacing:.05em;">Message</h3>
      <div style="white-space:pre-wrap;font-size:14px;line-height:1.6;color:#0f172a;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px;">${escapeHtml(message)}</div>

      <p style="margin:20px 0 0;color:#64748b;font-size:12px;">Reply directly to this email — your reply will go to ${escapeHtml(email)}.</p>
    </div>
  </body>
</html>`;

    return transporter.sendMail({
        from: `"Portfolio Bot" <${emailConfig.user}>`,
        to: emailConfig.to,
        replyTo: email,
        subject: 'New Portfolio Contact Form Submission',
        text,
        html,
    });
}

async function sendVisitorConfirmation({ rowId, name, email, subject, message, submittedAt }) {
    if (!transporter) return;

    const submittedIst = formatIst(submittedAt);

    const text = [
        `Hi ${name},`,
        '',
        'Thank you for contacting us.',
        'We have received your message and will get back to you as soon as possible.',
        '',
        'Your submission details:',
        `Name: ${name}`,
        `Email: ${email}`,
        `Subject: ${subject || '(none)'}`,
        `Message: ${message}`,
        '',
        'Thank you,',
        'Jinx',
    ].join('\n');

    const html = `
<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0f172a;">
    <div style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;padding:28px;">
      <h2 style="margin:0 0 12px;font-size:20px;color:#0f172a;">Thanks for contacting Jinx</h2>
      <p style="margin:0 0 6px;color:#1e293b;font-size:15px;line-height:1.6;">Hi ${escapeHtml(name)},</p>
      <p style="margin:0 0 24px;color:#1e293b;font-size:15px;line-height:1.6;">Thank you for contacting us. We have received your message and will get back to you as soon as possible.</p>

      <h3 style="margin:0 0 10px;font-size:13px;color:#64748b;text-transform:uppercase;letter-spacing:.05em;">Your submission details</h3>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <tr><td style="padding:6px 0;color:#64748b;width:120px;">Name</td><td style="padding:6px 0;color:#0f172a;">${escapeHtml(name)}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b;">Email</td><td style="padding:6px 0;color:#0f172a;">${escapeHtml(email)}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b;">Subject</td><td style="padding:6px 0;color:#0f172a;">${escapeHtml(subject || '(none)')}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b;vertical-align:top;">Message</td><td style="padding:6px 0;color:#0f172a;white-space:pre-wrap;">${escapeHtml(message)}</td></tr>
      </table>

      <p style="margin:24px 0 4px;color:#1e293b;font-size:15px;line-height:1.6;">Thank you,</p>
      <p style="margin:0;color:#0f172a;font-size:15px;font-weight:600;">Jinx</p>

      <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;" />
      <p style="margin:0;color:#94a3b8;font-size:12px;">Reference ID: ${escapeHtml(rowId)} &middot; Submitted ${escapeHtml(submittedIst)} IST</p>
    </div>
  </body>
</html>`;

    return transporter.sendMail({
        from: `"Jinx" <${emailConfig.user}>`,
        to: email,
        replyTo: emailConfig.to,
        subject: 'Thanks for contacting Jinx',
        text,
        html,
    });
}

// ---- Routes ----------------------------------------------------------------
app.get('/api/health', async (_req, res) => {
    let dbOk = false;
    let dbErr = null;
    try {
        const conn = await pool.getConnection();
        try {
            await conn.query('SELECT 1');
            dbOk = true;
        } finally {
            conn.release();
        }
    } catch (err) {
        dbErr = err.message;
    }

    let emailStatus = 'disabled';
    if (transporter) {
        try {
            await transporter.verify();
            emailStatus = 'up';
        } catch (err) {
            emailStatus = `down (${err.message})`;
        }
    }

    res.status(dbOk ? 200 : 500).json({
        ok: dbOk,
        db: dbOk ? 'up' : 'down',
        dbError: dbErr || undefined,
        email: emailStatus,
        database: dbConfig.database,
    });
});

app.post('/api/contact', async (req, res) => {
    const { errors, name, email, subject, message } = validateContactPayload(req.body);

    if (errors.length) {
        return res.status(400).json({ ok: false, errors });
    }

    // Schema note: contact_messages has columns (name, email, message, created_at).
    // We preprend the optional subject line into the message body so no user input is lost
    // without altering the agreed schema.
    const finalMessage = subject
        ? `Subject: ${subject}\n\n${message}`
        : message;

    let insertId = null;
    try {
        const [result] = await pool.execute(
            'INSERT INTO contact_messages (name, email, message) VALUES (?, ?, ?)',
            [name, email, finalMessage]
        );
        insertId = result.insertId;
        console.log(`[contact] stored id=${insertId} name="${name}" email="${email}"`);
    } catch (err) {
        console.error('[contact] insert failed:', err);
        return res.status(500).json({ ok: false, error: 'Failed to save message.' });
    }

    // Capture the timestamp once so the persisted created_at and the email body agree closely.
    const submittedAt = new Date();

    // Respond to the client the instant the DB row is committed. SMTP traffic can be slow
    // and must NEVER delay the user-visible success message. Both emails run in the
    // background after this response is flushed; any failure is logged but does not
    // roll back the (already-committed) row, and the client has already received 200.
    res.json({ ok: true, id: insertId, email: 'queued', confirmation: 'queued' });

    if (transporter) {
        sendNotificationEmail({
            rowId: insertId,
            name, email, subject, message,
            submittedAt,
        })
            .then(() => console.log(`[email] owner notification sent for id=${insertId}`))
            .catch((err) => console.error(`[email] owner notification failed for id=${insertId} (DB row kept):`, err.message && err.message.split('\n')[0]));

        sendVisitorConfirmation({
            rowId: insertId,
            name, email, subject, message,
            submittedAt,
        })
            .then(() => console.log(`[email] visitor confirmation sent for id=${insertId}`))
            .catch((err) => console.error(`[email] visitor confirmation failed for id=${insertId} (DB row kept):`, err.message && err.message.split('\n')[0]));
    } else {
        console.warn(`[email] skipped for id=${insertId} (no transporter configured)`);
    }
});

// 404 for unknown /api/* routes (does not interfere with the static SPA fallback)
app.use('/api', (_req, res) => res.status(404).json({ ok: false, error: 'Not found' }));

// ---- Startup ---------------------------------------------------------------
async function verifyDbOrExit() {
    try {
        const conn = await pool.getConnection();
        try {
            await conn.query('SELECT 1');
            console.log(`[db] connected to ${dbConfig.database} as ${dbConfig.user} @ ${dbConfig.host}:${dbConfig.port}`);
        } finally {
            conn.release();
        }
    } catch (err) {
        console.error('[db] connection failed:', err.message);
        console.error('[server] refusing to start. Check DB_HOST / DB_PORT / DB_USER / DB_PASSWORD / DB_NAME in .env.');
        process.exit(1);
    }
}

(async () => {
    await verifyDbOrExit();

    app.listen(PORT, () => {
        console.log(`[server] listening on http://localhost:${PORT}`);
        console.log(`[server] open http://localhost:${PORT} in your browser to view the portfolio.`);
    });
})();
