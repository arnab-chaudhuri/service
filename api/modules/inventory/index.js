'use strict';

/**
 * This module handles all functionality of Admin Inventory
 * @module Modules/Inventory
 */
module.exports = function (app) {
  const mongoose = require('mongoose');


  /**
   * inventory Model
   * @type {Mongoose.Model}
   */
  const Inventory = app.models.Inventory;
  const Restaurant = app.models.Restaurant;
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

  const updateInventoryCount = async (orderItems, orderId) => {
    const session = await app.db.startSession();
    session.startTransaction();

    try {
      // Prepare a map for bulk updates
      const bulkUpdates = [];
      const invIds = [];

      for (const orderItem of orderItems) {
        if (orderItem.menuRef) {
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
              if (ing.inventoryRef) {
                if ((orderId && orderItem.isNewToCart) || (!orderId)) {
                  let requiredQty = ing.quantity * orderItem.quantity;


                  // if (ing.inventoryRef.quantity < requiredQty) {
                  //   await session.abortTransaction();
                  //   session.endSession();
                  //   return Promise.reject({
                  //     'errCode': 'NOT_ENOUGH_STOCK'
                  //   });
                  // }

                  // const locationList = ing.inventoryRef.locationList;
                  // const locationData = locationList.find(each => each.location.toString() === ing.location.toString());
                  // if (locationData && Object.keys(locationData).length) {
                  //   if (locationData.quantity < requiredQty) {
                  //     await session.abortTransaction();
                  //     session.endSession();
                  //     return Promise.reject({
                  //       'errCode': 'NOT_ENOUGH_STOCK'
                  //     });
                  //   }
                  // }

                  console.log("orderItem ", orderItem)

                  const historyEntry = {
                    quantity: requiredQty,
                    isDebited: true,
                    reason: 'NEW_ORDER',
                    prevLocQuantity: ing.inventoryRef.locationList &&
                      ing.inventoryRef.locationList.length ? ing.inventoryRef.locationList.find(loc => loc.location.toString() === ing.location.toString())?.quantity : 0,
                    prevTotalQuantity: ing.inventoryRef.quantity || 0
                  };

                  if (orderId) {
                    historyEntry.orderRef = orderId;
                  }

                  const updateObj = {
                    $inc: { 'locationList.$[loc].quantity': -requiredQty, quantity: -requiredQty },
                  }

                  if ((orderId && orderItem.isNewToCart) || (!orderId)) {
                    updateObj["$push"] = { 'locationList.$[loc].history': historyEntry }
                  }

                  invIds.push(ing.inventoryRef._id.toString());

                  // Push to bulk update list
                  bulkUpdates.push({
                    updateOne: {
                      filter: { _id: new mongoose.Types.ObjectId(ing.inventoryRef._id) },
                      update: updateObj,
                      arrayFilters: [{ 'loc.location': new mongoose.Types.ObjectId(ing.location) }]
                    }
                  });
                }

              }


            }
          }
          // Perform all inventory updates in bulk
          if (bulkUpdates.length > 0) {
            await Inventory.bulkWrite(bulkUpdates, { session });
          }
        }

      }


      await session.commitTransaction();
      session.endSession();

      return Promise.resolve({ success: true, message: "Order placed & inventory updated", invIds: invIds });

    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      return Promise.reject({ success: false, error: err.message });
    }
  };

  const updateInventoryCountSync = async (orderItems) => {
    // console.log("updateInventoryCountSync",orderItems)

    const session = await app.db.startSession();
    session.startTransaction();

    try {
      // Prepare a map for bulk updates
      for (const orderItem of orderItems) {
        const bulkUpdates = [];
        const invIds = [];
        if (orderItem.menuRef && orderItem.status !== app.config.contentManagement.order.deleted) {
          const menu = await Menu.findById(orderItem.menuRef).populate("ingredients.inventoryRef");

          if (!menu) {
            if (session.inTransaction()) {
              await session.abortTransaction();
              session.endSession();
            }
          }

          if (menu.ingredients && menu.ingredients.length) {
            for (const ing of menu.ingredients) {
              if (ing.inventoryRef) {
                const requiredQty = ing.quantity * orderItem.quantity;

                const historyEntry = {
                  quantity: requiredQty,
                  isDebited: true,
                  reason: 'NEW_ORDER',
                  prevLocQuantity: ing.inventoryRef.locationList &&
                    ing.inventoryRef.locationList.length ? ing.inventoryRef.locationList.find(loc => loc.location.toString() === ing.location.toString())?.quantity : 0,
                  prevTotalQuantity: ing.inventoryRef.quantity || 0
                };

                if (orderItem.orderId) {
                  historyEntry.orderRef = orderItem.orderId?.toString();
                }

                invIds.push(ing.inventoryRef._id.toString());

                // Push to bulk update list
                bulkUpdates.push({
                  updateOne: {
                    filter: { _id: new mongoose.Types.ObjectId(ing.inventoryRef._id) },
                    update: {
                      $inc: { 'locationList.$[loc].quantity': -requiredQty, quantity: -requiredQty },
                      $push: { 'locationList.$[loc].history': historyEntry }
                    },
                    arrayFilters: [{ 'loc.location': new mongoose.Types.ObjectId(ing.location) }]
                  }
                });
              }


            }
          }
          // Perform all inventory updates in bulk
          if (bulkUpdates.length > 0) {
            await Inventory.bulkWrite(bulkUpdates, { session });
          }
        }

      }

      await session.commitTransaction();
      session.endSession();

      return Promise.resolve({ success: true, message: "Order placed & inventory updated", invIds: invIds });

    } catch (err) {
      if (session.inTransaction()) {
        await session.abortTransaction();
        session.endSession();
      }
      return Promise.resolve({ success: false, error: err.message });
    }
  };

  const updateHistoryOrderRef = async (inventoryIds, orderId) => {
    const session = await app.db.startSession();
    session.startTransaction();

    try {
      const getEntryDate = (entry) => {
        if (entry.date) return new Date(entry.date);
      };

      for (const invId of inventoryIds) {
        const inv = await Inventory.findById(invId).session(session);
        if (!inv) continue;

        let changed = false;

        if (Array.isArray(inv.locationList)) {
          for (const loc of inv.locationList) {
            if (!Array.isArray(loc.history) || !loc.history.length) continue;

            // Update orderRef where missing
            // for (const h of loc.history) {
            //   if (!h.orderRef) {
            //     h.orderRef = orderId;
            //     changed = true;
            //   }
            // }

            // Sort history by date (newest first). Fallbacks are attempted above.
            loc.history.sort((a, b) => getEntryDate(b) - getEntryDate(a));

            if (!loc.history[0].orderRef) {
              loc.history[0].orderRef = orderId.toString();
              changed = true;
            }
          }
        }

        if (changed) {
          await inv.save({ session });
        }
      }

      await session.commitTransaction();
      session.endSession();
      return Promise.resolve({ success: true, message: 'History orderRef updated and sorted' });
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      return Promise.reject({ success: false, error: err.message || err });
    }
  };


  async function rollbackInventory(orderId, updatedItems, onlyRemove) {
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
      const restoreUsageLoc = {};
      const restorePrevQuantity = {};
      existingOrder.cart.forEach(item => {
        // console.log('updatedItems ', updatedItems, item)
        // check if existing item is removed from coming cart or same cart is present but updated
        if (onlyRemove || (!onlyRemove && (item._id && !updatedItems.find(u => u._id.toString() === item._id.toString())) || (updatedItems.find(u => u._id.toString() === item._id.toString()) && updatedItems.find(u => u._id.toString() === item._id.toString())?.updated))) {

          if (item.menuRef) {
            item.menuRef.ingredients.forEach(ing => {
              if (ing.inventoryRef) {
                const qty = ing.quantity * item.quantity;
                if (!restoreUsage[ing.inventoryRef._id]) {
                  restoreUsage[ing.inventoryRef._id] = 0;
                }
                restoreUsage[ing.inventoryRef._id] += qty;
                restoreUsageLoc[ing.inventoryRef._id] = ing.location;

                restorePrevQuantity[ing.inventoryRef._id] = {
                  prevLocQuantity: ing.inventoryRef.locationList &&
                    ing.inventoryRef.locationList.length ? ing.inventoryRef.locationList.find(loc => loc.location.toString() === ing.location.toString())?.quantity : 0,
                  prevTotalQuantity: ing.inventoryRef.quantity || 0
                }
              }

            });
          }
        }
      });

      if (restoreUsage && Object.keys(restoreUsage).length) {
        // const restoreOps = Object.entries(restoreUsage).map(([invId, qty]) => ({
        //   updateOne: { filter: { _id: invId }, update: { $inc: { quantity: qty } } }
        // }));

        const restoreOps = Object.entries(restoreUsage).map(([invId, qty]) => {
          const historyEntry = {
            orderRef: orderId,
            quantity: qty,
            isDebited: false,
            reason: 'ORDER_UPDATE',
            prevLocQuantity: restorePrevQuantity[invId].prevLocQuantity,
            prevTotalQuantity: restorePrevQuantity[invId].prevTotalQuantity
          };
          return {
            updateOne: {
              filter: { _id: new mongoose.Types.ObjectId(invId) },
              update: {
                $inc: {
                  'locationList.$[loc].quantity': qty, quantity: qty,
                },
                $push: { 'locationList.$[loc].history': historyEntry }
              },
              arrayFilters: [{ 'loc.location': new mongoose.Types.ObjectId(restoreUsageLoc[invId]) }]
            }
          }
        });

        if (restoreOps.length > 0) {
          await Inventory.bulkWrite(restoreOps, { session });
        }
      }


      if (!onlyRemove) {
        // Step 3: Deduct inventory for new items
        const newIngredientUsage = {};
        const newIngredientLoc = {};
        const newPrevQuantity = {};
        for (const item of updatedItems) {
          if (item.menuRef && item.updated) {
            const menu = await Menu.findById(item.menuRef).populate("ingredients.inventoryRef").session(session);
            if (!menu) {
              await session.abortTransaction();
              session.endSession();
              return Promise.reject({
                'errCode': 'MENU_NOT_FOUND'
              });
            }

            menu.ingredients.forEach(ing => {
              if (ing.inventoryRef) {
                const qty = ing.quantity * item.quantity;
                if (!newIngredientUsage[ing.inventoryRef._id]) {
                  newIngredientUsage[ing.inventoryRef._id] = 0;
                }
                newIngredientUsage[ing.inventoryRef._id] += qty;
                newIngredientLoc[ing.inventoryRef._id] = ing.location;

                newPrevQuantity[ing.inventoryRef._id] = {
                  prevLocQuantity: ing.inventoryRef.locationList &&
                    ing.inventoryRef.locationList.length ? ing.inventoryRef.locationList.find(loc => loc.location.toString() === ing.location.toString())?.quantity : 0,
                  prevTotalQuantity: ing.inventoryRef.quantity || 0
                }
              }

            });
          }

        }

        // Step 3a: Validate stock before deduction
        if (newIngredientUsage && Object.keys(newIngredientUsage).length) {
          // for (const [invId, qty] of Object.entries(newIngredientUsage)) {
          // const inv = await Inventory.findById(invId).session(session);

          // const locationList = inv.locationList;
          // const locationData = locationList.find(each => each.location.toString() === newIngredientLoc[invId].toString());
          // if (locationData && Object.keys(locationData).length) {
          //   if (locationData.quantity < qty) {
          //     await session.abortTransaction();
          //     session.endSession();
          //     return Promise.reject({
          //       'errCode': 'NOT_ENOUGH_STOCK'
          //     });
          //   }
          // }


          //   if (!inv || inv.quantity < qty) {
          //     await session.abortTransaction();
          //     session.endSession();
          //     // throw new Error(`Insufficient stock for ingredient ${inv?.name || invId}`);
          //     return Promise.reject({
          //       'errCode': 'NOT_ENOUGH_STOCK'
          //     });
          //   }
          // }

          // const deductOps = Object.entries(newIngredientUsage).map(([invId, qty]) => ({
          //   updateOne: { filter: { _id: invId }, update: { $inc: { 
          //     quantity: -qty
          //   } } }
          // }));

          const deductOps = Object.entries(newIngredientUsage).map(([invId, qty]) => {
            const historyEntry = {
              orderRef: orderId,
              quantity: qty,
              isDebited: true,
              reason: 'ORDER_UPDATE',
              prevLocQuantity: newPrevQuantity[invId].prevLocQuantity,
              prevTotalQuantity: newPrevQuantity[invId].prevTotalQuantity
            };

            return {
              updateOne: {
                filter: { _id: new mongoose.Types.ObjectId(invId) },
                update: {
                  $inc: { 'locationList.$[loc].quantity': -qty, quantity: -qty },
                  $push: { 'locationList.$[loc].history': historyEntry }
                },
                arrayFilters: [{ 'loc.location': new mongoose.Types.ObjectId(newIngredientLoc[invId]) }]
              }
            };
          });

          if (deductOps.length > 0) {
            await Inventory.bulkWrite(deductOps, { session });
          }
        }
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

  async function rollbackInventorySync(updatedItems, onlyRemove) {
    // console.log("rollbackInventorySync",updatedItems)
    const session = await app.db.startSession();
    session.startTransaction();

    try {
      // Step 1: Fetch existing order
      for (const order of updatedItems) {
        // if (order.status !== app.config.contentManagement.order.deleted ||
        //   (order.status === app.config.contentManagement.order.deleted && order.isRestoredWhileCancel)) {
        const existingOrder = await Order.findById(order.orderId?.toString())
          .populate({
            path: "cart.menuRef",
            populate: { path: "ingredients.inventoryRef" }
          })
          .session(session);

        if (!existingOrder) {
          if (session.inTransaction()) {
            await session.abortTransaction();
            session.endSession();
          }
        }

        // Step 2: Restore inventory from old order
        const restoreUsage = {};
        const restoreUsageLoc = {};
        const restorePrevQuantity = {};
        existingOrder.cart.forEach(item => {
          if (item.menuRef) {
            item.menuRef.ingredients.forEach(ing => {
              if (ing.inventoryRef) {
                const qty = ing.quantity * item.quantity;
                if (!restoreUsage[ing.inventoryRef._id]) {
                  restoreUsage[ing.inventoryRef._id] = 0;
                }
                restoreUsage[ing.inventoryRef._id] += qty;
                restoreUsageLoc[ing.inventoryRef._id] = ing.location;

                restorePrevQuantity[ing.inventoryRef._id] = {
                  prevLocQuantity: ing.inventoryRef.locationList &&
                    ing.inventoryRef.locationList.length ? ing.inventoryRef.locationList.find(loc => loc.location.toString() === ing.location.toString())?.quantity : 0,
                  prevTotalQuantity: ing.inventoryRef.quantity || 0
                }
              }

            });
          }
        });

        if (restoreUsage && Object.keys(restoreUsage).length) {

          const restoreOps = Object.entries(restoreUsage).map(([invId, qty]) => {
            const historyEntry = {
              orderRef: order.orderId?.toString(),
              quantity: qty,
              isDebited: false,
              reason: 'ORDER_UPDATE',
              prevLocQuantity: restorePrevQuantity[invId].prevLocQuantity,
              prevTotalQuantity: restorePrevQuantity[invId].prevTotalQuantity
            };
            return {
              updateOne: {
                filter: { _id: new mongoose.Types.ObjectId(invId) },
                update: {
                  $inc: {
                    'locationList.$[loc].quantity': qty, quantity: qty,
                  },
                  $push: { 'locationList.$[loc].history': historyEntry }
                },
                arrayFilters: [{ 'loc.location': new mongoose.Types.ObjectId(restoreUsageLoc[invId]) }]
              }
            }
          });

          if (restoreOps.length > 0) {
            await Inventory.bulkWrite(restoreOps, { session });
          }
        }
        // }

      }

      // Step 3: Deduct inventory for new items
      for (const item of updatedItems) {
        if (item.status !== app.config.contentManagement.order.deleted ||
          (item.status === app.config.contentManagement.order.deleted && !item.isRestoredWhileCancel)
        ) {
          const newIngredientUsage = {};
          const newIngredientLoc = {};
          const newPrevQuantity = {};
          if (item.menuRef) {
            const menu = await Menu.findById(item.menuRef).populate("ingredients.inventoryRef").session(session);
            if (!menu) {
              if (session.inTransaction()) {
                await session.abortTransaction();
                session.endSession();
              }
            }

            menu.ingredients.forEach(ing => {
              if (ing.inventoryRef) {
                const qty = ing.quantity * item.quantity;
                if (!newIngredientUsage[ing.inventoryRef._id]) {
                  newIngredientUsage[ing.inventoryRef._id] = 0;
                }
                newIngredientUsage[ing.inventoryRef._id] += qty;
                newIngredientLoc[ing.inventoryRef._id] = ing.location;

                newPrevQuantity[ing.inventoryRef._id] = {
                  prevLocQuantity: ing.inventoryRef.locationList &&
                    ing.inventoryRef.locationList.length ? ing.inventoryRef.locationList.find(loc => loc.location.toString() === ing.location.toString())?.quantity : 0,
                  prevTotalQuantity: ing.inventoryRef.quantity || 0
                }
              }

            });
          }

          // Step 3a: Validate stock before deduction
          if (newIngredientUsage && Object.keys(newIngredientUsage).length) {

            const deductOps = Object.entries(newIngredientUsage).map(([invId, qty]) => {
              const historyEntry = {
                orderRef: item.orderId?.toString(),
                quantity: qty,
                isDebited: true,
                reason: 'ORDER_UPDATE',
                prevLocQuantity: newPrevQuantity[invId].prevLocQuantity,
                prevTotalQuantity: newPrevQuantity[invId].prevTotalQuantity
              };

              return {
                updateOne: {
                  filter: { _id: new mongoose.Types.ObjectId(invId) },
                  update: {
                    $inc: { 'locationList.$[loc].quantity': -qty, quantity: -qty },
                    $push: { 'locationList.$[loc].history': historyEntry }
                  },
                  arrayFilters: [{ 'loc.location': new mongoose.Types.ObjectId(newIngredientLoc[invId]) }]
                }
              };
            });

            if (deductOps.length > 0) {
              await Inventory.bulkWrite(deductOps, { session });
            }
          }
        }


      }


      await session.commitTransaction();
      session.endSession();

      return Promise.resolve({ success: true, message: "Order updated and inventory adjusted" });

    } catch (err) {
      if (session.inTransaction()) {
        await session.abortTransaction();
        session.endSession();
      }
      console.log(err)
      return Promise.resolve({ success: false });
    }
  }

  const updateInventoryWithPurchasex = async (payload, purchaseId, isDeduct) => {
    const bulkOps = [];

    // 1️⃣ Update main inventory fields + increment total quantity
    payload.forEach(item => {
      bulkOps.push({
        updateOne: {
          filter: { _id: item.itemRef },
          update: {
            $set: {
              unit: item.unit,
              saveAsUnit: item.saveAsUnit
            },
            $inc: {
              quantity: !isDeduct ? item.quantity : -item.quantity
            }
          }
        }
      });

      // 2️⃣ Increment location quantities + push history
      item.locationList.forEach(loc => {
        bulkOps.push({
          updateOne: {
            filter: {
              _id: item.itemRef,
              "locationList.location": loc.location.toString()
            },
            update: {
              $inc: {
                "locationList.$.quantity": !isDeduct ? loc.quantity : -loc.quantity
              },
              $push: {
                "locationList.$.history": {
                  $each: [{
                    quantity: loc.quantity,
                    expenseRef: purchaseId,
                    isDebited: !isDeduct,
                    reason: !isDeduct ? 'PURCHASE_ADDITION' : 'PURCHASE_DEDUCTION'
                  }]
                }
              }
            }
          }
        });

        // 3️⃣ If location does not exist, add it
        bulkOps.push({
          updateOne: {
            filter: {
              _id: item.itemRef,
              "locationList.location": { $ne: loc.location }
            },
            update: {
              $addToSet: {
                locationList: {
                  location: loc.location,
                  quantity: !isDeduct ? loc.quantity : -loc.quantity,
                  history: [{
                    quantity: loc.quantity,
                    expenseRef: purchaseId,
                    isDebited: !isDeduct,
                    reason: !isDeduct ? 'PURCHASE_ADDITION' : 'PURCHASE_DEDUCTION'
                  }]
                }
              }
            }
          }
        });
      });


    });

    await Inventory.bulkWrite(bulkOps);
    return Promise.resolve({ success: true, message: "inventory updated" });

  }

  const updateInventoryWithPurchase = async (payload, purchaseId, isDeduct) => {
    try {
      const bulkOps = [];

      // 🟢 1. Collect all inventory IDs
      const itemIds = payload.map(item => item.itemRef);

      // 🟢 2. Fetch existing inventory documents
      const existingInventories = await Inventory.find({
        _id: { $in: itemIds }
      }).lean();

      // 🟢 3. Convert to map for fast lookup
      const inventoryMap = {};
      existingInventories.forEach(inv => {
        inventoryMap[inv._id.toString()] = inv;
      });

      // 👉 Now you have OLD data available here
      // console.log(inventoryMap)

      // 🟢 4. Build bulk operations (same logic as before)
      payload.forEach(item => {
        const oldInventory = inventoryMap[item.itemRef.toString()];

        console.log("oldInventory ", oldInventory)



        // 1️⃣ Update main inventory
        bulkOps.push({
          updateOne: {
            filter: { _id: item.itemRef },
            update: {
              $set: {
                unit: item.unit,
                saveAsUnit: item.saveAsUnit
              },
              $inc: {
                quantity: !isDeduct ? item.quantity : -item.quantity
              }
            }
          }
        });

        // 2️⃣ Location updates
        item.locationList.forEach(loc => {
          const existingLoc = oldInventory?.locationList &&
            oldInventory.locationList.length ? oldInventory.locationList.find(l => l.location.toString() === loc.location.toString()) : null;
          let newAvgRate = (existingLoc?.avgRate || 0);
          if (!isDeduct) {
            const prevAmount = (existingLoc?.quantity || 0) * (existingLoc?.avgRate || 0);

            newAvgRate = (prevAmount + (item.amount || 0)) / ((existingLoc?.quantity || 0) + loc.quantity || 0);
          }

          // Update avgRate at location level
          bulkOps.push({
            updateOne: {
              filter: {
                _id: item.itemRef,
                "locationList.location": loc.location.toString()
              },
              update: {
                $set: {
                  "locationList.$.avgRate": newAvgRate
                },
                $inc: {
                  "locationList.$.quantity": !isDeduct ? loc.quantity : -loc.quantity
                },
                $push: {
                  "locationList.$.history": {
                    prevTotalQuantity: oldInventory?.quantity || 0,
                    prevLocQuantity: oldInventory?.locationList &&
                      oldInventory.locationList.length ? oldInventory.locationList.find(l => l.location.toString() === loc.location.toString())?.quantity : 0,
                    quantity: loc.quantity,
                    expenseRef: purchaseId,
                    isDebited: isDeduct,
                    reason: !isDeduct
                      ? "PURCHASE_ADDITION"
                      : "PURCHASE_DEDUCTION"
                  }
                }
              }
            }
          });

          // 3️⃣ Add location if missing
          bulkOps.push({
            updateOne: {
              filter: {
                _id: item.itemRef,
                "locationList.location": { $ne: loc.location }
              },
              update: {
                $addToSet: {
                  locationList: {
                    avgRate: newAvgRate,
                    location: loc.location,
                    quantity: !isDeduct ? loc.quantity : -loc.quantity,
                    history: [{
                      prevTotalQuantity: oldInventory?.quantity || 0,
                      prevLocQuantity: oldInventory?.locationList &&
                        oldInventory.locationList.length ? oldInventory.locationList.find(l => l.location.toString() === loc.location.toString())?.quantity : 0,
                      quantity: loc.quantity,
                      expenseRef: purchaseId,
                      isDebited: isDeduct,
                      reason: !isDeduct
                        ? "PURCHASE_ADDITION"
                        : "PURCHASE_DEDUCTION"
                    }]
                  }
                }
              }
            }
          });
        });
      });

      // 🟢 5. Execute bulk update
      await Inventory.bulkWrite(bulkOps);

      return { success: true, message: "Inventory updated", previousData: existingInventories };

    } catch (err) {
      console.error(err);
      throw err;
    }
  };


  async function seedInventoryForRestaurant(restaurantId, invCategories, inventoryItems) {
    // console.log("start")
    const session = await app.db.startSession();
    session.startTransaction();


    try {
      // ============================
      // 1️⃣  FETCH RESTAURANT
      // ============================
      const restaurant = await Restaurant.findById(restaurantId).session(session);
      if (!restaurant) throw new Error("Restaurant not found");
      // console.log("restaurant ", restaurant)

      if (!restaurant.inventoryCategories) {
        restaurant.inventoryCategories = [];
      }

      // Existing category names (lowercase for safety)
      const existingNames = restaurant.inventoryCategories.map(c => c.name.toLowerCase());

      // ============================
      // 2️⃣  ADD NEW CATEGORIES
      // ============================
      const newCategories = [];

      for (const cat of invCategories) {
        if (!existingNames.includes(cat.name.toLowerCase())) {
          const newCat = {
            _id: new mongoose.Types.ObjectId(),
            name: cat.name,
            code: cat.name
          };
          newCategories.push(newCat);
          restaurant.inventoryCategories.push(newCat);
        }
      }

      // console.log("newCategories ", newCategories)
      // Save restaurant with new categories
      await restaurant.save({ session });

      // Build quick lookup map:  categoryName → categoryId
      const categoryMap = {};
      for (const cat of restaurant.inventoryCategories) {
        categoryMap[cat.name.toLowerCase()] = cat._id;
      }

      // ============================
      // 3️⃣  PREPARE INVENTORY ITEMS FOR BULK INSERT
      // ============================
      const bulkOps = [];

      for (const item of inventoryItems) {
        const categoryId = categoryMap[item.categoryName.toLowerCase()];
        if (!categoryId) continue; // skip if category missing

        const obj = {
          name: item.name,
          restaurantRef: restaurantId,
          isDefault: true,
          preCode: `${item.categoryName.slice(0, 3).replaceAll(' ', '')}`,
          code: `${item.name.slice(0, 6).replaceAll(' ', '')}`,
          unit: item.unit,
          saveAsUnit: item.saveAsUnit,
          locationList: [{
            location: restaurant.inventoryLocations[0]?._id
          }]
        };

        if (categoryId) {
          obj.categoryId = categoryId;
        }

        bulkOps.push({
          updateOne: {
            filter: {
              name: item.name,
              restaurantRef: restaurantId
            },
            update: {
              $setOnInsert: obj
            },
            upsert: true
          }
        });
      }

      // ============================
      // 4️⃣  EXECUTE BULK INSERT
      // ============================
      if (bulkOps.length > 0) {
        await Inventory.bulkWrite(bulkOps, { session });
      }

      await session.commitTransaction();
      session.endSession();

      return Promise.resolve({
        status: "success",
        addedCategories: newCategories.length,
        itemsInsertedOrUpserted: bulkOps.length
      });

    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      return Promise.reject({ err });
    }
  }

  const downloadReport = async ({
    startDate,
    endDate
  }) => {
    const start = new Date(startDate);

    const end = new Date(endDate);

    console.log("start", start, startDate);
    console.log("end", end, endDate);

    return await Inventory.aggregate([
      // 1️⃣ Exclude docs with null or empty locationList early (performance)
      {
        $match: {
          locationList: { $exists: true, $ne: [], $ne: null },
          "locationList.history.date": { $gte: start, $lte: end },
        },
      },

      // 2️⃣ Filter history per location
      {
        $addFields: {
          locationList: {
            $map: {
              input: "$locationList",
              as: "loc",
              in: {
                $mergeObjects: [
                  "$$loc",
                  {
                    history: {
                      $filter: {
                        input: "$$loc.history",
                        as: "hist",
                        cond: {
                          $and: [
                            { $gte: ["$$hist.date", start] },
                            { $lte: ["$$hist.date", end] },
                          ],
                        },
                      },
                    },
                  },
                ],
              },
            },
          },
        },
      },

      // 3️⃣ Remove locations with empty history
      {
        $addFields: {
          locationList: {
            $filter: {
              input: { $ifNull: ["$locationList", []] }, // extra safety
              as: "loc",
              cond: {
                $gt: [
                  { $size: { $ifNull: ["$$loc.history", []] } },
                  0
                ]
              }
            }
          }
        }
      },

      // 4️⃣ Final guard: remove docs where locationList became empty
      {
        $match: {
          locationList: { $ne: [] },
        },
      },
      {
        $lookup: {
          from: "orders",
          let: {
            orderIds: {
              $reduce: {
                input: "$locationList",
                initialValue: [],
                in: {
                  $concatArrays: [
                    "$$value",
                    {
                      $map: {
                        input: "$$this.history",
                        as: "h",
                        in: {
                          $cond: [
                            {
                              $and: [
                                { $ne: ["$$h.orderRef", null] },
                                { $ne: ["$$h.orderRef", ""] },
                              ],
                            },
                            { $toObjectId: "$$h.orderRef" },
                            null,
                          ],
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
          pipeline: [
            {
              $match: {
                $expr: { $in: ["$_id", "$$orderIds"] },
              },
            },
            {
              $project: {
                _id: 1,
                idbId: 1,
                orderId: 1
              },
            },
          ],
          as: "orders",
        },
      },

      // 6️⃣ Inject populated order into each history item
      {
        $addFields: {
          locationList: {
            $map: {
              input: "$locationList",
              as: "loc",
              in: {
                $mergeObjects: [
                  "$$loc",
                  {
                    history: {
                      $map: {
                        input: "$$loc.history",
                        as: "hist",
                        in: {
                          $mergeObjects: [
                            "$$hist",
                            {
                              order: {
                                $arrayElemAt: [
                                  {
                                    $filter: {
                                      input: "$orders",
                                      as: "ord",
                                      cond: {
                                        $eq: [
                                          "$$ord._id",
                                          {
                                            $cond: [
                                              {
                                                $and: [
                                                  { $ne: ["$$hist.orderRef", null] },
                                                  { $ne: ["$$hist.orderRef", ""] },
                                                ],
                                              },
                                              { $toObjectId: "$$hist.orderRef" },
                                              null,
                                            ],
                                          },
                                        ],
                                      },
                                    },
                                  },
                                  0,
                                ],
                              },
                            },
                          ],
                        },
                      },
                    },
                  },
                ],
              },
            },
          },
        },
      },

      // 7️⃣ Cleanup helper array
      {
        $project: {
          orders: 0,
        },
      },
    ]);
  };



  return {
    'create': createInventory,
    'get': findInventoryById,
    'edit': editInventory,
    'list': getList,
    'remove': removeInventory,
    'updateMenuCount': updateMenuCount,
    'updateInventoryCount': updateInventoryCount,
    'rollbackInventory': rollbackInventory,
    'rollbackInventorySync': rollbackInventorySync,
    'updateHistoryOrderRef': updateHistoryOrderRef,
    updateInventoryCountSync: updateInventoryCountSync,
    updateInventoryWithPurchase: updateInventoryWithPurchase,
    seedInventoryForRestaurant: seedInventoryForRestaurant,
    downloadReport: downloadReport
  };
};