const express = require('express');
const nodemailer = require('nodemailer');
const multer = require('multer');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Configure multer for file uploads (max 25MB per file)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }
});

// Configure email service
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Support ticket endpoint
app.post('/api/send-support-email', upload.any(), async (req, res) => {
  try {
    const { name, message } = req.body;

    if (!name || !message) {
      return res.status(400).json({ error: 'Name and message are required' });
    }

    // Prepare attachments
    const attachments = (req.files || []).map(file => ({
      filename: file.originalname,
      content: file.buffer
    }));

    // Send email with timeout
    const emailPromise = transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: 'alder-it-support@askalder.com',
      subject: `New Support Ticket from ${name}`,
      html: `
        <h2>New Support Ticket</h2>
        <p><strong>From:</strong> ${name}</p>
        <p><strong>Message:</strong></p>
        <p>${message.replace(/\n/g, '<br>')}</p>
        <p><strong>Files Attached:</strong> ${attachments.length}</p>
      `,
      attachments: attachments
    });

    await Promise.race([
      emailPromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Email timeout')), 30000))
    ]);

    res.json({ success: true, message: 'Ticket submitted successfully' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to submit ticket: ' + error.message });
  }
});
