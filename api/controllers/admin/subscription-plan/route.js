'use strict';

///////////////////////////////////////////////////
// THIS IS THE ROUTE FILE FOR ADMIN USER MODULE //
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
   * The Common Middlewares for these APIs
   * @type {Object}
   */
  const commonMiddlewares = require('../../common/middleware')(app);

  /**
   * The Controllers for these APIs
   * @type {Object}
   */
  const controllers = require('./controller')(app);

  /**
   * Adds an subscriptionPlan owner
   */
  router.post('/add', [
    options.validateBody(schemaValidator.add),
    controllers.add
  ]);

  /**
   * Fetches a list of subscriptionPlan owner
   */
  router.post('/list', [
    options.validateQuery(schemaValidator.listQuery),
    options.validateBody(schemaValidator.list),
    controllers.list
  ]);

  /**
   * Fetches an admin, edits an admin and removes an admin
   */
  router.route('/:subscriptionPlanId')
    .all([
      options.validateParams(schemaValidator.param),
      commonMiddlewares.validateId('SubscriptionPlan', 'subscriptionPlanId')
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

  // /**
  //    *  Changes(Suspend) the status of an Admin User
  //    */
  // router.put('/change-status/:adminUserId', [
  //   options.validateParams(schemaValidator.param),
  //   commonMiddlewares.validateId('Admin', 'adminUserId'),
  //   controllers.changeStatus
  // ]);

  return router;
};
