'use strict';

/**
 * This module handles all functionality of User User Management
 * @module Modules/User
 */
module.exports = function (app) {

  /**
   * User Model
   * @type {Mongoose.Model}
   */
  const User = app.models.User;

  /**
   * Adds an user
   * @param {Object} zoneObj The zone object
   * @param {String} lang    The lang identifier
   * @return {Promise}        The promise
   */
  const addUser = function (userObj) {
    return User.addUser(userObj);
  };

  /**
   * Fetches a list of user
   * @param  {Object} options The options
   * @return {Promise}        The promise
   */
  const getUserList = function (options) {
    return User.pagedFind(options);
  };

  /**
   * Modifies an user
   * @param  {Object} editedZoneDoc The edited zone document
   * @param {String} lang           The lang identifier
   * @return {Promise}              The promise
   */
  const editUser = function (editedUserDoc) {
    console.log("editedUserDoc ", editedUserDoc)
    return User.exists({
      'personalInfo.phone': editedUserDoc.personalInfo.phone.number,
      '_id': {
        $ne: editedUserDoc._id
      },
      'accountStatus': {
        $ne: app.config.user.accountStatus.user.deleted
      }
    })
      .then(count => count ? Promise.reject({ 'errCode': 'USER_IS_ALREADY_REGISTERED' }) : editedUserDoc.save());
  };

  /**
   * Fetches an user
   * @param  {Object} editedZoneDoc The edited zone document
   * @param {String} lang           The lang identifier
   * @return {Promise}              The promise
   */
  const getUser = function (userDoc) {
    return userDoc.populate({
      path: 'roleInfo.roleId'
    })
  };

  /**
   * Removes an user
   * @param  {Object} zoneDoc  The zone document
   * @return {Promise}         The promise
   */
  const removeUser = function (userDoc) {
    userDoc.accountStatus = app.config.user.accountStatus.user.deleted;
    return userDoc.save();
    // return userDoc.update({
    //   '$unset': {
    //     'roleInfo.roleId': 1
    //   },
    //   'accountStatus': app.config.user.accountStatus.user.deleted
    // }).exec();
  };

  const changeStatus = (userDoc, data) => {
    userDoc.accountStatus = data.accountStatus;
    return userDoc.save();
  };

  const findOrCreateUserByPhone = async (
    countryCode,
    phoneNumber,
    fullName
  ) => {
    const user = await User.findOneAndUpdate(
      {
        "personalInfo.phone.countryCode": countryCode,
        "personalInfo.phone.number": phoneNumber,
      },
      {
        $setOnInsert: {
          personalInfo: {
            phone: {
              countryCode,
              number: phoneNumber,
            },
            fullName
          },
        },
      },
      {
        upsert: true,
        new: true,
      }
    );

    return user;
  }


  return {
    'add': addUser,
    'list': getUserList,
    'edit': editUser,
    'remove': removeUser,
    'get': getUser,
    'changeStatus': changeStatus,
    'findOrCreateUserByPhone': findOrCreateUserByPhone
  };
};