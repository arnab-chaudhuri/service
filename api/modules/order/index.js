'use strict';

/**
 * This module handles all functionality of Admin Order
 * @module Modules/Order
 */
module.exports = function (app) {


  /**
   * order Model
   * @type {Mongoose.Model}
   */
  const Order = app.models.Order;
  const Table = app.models.Table;

  /**
   * Creates a Order
   * @param  {Object} config  The config object
   * @return {Promise}        The promise
   */
  const createOrder = async (config, userRef) => {
    if (userRef) {
      config.createdBy = userRef._id;
      config.addedByOwner = true;
      config.restaurantRef = userRef.restaurantRef;

    }

    if (config.tableRef) {
      const tableDetails = await Table.findById(config.tableRef);
      if (tableDetails) {
        config.tableId = tableDetails.tableId;
      }
    }

    const totalOrders = await Order.countDocuments({
      restaurantRef: userRef ? userRef.restaurantRef : config.restaurantRef
    });
    config.orderId = totalOrders ? (totalOrders + 1).toString() : "1";
    return Order.createOrder(config);
  };

  /**
   * Fetches a order by Id
   * @param  {String} orderId  The order id
   * @return {Promise}        The promise
   */
  const findOrderById = function (orderId, userRef) {
    return Order.findById(orderId)
      .populate({
        path: 'billRef'
      })
      .then(orderDetails => {
        if (!orderDetails || (orderDetails && userRef &&
          orderDetails.restaurantRef.toString() !== userRef.restaurantRef.toString())) {
          return Promise.reject({
            'errCode': 'ORDER_NOT_FOUND'
          });
        } else {
          return Promise.resolve(orderDetails);
        }
      });
  };

  /**
   * Edits a order
   * @param  {Object} editedOrder The edited order document
   * @return {Promise}           The promise
   */
  const editOrder = function (editedOrder, userRef) {

    if (editedOrder.restaurantRef.toString() !== userRef.restaurantRef.toString()) {
      return Promise.reject({
        'errCode': 'ORDER_NOT_FOUND'
      });
    }

    return editedOrder.save();
  };

  /**
   * Fetches a list of orders
   * @param  {Object} options  The options object
   * @return {Promise}        The promise
   */
  // const getList = function (options) {
  //   return Order.pagedFind(options);
  // };

  /**
   * Removes a order
   * @param  {Object} order The order document
   * @return {Promise}     The promise
   */
  const removeOrder = function (order, userRef) {
    if (order.restaurantRef.toString() !== userRef.restaurantRef.toString()) {
      return Promise.reject({
        'errCode': 'ORDER_NOT_FOUND'
      });
    }
    return Order.removeOrder(order._id);
  };

  const updateMenuCount = (orderId, value) => {
    return Order.findOne({
      _id: orderId
    })
      .then(order => {
        if (order) {
          order.totalMenu = value === 1 ? order.totalMenu + 1 : order.totalMenu - 1;
          return order.save();
        } else {
          return Promise.resolve(null);
        }
      });
  };

  const updateBillDetails = (orderId, billDetails) => {
    return Order.findOne({
      _id: orderId
    })
      .then(order => {
        if (order) {
          order.billRef = billDetails._id;
          return order.save();
        } else {
          return Promise.resolve(null);
        }
      });
  };

  const updateStatus = (orderId) => {
    return Order.findOne({
      _id: orderId
    })
      .then(order => {
        if (order) {
          order.status = app.config.contentManagement.order.completed;
          return order.save();
        } else {
          return Promise.resolve(null);
        }
      });
  };

  const getList = async (options) => {
    const limit = options.limit;     // from API query params
    const skip = options.skip;

    const aggArr = [{
      $lookup: {
        from: "bills",              // collection name
        localField: "billRef",
        foreignField: "_id",
        as: "billRef"
      }
    }, { $unwind: "$billRef" },];

    if (options.filters) {
      aggArr.push({
        $match: options.filters
      })
    }

    aggArr.push({
      $facet: {
        totalCount: [{ $count: "count" }],

        data: [
          {
            $project: options.select,
          }
        ]
      }
    });

    if (options.sort) {

      if (options.sort.createdAt) {
        aggArr[aggArr.length - 1].$facet.data.push({
          $sort: { "createdAt": options.sort.createdAt }
        });
      }

    }

    aggArr[aggArr.length - 1].$facet.data.push({ $skip: skip });
    aggArr[aggArr.length - 1].$facet.data.push({ $limit: limit });

    const orders = await Order.aggregate(aggArr).exec();
    return Promise.resolve({
      data: orders[0]?.data || [],
      total: orders[0]?.totalCount[0]?.count || 0,
      limit: limit,
      skip: skip
    });
  }

  return {
    'create': createOrder,
    'get': findOrderById,
    'edit': editOrder,
    'list': getList,
    'remove': removeOrder,
    'updateMenuCount': updateMenuCount,
    'updateBillDetails': updateBillDetails,
    'updateStatus': updateStatus
  };
};