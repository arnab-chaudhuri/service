'use strict';

/**
 * This module handles all functionality of Admin TableSession
 * @module Modules/TableSession
 */
module.exports = function (app) {
  const mongoose = require('mongoose');

  /**
   * tableSession Model
   * @type {Mongoose.Model}
   */
  const TableSession = app.models.TableSession;

  /**
   * Creates a TableSession
   * @param  {Object} config  The config object
   * @return {Promise}        The promise
   */
  const createTableSession = async (config, userRef) => {
    if (!config.tableRef) {
      return Promise.resolve({});
    }
    if (userRef) {
      config.createdBy = userRef._id;
      config.addedByOwner = true;
      config.restaurantRef = userRef.restaurantRef;
    }
    const filter = {
      tableRef: new mongoose.Types.ObjectId(config.tableRef),
      restaurantRef: new mongoose.Types.ObjectId(config.restaurantRef),
      status: app.config.contentManagement.tableSession.active,
      endedAt: { $exists: false }
    };

    // Step 1: Ensure there is an active session (create if not)
    let result = await TableSession.findOneAndUpdate(
      filter,
      {
        $setOnInsert: {
          tableRef: filter.tableRef,
          restaurantRef: filter.restaurantRef,
          status: filter.status,
        }
      },
      { new: true, upsert: true, includeResultMetadata: true }
    );

    let session = result.value;

    const isNew = result.lastErrorObject.upserted;

    // Step 2: Try to increment main cart item if menuRef exists
    const incObj = {};
    if (typeof config.cartItem.quantity === "number") incObj["cart.$[item].quantity"] = config.cartItem.quantity;

    if (Object.keys(incObj).length) {
      await TableSession.updateOne(
        { _id: session._id },
        { $inc: incObj },
        { arrayFilters: [{ "item.menuRef": config.cartItem.menuRef }] }
      );
    }

    // Step 3: Handle subItems
    if (config.cartItem.subItems?.length) {
      for (const sub of config.cartItem.subItems) {
        const subInc = {};
        if (typeof sub.quantity === "number") subInc["cart.$[item].subItems.$[sub].quantity"] = sub.quantity;

        if (Object.keys(subInc).length) {
          const updated = await TableSession.updateOne(
            { _id: session._id },
            { $inc: subInc },
            {
              arrayFilters: [
                { "item.menuRef": config.cartItem.menuRef },
                { "sub.name": sub.name }
              ]
            }
          );

          // If subItem was not found, push it
          if (updated.matchedCount === 0) {
            await TableSession.updateOne(
              { _id: session._id, "cart.menuRef": config.cartItem.menuRef },
              { $push: { "cart.$.subItems": sub } }
            );
          }
        }
      }
    }

    // Step 4: If main cart item does not exist, push it
    const cartExists = session.cart.some(
      (c) => c.menuRef.toString() === config.cartItem.menuRef.toString()
    );

    if (!cartExists) {
      await TableSession.updateOne(
        { _id: session._id },
        { $push: { cart: config.cartItem } }
      );
    }

    // Step 5: Remove cart items with zero quantity
    await TableSession.updateOne(
      { _id: session._id },
      { $pull: { cart: { quantity: { $lte: 0 } } } }
    );

    // Step 6: Remove subItems with zero quantity
    await TableSession.updateOne(
      { _id: session._id },
      { $pull: { "cart.$[].subItems": { quantity: { $lte: 0 } } } }
    );

    // Step 7: Remove session if no cart items left
    const updatedSession = await TableSession.findById(session._id);
    if (!updatedSession.cart || updatedSession.cart.length === 0) {
      await TableSession.deleteOne({ _id: session._id });
      return Promise.resolve({
        noData: true
      });
    }

    // Step 8: Return updated session
    return Promise.resolve({
      isNew
    });
  };

  const createTableSessionFromOwner = async (config, userRef) => {
    if (!config.tableRef) {
      return Promise.resolve({});
    }
    if (userRef) {
      config.createdBy = userRef._id;
      config.addedByOwner = true;
      config.restaurantRef = userRef.restaurantRef;
    }
    const filter = {
      tableRef: new mongoose.Types.ObjectId(config.tableRef),
      restaurantRef: new mongoose.Types.ObjectId(config.restaurantRef),
      status: app.config.contentManagement.tableSession.active,
      endedAt: { $exists: false }
    };

    const tabSesRes = await TableSession.findOne(filter);

    if (tabSesRes && tabSesRes.orderRef) {
      return Promise.reject({
        'errCode': 'TABLE_ALREADY_ORDER'
      });
    }

    const obj = {
      tableRef: filter.tableRef,
      status: filter.status,
      createdBy: userRef._id,
      addedByOwner: true,
      restaurantRef: userRef.restaurantRef,
      cart: config.cart,
    };

    if (config.orderRef) {
      obj.orderRef = config.orderRef;
    }

    // Step 1: Ensure there is an active session (create if not)
    let session = await TableSession.findOneAndUpdate(
      filter,
      {
        $setOnInsert: obj
      },
      { new: true, upsert: true }
    );

    // Step 8: Return updated session
    return Promise.resolve(session);
  };

  const createTableSessionFromUser = async (config, userRef) => {
    if (!config.tableRef) {
      return Promise.resolve({});
    }
    if (userRef) {
      config.createdBy = userRef._id;
    }
    const filter = {
      tableRef: new mongoose.Types.ObjectId(config.tableRef),
      restaurantRef: new mongoose.Types.ObjectId(config.restaurantRef),
      status: app.config.contentManagement.tableSession.active,
      endedAt: { $exists: false }
    };

    const tabSesRes = await TableSession.findOne(filter);

    if (tabSesRes && tabSesRes.orderRef && !config.extOrderId) {
      return Promise.reject({
        'errCode': 'TABLE_SESSION_NOT_FOUND'
      });
    }

    const obj = {
      tableRef: filter.tableRef,
      restaurantRef: filter.restaurantRef,
      status: filter.status,
      cart: config.cart,
    };

    if (userRef) {
      obj.createdBy = userRef._id;
    }

    if (config.orderRef) {
      obj.orderRef = config.orderRef;
    }

    // Step 1: Ensure there is an active session (create if not)
    let session = await TableSession.findOneAndUpdate(
      filter,
      {
        $setOnInsert: obj
      },
      { new: true, upsert: true }
    );

    // Step 8: Return updated session
    return Promise.resolve(session);
  };
  /**
   * Fetches a tableSession by Id
   * @param  {String} tableSessionId  The tableSession id
   * @return {Promise}        The promise
   */
  const findTableSessionById = function (tableSessionId, userRef) {
    return TableSession.findById(tableSessionId)
      .populate({
        path: 'billRef'
      })
      .then(tableSessionDetails => {
        if (!tableSessionDetails || (tableSessionDetails && userRef &&
          tableSessionDetails.restaurantRef.toString() !== userRef.restaurantRef.toString())) {
          return Promise.reject({
            'errCode': 'TABLE_SESSION_NOT_FOUND'
          });
        } else {
          return Promise.resolve(tableSessionDetails);
        }
      });
  };

  const getByTableId = function ({ tableRef, restaurantRef, noError }) {

    if (!tableRef) {
      return Promise.resolve({});
    }

    const filter = {
      tableRef: new mongoose.Types.ObjectId(tableRef),
      restaurantRef: new mongoose.Types.ObjectId(restaurantRef),
      status: app.config.contentManagement.tableSession.active,
      endedAt: { $exists: false }
    };
    return TableSession.findOne(filter)
      .then(tableSessionDetails => {
        if (!tableSessionDetails) {
          if (noError) {
            return Promise.resolve({
              noData: true
            });
          }
          return Promise.reject({
            'errCode': 'TABLE_SESSION_NOT_FOUND'
          });
        } else {
          return Promise.resolve(tableSessionDetails);
        }
      });
  };

  const getByTableIdFromApp = function ({ tableRef, restaurantRef, noError }) {

    if (!tableRef) {
      return Promise.resolve({});
    }

    const filter = {
      tableRef: new mongoose.Types.ObjectId(tableRef),
      restaurantRef: new mongoose.Types.ObjectId(restaurantRef),
      status: app.config.contentManagement.tableSession.active,
      endedAt: { $exists: false }
    };
    return TableSession.findOne(filter)
      .populate({
        path: 'orderRef',
        select: 'orderId _id cart'
      })
      .then(tableSessionDetails => {
        if (!tableSessionDetails) {
          if (noError) {
            return Promise.resolve({
              noData: true
            });
          }
          return Promise.reject({
            'errCode': 'TABLE_SESSION_NOT_FOUND'
          });
        } else {
          return Promise.resolve(tableSessionDetails);
        }
      });
  };

  /**
   * Edits a tableSession
   * @param  {Object} editedTableSession The edited tableSession document
   * @return {Promise}           The promise
   */
  const editTableSession = function (editedTableSession, userRef) {

    if (userRef && editedTableSession.restaurantRef.toString() !== userRef.restaurantRef.toString()) {
      return Promise.reject({
        'errCode': 'TABLE_SESSION_NOT_FOUND'
      });
    }

    return editedTableSession.save();
  };

  const updateStatusByOrderId = function (orderRef, restaurantRef) {
    const filter = {
      orderRef: new mongoose.Types.ObjectId(orderRef),
      restaurantRef: new mongoose.Types.ObjectId(restaurantRef),
      status: app.config.contentManagement.tableSession.active,
      endedAt: { $exists: false }
    };

    return TableSession.findOne(filter)
      .then(tableSessionDetails => {
        if (tableSessionDetails) {
          tableSessionDetails.status = app.config.contentManagement.tableSession.closed;
          tableSessionDetails.endedAt = new Date();
          return tableSessionDetails.save();
        } else {
          return Promise.resolve({});
        }
      });
  };

  const updateCartByOrderId = function (orderRef, restaurantRef, cart) {
    const filter = {
      orderRef: new mongoose.Types.ObjectId(orderRef),
      restaurantRef: new mongoose.Types.ObjectId(restaurantRef),
      status: app.config.contentManagement.tableSession.active,
      endedAt: { $exists: false }
    };

    return TableSession.findOne(filter)
      .then(tableSessionDetails => {
        if (tableSessionDetails) {
          tableSessionDetails.cart = cart;
          return tableSessionDetails.save();
        }
      });
  };

  const updateStatus = (tableSessionId) => {
    return TableSession.findOne({
      _id: tableSessionId
    })
      .then(tableSession => {
        if (tableSession) {
          tableSession.status = app.config.contentManagement.tableSession.closed;
          return tableSession.save();
        } else {
          return Promise.resolve(null);
        }
      });
  };

  const updateStatusByTableRef = (tableRef, restaurantRef) => {
    return TableSession.updateMany(
      {
        status: app.config.contentManagement.tableSession.active,
        restaurantRef,
        tableRef
      },
      {
        $set: {
          status: app.config.contentManagement.tableSession.closed
        }
      }
    );
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

    const tableSessions = await TableSession.aggregate(aggArr).exec();
    return Promise.resolve({
      data: tableSessions[0]?.data || [],
      total: tableSessions[0]?.totalCount[0]?.count || 0,
      limit: limit,
      skip: skip
    });
  }

  return {
    'create': createTableSession,
    'createTableSessionFromOwner': createTableSessionFromOwner,
    'getByTableId': getByTableId,
    'getByTableIdFromApp': getByTableIdFromApp,
    'updateStatusByOrderId': updateStatusByOrderId,
    'updateCartByOrderId': updateCartByOrderId,
    'get': findTableSessionById,
    'edit': editTableSession,
    'list': getList,
    'updateStatus': updateStatus,
    'createTableSessionFromUser': createTableSessionFromUser,
    'updateStatusByTableRef': updateStatusByTableRef
  };
};