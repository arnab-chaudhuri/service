'use strict';
/**
 * This Controller handles all functionality of admin table
 * @module Controllers/Admin/table
 */
module.exports = function (app) {

  /**
   * table module
   * @type {Object}
   */
  const table = app.module.table;
  const tableSession = app.module.tableSession;

  /**
   * Adds a table
   * @param  {Object}   req  Request 
   * @param  {Object}   res  Response
   * @param  {Function} next Next is used to pass control to the next middleware function
   * @return {Promise}       The Promise
   */
  const addTable = (req, res, next) => {
    table.create(req.body, req.session.user)
      .then(output => {
        req.workflow.outcome.data = output;
        req.workflow.emit('response');
      })
      .catch(next);
  };

  /**
   * Fetches a table
   * @param  {Object}   req  Request 
   * @param  {Object}   res  Response
   * @param  {Function} next Next is used to pass control to the next middleware function
   * @return {Promise}       The Promise
   */
  const getTable = (req, res, next) => {
    table.get(req.params.tableId, req.session.user)
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
  const getTableList = (req, res, next) => {
    let query = {
      skip: Number(req.query.skip) || app.config.page.defaultSkip,
      limit: Number(req.query.limit) || app.config.page.defaultLimit,
      filters: {
        status: {
          '$ne': app.config.contentManagement.table.deleted
        },
        restaurantRef: req.session.user.restaurantRef
      },
      sort: {},
      populate: [{
        path: 'currentSessionRef',
        select: 'status orderRef',
        populate: [{
          path: 'orderRef',
          select: 'createdAt orderId status idbId'
        }]
      }]
    };

    if (req.body.filters) {
      let { tableId, status } = req.body.filters;
      if (tableId) {
        query.filters.tableId = new RegExp(`^${tableId}`, 'ig');
      }
      if (status) {
        query.filters.status = status;
      }
    }

    table.list(query)
      .then(output => {
        req.workflow.outcome.data = output;
        req.workflow.emit('response');
      })
      .catch(next);
  };

  /**
   * Edits a table
   * @param  {Object}   req  Request 
   * @param  {Object}   res  Response
   * @param  {Function} next Next is used to pass control to the next middleware function
   * @return {Promise}       The Promise
   */
  const editTable = (req, res, next) => {

    const oldStatus = req.tableId.status;

    if (req.body && Object.keys(req.body).length) {
      for (let prop in req.body) {
        req.tableId[prop] = req.body[prop];
      }
    }
    table.edit(req.tableId, req.session.user)
      .then(async output => {
        console.log("req.body ", req.body)
        if (req.body.status === app.config.contentManagement.table.active &&
          oldStatus !== req.body.status
        ) {
          await tableSession.updateStatusByTableRef(req.tableId._id, req.session.user.restaurantRef);
        }
        req.workflow.outcome.data = output;
        req.workflow.emit('response');
      })
      .catch(next);
  };

  /**
   * Deletes a table
   * @param  {Object}   req  Request 
   * @param  {Object}   res  Response
   * @param  {Function} next Next is used to pass control to the next middleware function
   * @return {Promise}       The Promise
   */
  const deleteTable = async (req, res, next) => {
    const tbSessionData = await tableSession.getByTableId(
      {
        tableRef: req.tableId._id,
        restaurantRef: req.tableId.restaurantRef,
        noError: true
      });

    if (tbSessionData && !tbSessionData.noData) {
      return next({ 'errCode': 'TABLE_CANNOT_BE_DELETED' });
    }

    req.tableId.status = app.config.contentManagement.table.deleted;
    table.edit(req.tableId, req.session.user)
      .then(output => {
        req.workflow.emit('response');
      })
      .catch(next);
  };

  return {
    add: addTable,
    get: getTable,
    edit: editTable,
    list: getTableList,
    delete: deleteTable
  };

};