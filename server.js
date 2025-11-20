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

// Configure email service with SendGrid
const transporter = nodemailer.createTransport({
  host: 'smtp.sendgrid.net',
  port: 465,
  secure: true,
  auth: {
    user: 'apikey',
    pass: process.env.SENDGRID_API_KEY
  }
});

// Support ticket endpoint
app.post('/api/send-support-email', upload.any(), async (req, res) => {
  try {
    console.log('Received support ticket request');
    const { name, message } = req.body;

    if (!name || !message) {
      console.log('Missing name or message');
      return res.status(400).json({ error: 'Name and message are required' });
    }

    console.log('Preparing attachments...');
    // Prepare attachments
    const attachments = (req.files || []).map(file => ({
      filename: file.originalname,
      content: file.buffer
    }));

    console.log('Sending email to alder-it-support@askalder.com via SendGrid');
    // Send email
    const result = await transporter.sendMail({
      from: 'noreply@askalder.com',
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

    console.log('Email sent successfully:', result);
    res.json({ success: true, message: 'Ticket submitted successfully' });
  } catch (error) {
    console.error('Error details:', error);
    res.status(500).json({ error: 'Failed to submit ticket: ' + error.message });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
