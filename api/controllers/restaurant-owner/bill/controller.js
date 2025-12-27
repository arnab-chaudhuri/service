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
  const tableSession = app.module.tableSession;
  const sse = app.module.sse;
  const notification = app.module.notification;

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

  const getByOfflineId = (req, res, next) => {
    bill.getByOfflineId(req.params.billId, req.session.user)
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
        andFilters.push({ "paymentDetails.status": Number(paymentStatus) });
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
        offlineId: 1,
        total: 1,
        subTotal: 1,
        "orderRef.tableId": 1,
        "orderRef.cart": 1,
        "orderRef.status": 1,
        "orderRef.orderType": 1,
        "orderRef._id": 1,
        "orderRef.parcelDetails": 1,
        "orderRef.waterDetails": 1,
        "orderRef.idbId": 1,
        createdAt: 1,
        isRoundOff: 1,
        _id: 1,
        paymentDetails: 1,
        discountDetails: 1,
        serviceTaxDetails: 1,
        gstDetails: 1,
        isCGSTDisabled: 1,
        isSGSTDisabled: 1,
        isServiceTaxDisabled: 1
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

    bill.getByOfflineId(req.params.billId, req.session.user)
      .then(orderData => {
        if (req.body && Object.keys(req.body).length) {
          for (let item in req.body) {
            orderData[item] = req.body[item];
          }
        }

        bill.edit(orderData, req.session.user)
          .then(output => {
            if (!req.body.updateMethod) {
              order.updateStatus(orderData.orderRef);
              menu.updateOrderCount(orderData.orderRef);
              tableSession.updateStatusByOrderId(orderData.orderRef, orderData.restaurantRef);
            }

            let inAppNotification = app.config.notification.inApp(app, app.config.lang.defaultLanguage);

            sse.broadcastOrderUpdate({
              orderId: output.offlineId.toString(),
              restaurantRef: req.session.user.restaurantRef.toString(),
              type: "PAYMENT_BY_STAFF",
              message: inAppNotification.toRestaurantOwner.billPaid.body(output.billNo, req.session.user.personalInfo.fullName),
              userRef: req.session.user._id.toString()
            });

            notification.sendInAppNotificationToRestaurantStaffs(req.session.user.restaurantRef, {
              moduleName: 'bills',
              notificationType: "PAYMENT_BY_STAFF",
              message: inAppNotification.toRestaurantOwner.billPaid.body(output.billNo, req.session.user.personalInfo.fullName),
              redirectionId: output.offlineId,
              userRef: req.session.user._id,
              staffName: req.session.user.personalInfo.fullName
            });

            req.workflow.outcome.data = output;
            req.workflow.emit('response');
          })
          .catch(next);
      }).catch(next);


  };


  return {
    get: getBill,
    getByOfflineId: getByOfflineId,
    list: getBillList,
    handlePayment: handlePayment
  };

};