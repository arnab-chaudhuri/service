'use strict';

/**
 * This module handles all functionality of Admin Table
 * @module Modules/Table
 */
module.exports = function (app) {
  const mongoose = require('mongoose');

  /**
   * table Model
   * @type {Mongoose.Model}
   */
  const Table = app.models.Table;
  const Restaurant = app.models.Restaurant;

  /**
   * Creates a Table
   * @param  {Object} config  The config object
   * @return {Promise}        The promise
   */
  const createTable = function (config, userRef) {
    if (config.tableIds && config.tableIds.length) {
      return Restaurant.findById(userRef.restaurantRef)
        .then(restDetails => {
          const arr = config.tableIds.map(element => {
            const monId = new mongoose.Types.ObjectId();
            return {
              tableId: element.tableId,
              restaurantRef: userRef.restaurantRef,
              _id: monId,
              qrCodeUrl: `https://immedine.com/diner/${restDetails.name.split(" ").join("-")}_${userRef.restaurantRef}_${monId}`,
              noOfSeats: element.noOfSeats,
              env: element.env,
              style: element.style,
              shape: element.shape,
              height: element.height
            }
          });
          return Table.insertMany(arr);
        })

    }

  };

  /**
   * Fetches a table by Id
   * @param  {String} tableId  The table id
   * @return {Promise}        The promise
   */
  const findTableById = function (tableId, userRef) {
    return Table.findById(tableId)
      .then(tableDetails => {
        if (!tableDetails || (tableDetails &&
          tableDetails.restaurantRef.toString() !== userRef.restaurantRef.toString())) {
          return Promise.reject({
            'errCode': 'TABLE_NOT_FOUND'
          });
        } else {
          return Promise.resolve(tableDetails);
        }
      });
  };

  /**
   * Edits a table
   * @param  {Object} editedTable The edited table document
   * @return {Promise}           The promise
   */
  const editTable = function (editedTable, userRef) {

    if (editedTable.restaurantRef.toString() !== userRef.restaurantRef.toString()) {
      return Promise.reject({
        'errCode': 'TABLE_NOT_FOUND'
      });
    }

    return Table.countDocuments({
      tableId: editedTable.tableId,
      status: app.config.contentManagement.table.active,
      restaurantRef: editedTable.restaurantRef,
      _id: {
        $ne: editedTable._id
      }
    })
      .then(count => count ? Promise.reject({
        'errCode': 'TABLE_ALREADY_EXISTS'
      }) : editedTable.save());
  };

  const markAsUnavailable = (tableId, tableSessionId) => {
    return Table.findOne({
      _id: tableId
    })
      .then(table => {
        if (table) {
          table.status = app.config.contentManagement.table.inActive;
          table.currentSessionRef = tableSessionId;
          return table.save();
        } else {
          return Promise.resolve(null);
        }
      });
  };

  /**
   * Fetches a list of inventories
   * @param  {Object} options  The options object
   * @return {Promise}        The promise
   */
  const getList = function (options) {
    // console.log("options")
    // console.log(options)
    // console.log(Table.pagedFind(options))
    return Table.pagedFind(options);
  };

  /**
   * Removes a table
   * @param  {Object} table The table document
   * @return {Promise}     The promise
   */
  const removeTable = function (table, userRef) {
    if (table.restaurantRef.toString() !== userRef.restaurantRef.toString()) {
      return Promise.reject({
        'errCode': 'TABLE_NOT_FOUND'
      });
    }
    return Table.removeTable(table._id);
  };

  return {
    'create': createTable,
    'get': findTableById,
    'edit': editTable,
    'list': getList,
    'remove': removeTable,
    'markAsUnavailable': markAsUnavailable
  };
};