'use strict';
/**
 * This Controller handles all functionality of admin vendor
 * @module Controllers/Admin/vendor
 */
module.exports = function(app) {

  /**
   * vendor module
   * @type {Object}
   */
  const vendor = app.module.vendor;

  /**
   * Adds a vendor
   * @param  {Object}   req  Request 
   * @param  {Object}   res  Response
   * @param  {Function} next Next is used to pass control to the next middleware function
   * @return {Promise}       The Promise
   */
  const addVendor = (req, res, next) => {
    req.body.restaurantRef = req.session.user.restaurantRef;
    vendor.create(req.body)
      .then(output => {
        req.workflow.outcome.data = output;
        req.workflow.emit('response');
      })
      .catch(next);
  };

  /**
   * Fetches a vendor
   * @param  {Object}   req  Request 
   * @param  {Object}   res  Response
   * @param  {Function} next Next is used to pass control to the next middleware function
   * @return {Promise}       The Promise
   */
  const getVendor = (req, res, next) => {
    vendor.get(req.params.vendorId)
      .then(output => {
        req.workflow.outcome.data = output;
        req.workflow.emit('response');
      })
      .catch(next);
  };

  /**
   * Fetches a list of categories
   * @param  {Object}   req  Request 
   * @param  {Object}   res  Response
   * @param  {Function} next Next is used to pass control to the next middleware function
   * @return {Promise}       The Promise
   */
  const getVendorList = (req, res, next) => {
    let query = {
      skip: Number(req.query.skip) || app.config.page.defaultSkip,
      limit: Number(req.query.limit) || app.config.page.defaultLimit,
      filters: {
        status: app.config.contentManagement.vendor.active,
        restaurantRef: req.session.user.restaurantRef
      },
      sort: {}
    };

    if (req.body.filters) {
      let { question } = req.body.filters;
      if (question) {
        query.filters.question = new RegExp(`^${question}`, 'ig');
      }
    }

    vendor.list(query)
      .then(output => {
        req.workflow.outcome.data = output;
        req.workflow.emit('response');
      })
      .catch(next);
  };

  /**
   * Edits a vendor
   * @param  {Object}   req  Request 
   * @param  {Object}   res  Response
   * @param  {Function} next Next is used to pass control to the next middleware function
   * @return {Promise}       The Promise
   */
  const editVendor = (req, res, next) => {
    req.vendorId.name = req.body.name;
    vendor.edit(req.vendorId)
      .then(output => {
        req.workflow.outcome.data = output;
        req.workflow.emit('response');
      })
      .catch(next);
  };

  /**
   * Deletes a vendor
   * @param  {Object}   req  Request 
   * @param  {Object}   res  Response
   * @param  {Function} next Next is used to pass control to the next middleware function
   * @return {Promise}       The Promise
   */
  const deleteVendor = (req, res, next) => {
    vendor.remove(req.vendorId)
      .then(output => {
        req.workflow.emit('response');
      })
      .catch(next);
  };

  return {
    add: addVendor,
    get: getVendor,
    edit: editVendor,
    list: getVendorList,
    delete: deleteVendor
  };

};