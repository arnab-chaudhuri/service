'use strict';

module.exports = function (app, smsGateway) {
  /**
   * The email notification module
   */
  const email = require('./email/nodemailer.js')(app);
  const push = require('./push/index.js')(app);
  /**
   * The sms  module
   */
  const Sms = require('./sms')();

  /**
   * The notification schema
   */
  const Notification = app.models.Notification;


  /**
   * Send an email immediatedly
   * @param  {String} options.userId   The user Id
   * @param  {Number} options.userType The user type
   * @param  {String} options.emailId  The email
   * @param  {String} options.subject  The subject of the email
   * @param  {Object} options.body     The body of the email
   * @return {Promise}                 The promise
   */
  const immediateEmail = function ({ emailId, subject, body }) {
    return email
      .titanMail({
        to: emailId,
        subject: subject,
        renderedOutput: body,
      })
      .then((output) => {
        console.log('Email::', output);
        return Promise.resolve(output);
      })
      .catch((err) => {
        return Promise.reject(err);
      });
  };


  /**
   * Sends an in app notification
   * @param  {String} options.userId   The user Id
   * @param  {Number} options.userType The user type
   * @param  {Object} options.content  The content for notification
   * @return {Promise}                 The promise
   */
  const sendInAppNotification = function ({ userId, userType, content, isActionable = true, restaurantRef }) {
    let notificationObj = {
      user: userId,
      userType: userType,
      restaurantRef: restaurantRef,
      medium: app.config.notification.medium.inApp,
      inAppContent: content,
      sent: true,
      isActionable: isActionable,
      sentTime: new Date(),
    };
    return new Notification(notificationObj).save();
  };

  /**
   * Marks a notification as read
   * @param  {String}  notificationId The notification Id
   * @return {Promise}                The Promise
   */
  const markAsRead = function (notificationIdList) {
    notificationIdList = notificationIdList || [];
    return Notification.update(
      {
        _id: {
          $in: notificationIdList,
        },
      },
      {
        $set: {
          seen: true,
        },
      },
      {
        multi: true,
      }
    ).exec();
  };

  /**
   * Gets notifications for a user
   * @param  {String}  userId   The user Id
   * @param  {Number}  userType The user type
   * @return {Promise}          The Promise
   */
  const getNotifications = function (userId, userType) {
    let query = {
      userId: userId,
      userType: userType,
      medium: app.config.notification.medium.inApp,
      sentTime: {
        $lte: new Date().getTime(),
        $gte: new Date().getTime() - 7 * 24 * 60 * 60 * 1000, // show upto 7 days
      },
    };

    return Notification.find(query)
      .exec()
      .then((notificationList) => {
        markAsRead(notificationList.map((each) => each._id));
        return Promise.resolve(notificationList);
      });
  };

  /**
   * Gets notification count for a user
   * @param  {String}  userId   The user Id
   * @param  {Number}  userType The user type
   * @param  {Boolean} [isSeen] True, if should retrieve only seen notifications. False, for only unseen notifications
   * @return {Promise}          The Promise
   */
  const getNotificationsCount = function (userId, userType, isSeen) {
    let query = {
      userId: userId,
      userType: userType,
      medium: app.config.notification.medium.inApp,
      sentTime: {
        $lte: new Date().getTime(),
      },
      seen: false,
    };
    if (isSeen) {
      query.seen = true;
    } else if (isSeen === false) {
      query.seen = false;
    }

    return Notification.countDocuments(query);
  };

  /**
   * Sets a notification as sent
   * @param  {String}  notificationId The notification Id
   * @return {Promise}                The Promise
   */
  const setAsSent = function (notificationId) {
    return Notification.update(
      {
        _id: notificationId,
      },
      {
        $set: {
          sent: true,
        },
      }
    ).exec();
  };

  /**
   * Deletes a notification
   * @param  {String}  notificationId The notification Id
   * @return {Promise}                The Promise
   */
  function deleteNotification(notificationId) {
    return Notification.remove({
      _id: notificationId,
    }).exec();
  }

  /**
     * Sends push notification to Android Devices
     * @param  {String} notificationKey The notificationKey
     * @param  {Number} userType        The user type
     * @param  {String} title           The title of the push notification
     * @param  {Object} body            The body of the push notification
     * @param  {Object} optionalData    The additional data
     * @return {Promise}                The promise
     */
  function sendPushToDevice(notificationKey, title, body) {
    let configForFCM = {
      'notificationKey': notificationKey,
      'title': title,
      'body': body,
    };
    return new Promise((resolve, reject) => {
      return push.sendFCM(configForFCM)
        .then((result) => {
          return resolve();
        })
        .catch((err) => {
          return reject(err);
        });
    });
  }

  /**
   * Checks and sends push notification to a specific device type
   * @param  {String} options.userId    The user Id
   * @param  {Number} options.userType  The user type
   * @param  {String} options.title     The title of the push notification
   * @param  {Object} body              The body of the push notification
   * @param  {Object} optionalData      The additional data
   * @return {Promise}                  The promise
   */
  const checkAndSendPush = function ({ userId, title, body, optionalData = {}, userData }) {
    if (!userData) {
      return app.models.User.findOne({
        '_id': userId,
      })
        .select({ 'sessionInfo': 1 })
        .exec()
        .then(doc => doc.sessionInfo ? Promise.resolve(doc.sessionInfo) : Promise.reject({ 'errCode': 'SESSION_NOT_FOUND' }))
        .then(doc => {
          if (doc.deviceType === app.config.user.deviceType.android || doc.deviceType === app.config.user.deviceType.iOS) {
            return sendPushToDevice(doc.notificationKey, title, body, optionalData);
          } else {
            return Promise.reject();
          }
        })
        .catch((err) => {
          return Promise.resolve(err);
        });
    } else if (userData && Object.keys(userData).length) {
      if (userData.sessionInfo && userData.sessionInfo.destroyTime) {
        if (userData.sessionInfo.destroyTime < new Date()) {
          return Promise.reject({ 'errCode': 'SESSION_NOT_FOUND' });
        }
      }
      if (userData.deviceType === app.config.user.deviceType.android || userData.deviceType === app.config.user.deviceType.iOS) {
        return sendPushToDevice(userData.notificationKey, title, body, optionalData);
      } else {
        return Promise.reject();
      }
    } 
  };

  return {
    email: {
      immediate: immediateEmail,
    },
    'push': {
      'checkAndSendImmediate': checkAndSendPush
    },
    inApp: {
      send: sendInAppNotification,
      get: getNotifications,
      setAsSent: setAsSent,
      markAsRead: markAsRead,
      delete: deleteNotification,
      count: getNotificationsCount,
    },
  };
};
