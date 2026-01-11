'use strict';

/**
 * This module handles all functionality of Admin Vendor
 * @module Modules/Vendor
 */
module.exports = function (app) {


  /**
   * vendor Model
   * @type {Mongoose.Model}
   */
  const Vendor = app.models.Vendor;

  /**
   * Creates a Vendor
   * @param  {Object} config  The config object
   * @return {Promise}        The promise
   */
  const createVendor = function (config) {
    return Vendor.createVendor({
      ...config,
      name: config.name.toLowerCase()
    });
  };

  /**
   * Fetches a vendor by Id
   * @param  {String} vendorId  The vendor id
   * @return {Promise}        The promise
   */
  const findVendorById = function (vendorId) {
    return Vendor.findById(vendorId);
  };

  /**
   * Edits a vendor
   * @param  {Object} editedVendor The edited vendor document
   * @return {Promise}           The promise
   */
  const editVendor = function (editedVendor) {
    return editedVendor.save();
  };

  /**
   * Fetches a list of vendors
   * @param  {Object} options  The options object
   * @return {Promise}        The promise
   */
  const getList = function (options) {
    return Vendor.pagedFind(options);
  };

  /**
   * Removes a vendor
   * @param  {Object} vendor The vendor document
   * @return {Promise}     The promise
   */
  const removeVendor = function (vendor) {
    return Vendor.removeVendor(vendor._id);
  };

  /**
   * Creates a vendor if not exists, otherwise returns existing vendor
   * @param  {Object} config  The config object
   * @return {Promise}        The promise
   */
  const createOrGetVendor = function (config) {
    return Vendor.findOne({ name: config.name.toLowerCase(), restaurantRef: config.restaurantRef })
      .then(existingVendor => {
        if (existingVendor) {
          return existingVendor;
        }
        return Vendor.createVendor({
          ...config,
          name: config.name.toLowerCase()
        });
      });
  };

  return {
    'create': createVendor,
    'get': findVendorById,
    'edit': editVendor,
    'list': getList,
    'remove': removeVendor,
    'createOrGetVendor': createOrGetVendor
  };
};