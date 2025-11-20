// --- 1. CORE IMPORTS ---
const express = require('express');
const cors = require('cors');
const multer = require('multer'); // For handling file uploads
require('dotenv').config();

// *** CRITICAL CHANGE: Use the official SendGrid library ***
const sgMail = require('@sendgrid/mail'); 
sgMail.setApiKey(process.env.SENDGRID_API_KEY); // Initialize API key once

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json()); 

// Configure multer for file uploads (max 25MB per file)
const upload = multer({
    storage: multer.memoryStorage(), // Stores file data in memory (as a buffer)
    limits: { fileSize: 25 * 1024 * 1024 } // 25MB limit
});

// REMOVED: All Nodemailer/transporter code that was causing the connection timeout.

// Support ticket endpoint
app.post('/api/send-support-email', upload.any(), async (req, res) => {
    try {
        console.log('Received support ticket request');
        
        // Data from the form (assuming 'message' is the issue description)
        // NOTE: If your frontend sends 'senderEmail', it needs to be explicitly collected here.
        const { name, message, senderEmail } = req.body; 

        // Input validation
        if (!name || !message) {
            console.log('Missing name or message');
            return res.status(400).json({ error: 'Name and message are required' });
        }
        
        // Prepare attachments: Convert buffer to Base64 for SendGrid API
        const attachments = (req.files || []).map(file => ({
            filename: file.originalname,
            content: file.buffer.toString('base64'), 
            type: file.mimetype,
            disposition: 'attachment'
        }));
        
        // --- SendGrid Web API Message Object ---
        const msg = {
            to: 'alder-it-support@askalder.com', // Recipient
            from: process.env.SUPPORT_FROM_EMAIL || 'noreply@askalder.com', // Must be verified sender
            replyTo: senderEmail, // So your team can reply directly to the user
            subject: `[Support Ticket] New Request from ${name}`,
            html: `
                <h2>New Support Ticket Submitted</h2>
                <p><strong>Name:</strong> ${name}</p>
                <p><strong>Reply-to:</strong> ${senderEmail || 'N/A'}</p>
                <hr>
                <h3>Issue Description:</h3>
                <p>${message.replace(/\n/g, '<br>')}</p>
                <p><strong>Files Attached:</strong> ${attachments.length}</p>
                <hr>
                <p>Please log in to your support portal to manage this ticket.</p>
            `,
            attachments: attachments
        };

        console.log('Attempting to send email via SendGrid Web API...');
        
        // --- Call the secure Web API function ---
        await sgMail.send(msg); 

        console.log('Email sent successfully via Web API.');
        res.json({ success: true, message: 'Ticket submitted successfully' });

    } catch (error) {
        // This catches errors from the SendGrid API (e.g., 401, 403)
        console.error('Error details in server.js:', error);
        
        // Log detailed error body from SendGrid if available
        if (error.response && error.response.body) {
            console.error('SendGrid Response Error:', error.response.body);
        }
        
        // Send a generic 500 response to the client
        res.status(500).json({ error: 'Failed to submit ticket: SendGrid Web API failure. Check logs.' });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
