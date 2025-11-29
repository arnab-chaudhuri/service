'use strict';
/**
 * This Controller handles all functionality of admin expense
 * @module Controllers/Admin/expense
 */
module.exports = function(app) {

  /**
   * expense module
   * @type {Object}
   */
  const expense = app.module.expense;
  const menu = app.module.menu;
  const inventory = app.module.inventory;

  /**
   * Adds a expense
   * @param  {Object}   req  Request 
   * @param  {Object}   res  Response
   * @param  {Function} next Next is used to pass control to the next middleware function
   * @return {Promise}       The Promise
   */
  const addExpense = (req, res, next) => {
    expense.create({
      vendorName: req.body.vendorName,
      amount: req.body.amount,
      items: req.body.items
    }, req.session.user)
      .then(async output => {
        await inventory.updateInventoryWithPurchase(req.body.items, output._id);
        req.workflow.outcome.data = output;
        req.workflow.emit('response');
      })
      .catch(next);
  };

  /**
   * Fetches a expense
   * @param  {Object}   req  Request 
   * @param  {Object}   res  Response
   * @param  {Function} next Next is used to pass control to the next middleware function
   * @return {Promise}       The Promise
   */
  const getExpense = (req, res, next) => {
    expense.get(req.params.expenseId,req.session.user)
      .then(output => {
        req.workflow.outcome.data = output;
        req.workflow.emit('response');
      })
      .catch(next);
  };

  /**
   * Fetches a list of Inventories
   * @param  {Object}   req  Request 
   * @param  {Object}   res  Response
   * @param  {Function} next Next is used to pass control to the next middleware function
   * @return {Promise}       The Promise
   */
  const getExpenseList = (req, res, next) => {
    let query = {
      skip: Number(req.query.skip) || app.config.page.defaultSkip,
      limit: Number(req.query.limit) || app.config.page.defaultLimit,
      filters: {
        status: app.config.contentManagement.expense.active,
        restaurantRef: req.session.user.restaurantRef
      },
      sort: {}
    };

    if (req.body.filters) {
      let { name } = req.body.filters;
      if (name) {
        query.filters.name = new RegExp(`^${name}`, 'ig');
      }
    }
    if (req.body.sortConfig) {
      let { name } = req.body.sortConfig;
      if (name) {
        query.sort = {name};
      }
    }

    expense.list(query)
      .then(output => {
        req.workflow.outcome.data = output;
        req.workflow.emit('response');
      })
      .catch(next);
  };

  /**
   * Edits a expense
   * @param  {Object}   req  Request 
   * @param  {Object}   res  Response
   * @param  {Function} next Next is used to pass control to the next middleware function
   * @return {Promise}       The Promise
   */
  const editExpense = (req, res, next) => {
    req.expenseId.name = req.body.name;
    req.expenseId.quantity = req.body.quantity;
    req.expenseId.unit = req.body.unit;
    req.expenseId.saveAsUnit = req.body.saveAsUnit;
    req.expenseId.image = req.body.image;
    req.expenseId.locationList = req.body.locationList;
    req.expenseId.categoryId = req.body.categoryId;
    expense.edit(req.expenseId, req.session.user)
      .then(output => {
        req.workflow.outcome.data = output;
        req.workflow.emit('response');
      })
      .catch(next);
  };

  /**
   * Deletes a expense
   * @param  {Object}   req  Request 
   * @param  {Object}   res  Response
   * @param  {Function} next Next is used to pass control to the next middleware function
   * @return {Promise}       The Promise
   */
  const deleteExpense = (req, res, next) => {
    req.expenseId.status = app.config.contentManagement.expense.deleted;
    expense.edit(req.expenseId, req.session.user)
      .then(async output => {
        await inventory.updateInventoryWithPurchase(req.expenseId.items, req.expenseId._id, true);
        req.workflow.emit('response');
      })
      .catch(next);
  };

  return {
    add: addExpense,
    get: getExpense,
    edit: editExpense,
    list: getExpenseList,
    delete: deleteExpense
  };

};