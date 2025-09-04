'use strict';
/**
 * This Controller handles all functionality of admin category
 * @module Controllers/Admin/category
 */
module.exports = function(app) {

  /**
   * category module
   * @type {Object}
   */
  const category = app.module.category;

  /**
   * Adds a category
   * @param  {Object}   req  Request 
   * @param  {Object}   res  Response
   * @param  {Function} next Next is used to pass control to the next middleware function
   * @return {Promise}       The Promise
   */
  const addCategory = (req, res, next) => {
    category.create(req.body, req.session.user)
      .then(output => {
        req.workflow.outcome.data = output;
        req.workflow.emit('response');
      })
      .catch(next);
  };

  /**
   * Fetches a category
   * @param  {Object}   req  Request 
   * @param  {Object}   res  Response
   * @param  {Function} next Next is used to pass control to the next middleware function
   * @return {Promise}       The Promise
   */
  const getCategory = (req, res, next) => {
    category.get(req.params.categoryId,req.session.user)
      .then(output => {
        req.workflow.outcome.data = output;
        req.workflow.emit('response');
      })
      .catch(next);
  };

  /**
   * Fetches a list of categories
   * @param  {Object}   req  Request 
   * @param  {Object}   res  Response
   * @param  {Function} next Next is used to pass control to the next middleware function
   * @return {Promise}       The Promise
   */
  const getCategoryList = (req, res, next) => {
    let query = {
      skip: Number(req.query.skip) || app.config.page.defaultSkip,
      limit: Number(req.query.limit) || app.config.page.defaultLimit,
      filters: {
        status: app.config.contentManagement.category.active,
        restaurantRef: req.session.user.restaurantRef
      },
      sort: {
        order: 1
      }
    };

    if (req.body.filters) {
      let { name } = req.body.filters;
      if (name) {
        query.filters.name = new RegExp(`^${name}`, 'ig');
      }
    }
    if (req.body.sortConfig) {
      let { name,order } = req.body.sortConfig;
      if (name) {
        query.sort = {name};
      } else if (order) {
        query.sort = {order};
      }
    }

    category.list(query)
      .then(output => {
        req.workflow.outcome.data = output;
        req.workflow.emit('response');
      })
      .catch(next);
  };

  /**
   * Edits a category
   * @param  {Object}   req  Request 
   * @param  {Object}   res  Response
   * @param  {Function} next Next is used to pass control to the next middleware function
   * @return {Promise}       The Promise
   */
  const editCategory = (req, res, next) => {
    req.categoryId.name = req.body.name;
    req.categoryId.order = req.body.order;
    req.categoryId.filterText = req.body.filterText;
    req.categoryId.image = req.body.image;
    category.edit(req.categoryId, req.session.user)
      .then(output => {
        req.workflow.outcome.data = output;
        req.workflow.emit('response');
      })
      .catch(next);
  };

  /**
   * Deletes a category
   * @param  {Object}   req  Request 
   * @param  {Object}   res  Response
   * @param  {Function} next Next is used to pass control to the next middleware function
   * @return {Promise}       The Promise
   */
  const deleteCategory = (req, res, next) => {
    req.categoryId.status = app.config.contentManagement.category.deleted;
    category.edit(req.categoryId, req.session.user)
      .then(output => {
        req.workflow.emit('response');
      })
      .catch(next);
  };

  return {
    add: addCategory,
    get: getCategory,
    edit: editCategory,
    list: getCategoryList,
    delete: deleteCategory
  };

};