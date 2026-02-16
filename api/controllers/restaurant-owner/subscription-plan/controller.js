'use strict';

/**
 * This Controller handles all functionality of admin user
 * @module Controllers/Admin/Admin-User
 */

module.exports = function(app) {

  /**
   * subscriptionPlan Module
   * @type {Object}
   */
  const subscriptionPlan = app.module.subscriptionPlan;

  /**
   * Fetches an admin
   * @param  {Object}   req  Request 
   * @param  {Object}   res  Response
   * @param  {Function} next Next is used to pass control to the next middleware function
   * @return {Promise}       The Promise
   */
  const getSubscriptionPlan = (req, res, next) => {
    subscriptionPlan.get(req.subscriptionPlanId)
      .then(output => {
        req.workflow.outcome.data = output;
        req.workflow.emit('response');
      })
      .catch(next);
  };

  /**
   * Fetches a list of admin users
   * @param  {Object}   req  Request 
   * @param  {Object}   res  Response
   * @param  {Function} next Next is used to pass control to the next middleware function
   * @return {Promise}       The Promise
   */
  const getSubscriptionPlanList = (req, res, next) => {
    let query = {
      skip: Number(req.query.skip) || app.config.page.defaultSkip,
      limit: Number(req.query.limit) || app.config.page.defaultLimit,
      filters: {
        accountStatus: {
          $ne: app.config.contentManagement.subscriptionPlan.deleted
        },
      },
      sort: { createdAt: -1 }
    };

    subscriptionPlan.list(query)
      .then(output => {
        req.workflow.outcome.data = output;
        req.workflow.emit('response');
      })
      .catch(next);
  };


  return {
    get: getSubscriptionPlan,
    list: getSubscriptionPlanList,
  };

};