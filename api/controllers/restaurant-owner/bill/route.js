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
   * Fetches a list of bills
   */
  router.post('/list', [
    options.validateQuery(schemaValidator.listQuery),
    options.validateBody(schemaValidator.list),
    controllers.list
  ]);
  

  router.put('/make-payment/:billId', [
      controllers.handlePayment
    ]);

  router.get('/by-offline/:billId', [
    controllers.getByOfflineId
  ]);


  /**
   * Fetches a bill, edits a bill and removes a bill
   */
  router.route('/:billId')
    .all([
      options.validateParams(schemaValidator.param),
      commonMiddlewares.validateId('Bill', 'billId')
    ])
    .get([
      controllers.get
    ]);


  return router;
};