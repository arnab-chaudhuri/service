'use strict';

const { inventoryCategories, inventoryItems } = require("../../../modules/cron/scripts/inventory");

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
        
        const filteredOutput = {
          ...output,
          data: output.data.map(item => {
            return {
              ...item._doc,
              locationList: item._doc.locationList?.length ? item._doc.locationList.map(location => {
                return {
                  ...location._doc,
                  history: []
                };
              }) : []
            }
          })
        };
        req.workflow.outcome.data = filteredOutput;
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
    req.inventoryId.preCode = req.body.preCode;
    req.inventoryId.code = req.body.code;
    req.inventoryId.saveAsUnit = req.body.saveAsUnit;
    req.inventoryId.image = req.body.image;
    req.inventoryId.locationList = req.body.locationList;
    req.inventoryId.categoryId = req.body.categoryId;
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

  const seedInventory = (req, res, next) => {
    inventory.seedInventoryForRestaurant(req.session.user.restaurantRef, inventoryCategories, inventoryItems)
      .then(output => {
        req.workflow.emit('response');
      })
      .catch(next);
  };

  const downloadReport = (req, res, next) => {
    // let query = {
    //   skip: Number(req.query.skip) || app.config.page.defaultSkip,
    //   limit: Number(req.query.limit) || app.config.page.defaultLimit,
    //   filters: {
    //     status: app.config.contentManagement.inventory.active,
    //     restaurantRef: req.session.user.restaurantRef
    //   },
    //   sort: {}
    // };

    let { startDate, endDate } = req.body.filters;

    // if (req.body.filters) {
    //   let { startDate, endDate } = req.body.filters;
    //   let andFilters = [{
    //     restaurantRef: req.session.user.restaurantRef
    //   }];

    //   if (startDate && endDate) {
    //     andFilters.push({
    //       'locationList.history.date': {
    //         $gte: new Date(startDate),
    //         $lte: new Date(endDate)
    //       }
    //     });
    //   } else if (startDate) {
    //     andFilters.push({
    //       'locationList.history.date': {
    //         $gte: new Date(startDate)
    //       }
    //     });
    //   } else if (endDate) {
    //     andFilters.push({
    //       'locationList.history.date': {
    //         $lte: new Date(endDate)
    //       }
    //     });
    //   }

    //   if (andFilters.length > 0) {
    //     query.filters = { $and: andFilters };
    //   }

    //   query.select = {
    //     name: 1,
    //     code: 1,
    //     preCode: 1,
    //     locationList: 1,
    //     quantity: 1,
    //     unit: 1,
    //     saveAsUnit: 1,
    //     updatedAt: 1,
    //     categoryId: 1
    //   };
    // }


    inventory.downloadReport({
      startDate,
      endDate,
      restaurantId: req.session.user.restaurantRef
    })
      .then(output => {
        // console.log("output ", output)
        req.workflow.outcome.data = output;
        req.workflow.emit('response');
      })
      .catch(next);
  };

  return {
    add: addInventory,
    get: getInventory,
    edit: editInventory,
    list: getInventoryList,
    delete: deleteInventory,
    seedInventory: seedInventory,
    downloadReport: downloadReport
  };

};