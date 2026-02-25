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

  const createMultiOrder = async (orders, userRef) => {
    if (!Array.isArray(orders) || orders.length === 0) {
      return Promise.resolve([]);
    }

    const restaurantRef = userRef ? userRef.restaurantRef : (orders[0] && orders[0].restaurantRef);
    const totalOrders = await Order.countDocuments({ restaurantRef });

    // collect unique table refs and fetch their tableId values
    const tableRefs = [...new Set(orders.map(o => o.tableRef).filter(Boolean))];
    const tableMap = {};
    if (tableRefs.length) {
      const tables = await Table.find({ _id: { $in: tableRefs } });
      tables.forEach(t => { tableMap[t._id.toString()] = t.tableId; });
    }

    // prepare docs with sequential orderId and other fields
    const docs = orders.map((o, idx) => {
      const config = Object.assign({}, o);
      if (userRef) {
        config.createdBy = userRef._id;
        config.addedByOwner = true;
        config.restaurantRef = restaurantRef;
      }
      if (config.tableRef) {
        const tid = tableMap[config.tableRef.toString()];
        if (tid) config.tableId = tid;
      }
      config.orderId = (totalOrders + idx + 1).toString();
      return config;
    });

    // bulk insert
    return Order.insertMany(docs);
  };

  /**
   * Bulk updates multiple orders.
   * Each item in the orders array should contain an _id (or orderId) and the fields to update.
   * Example item: { _id: '...', status: 'completed', billRef: '...', totalMenu: 5 }
   * @param {Array} orders
   * @return {Promise}
   */
  const bulkUpdateOrders = async (orders, userRef) => {
    if (!Array.isArray(orders) || orders.length === 0) {
      return Promise.resolve(null);
    }

    const ops = [];
    const ids = [];
    const orderIds = [];

    orders.forEach(item => {
      const id = item._id;
      const orderId = item.orderId;
      if (!id && !orderId) return;

      const set = {};
      Object.keys(item).forEach(k => {
        if (k === '_id' || k === 'orderId') return;
        set[k] = item[k];
      });

      if (Object.keys(set).length === 0) return;

      const filter = id ? { _id: id } : { orderId: orderId };
      if (userRef && userRef.restaurantRef) {
        filter.restaurantRef = userRef.restaurantRef;
      }
      ops.push({
        updateOne: {
          filter,
          update: { $set: set }
        }
      });

      if (id) ids.push(id);
      else orderIds.push(orderId);
    });

    if (ops.length === 0) return Promise.resolve(null);

    // perform bulk update
    await Order.bulkWrite(ops, { ordered: false });

    // fetch and return the updated documents
    let query;
    if (ids.length && orderIds.length) {
      query = { $or: [{ _id: { $in: ids } }, { orderId: { $in: orderIds } }] };
    } else if (ids.length) {
      query = { _id: { $in: ids } };
    } else {
      query = { orderId: { $in: orderIds } };
    }

    const updatedDocs = await Order.find(query);
    return updatedDocs;
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

  const findOrderFromUserById = function (orderId, userRef) {
    return Order.findById(orderId)
      .populate({
        path: 'billRef'
      })
      .populate({
        path: 'restaurantRef',
        select: 'name _id logo primaryColor secondaryColor config'
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

  const getOrderByIdbId = function (orderId, userRef) {
    return Order.findOne({
      idbId: orderId
    })
      .populate({
        path: 'billRef'
      })
      .populate({
        path: 'userRef',
        select: '_id personalInfo'
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

    if (userRef && editedOrder.restaurantRef.toString() !== userRef.restaurantRef.toString()) {
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

  const updateBillDetails = (orderId, billDetails, userData) => {
    return Order.findOne({
      _id: orderId
    })
      .then(order => {
        if (order) {
          order.billRef = billDetails._id;
          if (userData && userData._id) {
            order.userRef = userData._id;
          }
          return order.save();
        } else {
          return Promise.resolve(null);
        }
      });
  };

  const updateUserDetails = (orderId, userData) => {
    return Order.findOne({
      idbId: orderId
    })
      .then(order => {
        if (order) {
          if (userData && userData._id) {
            order.userRef = userData._id;
          }
          return order.save();
        } else {
          return Promise.resolve(null);
        }
      });
  };

  const updateBillDetailsBulk = (updates) => {
    if (!updates) return Promise.resolve(null);

    return Order.bulkWrite(
      updates.map(u => ({
        updateOne: {
          filter: { _id: u.orderId },
          update: { $set: { billRef: u.billRef } }
        }
      }))
    );
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

  const isMenuInOrderCart = async (menuRef, restaurantRef) => {
    if (!menuRef || !restaurantRef) return false;

    const query = {
      restaurantRef: restaurantRef,
      $or: [
        { 'cart.menuRef': menuRef },
      ]
    };

    const exists = await Order.exists(query);
    return Promise.resolve(!!exists);
  };

  const hasOrderForOwner = async (restaurantOwnerId) => {
    if (!restaurantOwnerId) return Promise.resolve(false);

    const filter = { createdBy: restaurantOwnerId };

    const exists = await Order.exists(filter);
    return Promise.resolve(!!exists);
  };

  return {
    'create': createOrder,
    'createMulti': createMultiOrder,
    'get': findOrderById,
    'getFromUser': findOrderFromUserById,
    'getOrderByIdbId': getOrderByIdbId,
    'edit': editOrder,
    'list': getList,
    'remove': removeOrder,
    'updateBillDetails': updateBillDetails,
    'updateStatus': updateStatus,
    'updateBillDetailsBulk': updateBillDetailsBulk,
    'bulkUpdateOrders': bulkUpdateOrders,
    'isMenuInOrderCart': isMenuInOrderCart,
    'hasOrderForOwner': hasOrderForOwner,
    'updateUserDetails': updateUserDetails
  };
};