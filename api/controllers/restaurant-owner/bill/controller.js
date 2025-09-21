'use strict';
/**
 * This Controller handles all functionality of admin bill
 * @module Controllers/Admin/bill
 */
module.exports = function (app) {

  /**
   * bill module
   * @type {Object}
   */
  const bill = app.module.bill;
  const order = app.module.order;

  /**
   * Fetches a bill
   * @param  {Object}   req  Request 
   * @param  {Object}   res  Response
   * @param  {Function} next Next is used to pass control to the next middleware function
   * @return {Promise}       The Promise
   */
  const getBill = (req, res, next) => {
    bill.get(req.params.billId, req.session.user)
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
  const getBillList = (req, res, next) => {
    let query = {
      skip: Number(req.query.skip) || app.config.page.defaultSkip,
      limit: Number(req.query.limit) || app.config.page.defaultLimit,
      filters: {
        restaurantRef: req.session.user.restaurantRef
      },
      populate: [{
        path: 'orderRef',
        select: 'tableId tableRef'
      }],
      sort: {
        createdAt: -1
      }
    };

    // if (req.body.filters) {
    //   let { name } = req.body.filters;
    //   if (name) {
    //     query.filters.name = new RegExp(`^${name}`, 'ig');
    //   }
    // }
    // if (req.body.sortConfig) {
    //   let { name, bill } = req.body.sortConfig;
    //   if (name) {
    //     query.sort = { name };
    //   } else if (bill) {
    //     query.sort = { bill };
    //   }
    // }

    bill.list(query)
      .then(output => {
        req.workflow.outcome.data = output;
        req.workflow.emit('response');
      })
      .catch(next);
  };


  const handlePayment = (req, res, next) => {

    if (req.body && Object.keys(req.body).length) {
      for (let item in req.body) {
        req.billId[item] = req.body[item];
      }
    }

    bill.edit(req.billId, req.session.user)
      .then(output => {
        order.updateStatus(req.billId.orderRef);
        req.workflow.outcome.data = output;
        req.workflow.emit('response');
      })
      .catch(next);
  };


  return {
    get: getBill,
    list: getBillList,
    handlePayment: handlePayment
  };

};