'use strict';

/**
 * The router for public routes
 * @type {Express.Router}
 */
const router = require('express').Router();

module.exports = function (app) {
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

  const commonMiddlewares = require('./middleware')(app);


  router.get('/global-config', controllers.getGlobalConfig);
  router.get('/stream', controllers.stream);

  router.get('/error-codes', controllers.getErrorCodes);

  router.post('/contact-us', [app.utility.apiValidate.body(schemaValidator.contactUs), controllers.submitContactUs]);
  router.post('/mail', [controllers.triggerEmail]);

  return {
    public: router,
  };
};
