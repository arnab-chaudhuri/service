'use strict';
/**
 * This Controller handles all functionality of admin order
 * @module Controllers/Admin/order
 */
module.exports = function (app) {

  /**
   * order module
   * @type {Object}
   */
  const order = app.module.order;
  const bill = app.module.bill;
  const inventory = app.module.inventory;

  /**
   * Adds a order
   * @param  {Object}   req  Request 
   * @param  {Object}   res  Response
   * @param  {Function} next Next is used to pass control to the next middleware function
   * @return {Promise}       The Promise
   */
  const addOrder = (req, res, next) => {
    inventory.updateInventoryCount(req.body.cart)
      .then(output1 => {
        order.create(req.body, req.session.user)
          .then(output => {
            bill.create({
              billNo: output.orderId,
              orderRef: output._id,
              subTotal: req.body.subTotal,
              total: req.body.total,
              gstDetails: req.body.gstDetails,
              paymentDetails: req.body.paymentDetails
            }, req.session.user)
            .then(output2 => {
              output.billDetails = output2;

              order.updateBillDetails(output._id, output2);
              req.workflow.outcome.data = output;
              req.workflow.emit('response');
            }).catch(next);
          })
          .catch(next);
      })
      .catch(next);
  };

  /**
   * Fetches a order
   * @param  {Object}   req  Request 
   * @param  {Object}   res  Response
   * @param  {Function} next Next is used to pass control to the next middleware function
   * @return {Promise}       The Promise
   */
  const getOrder = (req, res, next) => {
    order.get(req.params.orderId, req.session.user)
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
  const getOrderList = (req, res, next) => {
    let query = {
      skip: Number(req.query.skip) || app.config.page.defaultSkip,
      limit: Number(req.query.limit) || app.config.page.defaultLimit,
      filters: {
        status: {
          $ne: app.config.contentManagement.order.deleted
        },
        restaurantRef: req.session.user.restaurantRef
      },
      populate: [{
        path: 'billRef',
        select: 'paymentDetails total'
      }],
      sort: {
        createdAt: -1
      }
    };

    if (req.body.filters) {
      let { name } = req.body.filters;
      if (name) {
        query.filters.name = new RegExp(`^${name}`, 'ig');
      }
    }
    if (req.body.sortConfig) {
      let { name, order } = req.body.sortConfig;
      if (name) {
        query.sort = { name };
      } else if (order) {
        query.sort = { order };
      }
    }

    order.list(query)
      .then(output => {
        req.workflow.outcome.data = output;
        req.workflow.emit('response');
      })
      .catch(next);
  };

  /**
   * Edits a order
   * @param  {Object}   req  Request 
   * @param  {Object}   res  Response
   * @param  {Function} next Next is used to pass control to the next middleware function
   * @return {Promise}       The Promise
   */
  const editOrder = (req, res, next) => {

    if (req.body && Object.keys(req.body).length) {
      for (let item in req.body) {
        req.orderId[item] = req.body[item];
      }
    }

    inventory.rollbackInventory(req.orderId._id, req.body.cart)
      .then(output1 => {
        order.edit(req.orderId, req.session.user)
          .then(output => {
            bill.updateBillFromOrder(req.orderId.billRef, {
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

  const changeStatus = (req, res, next) => {
    req.orderId.status = req.body.status;

    order.edit(req.orderId, req.session.user)
      .then(output => {
        req.workflow.outcome.data = output;
        req.workflow.emit('response');
      })
      .catch(next);
  };

  /**
   * Deletes a order
   * @param  {Object}   req  Request 
   * @param  {Object}   res  Response
   * @param  {Function} next Next is used to pass control to the next middleware function
   * @return {Promise}       The Promise
   */
  const deleteOrder = (req, res, next) => {
    req.orderId.status = app.config.contentManagement.order.deleted;
    order.edit(req.orderId, req.session.user)
      .then(output => {
        req.workflow.emit('response');
      })
      .catch(next);
  };

  return {
    add: addOrder,
    get: getOrder,
    edit: editOrder,
    list: getOrderList,
    delete: deleteOrder,
    changeStatus: changeStatus
  };

};