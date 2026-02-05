'use strict';
/**
 * This Controller handles all functionality of admin tableSession
 * @module Controllers/Admin/tableSession
 */
module.exports = function (app) {

  /**
   * tableSession module
   * @type {Object}
   */
  const tableSession = app.module.tableSession;
  const table = app.module.table;
  const bill = app.module.bill;
  const inventory = app.module.inventory;

  /**
   * Adds a tableSession
   * @param  {Object}   req  Request 
   * @param  {Object}   res  Response
   * @param  {Function} next Next is used to pass control to the next middleware function
   * @return {Promise}       The Promise
   */
  const addTableSession = (req, res, next) => {
    tableSession.create(req.body)
      .then(output => {
        if (req.body.tableRef && output.isNew) {
          table.markAsUnavailable(req.body.tableRef);
        }
        req.workflow.outcome.data = output;
        req.workflow.emit('response');
      })
      .catch(next);
  };

  /**
   * Fetches a tableSession
   * @param  {Object}   req  Request 
   * @param  {Object}   res  Response
   * @param  {Function} next Next is used to pass control to the next middleware function
   * @return {Promise}       The Promise
   */
  const getTableSession = (req, res, next) => {
    tableSession.getByTableIdFromApp({
      tableRef: req.params.tableId,
      restaurantRef: req.params.restaurantRef,
      noError: true
    })
      .then(output => {
        req.workflow.outcome.data = output;
        req.workflow.emit('response');
      })
      .catch(next);
  };

  /**
   * Edits a tableSession
   * @param  {Object}   req  Request 
   * @param  {Object}   res  Response
   * @param  {Function} next Next is used to pass control to the next middleware function
   * @return {Promise}       The Promise
   */
  const editTableSession = (req, res, next) => {

    if (req.body && Object.keys(req.body).length) {
      for (let item in req.body) {
        req.tableSessionId[item] = req.body[item];
      }
    }

    inventory.rollbackInventory(req.tableSessionId._id, req.body.cart)
      .then(output1 => {
        tableSession.edit(req.tableSessionId, req.session.user)
          .then(output => {
            bill.updateBillFromTableSession(req.tableSessionId.billRef, {
              subTotal: req.body.subTotal,
              total: req.body.total,
            });
            req.workflow.outcome.data = output;
            req.workflow.emit('response');
          })
          .catch(next);
      })
      .catch(next);
  };

  return {
    add: addTableSession,
    get: getTableSession,
    edit: editTableSession
  };

};