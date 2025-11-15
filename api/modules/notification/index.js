'use strict';

/**
 * This module handles all functionality of Notification
 * @module Modules/Notification
 */
module.exports = function (app) {
  /**
   * Notification Model
   * @type {Mongoose.Model}
   */
  const Notification = app.models.Notification;
  const Admin = app.models.Admin;
  const RestaurantOwner = app.models.RestaurantOwner;
  const User = app.models.User;
  const Role = app.models.Role;
  // let inAppNotification = app.config.notification.inApp(app, app.config.lang.defaultLanguage);

  /**
   * Changes the status of the notification
   * @param  {Object} notificationDoc     Updated notification doc
   * @return {Promise}                    The promise
   */
  const markAsRead = (notificationDoc) => notificationDoc.save();
  /**
   * Changes the status of the alL notification of a user
   * @param  {Object} notificationDoc     Updated notification doc
   * @return {Promise}                    The promise
   */
  const markAllAsRead = (user) => Notification.updateMany({ user: user._id, restaurantRef: user.restaurantRef }, { $set: { seen: true } });

  /**
   * Fetches the notification list
   * @param {Object} options        The options
   * @return {Promise}              The promise
   */
  const getNotificationList = (options) => Notification.pagedFind(options);

  /**
   * Fetches notification details
   * @param {Object} notificationId     The notification object Id
   * @return {Promise}                  The promise
   */
  const getNotificationDetails = (notificationId) => Notification.findOne({ _id: notificationId }).exec();

  /**
   * Fetches unread notification count
   * @param {Object} query              query object
   * @return {Promise}                  The promise
   */
  const unreadNotificationCount = (query) => Notification.countDocuments(query).exec();

  const sendInAppNotificationToRestaurantStaffs = (restaurantRef, metadata) => {
    return Role.find({
      status: app.config.contentManagement.role.active,
      'permissions.moduleKey': metadata.moduleName, restaurantRef: restaurantRef
    }, { _id: 1 }).then((roles) => {
      const roleIds = roles.map((each) => each._id);
      // console.log('roleIds', roleIds);
      return RestaurantOwner.find({
        restaurantRef: restaurantRef,
        accountStatus: app.config.user.accountStatus.restaurantOwner.active,
        $or: [{ 'roleInfo.isSuperRestaurantOwner': true },
        { 'roleInfo.roleId': { $in: roleIds } }]
      })
        .select({ _id: 1 })
        .then((resStaffList) => {
          // console.log('resStaffList', resStaffList);
          resStaffList.forEach((each) => {
            if (!metadata.userRef || (metadata.userRef && metadata.userRef.toString() !== each._id.toString())) {
              app.service.notification.inApp.send({
                userId: each._id,
                userType: app.config.user.role.restaurantOwner,
                restaurantRef: restaurantRef,
                content: {
                  notificationType: metadata.notificationType,
                  info: {
                    message: metadata.message,
                    redirectionId: metadata.redirectionId,
                    staffRef: metadata.userRef || "",
                    staffName: metadata.staffName || ""
                  },
                },
              });
            }

          });
        });
    });
  };

  const createNotification = (data, userDoc) => {
    User.find().then((users) => {
      if (users && users.length) {
        users.forEach((user) => {
          if (user.isNotificationEnabled) {
            app.service.notification.push.checkAndSendImmediate({
              userId: user._id.toString(),
              userType: app.config.user.role.user,
              title: data.title,
              body: data.message,
              optionalData: {
                type: data.notificationType,
                data: {
                  redirectionId: data.redirectionId,
                  fromUserType: userDoc.userType,
                  fromUserRef: userDoc._id.toString(),
                }
              },
              userData: user,
            });

            app.service.notification.inApp.send({
              userId: user._id.toString(),
              userType: app.config.user.role.user,
              content: {
                notificationType: data.notificationType,
                info: {
                  message: data.message,
                  title: data.title,
                  notificationType: data.notificationType,
                  redirectionId: data.redirectionId,
                  fromUserType: userDoc.userType,
                  fromUserRef: userDoc._id.toString(),
                },
              },
            });
          }
        });
      }
    });
    return Promise.resolve(true);
  };


  return {
    list: getNotificationList,
    get: getNotificationDetails,
    markAsRead: markAsRead,
    markAllAsRead: markAllAsRead,
    unreadNotificationCount: unreadNotificationCount,
    sendInAppNotificationToRestaurantStaffs: sendInAppNotificationToRestaurantStaffs,
    createNotification: createNotification
  };
};
