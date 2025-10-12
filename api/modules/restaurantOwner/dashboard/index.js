'use strict';

/**
 * This module handles all functionality of dashboard portion in admin
 * @module Modules/Admin/Dashboard
 */

module.exports = function (app) {
  const Category = app.models.Category;
  const Menu = app.models.Menu;
  const Order = app.models.Order;

  const getStats = (restaurantId) => {
    return Promise.all([
      Order.countDocuments({
        restaurantRef: restaurantId,
        status: app.config.contentManagement.order.completed,
      }).exec(),
      Order.find({
        restaurantRef: restaurantId,
        createdAt: {
          $gte: new Date(new Date().setHours(0, 0, 0, 0)),
          $lt: new Date(new Date().setHours(23, 59, 59, 999)),
        },
      }, {
        _id: 1,
        status: 1,
        orderId: 1,
        tableId: 1,
        orderType: 1
      }).sort({ createdAt: -1 }).exec(),
      Menu.find({
        restaurantRef: restaurantId,
        noOfOrders: {
          $gt: 0
        }
      })
        .sort({ noOfOrders: -1 })  
        .limit(10)                  
        .select('name noOfOrders images').exec(),
    ]).spread((totalOrder, todayOrders, mostOrderedItems) => {
      return {
        totalOrder,
        todayOrders,
        mostOrderedItems
      };
    });

  };
  return { getStats };
};