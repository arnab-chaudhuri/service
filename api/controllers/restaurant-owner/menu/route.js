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

  const uploadExcel = options.uploadFiles(app,{
    useFileFilter: true,
    allowedFileTypes: [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ],
  });

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
   * Adds a menu
   */
  router.post('/add', [
    options.validateBody(schemaValidator.add),
    controllers.add
  ]);

  /**
   * Fetches a list of menus
   */
  router.post('/list', [
    options.validateQuery(schemaValidator.listQuery),
    options.validateBody(schemaValidator.list),
    controllers.list
  ]);

  router.post('/bulk-add', [
    uploadExcel('excel'),
    controllers.bulkAdd
  ]);

  router.post('/get-menu-images', [
    options.validateBody(schemaValidator.getMenuImages),
    controllers.getMenuImages
  ]);

  /**
   * Fetches a menu, edits a menu and removes a menu
   */
  router.route('/:menuId')
    .all([
      options.validateParams(schemaValidator.param),
      commonMiddlewares.validateId('Menu', 'menuId')
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