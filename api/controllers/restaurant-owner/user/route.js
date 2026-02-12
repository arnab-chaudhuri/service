'use strict';

///////////////////////////////////////////////////
// THIS IS THE ROUTE FILE FOR USER MODULE //
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

  router.post('/', [
    controllers.findOrCreateUserByPhone
  ]);

  /**
   * Fetches a list of categories
   */
  router.post('/list', [
    options.validateQuery(schemaValidator.listQuery),
    options.validateBody(schemaValidator.list),
    controllers.list
  ]);

  /**
   * Fetches a category, edits a category and removes a category
   */
  router.route('/:userId')
    .all([
      options.validateParams(schemaValidator.param),
      commonMiddlewares.validateId('User', 'userId')
    ])
    .get([
      controllers.get
    ])
    .put([
      controllers.edit
    ]);


  return router;
};