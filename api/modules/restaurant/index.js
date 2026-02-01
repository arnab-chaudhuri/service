'use strict';

/**
 * This module handles all functionality of Admin Restaurant
 * @module Modules/Restaurant
 */
module.exports = function (app) {


  /**
   * restaurant Model
   * @type {Mongoose.Model}
   */
  const Restaurant = app.models.Restaurant;

  /**
   * Creates a Restaurant
   * @param  {Object} config  The config object
   * @return {Promise}        The promise
   */
  const createRestaurant = function (config) {
    config.inventoryLocations = [{
      name: config.name,
      code: config.code
    }];
    return Restaurant.createRestaurant(config);
  };

  /**
   * Fetches a restaurant by Id
   * @param  {String} restaurantId  The restaurant id
   * @return {Promise}        The promise
   */
  const findRestaurantById = function (restaurantId) {
    return Restaurant.findById(restaurantId);
  };

  /**
   * Edits a restaurant
   * @param  {Object} editedRestaurant The edited restaurant document
   * @return {Promise}           The promise
   */
  const editRestaurant = function (editedRestaurant) {
    return Restaurant.countDocuments({
      name: editedRestaurant.name,
      status: app.config.contentManagement.restaurant.active,
      _id: {
        $ne: editedRestaurant._id
      }
    })
      .then(count => count ? Promise.reject({
        'errCode': 'RESTAURANT_ALREADY_EXISTS'
      }) : editedRestaurant.save());
  };

  /**
   * Fetches a list of categories
   * @param  {Object} options  The options object
   * @return {Promise}        The promise
   */
  const getList = function (options) {
    return Restaurant.pagedFind(options);
  };

  /**
   * Removes a restaurant
   * @param  {Object} restaurant The restaurant document
   * @return {Promise}     The promise
   */
  const removeRestaurant = function (restaurant) {
    return Restaurant.removeRestaurant(restaurant._id);
  };

  const editMyRestaurant = (restaurantId, data) => {
    return Restaurant.findById(restaurantId)
      .then(restaurant => {
        if (!restaurant) {
          return Promise.reject({
            'errCode': 'RESTAURANT_NOT_FOUND'
          });
        }
        restaurant.set(data);
        return restaurant.save();
      });
  };

  const updateParcel = (restaurantId, data) => {
    return Restaurant.findById(restaurantId)
      .then(restaurant => {
        if (!restaurant) {
          return Promise.reject({
            'errCode': 'RESTAURANT_NOT_FOUND'
          });
        }
        restaurant.config.parcels = data;
        return restaurant.save();
      });
  };

  const updateBillDetails = (restaurantId, data) => {
    return Restaurant.findById(restaurantId)
      .then(restaurant => {
        if (!restaurant) {
          return Promise.reject({
            'errCode': 'RESTAURANT_NOT_FOUND'
          });
        }
        restaurant.billConfigDetails = data;
        return restaurant.save();
      });
  };

  const updateWater = (restaurantId, data) => {
    return Restaurant.findById(restaurantId)
      .then(restaurant => {
        if (!restaurant) {
          return Promise.reject({
            'errCode': 'RESTAURANT_NOT_FOUND'
          });
        }
        restaurant.config.waters = data;
        return restaurant.save();
      });
  };

  const updateBranding = (restaurantId, data) => {
    return Restaurant.findById(restaurantId)
      .then(restaurant => {
        if (!restaurant) {
          return Promise.reject({
            'errCode': 'RESTAURANT_NOT_FOUND'
          });
        }

        for (const key in data) {
          if (key !== 'primaryColor' && key !== 'secondaryColor' && key !== 'footerColor') {
            restaurant.config[key] = data[key];
          } else {
            restaurant[key] = data[key];
          }
        }
        
        return restaurant.save();
      });
  };

  const updateGstDetails = (restaurantId, data) => {
    return Restaurant.findById(restaurantId)
      .then(restaurant => {
        if (!restaurant) {
          return Promise.reject({
            'errCode': 'RESTAURANT_NOT_FOUND'
          });
        }
        restaurant.gstDetails = data;
        return restaurant.save();
      });
  };

  const updateServiceTaxDetails = (restaurantId, data) => {
    return Restaurant.findById(restaurantId)
      .then(restaurant => {
        if (!restaurant) {
          return Promise.reject({
            'errCode': 'RESTAURANT_NOT_FOUND'
          });
        }
        restaurant.serviceTaxDetails = data;
        return restaurant.save();
      });
  };

  const updateLocations = (restaurantId, data) => {
    return Restaurant.findById(restaurantId)
      .then(restaurant => {
        if (!restaurant) {
          return Promise.reject({
            'errCode': 'RESTAURANT_NOT_FOUND'
          });
        }
        restaurant.inventoryLocations = data;
        return restaurant.save();
      });
  };

  const updateInventoryCategories = (restaurantId, data) => {
    return Restaurant.findById(restaurantId)
      .then(restaurant => {
        if (!restaurant) {
          return Promise.reject({
            'errCode': 'RESTAURANT_NOT_FOUND'
          });
        }
        restaurant.inventoryCategories = data;
        return restaurant.save();
      });
  };


  return {
    'create': createRestaurant,
    'get': findRestaurantById,
    'edit': editRestaurant,
    'list': getList,
    'remove': removeRestaurant,
    'set': editMyRestaurant,
    'updateGstDetails': updateGstDetails,
    'updateServiceTaxDetails': updateServiceTaxDetails,
    'updateLocations': updateLocations,
    'updateInventoryCategories': updateInventoryCategories,
    'updateParcel': updateParcel,
    'updateWater': updateWater,
    'updateBillDetails': updateBillDetails,
    'updateBranding': updateBranding
  };
};