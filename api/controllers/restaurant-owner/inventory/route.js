'use strict';

///////////////////////////////////////////////////
// THIS IS THE ROUTE FILE FOR CATEGORY MODULE //
///////////////////////////////////////////////////

/**
 * The express router
 * @type {Express.Router}
 */
const router = require('express').Router();

/**
 * @param  {Express} app     The express app reference
 * @param  {Object}  options The options for this module
 * @return {Object}          The revealed module
 */
module.exports = function (app, options) {

  /**
   * The JSON-Schema for these APIs
   * @type {Object}
   */
  const schemaValidator = require('./schema-validator')(app);

  /**
   * The Controllers for these APIs
   * @type {Object}
   */
  const controllers = require('./controller')(app);

  /**
   * The Common Middlewares for these APIs
   * @type {Object}
   */
  const commonMiddlewares = require('../../common/middleware')(app);

  /**
   * Adds a inventory
   */
  router.post('/add', [
    options.validateBody(schemaValidator.add),
    controllers.add
  ]);

  router.post('/seed', [
    controllers.seedInventory
  ]);

  /**
   * Fetches a list of inventories
   */
  router.post('/list', [
    options.validateQuery(schemaValidator.listQuery),
    options.validateBody(schemaValidator.list),
    controllers.list
  ]);

  router.post('/download-report', [
    controllers.downloadReport
  ]);

  /**
   * Fetches a inventory, edits a inventory and removes a inventory
   */
  router.route('/:inventoryId')
    .all([
      options.validateParams(schemaValidator.param),
      commonMiddlewares.validateId('Inventory', 'inventoryId')
    ])
    .get([
      controllers.get
    ])
    .put([
      options.validateBody(schemaValidator.edit),
      controllers.edit
    ])
    .delete([
      controllers.delete
    ]);


  return router;
};