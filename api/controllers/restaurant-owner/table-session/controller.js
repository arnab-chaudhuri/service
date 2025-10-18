'use strict';
/**
 * This Controller handles all functionality of admin table
 * @module Controllers/Admin/table
 */
module.exports = function(app) {

  /**
   * table module
   * @type {Object}
   */
  const tableSession = app.module.tableSession;

  /**
   * Fetches a table
   * @param  {Object}   req  Request 
   * @param  {Object}   res  Response
   * @param  {Function} next Next is used to pass control to the next middleware function
   * @return {Promise}       The Promise
   */
  const getTableSession = (req, res, next) => {
    tableSession.getByTableId({
      tableRef: req.params.tableId,
      restaurantRef: req.session.user.restaurantRef,
      noError: true
    })
      .then(output => {
        req.workflow.outcome.data = output;
        req.workflow.emit('response');
      })
      .catch(next);
  };

  return {
    get: getTableSession,
  };

};