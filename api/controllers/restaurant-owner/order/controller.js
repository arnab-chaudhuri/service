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
      filters: {},
      sort: {
        createdAt: -1
      }
    };

    if (req.body.filters) {
      let { paymentStatus, orderStatus, startDate, endDate, search } = req.body.filters;
      let andFilters = [{
        status: {
          $ne: app.config.contentManagement.order.deleted
        },
        restaurantRef: req.session.user.restaurantRef
      }];

      if (search && search.trim().length) {
        andFilters.push({ "orderId": new RegExp(`^${search.trim()}`, 'ig') });
      }

      if (paymentStatus) {
        andFilters.push({ "billRef.paymentDetails.status": Number(paymentStatus)});
      }

      if (orderStatus) {
        andFilters.push({ "status": Number(orderStatus)});
      }

      if (startDate && endDate) {
        andFilters.push({
          createdAt: {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
          }
        });
      } else if (startDate) {
        andFilters.push({
          createdAt: {
            $gte: new Date(startDate)
          }
        });
      } else if (endDate) {
        andFilters.push({
          createdAt: {
            $lte: new Date(endDate)
          }
        });
      }

      if (andFilters.length > 0) {
        query.filters = { $and: andFilters };
      }

      query.select = {
        tableId: 1,
        orderId: 1,
        cart: 1,
        status: 1,
        "billRef.paymentDetails": 1,
        "billRef.total": 1,
        createdAt: 1,
        _id: 1
      };
    }
    // if (req.body.sortConfig) {
    //   let { name, uploadDateTime } = req.body.sortConfig;
    //   if (name) {
    //     query.sort.name = name;
    //   } else if (uploadDateTime) {
    //     query.sort.uploadDateTime = uploadDateTime;
    //   }
    // }

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