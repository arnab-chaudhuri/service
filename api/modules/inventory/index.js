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
                const requiredQty = ing.quantity * orderItem.quantity;

                // if (ing.inventoryRef.quantity < requiredQty) {
                //   await session.abortTransaction();
                //   session.endSession();
                //   return Promise.reject({
                //     'errCode': 'NOT_ENOUGH_STOCK'
                //   });
                // }

                const locationList = ing.inventoryRef.locationList;
                const locationData = locationList.find(each => each.location === ing.location);
                if (locationData && Object.keys(locationData).length) {
                  if (locationData.quantity < requiredQty) {
                    await session.abortTransaction();
                    session.endSession();
                    return Promise.reject({
                      'errCode': 'NOT_ENOUGH_STOCK'
                    });
                  }
                }

                const historyEntry = {
                  quantity: requiredQty,
                  isDebited: true,
                  reason: 'NEW_ORDER'
                };

                if (orderId) {
                  historyEntry.orderRef = orderId;
                }

                invIds.push(ing.inventoryRef._id.toString());

                // Push to bulk update list
                bulkUpdates.push({
                  updateOne: {
                    filter: { _id: ing.inventoryRef._id },
                    update: {
                      $inc: { 'locationList.$[loc].quantity': -requiredQty, quantity: -requiredQty },
                      $push: { 'locationList.$[loc].history': historyEntry }
                    },
                    arrayFilters: [{ 'loc.location': ing.location }]
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
                  reason: 'NEW_ORDER'
                };

                if (orderItem.orderId) {
                  historyEntry.orderRef = orderItem.orderId?.toString();
                }

                invIds.push(ing.inventoryRef._id.toString());

                // Push to bulk update list
                bulkUpdates.push({
                  updateOne: {
                    filter: { _id: ing.inventoryRef._id },
                    update: {
                      $inc: { 'locationList.$[loc].quantity': -requiredQty, quantity: -requiredQty },
                      $push: { 'locationList.$[loc].history': historyEntry }
                    },
                    arrayFilters: [{ 'loc.location': ing.location }]
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
            }

          });
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
            reason: 'ORDER_UPDATE'
          };
          return {
            updateOne: {
              filter: { _id: invId },
              update: {
                $inc: {
                  'locationList.$[loc].quantity': qty, quantity: qty,
                },
                $push: { 'locationList.$[loc].history': historyEntry }
              },
              arrayFilters: [{ 'loc.location': restoreUsageLoc[invId] }]
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
        for (const item of updatedItems) {
          if (item.menuRef) {
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
              }

            });
          }

        }

        // Step 3a: Validate stock before deduction
        if (newIngredientUsage && Object.keys(newIngredientUsage).length) {
          for (const [invId, qty] of Object.entries(newIngredientUsage)) {
            const inv = await Inventory.findById(invId).session(session);

            const locationList = inv.locationList;
            const locationData = locationList.find(each => each.location === newIngredientLoc[invId]);
            if (locationData && Object.keys(locationData).length) {
              if (locationData.quantity < qty) {
                await session.abortTransaction();
                session.endSession();
                return Promise.reject({
                  'errCode': 'NOT_ENOUGH_STOCK'
                });
              }
            }


            //   if (!inv || inv.quantity < qty) {
            //     await session.abortTransaction();
            //     session.endSession();
            //     // throw new Error(`Insufficient stock for ingredient ${inv?.name || invId}`);
            //     return Promise.reject({
            //       'errCode': 'NOT_ENOUGH_STOCK'
            //     });
            //   }
          }

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
              reason: 'ORDER_UPDATE'
            };

            return {
              updateOne: {
                filter: { _id: invId },
                update: {
                  $inc: { 'locationList.$[loc].quantity': -qty, quantity: -qty },
                  $push: { 'locationList.$[loc].history': historyEntry }
                },
                arrayFilters: [{ 'loc.location': newIngredientLoc[invId] }]
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
              reason: 'ORDER_UPDATE'
            };
            return {
              updateOne: {
                filter: { _id: invId },
                update: {
                  $inc: {
                    'locationList.$[loc].quantity': qty, quantity: qty,
                  },
                  $push: { 'locationList.$[loc].history': historyEntry }
                },
                arrayFilters: [{ 'loc.location': restoreUsageLoc[invId] }]
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
                reason: 'ORDER_UPDATE'
              };

              return {
                updateOne: {
                  filter: { _id: invId },
                  update: {
                    $inc: { 'locationList.$[loc].quantity': -qty, quantity: -qty },
                    $push: { 'locationList.$[loc].history': historyEntry }
                  },
                  arrayFilters: [{ 'loc.location': newIngredientLoc[invId] }]
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

  const updateInventoryWithPurchase = async (payload, purchaseId, isDeduct) => {
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

  async function seedInventoryForRestaurant(restaurantId, invCategories, inventoryItems) {
    console.log("start")
    const session = await app.db.startSession();
    session.startTransaction();


    try {
      // ============================
      // 1️⃣  FETCH RESTAURANT
      // ============================
      const restaurant = await Restaurant.findById(restaurantId).session(session);
      if (!restaurant) throw new Error("Restaurant not found");
      console.log("restaurant ", restaurant)

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

      console.log("newCategories ", newCategories)
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

        bulkOps.push({
          updateOne: {
            filter: {
              name: item.name,
              restaurantRef: restaurantId
            },
            update: {
              $setOnInsert: {
                name: item.name,
                restaurantRef: restaurantId,
                isDefault: true,
                preCode: `${item.categoryName.slice(0, 3).replaceAll(' ', '')}`,
                code: `${item.name.slice(0, 6).replaceAll(' ', '')}`,
                unit: item.unit,
                saveAsUnit: item.saveAsUnit,
                categoryId: categoryId,
                locationList: [{
                  location: restaurant.inventoryLocations[0]?._id
                }]
              }
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
    seedInventoryForRestaurant: seedInventoryForRestaurant
  };
};