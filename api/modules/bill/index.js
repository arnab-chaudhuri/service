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
    config.restaurantRef = userRef.restaurantRef;
    config.createdBy = userRef._id;
    config.addedByOwner = true;
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
   * Fetches a list of bills
   * @param  {Object} options  The options object
   * @return {Promise}        The promise
   */
  const getList = function (options) {
    return Bill.pagedFind(options);
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

  return {
    'create': createBill,
    'get': findBillById,
    'edit': editBill,
    'list': getList,
    'remove': removeBill,
    'updateBillFromOrder': updateBillFromOrder
  };
};