'use strict';

module.exports = function (app) {
  /**
   * Requiring AWS module
   */
  const nodemailer = require('nodemailer');
  const Imap = require('imap');

  async function sendEmailAndAppend(options) {
    const senderEmail = 'team@immedine.com';
    const senderPassword = 'Immedine@2025';
    const recipientEmail = options.to;
    const subject = options.subject;
    const body = options.renderedOutput;

    // SMTP (sending) server details
    const smtpServer = 'smtp.titan.email';
    const smtpPort = 587;

    // IMAP (receiving) server details
    const imapServer = 'imap.titan.email';
    const imapPort = 993;
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
        html: body,
      };

      // console.log("mailOptions ",mailOptions)

      // Send the email
      const info = await transporter.sendMail(mailOptions);
      // console.log('Email sent successfully.');
      // console.log('Info object:', info);

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
              // console.log('Email appended to "Sent" folder.');
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


  const titanMail = function (options) {
    sendEmailAndAppend(options);
    return new Promise((resolve, reject) => {
      return resolve({status: 'success'});
    });
    // return new Promise((resolve, reject) =>
    //   ses.sendEmail(
    //     {
    //       Source: `${app.config.server.systemEmail.name} <${app.config.server.systemEmail.email}>`,
    //       Destination: {
    //         ToAddresses: [options.to],
    //       },
    //       Message: {
    //         Subject: {
    //           Data: options.subject,
    //         },
    //         Body: {
    //           Html: {
    //             Data: options.renderedOutput,
    //           },
    //         },
    //       },
    //     },
    //     (error, result) => (error ? reject(error) : resolve(result))
    //   )
    // );
  };

  return {
    titanMail,
  };
};
