const nodemailer = require('nodemailer');
require('dotenv').config();

const username = process.env.EMAIL_USERNAME;
const password = process.env.EMAIL_PASSWORD 

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: username,
    pass: password,
  },
});

const sendEmail = async (to, subject, htmlContent) => {
  const mailOptions = {
    from: `"צוות הדדי" <${username}>`,
    to,
    subject,
    html: htmlContent,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Email sent to ' + to);
  } catch (error) {
    console.error('Error sending email: ', error);
  }
};

module.exports = { sendEmail };
