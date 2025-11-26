'use strict';

/**
 * This module handles all functionality of Admin Query
 * @module Modules/Query
 */
module.exports = function (app) {
  const mongoose = require('mongoose');

  /**
   * query Model
   * @type {Mongoose.Model}
   */
  const Query = app.models.Query;

  /**
   * Creates a Query
   * @param  {Object} config  The config object
   * @return {Promise}        The promise
   */
  const createQuery = function (config, userRef) {
    return Query.createQuery(config);
  };

  /**
   * Fetches a query by Id
   * @param  {String} queryId  The query id
   * @return {Promise}        The promise
   */
  const findQueryById = function (queryId, userRef) {
    return Query.findById(queryId)
      .then(queryDetails => {
        if (!queryDetails) {
          return Promise.reject({
            'errCode': 'QUERY_NOT_FOUND'
          });
        } else {
          return Promise.resolve(queryDetails);
        }
      });
  };

  /**
   * Edits a query
   * @param  {Object} editedQuery The edited query document
   * @return {Promise}           The promise
   */
  const editQuery = function (editedQuery, userRef) {
    return editedQuery.save();
  };

  /**
   * Fetches a list of inventories
   * @param  {Object} options  The options object
   * @return {Promise}        The promise
   */
  const getList = function (options) {
    return Query.pagedFind(options);
  };

  /**
   * Removes a query
   * @param  {Object} query The query document
   * @return {Promise}     The promise
   */
  const removeQuery = function (query, userRef) {
    return Query.removeQuery(query._id);
  };

  return {
    'create': createQuery,
    'get': findQueryById,
    'edit': editQuery,
    'list': getList,
    'remove': removeQuery,
  };
};