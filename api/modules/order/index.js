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

  /**
   * Creates a Order
   * @param  {Object} config  The config object
   * @return {Promise}        The promise
   */
  const createOrder = async (config, userRef) => {
    config.restaurantRef = userRef.restaurantRef;
    config.createdBy = userRef._id;
    config.addedByOwner = true;
    const totalOrders = await Order.countDocuments({
        restaurantRef: userRef.restaurantRef
    });
    config.orderId = totalOrders ? (totalOrders + 1).toString(): "1";
    return Order.createOrder(config);
  };

  /**
   * Fetches a order by Id
   * @param  {String} orderId  The order id
   * @return {Promise}        The promise
   */
  const findOrderById = function (orderId, userRef) {
    return Order.findById(orderId)
    .then(orderDetails => {
      if(!orderDetails || (orderDetails && 
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
  const getList = function (options) {
    return Order.pagedFind(options);
  };

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
    .then(order =>{
      if (order) {
        order.totalMenu = value === 1 ? order.totalMenu + 1 : order.totalMenu - 1;
        return order.save(); 
      } else {
        return Promise.resolve(null);
      }
    });
  };

  return {
    'create': createOrder,
    'get': findOrderById,
    'edit': editOrder,
    'list': getList,
    'remove': removeOrder,
    'updateMenuCount': updateMenuCount
  };
};