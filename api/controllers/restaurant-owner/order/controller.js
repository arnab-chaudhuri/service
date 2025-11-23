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
  const tableSession = app.module.tableSession;
  const table = app.module.table;
  const sse = app.module.sse;
  const notification = app.module.notification;
  const menu = app.module.menu;

  /**
   * Adds a order
   * @param  {Object}   req  Request 
   * @param  {Object}   res  Response
   * @param  {Function} next Next is used to pass control to the next middleware function
   * @return {Promise}       The Promise
   */
  const addOrder = (req, res, next) => {
    tableSession.createTableSessionFromOwner(req.body, req.session.user)
      .then(output0 => {
        inventory.updateInventoryCount(req.body.cart)
          .then(output1 => {
            order.create(req.body, req.session.user)
              .then(output => {
                bill.create({
                  offlineId: req.body.idbId,
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

                    if (req.body.tableRef) {
                      table.markAsUnavailable(req.body.tableRef, output0._id);

                      // update orderRef in table session
                      output0.orderRef = output._id;
                      tableSession.edit(output0);
                    }

                    inventory.updateHistoryOrderRef(output1.invIds, output._id);

                    let inAppNotification = app.config.notification.inApp(app, app.config.lang.defaultLanguage);

                    sse.broadcastOrderUpdate({
                      orderId: output.idbId.toString(),
                      restaurantRef: req.session.user.restaurantRef.toString(),
                      message: inAppNotification.toRestaurantOwner.newOrder.body(req.session.user.personalInfo.fullName),
                      type: "NEW_ORDER_BY_STAFF",
                      userRef: req.session.user._id.toString()
                    });

                    notification.sendInAppNotificationToRestaurantStaffs(req.session.user.restaurantRef, {
                      moduleName: 'orders',
                      notificationType: "NEW_ORDER_BY_STAFF",
                      message: inAppNotification.toRestaurantOwner.newOrder.body(req.session.user.personalInfo.fullName),
                      redirectionId: output.idbId,
                      userRef: req.session.user._id,
                      staffName: req.session.user.personalInfo.fullName
                    });

                    req.workflow.outcome.data = output;
                    req.workflow.emit('response');
                  }).catch(next);
              })
              .catch(next);
          })
          .catch(next);
      })
      .catch(next);
  };

  function aggregateItems(orders, user) {
    const inventoryMap = new Map();

    for (const order of orders) {
      for (const item of order.cart) {
        const key = `${user.restaurantRef}_${item.menuRef}`;
        if (!inventoryMap.has(key)) {
          inventoryMap.set(key, {
            restaurantRef: user.restaurantRef,
            menuRef: item.menuRef,
            quantity: item.quantity,
            orderId: order._id,
            status: order.status,
            isRestoredWhileCancel: order.isRestoredWhileCancel
          });
        } else {
          inventoryMap.get(key).quantity += item.quantity;
        }
      }
    }

    return Array.from(inventoryMap.values());
  }

  const syncMaster = async (req, res, next) => {
    try {
      const { orders } = req.body;
      if (!orders || !orders.length) {
        req.workflow.outcome.data = { syncedIds: [] };
        req.workflow.emit('response');
        return;
      }

      const syncedIds = [];

      const newOrders = orders.filter(o => !o.orderId);
      const updateOrders = orders.filter(o => o.orderId);

      // handle new orders
      if (newOrders.length) {
        const outputOrders = await order.createMulti(newOrders, req.session.user);
        // update inventory - await in case returns a promise
        await inventory.updateInventoryCountSync(aggregateItems(outputOrders, req.session.user));

        const carts = [];
        // collect all cart items from outputOrders
        outputOrders.forEach(o => {
          if (Array.isArray(o.cart) && o.cart.length &&
        (o.status === app.config.contentManagement.order.completed ||
          o.status === app.config.contentManagement.order.deleted
        )) {
            carts.push(...o.cart);
          }
        });
        if (carts.length) {
          await menu.updateBulkOrderCount(carts);
        }

        const bills = newOrders.map(n => {
            
          const match = outputOrders.find(o => String(o.idbId) === String(n.idbId));
          const obj = {
            offlineId: match.idbId,
            billNo: match ? match.orderId : undefined,
            orderRef: match ? match._id : undefined,
            subTotal: n.billDetails ? n.billDetails.subTotal : n.subTotal,
            total: n.billDetails ? n.billDetails.total : n.total,
            gstDetails: n.billDetails ? n.billDetails.gstDetails : n.gstDetails,
            paymentDetails: n.billDetails ? n.billDetails.paymentDetails : n.paymentDetails,
          };
          if ((n.billDetails && n.billDetails.discountDetails) || n.discountDetails) {
            obj.discountDetails = n.billDetails ? n.billDetails.discountDetails : n.discountDetails;
          }
          return obj;
        });

        const outputBills = await bill.createMulti(bills, req.session.user);

        const arr = outputBills.map(each => ({
          billRef: each._id,
          orderId: outputOrders.find(item => item.orderId === each.billNo)?._id
        }));

        // update orders with bill refs
        await order.updateBillDetailsBulk(arr);

        const responseOrders = outputOrders.map(each => {
          each.billRef = outputBills.find(o => String(o.billNo) === String(each.orderId));
          return each;
        });

        syncedIds.push(...responseOrders);
      }

      // handle update orders
      if (updateOrders.length) {
        await inventory.rollbackInventorySync(aggregateItems(updateOrders, req.session.user));

        const outputOrders = await order.bulkUpdateOrders(updateOrders, req.session.user);

        const carts = [];
        // collect all cart items from outputOrders
        outputOrders.forEach(o => {
          if (Array.isArray(o.cart) && o.cart.length &&
        (o.status === app.config.contentManagement.order.completed ||
          o.status === app.config.contentManagement.order.deleted
        )) {
            carts.push(...o.cart);
          }
        });

        console.log("carts ", carts)
        if (carts.length) {
          await menu.updateBulkOrderCount(carts);
        }

        const bills = updateOrders.map(n => {
          const match = outputOrders.find(o => String(o.idbId) === String(n.idbId));
          const obj = {
            _id: match ? match.billRef : undefined,
            billNo: match ? match.orderId : undefined,
            orderRef: match ? match._id : undefined,
            subTotal: n.billDetails ? n.billDetails.subTotal : n.subTotal,
            total: n.billDetails ? n.billDetails.total : n.total,
            gstDetails: n.billDetails ? n.billDetails.gstDetails : n.gstDetails,
            paymentDetails: n.billDetails ? n.billDetails.paymentDetails : n.paymentDetails,
          };
          if ((n.billDetails && n.billDetails.discountDetails) || n.discountDetails) {
            obj.discountDetails = n.billDetails ? n.billDetails.discountDetails : n.discountDetails;
          }
          return obj;
        });

        const updatedBills = await bill.bulkUpdateBills(bills, req.session.user);

        const responseOrders = outputOrders.map(each => {
          each.billRef = updatedBills.find(o => String(o._id) === String(each.billRef));
          return each;
        });

        syncedIds.push(...responseOrders);
      }

      req.workflow.outcome.data = syncedIds;
      req.workflow.emit('response');
    } catch (err) {
      next(err);
    }
  };

  const acceptOrder = (req, res, next) => {
    order.getOrderByIdbId(req.params.orderId, req.session.user)
      .then(orderData => {
        orderData.status = app.config.contentManagement.order.active;
        inventory.updateInventoryCount(orderData.cart, orderData._id)
          .then(output1 => {
            order.edit(orderData, req.session.user)
              .then(output => {


                let inAppNotification = app.config.notification.inApp(app, app.config.lang.defaultLanguage);

                sse.broadcastOrderUpdate({
                  orderId: orderData._id.toString(),
                  restaurantRef: req.session.user.restaurantRef.toString(),
                  status: orderData.status,
                  type: "ACCEPT_ORDER"
                });

                sse.broadcastOrderUpdate({
                  orderId: orderData.idbId.toString(),
                  restaurantRef: req.session.user.restaurantRef.toString(),
                  type: "ACCEPT_ORDER_BY_STAFF",
                  message: inAppNotification.toRestaurantOwner.acceptOrder.body(orderData.orderId, req.session.user.personalInfo.fullName),
                  userRef: req.session.user._id.toString()
                });

                notification.sendInAppNotificationToRestaurantStaffs(req.session.user.restaurantRef, {
                  moduleName: 'orders',
                  notificationType: "ACCEPT_ORDER_BY_STAFF",
                  message: inAppNotification.toRestaurantOwner.acceptOrder.body(orderData.orderId, req.session.user.personalInfo.fullName),
                  redirectionId: orderData.idbId,
                  userRef: req.session.user._id,
                  staffName: req.session.user.personalInfo.fullName
                });
                req.workflow.outcome.data = output;
                req.workflow.emit('response');
              })
              .catch(next);
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

  const getOrderByIdbId = (req, res, next) => {
    order.getOrderByIdbId(req.params.orderId, req.session.user)
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
      let { paymentStatus, orderStatus, startDate, endDate, search, offline } = req.body.filters;
      let andFilters = [{
        restaurantRef: req.session.user.restaurantRef
      }];

      if (search && search.trim().length) {
        andFilters.push({ "orderId": new RegExp(`^${search.trim()}`, 'ig') });
      }

      if (paymentStatus) {
        andFilters.push({ "billRef.paymentDetails.status": Number(paymentStatus) });
      }

      if (orderStatus) {
        andFilters.push({ "status": Number(orderStatus) });
      }

      if (offline) {
        andFilters.push({ "isOnline": false });
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
        idbId: 1,
        cart: 1,
        status: 1,
        isOnline: 1,
        "billRef.paymentDetails": 1,
        "billRef.total": 1,
        "billRef._id": 1,
        "billRef.offlineId": 1,
        "billRef.billNo": 1,
        "billRef.restaurantRef": 1,
        "billRef.subTotal": 1,
        "billRef.discountDetails": 1,
        "billRef.gstDetails": 1,
        createdAt: 1,
        updatedAt: 1,
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

  const getOngoingOrderList = (req, res, next) => {

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
        restaurantRef: req.session.user.restaurantRef,
        status: {
          '$in': [
            app.config.contentManagement.order.active,
            app.config.contentManagement.order.cooking,
            app.config.contentManagement.order.served,
            app.config.contentManagement.order.pending,
          ]
        }
      }];

      if (search && search.trim().length) {
        andFilters.push({ "orderId": new RegExp(`^${search.trim()}`, 'ig') });
      }

      if (paymentStatus) {
        andFilters.push({ "billRef.paymentDetails.status": Number(paymentStatus) });
      }

      if (orderStatus) {
        andFilters.push({ "status": Number(orderStatus) });
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
        idbId: 1,
        cart: 1,
        status: 1,
        isOnline: 1,
        "billRef.paymentDetails": 1,
        "billRef.total": 1,
        "billRef._id": 1,
        "billRef.offlineId": 1,
        "billRef.billNo": 1,
        "billRef.restaurantRef": 1,
        "billRef.subTotal": 1,
        "billRef.discountDetails": 1,
        "billRef.gstDetails": 1,
        createdBy: 1,
        createdAt: 1,
        updatedAt: 1,
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

    const oldTableId = req.orderId.tableRef;

    if (req.body && Object.keys(req.body).length) {
      for (let item in req.body) {
        req.orderId[item] = req.body[item];
      }
    }

    inventory.rollbackInventory(req.orderId._id, req.body.cart)
      .then(output1 => {
        order.edit(req.orderId, req.session.user)
          .then(async output => {
            bill.updateBillFromOrder(req.orderId.billRef, {
              subTotal: req.body.subTotal,
              total: req.body.total,
              gstDetails: req.body.gstDetails
            });

            let inAppNotification = app.config.notification.inApp(app, app.config.lang.defaultLanguage);

            sse.broadcastOrderUpdate({
              orderId: req.orderId.idbId.toString(),
              restaurantRef: req.session.user.restaurantRef.toString(),
              type: "UPDATE_ORDER_BY_STAFF",
              message: inAppNotification.toRestaurantOwner.updateOrder.body(orderData.orderId, req.session.user.personalInfo.fullName),
              userRef: req.session.user._id.toString()
            });

            notification.sendInAppNotificationToRestaurantStaffs(req.session.user.restaurantRef, {
              moduleName: 'orders',
              notificationType: "UPDATE_ORDER_BY_STAFF",
              message: inAppNotification.toRestaurantOwner.updateOrder.body(orderData.orderId, req.session.user.personalInfo.fullName),
              redirectionId: req.orderId.idbId,
              userRef: req.session.user._id,
              staffName: req.session.user.personalInfo.fullName
            });

            if (req.body.tableRef && (!oldTableId || (oldTableId && req.body.tableRef.toString() !== oldTableId.toString()))) {

              req.body.orderRef = req.orderId._id;
              // close the earlier table session and create a new session for the new table
              tableSession.updateStatusByOrderId(req.orderId._id, req.orderId.restaurantRef);
              const tableSessionRes = await tableSession.createTableSessionFromOwner(req.body, req.session.user);

              table.markAsUnavailable(req.body.tableRef, tableSessionRes._id);

            }

            req.workflow.outcome.data = output;
            req.workflow.emit('response');
          })
          .catch(next);
      })
      .catch(next);
  };

  const updateByIdbId = (req, res, next) => {

    order.getOrderByIdbId(req.params.orderId, req.session.user)
      .then(orderData => {
        const oldTableId = orderData.tableRef;

        if (req.body && Object.keys(req.body).length) {
          for (let item in req.body) {
            orderData[item] = req.body[item];
          }
        }

        inventory.rollbackInventory(orderData._id, req.body.cart)
          .then(output1 => {
            order.edit(orderData, req.session.user)
              .then(async output => {
                bill.updateBillFromOrder(orderData.billRef, {
                  subTotal: req.body.subTotal,
                  total: req.body.total,
                  gstDetails: req.body.gstDetails
                });

                let inAppNotification = app.config.notification.inApp(app, app.config.lang.defaultLanguage);

                sse.broadcastOrderUpdate({
                  orderId: orderData.idbId.toString(),
                  restaurantRef: req.session.user.restaurantRef.toString(),
                  type: "UPDATE_ORDER_BY_STAFF",
                  message: inAppNotification.toRestaurantOwner.updateOrder.body(orderData.orderId, req.session.user.personalInfo.fullName),
                  userRef: req.session.user._id.toString()
                });

                notification.sendInAppNotificationToRestaurantStaffs(req.session.user.restaurantRef, {
                  moduleName: 'orders',
                  notificationType: "UPDATE_ORDER_BY_STAFF",
                  message: inAppNotification.toRestaurantOwner.updateOrder.body(orderData.orderId, req.session.user.personalInfo.fullName),
                  redirectionId: orderData.idbId,
                  userRef: req.session.user._id,
                  staffName: req.session.user.personalInfo.fullName
                });

                if (req.body.tableRef && (!oldTableId || (oldTableId && req.body.tableRef.toString() !== oldTableId.toString()))) {

                  req.body.orderRef = orderData._id;
                  // close the earlier table session and create a new session for the new table
                  tableSession.updateStatusByOrderId(orderData._id, orderData.restaurantRef);
                  const tableSessionRes = await tableSession.createTableSessionFromOwner(req.body, req.session.user);

                  table.markAsUnavailable(req.body.tableRef, tableSessionRes._id);

                }

                req.workflow.outcome.data = output;
                req.workflow.emit('response');
              })
              .catch(next);
          })
          .catch(next);
      })
      .catch(next);


  };

  const cancelOrder = (req, res, next) => {

    const notPossibleCancelStatus = [
      app.config.contentManagement.order.deleted
    ];

    order.getOrderByIdbId(req.params.orderId, req.session.user)
      .then(orderData => {

        if (notPossibleCancelStatus.includes(orderData.status)) {
          return next({ 'errCode': 'ORDER_CANNOT_BE_CANCELLED' });
        }

        if (!req.body.noRevertBack) {
          inventory.rollbackInventory(orderData._id, req.body.cart, true);
        }

        orderData.status = app.config.contentManagement.order.deleted;
        orderData.isRestoredWhileCancel = !req.body.noRevertBack;
        order.edit(orderData, req.session.user)
          .then(async output => {
            bill.updateBillFromOrder(orderData.billRef, {
              paymentDetails: {
                status: app.config.contentManagement.paymentStatus.cancelled
              }
            });

            if (orderData.tableRef) {

              // close the earlier table session
              tableSession.updateStatusByOrderId(orderData._id, orderData.restaurantRef);

            }

            let inAppNotification = app.config.notification.inApp(app, app.config.lang.defaultLanguage);

            sse.broadcastOrderUpdate({
              orderId: orderData.idbId.toString(),
              restaurantRef: req.session.user.restaurantRef.toString(),
              type: "CANCEL_ORDER_BY_STAFF",
              message: inAppNotification.toRestaurantOwner.cancelOrder.body(orderData.orderId, req.session.user.personalInfo.fullName),
              userRef: req.session.user._id.toString()
            });

            notification.sendInAppNotificationToRestaurantStaffs(req.session.user.restaurantRef, {
              moduleName: 'orders',
              notificationType: "CANCEL_ORDER_BY_STAFF",
              message: inAppNotification.toRestaurantOwner.cancelOrder.body(orderData.orderId, req.session.user.personalInfo.fullName),
              redirectionId: orderData.idbId,
              userRef: req.session.user._id,
              staffName: req.session.user.personalInfo.fullName
            });

            req.workflow.outcome.data = output;
            req.workflow.emit('response');
          })
          .catch(next);
      }).catch(next);


  };

  const changeStatus = (req, res, next) => {
    order.getOrderByIdbId(req.params.orderId, req.session.user)
      .then(orderData => {
        orderData.status = req.body.status;

        order.edit(orderData, req.session.user)
          .then(output => {
            let inAppNotification = app.config.notification.inApp(app, app.config.lang.defaultLanguage);

            sse.broadcastOrderUpdate({
              orderId: orderData._id.toString(),
              restaurantRef: req.session.user.restaurantRef.toString(),
              status: orderData.status,
              type: "CHANGE_ORDER_STATUS",
              userRef: req.session.user._id.toString(),
              message: inAppNotification.toRestaurantOwner.changeOrderStatus.body(orderData.orderId, req.session.user.personalInfo.fullName),
            });

            notification.sendInAppNotificationToRestaurantStaffs(req.session.user.restaurantRef, {
              moduleName: 'orders',
              notificationType: "CHANGE_ORDER_STATUS",
              message: inAppNotification.toRestaurantOwner.changeOrderStatus.body(orderData.orderId, req.session.user.personalInfo.fullName),
              redirectionId: orderData.idbId,
              userRef: req.session.user._id,
              staffName: req.session.user.personalInfo.fullName
            });

            req.workflow.outcome.data = output;
            req.workflow.emit('response');
          })
          .catch(next);
      }).catch(next);

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
    getByIdbId: getOrderByIdbId,
    edit: editOrder,
    list: getOrderList,
    delete: deleteOrder,
    changeStatus: changeStatus,
    acceptOrder: acceptOrder,
    cancelOrder: cancelOrder,
    syncMaster: syncMaster,
    updateByIdbId: updateByIdbId,
    getOngoingOrderList: getOngoingOrderList
  };

};