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
   * The Controllers for these APIs
   * @type {Object}
   */
  const controllers = require('./controller')(app);

  /**j
   * The Common Middlewares for these APIs
   * @type {Object}
   */
  const commonMiddlewares = require('../../common/middleware')(app);
  /**
   * Fetch/Edit global config
   */

  router.get('/get-unread-count', [
    controllers.getUnreadCount
  ]);

  router.put('/mark-all-as-read', [
    controllers.markAllAsRead
  ]);

  router
    .route("/")
    .get([controllers.get])
    .post([
      commonMiddlewares.checkAdminRoleAccess([
        {
          moduleName: "notification",
          role: 2,
        },
      ]),
      options.validateBody(schemaValidator.createNotification),
      controllers.createNotification,
    ]);

  return router;
};
