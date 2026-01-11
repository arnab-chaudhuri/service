'use strict';

/**
 * This module handles all functionality of Admin Expense
 * @module Modules/Expense
 */
module.exports = function (app) {

  /**
   * expense Model
   * @type {Mongoose.Model}
   */
  const Expense = app.models.Expense;

  /**
   * Creates a Expense
   * @param  {Object} config  The config object
   * @return {Promise}        The promise
   */
  const createExpense = function (config, userRef) {
    config.restaurantRef = userRef.restaurantRef;
    config.createdBy = userRef._id;
    return Expense.createExpense(config);
  };

  /**
   * Fetches a expense by Id
   * @param  {String} expenseId  The expense id
   * @return {Promise}        The promise
   */
  const findExpenseById = function (expenseId, userRef) {
    return Expense.findById(expenseId)
    .populate({
      path: 'items.itemRef',
      select: 'name _id unit saveAsUnit'
    })
    .populate({
      path: 'vendorRef',
      select: 'name _id'
    })
      .then(expenseDetails => {
        if (!expenseDetails || (expenseDetails &&
          expenseDetails.restaurantRef.toString() !== userRef.restaurantRef.toString())) {
          return Promise.reject({
            'errCode': 'EXPENSE_NOT_FOUND'
          });
        } else {
          return Promise.resolve(expenseDetails);
        }
      });
  };

  /**
   * Edits a expense
   * @param  {Object} editedExpense The edited expense document
   * @return {Promise}           The promise
   */
  const editExpense = function (editedExpense, userRef) {

    if (editedExpense.restaurantRef.toString() !== userRef.restaurantRef.toString()) {
      return Promise.reject({
        'errCode': 'EXPENSE_NOT_FOUND'
      });
    }

    return editedExpense.save();
  };

  /**
   * Fetches a list of inventories
   * @param  {Object} options  The options object
   * @return {Promise}        The promise
   */
  const getList = function (options) {
    return Expense.pagedFind(options);
  };

  /**
   * Removes a expense
   * @param  {Object} expense The expense document
   * @return {Promise}     The promise
   */
  const removeExpense = function (expense, userRef) {
    if (expense.restaurantRef.toString() !== userRef.restaurantRef.toString()) {
      return Promise.reject({
        'errCode': 'EXPENSE_NOT_FOUND'
      });
    }
    return Expense.removeExpense(expense._id);
  };

  return {
    'create': createExpense,
    'get': findExpenseById,
    'edit': editExpense,
    'list': getList,
    'remove': removeExpense
  };
};