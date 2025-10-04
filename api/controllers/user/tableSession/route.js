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
   * Adds a tableSession
   */
  router.post('/create', [
    options.validateBody(schemaValidator.add),
    controllers.add
  ]);

  /**
   * Fetches a tableSession, edits a tableSession and removes a tableSession
   */
  router.route('/:tableId/:restaurantRef')
    .all([
      options.validateParams(schemaValidator.param),
    ])
    .get([
      controllers.get
    ]);


  return router;
};