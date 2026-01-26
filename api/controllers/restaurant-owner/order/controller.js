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
  const user = app.module.user;

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
                  serviceTaxDetails: req.body.serviceTaxDetails,
                  paymentDetails: req.body.paymentDetails
                }, req.session.user)
                  .then(async output2 => {
                    output.billDetails = output2;

                    const userData = req.body.contactDetails;
                    let dbUser = undefined;

                    if (userData && userData.phone &&
                      userData.phone.number
                    ) {
                      dbUser = await user.crud.findOrCreateUserByPhone(
                        userData.phone.countryCode || "+91",
                        userData.phone.number,
                        userData.fullName
                      );

                    }

                    order.updateBillDetails(output._id, output2, dbUser).catch(err => {
                      console.log("err updateBillDetails ", err)
                    });

                    if (req.body.tableRef) {
                      table.markAsUnavailable(req.body.tableRef, output0._id).catch(err => {
                        console.log("err markAsUnavailable ", err)
                      });

                      // update orderRef in table session
                      output0.orderRef = output._id;
                      tableSession.edit(output0).catch(err => {
                        console.log("err tableSession ", err)
                      });
                    }

                    inventory.updateHistoryOrderRef(output1.invIds, output._id).catch(err => {
                      console.log("err updateHistoryOrderRef ", err)
                    });

                    let inAppNotification = app.config.notification.inApp(app, app.config.lang.defaultLanguage);

                    sse.broadcastOrderUpdate({
                      orderId: output.idbId.toString(),
                      restaurantRef: req.session.user.restaurantRef.toString(),
                      message: inAppNotification.toRestaurantOwner.newOrder.body(req.session.user.personalInfo.fullName),
                      type: "NEW_ORDER_BY_STAFF",
                      userRef: req.session.user._id.toString()
                    })

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

  function getLatestFromEachTable(orders) {
    const result = orders.reduce((acc, curr) => {
      const { tableRef, lastUpdated } = curr;

      if (
        !acc[tableRef] ||
        lastUpdated > acc[tableRef].lastUpdated
      ) {
        acc[tableRef] = curr;
      }

      return acc;
    }, {});

    return result
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

      const newOrders = orders.filter(o => !o.orderId).filter(n => n.status !== app.config.contentManagement.order.pending);
      const updateOrders = orders.filter(o => o.orderId).filter(n => n.status !== app.config.contentManagement.order.pending);

      // console.log("newOrders ", newOrders, updateOrders)

      // handle new orders
      if (newOrders.length) {
        const outputOrders = await order.createMulti(newOrders, req.session.user);
        // console.log("outputOrders ", outputOrders)
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
            isCGSTDisabled: n.billDetails ? n.billDetails.isCGSTDisabled : n.isCGSTDisabled || false,
            isSGSTDisabled: n.billDetails ? n.billDetails.isSGSTDisabled : n.isSGSTDisabled || false,
            gstDetails: n.billDetails ? n.billDetails.gstDetails : n.gstDetails,
            serviceTaxDetails: n.billDetails ? n.billDetails.serviceTaxDetails : n.serviceTaxDetails,
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

        // console.log("responseOrders ", responseOrders)
        syncedIds.push(...responseOrders);
      }

      // handle update orders
      if (updateOrders.length) {
        await inventory.rollbackInventorySync(aggregateItems(updateOrders, req.session.user));

        const outputOrders = await order.bulkUpdateOrders(updateOrders, req.session.user);

        // console.log("outputOrders updte ", outputOrders)

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

        // console.log("carts ", carts)
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
            serviceTaxDetails: n.billDetails ? n.billDetails.serviceTaxDetails : n.serviceTaxDetails,
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

      // console.log("syncedIds ", syncedIds)


      // should be different for update and create
      // console.log("Incoming orders count:", orders.length);

      const tableWiseLatestOrder = getLatestFromEachTable(
        orders.filter(each => each.tableRef)
      );
      // console.log("tableWiseLatestOrder:", tableWiseLatestOrder);

      let tableQuery = {
        skip: 0,
        limit: 1500,
        filters: {
          restaurantRef: req.session.user.restaurantRef.toString()
        },
        sort: {},
        populate: [{
          path: 'currentSessionRef',
          select: 'status orderRef',
          populate: [{
            path: 'orderRef',
            select: 'createdAt orderId status idbId updatedAt'
          }]
        }]
      };

      // console.log("Table list query:", tableQuery);

      await table.list(tableQuery)
        .then(async tableList => {
          // console.log("Fetched tableList count:", tableList?.data?.length || 0);

          if (!tableList || !tableList?.data?.length) {
            // console.log("No tables found");
            return;
          }

          if (!tableWiseLatestOrder || !Object.keys(tableWiseLatestOrder).length) {
            // console.log("No tableWiseLatestOrder found");
            return;
          }

          for (let tblRef in tableWiseLatestOrder) {
            const lstOrder = tableWiseLatestOrder[tblRef];
            const latestOrder = syncedIds.find(each => each.idbId === lstOrder.idbId);

            // console.log(`\nProcessing tableRef: ${tblRef}`);
            // console.log("Latest order:", latestOrder, lstOrder);

            if (
              !latestOrder ||
              !Object.keys(latestOrder).length
            ) {
              // console.log("Invalid latest order, skipping");
              continue;
            }

            if (
              latestOrder.status === app.config.contentManagement.order.completed ||
              latestOrder.status === app.config.contentManagement.order.deleted
            ) {
              // console.log("Order is completed or deleted");
              tableSession.updateStatusByOrderId(
                latestOrder._id,
                req.session.user.restaurantRef
              );
              continue;
            }

            const dbTableData = tableList.data.find(each => each._id.toString() === tblRef.toString());
            // console.log("DB table data:", dbTableData);

            let sessionType = '';

            if (dbTableData && !dbTableData.currentSessionRef) {
              sessionType = 'ADD';
              // console.log("No currentSessionRef → ADD");
            }

            if (
              dbTableData &&
              dbTableData.currentSessionRef &&
              !dbTableData.currentSessionRef.orderRef
            ) {
              sessionType = 'ADD';
              // console.log("Session exists but no orderRef → ADD");
            }

            if (
              dbTableData &&
              dbTableData.currentSessionRef &&
              dbTableData.currentSessionRef.orderRef &&
              dbTableData.currentSessionRef.orderRef.idbId !== latestOrder.idbId &&
              dbTableData.currentSessionRef.orderRef.updatedAt &&
              lstOrder.lastUpdated &&
              new Date(dbTableData.currentSessionRef.orderRef.updatedAt).getTime() <=
              new Date(lstOrder.lastUpdated).getTime()
            ) {
              sessionType = 'UPDATE';
              // console.log("Existing session older than latest order → UPDATE");
            }

            // console.log("Final sessionType:", sessionType);

            if (sessionType === 'UPDATE') {
              // console.log(
              //   "Updating table session for orderId:",
              //   dbTableData.currentSessionRef.orderRef._id
              // );

              tableSession.updateStatusByOrderId(
                dbTableData.currentSessionRef.orderRef._id,
                req.session.user.restaurantRef
              );
            }

            if (sessionType) {
              // console.log("Creating table session with payload:", {
              //   tableRef: tblRef,
              //   cart: latestOrder.cart,
              //   restaurantRef: req.session.user.restaurantRef,
              //   orderRef: latestOrder._id
              // });

              const tableSessionRes =
                await tableSession.createTableSessionFromOwner(
                  {
                    tableRef: tblRef,
                    cart: latestOrder.cart,
                    restaurantRef: req.session.user.restaurantRef,
                    orderRef: latestOrder._id
                  },
                  req.session.user
                );

              // console.log("Table session created:", tableSessionRes);

              // console.log("Marking table as unavailable:", tblRef);
              table.markAsUnavailable(tblRef, tableSessionRes._id);
            } else {
              // console.log("No session action required for table:", tblRef);
            }
          }
        })
        .catch(err => {
          console.error("Error while processing table sessions:", err);
        });




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

                // inventory.updateHistoryOrderRef(output1.invIds, output._id).catch(err => {
                //   console.log("err updateHistoryOrderRef ", err)
                // });

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
      let { paymentStatus, orderStatus, startDate, endDate, search, offline, userRef } = req.body.filters;
      let andFilters = [{
        restaurantRef: req.session.user.restaurantRef
      }];

      if (userRef) {
        andFilters.push({ "userRef": userRef });
      }

      if (search && search.trim().length) {
        andFilters.push({ "orderId": new RegExp(`^${search.trim()}`, 'ig') });
      }

      if (paymentStatus) {
        andFilters.push({ "billRef.paymentDetails.status": Number(paymentStatus) });
      } else {
        andFilters.push({ "billRef.paymentDetails.status": {
          '$in': [
            app.config.contentManagement.paymentStatus.paid,
            app.config.contentManagement.paymentStatus.cancelled
          ]
        } });
      }

      if (orderStatus) {
        andFilters.push({ "status": Number(orderStatus) });
      } else {
        andFilters.push({ "status": {
          '$in': [
            app.config.contentManagement.order.completed,
            app.config.contentManagement.order.deleted,
          ]
        } });
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
        tableRef: 1,
        orderId: 1,
        orderType: 1,
        idbId: 1,
        note: 1,
        cart: 1,
        status: 1,
        isOnline: 1,
        restaurantRef: 1,
        parcelDetails: 1,
        waterDetails: 1,
        "billRef.paymentDetails": 1,
        "billRef.total": 1,
        "billRef._id": 1,
        "billRef.offlineId": 1,
        "billRef.billNo": 1,
        "billRef.restaurantRef": 1,
        "billRef.subTotal": 1,
        "billRef.discountDetails": 1,
        "billRef.gstDetails": 1,
        "billRef.serviceTaxDetails": 1,
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

    const idbOrderFilters = [{
      restaurantRef: req.session.user.restaurantRef,
      status: {
        '$in': [
          app.config.contentManagement.order.completed,
          app.config.contentManagement.order.deleted,
        ]
      },
      idbId: {
        '$in': req.body.orderList
      }
    }];

    const idbQuery = {
      skip: Number(req.query.skip) || app.config.page.defaultSkip,
      limit: Number(req.query.limit) || app.config.page.defaultLimit,
      filters: { $and: idbOrderFilters },
      sort: {
        createdAt: -1
      },
      select: {
        tableId: 1,
        tableRef: 1,
        orderId: 1,
        orderType: 1,
        idbId: 1,
        cart: 1,
        note: 1,
        status: 1,
        isOnline: 1,
        restaurantRef: 1,
        parcelDetails: 1,
        waterDetails: 1,
        "billRef.paymentDetails": 1,
        "billRef.total": 1,
        "billRef._id": 1,
        "billRef.offlineId": 1,
        "billRef.billNo": 1,
        "billRef.restaurantRef": 1,
        "billRef.subTotal": 1,
        "billRef.discountDetails": 1,
        "billRef.gstDetails": 1,
        "billRef.serviceTaxDetails": 1,
        createdBy: 1,
        createdAt: 1,
        updatedAt: 1,
        _id: 1
      }
    };

    if (req.body.filters) {
      let { paymentStatus, orderStatus, startDate, endDate, search, orderType } = req.body.filters;
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

      if (orderType) {
        andFilters.push({
          "orderType": {
            "$in": orderType
          }
        })
      }

      if (andFilters.length > 0) {
        query.filters = { $and: andFilters };
      }

      query.select = {
        tableId: 1,
        tableRef: 1,
        orderId: 1,
        orderType: 1,
        idbId: 1,
        note: 1,
        cart: 1,
        status: 1,
        isOnline: 1,
        restaurantRef: 1,
        parcelDetails: 1,
        waterDetails: 1,
        "billRef.paymentDetails": 1,
        "billRef.total": 1,
        "billRef._id": 1,
        "billRef.offlineId": 1,
        "billRef.billNo": 1,
        "billRef.restaurantRef": 1,
        "billRef.subTotal": 1,
        "billRef.discountDetails": 1,
        "billRef.gstDetails": 1,
        "billRef.serviceTaxDetails": 1,
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

    // order.list(query)
    return Promise.all([
      order.list(query),
      req.body.orderList && req.body.orderList.length ? order.list(idbQuery) : []
    ])
      .then(([queryResult, idbResult]) => {
        const output = idbResult && idbResult.data ? [...queryResult.data, ...idbResult.data] : [...queryResult.data];
        req.workflow.outcome.data = {
          data: output
        };
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
              gstDetails: req.body.gstDetails,
              serviceTaxDetails: req.body.serviceTaxDetails,
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
      .then(async orderData => {
        const oldTableId = orderData.tableRef;

        if (req.body && Object.keys(req.body).length) {
          for (let item in req.body) {
            orderData[item] = req.body[item];
          }
        }

        const userData = req.body.contactDetails;

        if (userData && userData.phone &&
          userData.phone.number
        ) {
          const dbUser = await user.crud.findOrCreateUserByPhone(
            userData.phone.countryCode || "+91",
            userData.phone.number,
            userData.fullName
          );
          if (dbUser) {
            orderData.userRef = dbUser._id;
          }
        }

        inventory.rollbackInventory(orderData._id, req.body.cart)
          .then(output1 => {
            order.edit(orderData, req.session.user)
              .then(async output => {
                const billRes = await bill.updateBillFromOrder(orderData.billRef, {
                  subTotal: req.body.subTotal,
                  total: req.body.total,
                  gstDetails: req.body.gstDetails,
                  serviceTaxDetails: req.body.serviceTaxDetails
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

                if (req.body.tableRef && (oldTableId && req.body.tableRef.toString() === oldTableId.toString())) {

                  tableSession.updateCartByOrderId(orderData._id, orderData.restaurantRef, req.body.cart);
                }

                if (req.body.tableRef && (!oldTableId || (oldTableId && req.body.tableRef.toString() !== oldTableId.toString()))) {

                  req.body.orderRef = orderData._id;
                  // close the earlier table session and create a new session for the new table
                  tableSession.updateStatusByOrderId(orderData._id, orderData.restaurantRef);
                  const tableSessionRes = await tableSession.createTableSessionFromOwner(req.body, req.session.user);

                  table.markAsUnavailable(req.body.tableRef, tableSessionRes._id);

                }

                const finalOutput = output;
                finalOutput.billRef = billRes;

                req.workflow.outcome.data = finalOutput;
                req.workflow.emit('response');
              })
              .catch(next);
          })
          .catch(next);
      })
      .catch(next);


  };

  const updateCartByIdbId = (req, res, next) => {

    order.getOrderByIdbId(req.params.orderId, req.session.user)
      .then(orderData => {
        const oldTableId = orderData.tableRef;

        if (req.body && Object.keys(req.body).length) {
          for (let item in req.body) {
            orderData[item] = req.body[item];
          }
        }
        order.edit(orderData, req.session.user)
          .then(async output => {

            if (req.body.tableRef && (oldTableId && req.body.tableRef.toString() === oldTableId.toString())) {

              tableSession.updateCartByOrderId(orderData._id, orderData.restaurantRef, req.body.cart);
            }

            const finalOutput = output;

            req.workflow.outcome.data = finalOutput;
            req.workflow.emit('response');
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
        orderData.reasonForCancellation = req.body.reasonForCancellation || "";
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

  const updateNote = (req, res, next) => {
    order.getOrderByIdbId(req.params.orderId, req.session.user)
      .then(orderData => {
        orderData.note = req.body.note;

        order.edit(orderData, req.session.user)
          .then(output => {

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
    getOngoingOrderList: getOngoingOrderList,
    updateCartByIdbId: updateCartByIdbId,
    updateNote: updateNote
  };

};