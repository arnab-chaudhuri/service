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
  const createTableSession = async ({ tableRef, restaurantRef, cartItem }, userRef) => {
    if (userRef) {
      config.createdBy = userRef._id;
      config.addedByOwner = true;
      config.restaurantRef = userRef.restaurantRef;
    }
    const filter = {
      tableRef: new mongoose.Types.ObjectId(tableRef),
      restaurantRef: new mongoose.Types.ObjectId(restaurantRef),
      status: app.config.contentManagement.tableSession.active,
      endedAt: { $exists: false }
    };

    // Step 1: Ensure there is an active session (create if not)
    let session = await TableSession.findOneAndUpdate(
      filter,
      { 
        $setOnInsert: {
          tableRef: filter.tableRef,
          restaurantRef: filter.restaurantRef,
          status: filter.status,
        }
      },
      { new: true, upsert: true }
    );

    // Step 2: Try to increment main cart item if menuRef exists
    const incObj = {};
    if (typeof cartItem.quantity === "number") incObj["cart.$[item].quantity"] = cartItem.quantity;

    if (Object.keys(incObj).length) {
      await TableSession.updateOne(
        { _id: session._id },
        { $inc: incObj },
        { arrayFilters: [{ "item.menuRef": cartItem.menuRef }] }
      );
    }

    // Step 3: Handle subItems
    if (cartItem.subItems?.length) {
      for (const sub of cartItem.subItems) {
        const subInc = {};
        if (typeof sub.quantity === "number") subInc["cart.$[item].subItems.$[sub].quantity"] = sub.quantity;

        if (Object.keys(subInc).length) {
          const updated = await TableSession.updateOne(
            { _id: session._id },
            { $inc: subInc },
            {
              arrayFilters: [
                { "item.menuRef": cartItem.menuRef },
                { "sub.name": sub.name }
              ]
            }
          );

          // If subItem was not found, push it
          if (updated.matchedCount === 0) {
            await TableSession.updateOne(
              { _id: session._id, "cart.menuRef": cartItem.menuRef },
              { $push: { "cart.$.subItems": sub } }
            );
          }
        }
      }
    }

    // Step 4: If main cart item does not exist, push it
    const cartExists = session.cart.some(
      (c) => c.menuRef.toString() === cartItem.menuRef.toString()
    );

    if (!cartExists) {
      await TableSession.updateOne(
        { _id: session._id },
        { $push: { cart: cartItem } }
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
    return Promise.resolve(updatedSession);
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
    const filter = {
      tableRef: new mongoose.Types.ObjectId(tableRef),
      restaurantRef: new mongoose.Types.ObjectId(restaurantRef),
      status: app.config.contentManagement.tableSession.active,
      endedAt: { $exists: false }
    };
    return TableSession.findOne(filter)
      .then(tableSessionDetails => {
        console.log("tableSessionDetails", tableSessionDetails)
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
        }
      });
  };

  const updateStatus = (tableSessionId) => {
    return TableSession.findOne({
      _id: tableSessionId
    })
      .then(tableSession => {
        if (tableSession) {
          tableSession.status = app.config.contentManagement.tableSession.completed;
          return tableSession.save();
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
    'getByTableId': getByTableId,
    'updateStatusByOrderId': updateStatusByOrderId,
    'get': findTableSessionById,
    'edit': editTableSession,
    'list': getList,
    'updateStatus': updateStatus
  };
};