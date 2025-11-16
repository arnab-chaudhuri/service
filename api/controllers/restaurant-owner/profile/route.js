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
   * File upload handling middleware
   * @type {Function}
   */

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
   * Logout
   */
  router.put('/logout', controllers.logout);
  router.put('/generate-pin', controllers.generatePin);
  router.put('/verify-pin', [options.validateBody(schemaValidator.verifyPin), controllers.verifyPin]);

  /**
   * Profile
   */
  router
    .route('/')
    .get(controllers.getProfile)
    .put([
      options.validateBody(schemaValidator.set),
      controllers.setProfile,
    ]);

  /**
   * Change Password
   */
  router.put('/change-password', [options.validateBody(schemaValidator.changePassword), controllers.changePassword]);

  return router;
};
