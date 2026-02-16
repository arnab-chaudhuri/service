'use strict';

/**
 * This module handles all functionality of Admin SubscriptionPlan
 * @module Modules/SubscriptionPlan
 */
module.exports = function (app) {


  /**
   * subscriptionPlan Model
   * @type {Mongoose.Model}
   */
  const SubscriptionPlan = app.models.SubscriptionPlan;

  /**
   * Creates a SubscriptionPlan
   * @param  {Object} config  The config object
   * @return {Promise}        The promise
   */
  const createSubscriptionPlan = function (config) {
    return SubscriptionPlan.createSubscriptionPlan(config);
  };

  /**
   * Fetches a subscriptionPlan by Id
   * @param  {String} subscriptionPlanId  The subscriptionPlan id
   * @return {Promise}        The promise
   */
  const findSubscriptionPlanById = function (subscriptionPlanId) {
    return SubscriptionPlan.findById(subscriptionPlanId);
  };

  /**
   * Edits a subscriptionPlan
   * @param  {Object} editedSubscriptionPlan The edited subscriptionPlan document
   * @return {Promise}           The promise
   */
  const editSubscriptionPlan = function (editedSubscriptionPlan) {
    return SubscriptionPlan.countDocuments({
      question: editedSubscriptionPlan.question,
      _id: {
        $ne: editedSubscriptionPlan._id
      }
    })
      .then(count => count ? Promise.reject({
        'errCode': 'PLAN_ALREADY_EXISTS'
      }) : editedSubscriptionPlan.save());
  };

  /**
   * Fetches a list of subscriptionPlans
   * @param  {Object} options  The options object
   * @return {Promise}        The promise
   */
  const getList = function (options) {
    return SubscriptionPlan.pagedFind(options);
  };

  /**
   * Removes a subscriptionPlan
   * @param  {Object} subscriptionPlan The subscriptionPlan document
   * @return {Promise}     The promise
   */
  const removeSubscriptionPlan = function (subscriptionPlan) {
    return SubscriptionPlan.removeSubscriptionPlan(subscriptionPlan._id);
  };

  return {
    'create': createSubscriptionPlan,
    'get': findSubscriptionPlanById,
    'edit': editSubscriptionPlan,
    'list': getList,
    'remove': removeSubscriptionPlan
  };
};