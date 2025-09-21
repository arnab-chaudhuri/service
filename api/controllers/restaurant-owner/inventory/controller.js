'use strict';
/**
 * This Controller handles all functionality of admin inventory
 * @module Controllers/Admin/inventory
 */
module.exports = function(app) {

  /**
   * inventory module
   * @type {Object}
   */
  const inventory = app.module.inventory;
  const menu = app.module.menu;

  /**
   * Adds a inventory
   * @param  {Object}   req  Request 
   * @param  {Object}   res  Response
   * @param  {Function} next Next is used to pass control to the next middleware function
   * @return {Promise}       The Promise
   */
  const addInventory = (req, res, next) => {
    inventory.create(req.body, req.session.user)
      .then(output => {
        req.workflow.outcome.data = output;
        req.workflow.emit('response');
      })
      .catch(next);
  };

  /**
   * Fetches a inventory
   * @param  {Object}   req  Request 
   * @param  {Object}   res  Response
   * @param  {Function} next Next is used to pass control to the next middleware function
   * @return {Promise}       The Promise
   */
  const getInventory = (req, res, next) => {
    inventory.get(req.params.inventoryId,req.session.user)
      .then(output => {
        req.workflow.outcome.data = output;
        req.workflow.emit('response');
      })
      .catch(next);
  };

  /**
   * Fetches a list of Inventories
   * @param  {Object}   req  Request 
   * @param  {Object}   res  Response
   * @param  {Function} next Next is used to pass control to the next middleware function
   * @return {Promise}       The Promise
   */
  const getInventoryList = (req, res, next) => {
    let query = {
      skip: Number(req.query.skip) || app.config.page.defaultSkip,
      limit: Number(req.query.limit) || app.config.page.defaultLimit,
      filters: {
        status: app.config.contentManagement.inventory.active,
        restaurantRef: req.session.user.restaurantRef
      },
      sort: {}
    };

    if (req.body.filters) {
      let { name } = req.body.filters;
      if (name) {
        query.filters.name = new RegExp(`^${name}`, 'ig');
      }
    }
    if (req.body.sortConfig) {
      let { name } = req.body.sortConfig;
      if (name) {
        query.sort = {name};
      }
    }

    inventory.list(query)
      .then(output => {
        req.workflow.outcome.data = output;
        req.workflow.emit('response');
      })
      .catch(next);
  };

  /**
   * Edits a inventory
   * @param  {Object}   req  Request 
   * @param  {Object}   res  Response
   * @param  {Function} next Next is used to pass control to the next middleware function
   * @return {Promise}       The Promise
   */
  const editInventory = (req, res, next) => {
    req.inventoryId.name = req.body.name;
    req.inventoryId.quantity = req.body.quantity;
    req.inventoryId.unit = req.body.unit;
    req.inventoryId.image = req.body.image;
    inventory.edit(req.inventoryId, req.session.user)
      .then(output => {
        req.workflow.outcome.data = output;
        req.workflow.emit('response');
      })
      .catch(next);
  };

  /**
   * Deletes a inventory
   * @param  {Object}   req  Request 
   * @param  {Object}   res  Response
   * @param  {Function} next Next is used to pass control to the next middleware function
   * @return {Promise}       The Promise
   */
  const deleteInventory = (req, res, next) => {
    req.inventoryId.status = app.config.contentManagement.inventory.deleted;
    inventory.edit(req.inventoryId, req.session.user)
      .then(output => {
        menu.removeInventoryItem(req.inventoryId._id);
        req.workflow.emit('response');
      })
      .catch(next);
  };

  return {
    add: addInventory,
    get: getInventory,
    edit: editInventory,
    list: getInventoryList,
    delete: deleteInventory
  };

};