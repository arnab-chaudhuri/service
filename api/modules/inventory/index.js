'use strict';

/**
 * This module handles all functionality of Admin Inventory
 * @module Modules/Inventory
 */
module.exports = function (app) {

  /**
   * inventory Model
   * @type {Mongoose.Model}
   */
  const Inventory = app.models.Inventory;
  const Menu = app.models.Menu;

  /**
   * Creates a Inventory
   * @param  {Object} config  The config object
   * @return {Promise}        The promise
   */
  const createInventory = function (config, userRef) {
    config.restaurantRef = userRef.restaurantRef;
    config.createdBy = userRef._id;
    return Inventory.createInventory(config);
  };

  /**
   * Fetches a inventory by Id
   * @param  {String} inventoryId  The inventory id
   * @return {Promise}        The promise
   */
  const findInventoryById = function (inventoryId, userRef) {
    return Inventory.findById(inventoryId)
      .then(inventoryDetails => {
        if (!inventoryDetails || (inventoryDetails &&
          inventoryDetails.restaurantRef.toString() !== userRef.restaurantRef.toString())) {
          return Promise.reject({
            'errCode': 'INVENTORY_NOT_FOUND'
          });
        } else {
          return Promise.resolve(inventoryDetails);
        }
      });
  };

  /**
   * Edits a inventory
   * @param  {Object} editedInventory The edited inventory document
   * @return {Promise}           The promise
   */
  const editInventory = function (editedInventory, userRef) {

    if (editedInventory.restaurantRef.toString() !== userRef.restaurantRef.toString()) {
      return Promise.reject({
        'errCode': 'INVENTORY_NOT_FOUND'
      });
    }

    return Inventory.countDocuments({
      name: editedInventory.name,
      status: app.config.contentManagement.inventory.active,
      restaurantRef: editedInventory.restaurantRef,
      _id: {
        $ne: editedInventory._id
      }
    })
      .then(count => count ? Promise.reject({
        'errCode': 'INVENTORY_ALREADY_EXISTS'
      }) : editedInventory.save());
  };

  /**
   * Fetches a list of inventories
   * @param  {Object} options  The options object
   * @return {Promise}        The promise
   */
  const getList = function (options) {
    return Inventory.pagedFind(options);
  };

  /**
   * Removes a inventory
   * @param  {Object} inventory The inventory document
   * @return {Promise}     The promise
   */
  const removeInventory = function (inventory, userRef) {
    if (inventory.restaurantRef.toString() !== userRef.restaurantRef.toString()) {
      return Promise.reject({
        'errCode': 'INVENTORY_NOT_FOUND'
      });
    }
    return Inventory.removeInventory(inventory._id);
  };

  const updateMenuCount = (inventoryId, value) => {
    return Inventory.findOne({
      _id: inventoryId
    })
      .then(inventory => {
        if (inventory) {
          inventory.totalMenu = value === 1 ? inventory.totalMenu + 1 : inventory.totalMenu - 1;
          return inventory.save();
        } else {
          return Promise.resolve(null);
        }
      });
  };

  const updateInventoryCount = async (orderItems) => {
    const session = await app.db.startSession();
    session.startTransaction();

    try {
      // Prepare a map for bulk updates
      const bulkUpdates = [];

      for (const orderItem of orderItems) {
        const menu = await Menu.findById(orderItem.menuRef).populate("ingredients.inventoryRef");

        if (!menu) {
          return Promise.reject({
            'errCode': 'MENU_NOT_FOUND'
          });
        }

        for (const ing of menu.ingredients) {
          const requiredQty = ing.quantity * orderItem.quantity;

          if (ing.inventoryRef.quantity < requiredQty) {
            return Promise.reject({
              'errCode': 'NOT_ENOUGH_STOCK'
            });
          }

          // Push to bulk update list
          bulkUpdates.push({
            updateOne: {
              filter: { _id: ing.inventoryRef._id },
              update: { $inc: { quantity: -requiredQty } }
            }
          });
        }
      }


      // Perform all inventory updates in bulk
      if (bulkUpdates.length > 0) {
        await Inventory.bulkWrite(bulkUpdates, { session });
      }

      await session.commitTransaction();
      session.endSession();

      return Promise.resolve({ success: true, message: "Order placed & inventory updated" });

    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      return Promise.reject({ success: false, error: err.message });
    }
  };

  return {
    'create': createInventory,
    'get': findInventoryById,
    'edit': editInventory,
    'list': getList,
    'remove': removeInventory,
    'updateMenuCount': updateMenuCount,
    'updateInventoryCount': updateInventoryCount
  };
};