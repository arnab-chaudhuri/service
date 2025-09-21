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
  const Order = app.models.Order;

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
          await session.abortTransaction();
          session.endSession();
          return Promise.reject({
            'errCode': 'MENU_NOT_FOUND'
          });
        }

        if (menu.ingredients && menu.ingredients.length) {
          for (const ing of menu.ingredients) {
            const requiredQty = ing.quantity * orderItem.quantity;

            if (ing.inventoryRef.quantity < requiredQty) {
              await session.abortTransaction();
              session.endSession();
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

  async function rollbackInventory(orderId, updatedItems) {
    const session = await app.db.startSession();
    session.startTransaction();

    try {
      // Step 1: Fetch existing order
      const existingOrder = await Order.findById(orderId)
        .populate({
          path: "cart.menuRef",
          populate: { path: "ingredients.inventoryRef" }
        })
        .session(session);

      if (!existingOrder) {
        await session.abortTransaction();
        session.endSession();
        return Promise.reject({
          'errCode': 'ORDER_NOT_FOUND'
        });
      }

      // Step 2: Restore inventory from old order
      const restoreUsage = {};
      existingOrder.cart.forEach(item => {
        item.menuRef.ingredients.forEach(ing => {
          const qty = ing.quantity * item.quantity;
          if (!restoreUsage[ing.inventoryRef._id]) {
            restoreUsage[ing.inventoryRef._id] = 0;
          }
          restoreUsage[ing.inventoryRef._id] += qty;
        });
      });

      const restoreOps = Object.entries(restoreUsage).map(([invId, qty]) => ({
        updateOne: { filter: { _id: invId }, update: { $inc: { quantity: qty } } }
      }));

      if (restoreOps.length > 0) {
        await Inventory.bulkWrite(restoreOps, { session });
      }

      // Step 3: Deduct inventory for new items
      const newIngredientUsage = {};
      for (const item of updatedItems) {
        const menu = await Menu.findById(item.menuRef).populate("ingredients.inventoryRef").session(session);
        if (!menu) {
          await session.abortTransaction();
          session.endSession();
          return Promise.reject({
            'errCode': 'MENU_NOT_FOUND'
          });
        }

        menu.ingredients.forEach(ing => {
          const qty = ing.quantity * item.quantity;
          if (!newIngredientUsage[ing.inventoryRef._id]) {
            newIngredientUsage[ing.inventoryRef._id] = 0;
          }
          newIngredientUsage[ing.inventoryRef._id] += qty;
        });
      }

      // Step 3a: Validate stock before deduction
      for (const [invId, qty] of Object.entries(newIngredientUsage)) {
        const inv = await Inventory.findById(invId).session(session);
        if (!inv || inv.quantity < qty) {
          await session.abortTransaction();
          session.endSession();
          // throw new Error(`Insufficient stock for ingredient ${inv?.name || invId}`);
          return Promise.reject({
            'errCode': 'NOT_ENOUGH_STOCK'
          });
        }
      }

      const deductOps = Object.entries(newIngredientUsage).map(([invId, qty]) => ({
        updateOne: { filter: { _id: invId }, update: { $inc: { quantity: -qty } } }
      }));

      if (deductOps.length > 0) {
        await Inventory.bulkWrite(deductOps, { session });
      }

      await session.commitTransaction();
      session.endSession();

      return Promise.resolve({ success: true, message: "Order updated and inventory adjusted" });

    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      console.log(err)
      return Promise.reject({ success: false });
    }
  }


  return {
    'create': createInventory,
    'get': findInventoryById,
    'edit': editInventory,
    'list': getList,
    'remove': removeInventory,
    'updateMenuCount': updateMenuCount,
    'updateInventoryCount': updateInventoryCount,
    'rollbackInventory': rollbackInventory
  };
};