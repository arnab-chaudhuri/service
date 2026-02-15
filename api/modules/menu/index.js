'use strict';

/**
 * This module handles all functionality of Admin Menu
 * @module Modules/Menu
 */
module.exports = function (app) {
  const mongoose = require('mongoose');


  /**
   * menu Model
   * @type {Mongoose.Model}
   */
  const Menu = app.models.Menu;
  const Order = app.models.Order;

  /**
   * Creates a Menu
   * @param  {Object} config  The config object
   * @return {Promise}        The promise
   */
  const createMenu = function (config, userRef) {
    config.restaurantRef = userRef.restaurantRef;
    config.createdBy = userRef._id;
    return Menu.createMenu(config);
  };

  /**
   * Fetches a menu by Id
   * @param  {String} menuId  The menu id
   * @return {Promise}        The promise
   */
  const findMenuById = function (menuId, userRef) {
    return Menu.findById(menuId)
      .populate({
        path: 'ingredients.inventoryRef',
        select: 'name quantity unit'
      })
      .then(menuDetails => {
        if (!menuDetails || (menuDetails && userRef &&
          menuDetails.restaurantRef.toString() !== userRef.restaurantRef.toString())) {
          return Promise.reject({
            'errCode': 'MENU_NOT_FOUND'
          });
        } else {
          return Promise.resolve(menuDetails);
        }
      });
  };

  /**
   * Edits a menu
   * @param  {Object} editedMenu The edited menu document
   * @return {Promise}           The promise
   */
  const editMenu = function (editedMenu, userRef) {

    if (editedMenu.restaurantRef.toString() !== userRef.restaurantRef.toString()) {
      return Promise.reject({
        'errCode': 'MENU_NOT_FOUND'
      });
    }

    return Menu.countDocuments({
      name: new RegExp(`^${editedMenu.name}$`, 'i'),
      status: app.config.contentManagement.menu.active,
      restaurantRef: editedMenu.restaurantRef,
      _id: {
      $ne: editedMenu._id
      }
    })
      .then(count => count ? Promise.reject({
      'errCode': 'MENU_ALREADY_EXISTS'
      }) : editedMenu.save());
  };

  /**
   * Fetches a list of menus
   * @param  {Object} options  The options object
   * @return {Promise}        The promise
   */
  const getList = function (options) {
    return Menu.pagedFind(options);
  };

  /**
   * Removes a menu
   * @param  {Object} menu The menu document
   * @return {Promise}     The promise
   */
  const removeMenu = function (menu, userRef) {
    if (menu.restaurantRef.toString() !== userRef.restaurantRef.toString()) {
      return Promise.reject({
        'errCode': 'MENU_NOT_FOUND'
      });
    }
    return Menu.removeMenu(menu._id);
  };

  const listFromApp = (options) => {
    const aggrArr = [];
    aggrArr.push(
      {
        $match: {
          restaurantRef: new mongoose.Types.ObjectId(options.filters.restaurantRef),
          status: options.filters.status
        }
      }
    );
    aggrArr.push({
      $sort: { order: 1 } // Sort by order before grouping
    })
    aggrArr.push(
      {
        $group: {
          _id: '$categoryRef',
          menus: {
            $push: {
              _id: '$_id',
              name: '$name',
              price: '$price',
              order: '$order',
              veg: '$isVeg',
              spicy: '$isSpicy',
              available: '$isAvailable',
              images: '$images',
              restaurantRef: '$restaurantRef'
            }
          }
        }
      },
      {
        $project: {
          categoryId: '$_id',
          menus: 1,
          _id: 0
        }
      }
    );

    return Menu.aggregate(aggrArr).then(data => {
      return Promise.resolve(data);
    });
  }

  const removeInventoryItem = async (inventoryId) => {
    await Menu.updateMany(
      {},
      { $pull: { ingredients: { inventoryRef: inventoryId } } }
    );
    return Promise.resolve({});
  }

  const updateOrderCount = async (orderId) => {
    const order = await Order.findById(orderId).select("cart.menuRef cart.quantity");

    if (!order) throw new Error("Order not found");

    // Prepare bulk operations
    const bulkOps = order.cart
      .filter(item => item.menuRef) // only if menuRef is present
      .map(item => ({
        updateOne: {
          filter: { _id: item.menuRef },
          update: { $inc: { noOfOrders: item.quantity } } // increase by quantity
        }
      }));

    if (bulkOps.length > 0) {
      await Menu.bulkWrite(bulkOps);
    }
  };

  const updateBulkOrderCount = async (carts) => {
    console.log("carts ", carts)
    // Prepare bulk operations
    const bulkOps = carts
      .filter(item => item.menuRef) // only if menuRef is present
      .map(item => ({
        updateOne: {
          filter: { _id: item.menuRef },
          update: { $inc: { noOfOrders: item.quantity } } // increase by quantity
        }
      }));

    if (bulkOps.length > 0) {
      await Menu.bulkWrite(bulkOps);
    }
  };

  return {
    'create': createMenu,
    'get': findMenuById,
    'edit': editMenu,
    'list': getList,
    'remove': removeMenu,
    'listFromApp': listFromApp,
    'removeInventoryItem': removeInventoryItem,
    'updateOrderCount': updateOrderCount,
    'updateBulkOrderCount': updateBulkOrderCount
  };
};