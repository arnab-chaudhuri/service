'use strict';

module.exports = function (app) {
  const globalConfig = app.module.globalConfig;
  const contactUs = app.module.contactUs;
  const sse = app.module.sse;

  const getGlobalConfig = function (req, res, next) {
    // jshint ignore:line

    globalConfig
      .getGlobalConfigDoc()
      .then((output) => {
        req.workflow.outcome.data = output;
        req.workflow.emit('response');
      })
      .catch(next);
  };
  const getErrorCodes = function (req, res, next) {
    // jshint ignore:line

    let erroCodes = require('../../responseHandler/scripts/errorCodes')();

    req.workflow.outcome.data = erroCodes;
    req.workflow.emit('response');
  };

  const submitContactUs = function (req, res, next) {
    // jshint ignore:line

    contactUs
      .saveContactUsRequest(req.body)
      .then(() => req.workflow.emit('response'))
      .catch(next);
  };
  const getMasterData = function (req, res, next) {
    // jshint ignore:line

    globalConfig
      .getMasterData()
      .then((data) => {
        req.workflow.outcome.data = data;
        req.workflow.emit('response');
      })
      .catch(next);
  };

  const triggerEmail = function (req, res, next) {

    let val = req.body;
    req.workflow.outcome.data = val;


    const nodemailer = require('nodemailer');
    const Imap = require('imap');
    // const { simpleParser } = require('mailparser');

    // Email configuration
    const senderEmail = 'team@immedine.com';
    const senderPassword = 'Immedine@2025';
    const recipientEmail = 'souraj.93.sadhukhan@gmail.com';
    const subject = 'Testing email script';
    const body = 'This is a test email sent from a Node.js script.';

    // SMTP (sending) server details
    const smtpServer = 'smtp.titan.email';
    const smtpPort = 587;

    // IMAP (receiving) server details
    const imapServer = 'imap.titan.email';
    const imapPort = 993;

    async function sendEmailAndAppend() {
      try {
        // Create a nodemailer transporter using SMTP
        const transporter = nodemailer.createTransport({
          host: smtpServer,
          port: smtpPort,
          auth: {
            user: senderEmail,
            pass: senderPassword,
          },
        });

        // Create the email options
        const mailOptions = {
          from: "ImmeDine " + senderEmail,
          to: recipientEmail,
          subject: subject,
          text: body,
        };

        // Send the email
        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent successfully.');
        console.log('Info object:', info);

        // Append the sent email to the "Sent" folder using IMAP
        const imap = new Imap({
          user: senderEmail,
          password: senderPassword,
          host: imapServer,
          port: imapPort,
          tls: true,
        });

        imap.once('ready', () => {
          imap.openBox('Sent', true, (err) => {
            if (err) {
              console.error('Error opening "Sent" folder:', err);
              imap.end();
              return;
            }

            // Create the email message as MIMEText
            const emailMessage = `From: ${senderEmail}\r\nTo: ${recipientEmail}\r\nSubject: ${subject}\r\n\r\n${body}`;

            // Append the sent email to the "Sent" folder
            imap.append(emailMessage, { mailbox: 'Sent' }, (appendErr) => {
              if (appendErr) {
                console.error('Error appending email to "Sent" folder:', appendErr);
              } else {
                console.log('Email appended to "Sent" folder.');
              }
              imap.end();
            });
          });
        });

        imap.once('error', (imapErr) => {
          console.error('IMAP Error:', imapErr);
        });

        imap.connect();
      } catch (error) {
        console.error('Error sending email:', error);
      }
    }

    // Call the function to send the email and append it to the "Sent" folder
    sendEmailAndAppend();
    // jshint ignore:line
    return req.workflow.emit('response')
    // contactUs
    //   .saveContactUsRequest(req.body)
    //   .then(() => req.workflow.emit('response'))
    //   .catch(next);
  };

  const orderStream = (req, res) => {
    const restaurantRef = req.query.restaurantRef; // 👈 Owner passes this in query param

    if (!restaurantRef) {
      return res.status(400).json({ error: "restaurantRef is required" });
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    sse.addClient(restaurantRef, res);
  };

  return {
    getGlobalConfig: getGlobalConfig,
    getErrorCodes: getErrorCodes,
    submitContactUs: submitContactUs,
    getMasterData: getMasterData,
    triggerEmail: triggerEmail,
    orderStream: orderStream
  };
};
