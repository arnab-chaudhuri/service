'use strict';

/**
 * This module handles all functionality of Admin Bill
 * @module Modules/Bill
 */
module.exports = function (app) {


  /**
   * bill Model
   * @type {Mongoose.Model}
   */
  const Bill = app.models.Bill;

  /**
   * Creates a Bill
   * @param  {Object} config  The config object
   * @return {Promise}        The promise
   */
  const createBill = async (config, userRef) => {
    if (userRef) {
      config.restaurantRef = userRef.restaurantRef;
      config.createdBy = userRef._id;
      config.addedByOwner = true;
    }
    
    return Bill.createBill(config);
  };

  const createMultiBill = async (bills, userRef) => {
    if (!Array.isArray(bills)) {
      return Promise.reject({ errCode: 'INVALID_BILLS' });
    }

    const prepared = bills.map(b => {
      const bill = { ...b };
      if (userRef) {
        bill.restaurantRef = userRef.restaurantRef;
        bill.createdBy = userRef._id;
        bill.addedByOwner = true;
      }
      return bill;
    });

    return Bill.insertMany(prepared);
  };

  const bulkUpdateBills = async (bills, userRef) => {
    if (!Array.isArray(bills)) {
      return Promise.reject({ errCode: 'INVALID_BILLS' });
    }

    const ops = [];
    const ids = [];

    for (const item of bills) {
      if (!item || !item._id) {
        return Promise.reject({ errCode: 'BILL_ID_REQUIRED' });
      }

      const id = item._id;
      const updatePayload = { ...item };
      delete updatePayload._id;

      // Prevent changing ownership fields from API
      delete updatePayload.restaurantRef;
      delete updatePayload.createdBy;
      delete updatePayload.addedByOwner;

      // Nothing to update for this item
      if (Object.keys(updatePayload).length === 0) continue;

      const filter = { _id: id };
      if (userRef && userRef.restaurantRef) {
        filter.restaurantRef = userRef.restaurantRef;
      }

      ops.push({
        updateOne: {
          filter,
          update: { $set: updatePayload },
          upsert: false
        }
      });

      ids.push(id);
    }

    if (ops.length === 0) {
      return Promise.resolve({ matchedCount: 0, modifiedCount: 0, updated: [] });
    }

    await Bill.bulkWrite(ops);

    // Fetch and return the updated documents (respecting restaurantRef if provided)
    const findFilter = { _id: { $in: ids } };
    if (userRef && userRef.restaurantRef) {
      findFilter.restaurantRef = userRef.restaurantRef;
    }
    const updated = await Bill.find(findFilter);

    return updated;
  };

  /**
   * Fetches a bill by Id
   * @param  {String} billId  The bill id
   * @return {Promise}        The promise
   */
  const findBillById = function (billId, userRef) {
    return Bill.findById(billId)
      .populate({
        path: 'orderRef'
      })
      .then(billDetails => {
        if (!billDetails || (billDetails &&
          billDetails.restaurantRef.toString() !== userRef.restaurantRef.toString())) {
          return Promise.reject({
            'errCode': 'BILL_NOT_FOUND'
          });
        } else {
          return Promise.resolve(billDetails);
        }
      });
  };

  const getByOfflineId = function (billId, userRef) {
    return Bill.findOne({
      offlineId: billId
    })
      .populate({
        path: 'orderRef',
        populate: {
          path: 'userRef',
          select: 'personalInfo _id'
        }
      })
      .then(billDetails => {
        if (!billDetails || (billDetails &&
          billDetails.restaurantRef.toString() !== userRef.restaurantRef.toString())) {
          return Promise.reject({
            'errCode': 'BILL_NOT_FOUND'
          });
        } else {
          return Promise.resolve(billDetails);
        }
      });
  };

  /**
   * Edits a bill
   * @param  {Object} editedBill The edited bill document
   * @return {Promise}           The promise
   */
  const editBill = function (editedBill, userRef) {

    if (editedBill.restaurantRef.toString() !== userRef.restaurantRef.toString()) {
      return Promise.reject({
        'errCode': 'BILL_NOT_FOUND'
      });
    }

    return editedBill.save();
  };

  /**
   * Removes a bill
   * @param  {Object} bill The bill document
   * @return {Promise}     The promise
   */
  const removeBill = function (bill, userRef) {
    if (bill.restaurantRef.toString() !== userRef.restaurantRef.toString()) {
      return Promise.reject({
        'errCode': 'BILL_NOT_FOUND'
      });
    }
    return Bill.removeBill(bill._id);
  };

  const updateBillFromOrder = (billId, billDetails) => {
    return Bill.findOne({
      _id: billId
    })
      .then(bill => {
        if (bill) {
          if (billDetails && Object.keys(billDetails).length) {
            for (let item in billDetails) {
              bill[item] = typeof billDetails[item] !== "object" || Array.isArray(billDetails[item]) ? billDetails[item] : {
                ...bill[item],
                ...billDetails[item]
              };
            }
          }
          return bill.save();
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
        from: "orders",              // collection name
        localField: "orderRef",
        foreignField: "_id",
        as: "orderRef"
      }
    }, { $unwind: "$orderRef" },];

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

    const bills = await Bill.aggregate(aggArr).exec();
    return Promise.resolve({
      data: bills[0]?.data || [],
      total: bills[0]?.totalCount[0]?.count || 0,
      limit: limit,
      skip: skip
    });
  }

  return {
    'create': createBill,
    'createMulti': createMultiBill,
    'get': findBillById,
    'getByOfflineId': getByOfflineId,
    'edit': editBill,
    'list': getList,
    'remove': removeBill,
    'updateBillFromOrder': updateBillFromOrder,
    'bulkUpdateBills': bulkUpdateBills
  };
};