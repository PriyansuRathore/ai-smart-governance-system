const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // Gmail App Password
  },
});

const STATUS_MESSAGES = {
  pending:     { subject: '📋 Complaint received — we\'re on it', color: '#f59e0b', label: 'Received' },
  in_progress: { subject: '🔄 Your complaint is being worked on',  color: '#3b82f6', label: 'In Progress' },
  resolved:    { subject: '✅ Your complaint has been resolved',    color: '#16a37a', label: 'Resolved' },
};

async function sendStatusEmail(complaint) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS ||
      process.env.EMAIL_USER === 'your_gmail@gmail.com') return;

  const info = STATUS_MESSAGES[complaint.status] || STATUS_MESSAGES.pending;
  const isNew = complaint.status === 'pending';

  const html = `
    <div style="font-family:Segoe UI,sans-serif;max-width:560px;margin:0 auto;background:#f0f5f9;padding:2rem;border-radius:16px;">
      <div style="background:white;border-radius:12px;padding:2rem;box-shadow:0 4px 16px rgba(0,0,0,0.08);">
        <div style="background:#0f2d48;padding:1.2rem 1.5rem;border-radius:10px;margin-bottom:1.5rem;">
          <h1 style="color:white;margin:0;font-size:1.2rem;">🏛️ AI Smart Governance</h1>
        </div>
        <h2 style="color:#0f2d48;margin-bottom:0.5rem;">${info.subject}</h2>
        <p style="color:#5a7a8e;">Hi <strong>${complaint.citizenName}</strong>, ${isNew ? 'your complaint has been received and routed to the right department.' : 'here\'s an update on your complaint.'}</p>
        <div style="background:#f8fafc;border-radius:10px;padding:1.2rem;margin:1.2rem 0;border-left:4px solid ${info.color};">
          <p style="margin:0 0 0.5rem;color:#5a7a8e;font-size:0.85rem;">COMPLAINT #${complaint.id}</p>
          <p style="margin:0 0 0.75rem;color:#0f2d48;font-weight:600;">${complaint.description}</p>
          <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
            <span style="background:${info.color};color:white;padding:0.25rem 0.75rem;border-radius:999px;font-size:0.8rem;font-weight:700;">${info.label}</span>
            <span style="background:#e2e8f0;color:#475569;padding:0.25rem 0.75rem;border-radius:999px;font-size:0.8rem;">${complaint.department}</span>
            <span style="background:#e2e8f0;color:#475569;padding:0.25rem 0.75rem;border-radius:999px;font-size:0.8rem;">Priority: ${complaint.priority}</span>
            <span style="background:#e2e8f0;color:#475569;padding:0.25rem 0.75rem;border-radius:999px;font-size:0.8rem;">Category: ${complaint.category}</span>
          </div>
        </div>
        ${isNew ? '<p style="color:#5a7a8e;font-size:0.88rem;">You can track your complaint status at any time using your email address.</p>' : ''}
        <p style="color:#5a7a8e;font-size:0.88rem;">If you have questions, reply to this email.</p>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:1.5rem 0;">
        <p style="color:#94a3b8;font-size:0.8rem;text-align:center;">AI Smart Governance System · Automated notification</p>
      </div>
    </div>
  `;

  try {
    await transporter.sendMail({
      from:    `"AI Governance" <${process.env.EMAIL_USER}>`,
      to:      complaint.email,
      subject: `${info.subject} — Complaint #${complaint.id}`,
      html,
    });
  } catch (err) {
    console.error('Email send failed:', err.message);
  }
}

async function sendOfficialReplyEmail(complaint, comment) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS ||
      process.env.EMAIL_USER === 'your_gmail@gmail.com') return;

  const html = `
    <div style="font-family:Segoe UI,sans-serif;max-width:560px;margin:0 auto;background:#f0f5f9;padding:2rem;border-radius:16px;">
      <div style="background:white;border-radius:12px;padding:2rem;box-shadow:0 4px 16px rgba(0,0,0,0.08);">
        <div style="background:#0f2d48;padding:1.2rem 1.5rem;border-radius:10px;margin-bottom:1.5rem;">
          <h1 style="color:white;margin:0;font-size:1.2rem;">&#127963;&#65039; AI Smart Governance</h1>
        </div>
        <h2 style="color:#0f2d48;margin-bottom:0.5rem;">&#128172; Official response on your complaint</h2>
        <p style="color:#5a7a8e;">Hi <strong>${complaint.citizenName}</strong>, ${comment.authorName} from <strong>${complaint.department}</strong> has responded to your complaint.</p>
        <div style="background:#f0f7ff;border-radius:10px;padding:1.2rem;margin:1.2rem 0;border-left:4px solid #3b82f6;">
          <p style="margin:0 0 0.5rem;color:#5a7a8e;font-size:0.85rem;">COMPLAINT #${complaint.id}</p>
          <p style="margin:0 0 0.75rem;color:#0f2d48;font-weight:600;">${complaint.description}</p>
          <div style="background:white;border-radius:8px;padding:1rem;margin-top:0.75rem;">
            <p style="margin:0 0 0.4rem;font-size:0.8rem;color:#2563eb;font-weight:700;">${comment.authorName} (${comment.role}):</p>
            <p style="margin:0;color:#1e293b;line-height:1.6;">${comment.text}</p>
          </div>
        </div>
        <p style="color:#5a7a8e;font-size:0.88rem;">View the full ticket and reply at your complaint tracking page.</p>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:1.5rem 0;">
        <p style="color:#94a3b8;font-size:0.8rem;text-align:center;">AI Smart Governance System &middot; Automated notification</p>
      </div>
    </div>
  `;

  try {
    await transporter.sendMail({
      from:    `"AI Governance" <${process.env.EMAIL_USER}>`,
      to:      complaint.email,
      subject: `Official response on Complaint #${complaint.id}`,
      html,
    });
  } catch (err) {
    console.error('Email send failed:', err.message);
  }
}

module.exports = { sendStatusEmail, sendOfficialReplyEmail };
