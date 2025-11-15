'use strict';

module.exports = {
  medium: {
    email: 1,
    sms: 2,
    push: 3,
    inApp: 4,
  },
  fcm: {
    serverKey: {
      androidApp: process.env.FCM_SERVER_KEY,
    },
  },
  apn: {
    sound: 'Submarine.aiff',
    badge: 1,
    environment: process.env.PUSH_ENV === 'production' ? 'production' : 'sandbox',
    // environment: 'sandbox',
    // isProduction: false,
    isProduction: process.env.PUSH_ENV === 'production' ? true : false,
    p8File: ' ',
    keyId: process.env.KEY_ID,
    teamId: process.env.TEAM_ID,
    expireInSec: 10,
    bundleId: process.env.BUNDLE_ID,
  },
  smsGateway: {
    sns: 1,
  },
  smsText: function (app, selectedLang) {
    return {
      mobileVerification: (otp) => app.config.lang[selectedLang].sms.mobileVerification.body(otp),
      loginOTP: (otp) => app.config.lang[selectedLang].sms.loginOTP.body(otp),
      projectInvitationOTP: (otp) => app.config.lang[selectedLang].sms.projectInvitationOTP.body(otp),
    };
  },
  email: function (app, selectedLang) {
    return {
      forgotPassword: {
        subject: app.config.lang[selectedLang].email.forgotPassword.subject,
        pageName: 'forgot-password',
      },
      sendVerificationLink: {
        subject: app.config.lang[selectedLang].email.sendVerificationLink.subject,
        pageName: 'send-verification-link',
      },
      userSignupRequest:{
        subject: app.config.lang[selectedLang].email.userSignupRequest.subject,
        pageName: 'user-signup-otp',
      },
      pinRequest:{
        subject: app.config.lang[selectedLang].email.pinRequest.subject,
        pageName: 'user-generate-pin',
      },
      restaurantOwnerAddedByAdmin:{
        subject: app.config.lang[selectedLang].email.restaurantOwnerAddedByAdmin.subject,
        pageName: 'owner-added-by-admin',
      },
      owner:{
        signupConfirmation:{
          subject: app.config.lang[selectedLang].email.owner.signupConfirmation.subject,
          pageName: 'user-signup-confirmation',
        },
      },
      employer:{
        signupConfirmation:{
          subject: app.config.lang[selectedLang].email.employer.signupConfirmation.subject,
          pageName: 'user-signup-confirmation',
        }
      },
      agency:{
        signupConfirmation:{
          subject: app.config.lang[selectedLang].email.agency.signupConfirmation.subject,
          pageName: 'user-signup-confirmation',
        }
      }
    };
  },
  push: function (app, selectedLang) {
    return {};
  },
  inApp: function (app, selectedLang) {
    return {
      toRestaurantOwner: {
        newOrder: {
          body: (staffName) => `${app.config.lang[selectedLang].inApp.toRestaurantOwner.newOrder.body(staffName)}`,
          type: "newOrder",
        },
        updateOrder: {
          body: (id, staffName) => `${app.config.lang[selectedLang].inApp.toRestaurantOwner.updateOrder.body(id, staffName)}`,
          type: "updateOrder",
        },
        cancelOrder: {
          body: (id, staffName) => `${app.config.lang[selectedLang].inApp.toRestaurantOwner.cancelOrder.body(id, staffName)}`,
          type: "cancelOrder",
        },
        acceptOrder: {
          body: (id, staffName) => `${app.config.lang[selectedLang].inApp.toRestaurantOwner.acceptOrder.body(id, staffName)}`,
          type: "acceptOrder",
        },
        changeOrderStatus: {
          body: (id, staffName) => `${app.config.lang[selectedLang].inApp.toRestaurantOwner.changeOrderStatus.body(id, staffName)}`,
          type: "changeOrderStatus",
        },
        billPaid: {
          body: (id, staffName) => `${app.config.lang[selectedLang].inApp.toRestaurantOwner.billPaid.body(id, staffName)}`,
          type: "billPaid",
        },
      },
    };
  },
  companyName: '',
  companyURL: '',
};
