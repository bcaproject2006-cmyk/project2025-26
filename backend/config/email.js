const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

// Configure transporter using environment variables
const transporter = nodemailer.createTransport({
  service: 'gmail', // or your SMTP provider
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * Universal email sender with optional attachment
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject line
 * @param {string} text - Plain text body (used if html is not provided)
 * @param {string|null} [html=null] - HTML body (optional)
 * @param {string|null} [attachmentPath=null] - Full file path to attach (optional)
 * @returns {Promise<void>}
 */
const sendEmail = async (to, subject, text, html = null, attachmentPath = null) => {
  // Basic validation
  if (!to || !subject || (!text && !html)) {
    throw new Error('Missing required email parameters (to, subject, and either text or html)');
  }

  const mailOptions = {
    from: `"FreshBasket" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    text,
    html: html || text, // fallback to text if html not provided
  };

  // Handle attachment if provided
  if (attachmentPath) {
    try {
      // Check if file exists
      await fs.promises.access(attachmentPath, fs.constants.R_OK);
      mailOptions.attachments = [
        {
          filename: path.basename(attachmentPath),
          path: attachmentPath,
        },
      ];
    } catch (err) {
      console.warn(`Attachment file not accessible: ${attachmentPath}`, err.message);
      // Continue without attachment – don't break the email
    }
  }

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent to ${to} (Message ID: ${info.messageId})`);
  } catch (error) {
    console.error('❌ Email sending failed:', error);
    // Re-throw so calling function can handle if needed
    throw error;
  }
};

module.exports = sendEmail;