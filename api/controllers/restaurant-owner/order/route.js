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
   * Adds a order
   */
  router.post('/create', [
    options.validateBody(schemaValidator.add),
    controllers.add
  ]);

  router.post('/sync-master', [
    // options.validateBody(schemaValidator.syncMaster),
    controllers.syncMaster
  ]);

  /**
   * Fetches a list of orders
   */
  router.post('/list', [
    options.validateQuery(schemaValidator.listQuery),
    options.validateBody(schemaValidator.list),
    controllers.list
  ]);

  router.post('/ongoing-list', [
    options.validateQuery(schemaValidator.listQuery),
    options.validateBody(schemaValidator.list),
    controllers.getOngoingOrderList
  ]);

  router.get('/get-by-idbid/:orderId', [
    controllers.getByIdbId
  ]);

  router.put('/update-by-idbid/:orderId', [
    controllers.updateByIdbId
  ]);

  router.put('/update-cart-by-idbid/:orderId', [
    controllers.updateCartByIdbId
  ]);

  router.route('/change-status/:orderId')
    .put([
      options.validateBody(schemaValidator.changeStatus),
      controllers.changeStatus
    ]);

  router.route('/update-note/:orderId')
    .put([
      options.validateBody(schemaValidator.updateNote),
      controllers.updateNote
    ]);

  router.route('/accept/:orderId')
    .put([
      controllers.acceptOrder
    ]);

  router.route('/cancel/:orderId')
    .put([
      controllers.cancelOrder
    ]);

  /**
   * Fetches a order, edits a order and removes a order
   */
  router.route('/:orderId')
    .all([
      options.validateParams(schemaValidator.param),
      commonMiddlewares.validateId('Order', 'orderId')
    ])
    .get([
      controllers.get
    ])
    .put([
      // options.validateBody(schemaValidator.edit),
      controllers.edit
    ]);


  return router;
};