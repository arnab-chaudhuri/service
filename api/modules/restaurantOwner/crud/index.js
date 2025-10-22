'use strict';

/**
 * This module handles all functionality of RestaurantOwner User Management
 * @module Modules/RestaurantOwner
 */
module.exports = function (app) {

  /**
   * RestaurantOwner Model
   * @type {Mongoose.Model}
   */
  const RestaurantOwner = app.models.RestaurantOwner;

  /**
   * Adds an restaurantOwner
   * @param {Object} zoneObj The zone object
   * @param {String} lang    The lang identifier
   * @return {Promise}        The promise
   */
  const addRestaurantOwner = function (restaurantOwnerObj) {
    return RestaurantOwner.addRestaurantOwner(restaurantOwnerObj);
  };

  /**
   * Fetches a list of restaurantOwner
   * @param  {Object} options The options
   * @return {Promise}        The promise
   */
  const getRestaurantOwnerList = function (options) {
    return RestaurantOwner.pagedFind(options);
  };

  /**
   * Modifies an restaurantOwner
   * @param  {Object} editedZoneDoc The edited zone document
   * @param {String} lang           The lang identifier
   * @return {Promise}              The promise
   */
  const editRestaurantOwner = function (editedRestaurantOwnerDoc) {
    console.log("editedRestaurantOwnerDoc ", editedRestaurantOwnerDoc)
    return RestaurantOwner.exists({
      'personalInfo.email': editedRestaurantOwnerDoc.personalInfo.email,
      restaurantRef: editedRestaurantOwnerDoc.restaurantRef,
      '_id': {
        $ne: editedRestaurantOwnerDoc._id
      },
      'accountStatus': {
        $ne: app.config.user.accountStatus.restaurantOwner.deleted
      }
    })
      .then(count => count ? Promise.reject({ 'errCode': 'RESTAURANT_OWNER_EMAIL_ALREADY_EXISTS' }) : editedRestaurantOwnerDoc.save());
  };

  /**
   * Fetches an restaurantOwner
   * @param  {Object} editedZoneDoc The edited zone document
   * @param {String} lang           The lang identifier
   * @return {Promise}              The promise
   */
  const getRestaurantOwner = function (restaurantOwnerDoc) {
    return restaurantOwnerDoc.populate({
      path: 'roleInfo.roleId'
    })
  };

  /**
   * Removes an restaurantOwner
   * @param  {Object} zoneDoc  The zone document
   * @return {Promise}         The promise
   */
  const removeRestaurantOwner = function (restaurantOwnerDoc) {
    restaurantOwnerDoc.accountStatus = app.config.user.accountStatus.restaurantOwner.deleted;
    return restaurantOwnerDoc.save();
    // return restaurantOwnerDoc.update({
    //   '$unset': {
    //     'roleInfo.roleId': 1
    //   },
    //   'accountStatus': app.config.user.accountStatus.restaurantOwner.deleted
    // }).exec();
  };

  const changeStatus = (restaurantOwnerDoc, data) => {
    restaurantOwnerDoc.accountStatus = data.accountStatus;
    return restaurantOwnerDoc.save();
  };


  return {
    'add': addRestaurantOwner,
    'list': getRestaurantOwnerList,
    'edit': editRestaurantOwner,
    'remove': removeRestaurantOwner,
    'get': getRestaurantOwner,
    'changeStatus': changeStatus
  };
};