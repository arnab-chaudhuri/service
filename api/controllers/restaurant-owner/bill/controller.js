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
  const menu = app.module.menu;

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
      filters: {},
      sort: {
        createdAt: -1
      }
    };

    if (req.body.filters) {
      let { paymentStatus, startDate, endDate, search, searchType } = req.body.filters;
      let andFilters = [{
        restaurantRef: req.session.user.restaurantRef
      }];

      if (searchType && search && search.trim().length) {
        const obj = {};
        obj[searchType] = new RegExp(`^${search.trim()}`, 'ig');
        andFilters.push(obj);
      }

      if (paymentStatus) {
        andFilters.push({ "paymentDetails.status": Number(paymentStatus)});
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
        billNo: 1,
        total: 1,
        subTotal: 1,
        "orderRef.tableId": 1,
        "orderRef.cart": 1,
        "orderRef.status": 1,
        "orderRef.orderType": 1,
        "orderRef._id": 1,
        "orderRef.parcelDetails": 1,
        createdAt: 1,
        _id: 1,
        paymentDetails: 1,
        discountDetails: 1
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
        menu.updateOrderCount(req.billId.orderRef);
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