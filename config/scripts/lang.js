'use strict';

module.exports = {
  defaultLanguage: 'en-us',
  languages: ['en-us', 'fr'],
  'en-us': {
    push: {},
    inApp: {
      toEmployer: {
        interestedUser: {
          body: () => `A new candidate has interested to your jobpost, Check it out!`,
        },
        interestedAgency: {
          body: () => `A new agency has interested to your jobpost, Check it out!`,
        },
      },
      toAgency: {
        interestedUser: {
          body: () => `A new candidate has interested to you for getting hire, Check it out!`,
        },
        interestedEmployer: {
          body: () => `A new employer has interested to you for hiring candidate of on demand jobpost, Check it out!`,
        },
      },
      toUser: {
        interestedAgency: {
          body: () => `A new agency has interested to you for hiring on demand jobpost, Check it out!`,
        },
        interestedEmployer: {
          body: () => `A new employer has interested to you for hiring on fulltime jobpost, Check it out!`,
        },
      },
    },

    email: {
      copyRightText: 'Copyright (c) RA-System',
      forgotPassword: {
        subject: 'ImmeDine - Reset Password',
        greeting: 'Hi',
        message:
          'We received a request to reset the password for your ImmeDine account. If you made this request, please click the button below to set a new password:',
        otpText: 'OTP',
        note: 'If you did not request a password reset, you can safely ignore this email. Your account will remain secure.'
      },
      sendVerificationLink: {
        subject: 'ImmeDine - Verify Account',
        greeting: 'Hi',
        message:
          'You recently requested a verification link for your ImmeDine account. Please click the button below to verify your account:',
        otpText: 'OTP',
        note: 'If you did not request this verification, please ignore this email.'
      },
      userSignupRequest: {
        subject: `ImmeDine - Signup Verification`,
        greeting: 'Hi',
        message: 'Thank you for signing up with ImmeDine! To complete your registration and activate your account, please click the button below:',
        otpText: 'OTP',
        note: 'If you did not create this account, you can safely ignore this email.'
      },
      pinRequest: {
        subject: `ImmeDine - Generate PIN`,
        greeting: 'Hi',
        message: 'Please find the new PIN below:',
        otpText: 'PIN',
        note: 'If you did not generate this pin, you can safely ignore this email.'
      },
      restaurantOwnerAddedByAdmin: {
        subject: `ImmeDine - Owner Created`,
        greeting: 'Hi',
        message: 'You have been successfully added as a Restaurant Owner for your restaurant on ImmeDine. To access your account, please click the button below and use the login credentials provided:',
        emailText: "Email",
        passwordText: "Password",
        note: 'For security reasons, we recommend changing your password after your first login.'
      },
      owner: {
        signupConfirmation: {
          subject: (name) => `ImmeDine - Confirmation as Candidate ${name}`,
          greeting: 'Hi',
          message:
            'Your candidate account has been successfully created. Use the link and credentials below to access it.',
          loginLink: process.env.CANDIDATE_LOGIN_LINK || '',
        },
      },
      employer: {
        signupConfirmation: {
          subject: (name) => `ImmeDine - Confirmation as Employer ${name}`,
          greeting: 'Hi',
          message:
            'Your employer account has been successfully created by Admin. Use the link and credentials below to access it.',
          loginLink: process.env.EMPLOYER_LOGIN_LINK || '',
        },
      },
      agency: {
        signupConfirmation: {
          subject: (name) => `ImmeDine - Confirmation as Agency ${name}`,
          greeting: 'Hi',
          message:
            'Your agency account has been successfully created by Admin. Use the link and credentials below to access it.',
          loginLink: process.env.AGENCY_LOGIN_LINK || '',
        },
      },
    },
    sms: {
      mobileVerification: {
        body: (otp) => `Hi! Welcome to RA-System. Your mobile verification One Time Password is ${otp}.`,
      },
      loginOTP: {
        body: (otp) => `Hi! use this One Time Password ${otp}, to log in to your RA-System account.`,
      },
    },
  },
};
