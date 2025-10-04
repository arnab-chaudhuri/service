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
              bill[item] = billDetails[item];
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
    'get': findBillById,
    'edit': editBill,
    'list': getList,
    'remove': removeBill,
    'updateBillFromOrder': updateBillFromOrder
  };
};