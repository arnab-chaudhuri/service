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
   * Session Module
   * @type {Object}
   */
  const session = app.module.session;

  /**
   * Adds an admin
   * @param  {Object}   req  Request 
   * @param  {Object}   res  Response
   * @param  {Function} next Next is used to pass control to the next middleware function
   * @return {Promise}       The Promise
   */
  const addSubscriptionPlan = (req, res, next) => {
    req.body.createdByAdmin = true;
    subscriptionPlan.create(req.body)
      .then(output => {
        req.workflow.emit('response');
      })
      .catch(next);
  };

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

  /**
   * Edits an admin
   * @param  {Object}   req  Request 
   * @param  {Object}   res  Response
   * @param  {Function} next Next is used to pass control to the next middleware function
   * @return {Promise}       The Promise
   */
  const editSubscriptionPlan = (req, res, next) => {
    req.subscriptionPlanId.name = req.body.name || req.subscriptionPlanId.name;
    req.subscriptionPlanId.introductoryText = req.body.introductoryText || req.subscriptionPlanId.introductoryText;
    req.subscriptionPlanId.logo = req.body.logo || req.subscriptionPlanId.logo;
    req.subscriptionPlanId.primaryColor = req.body.primaryColor || req.subscriptionPlanId.primaryColor;
    req.subscriptionPlanId.secondaryColor = req.body.secondaryColor || req.subscriptionPlanId.secondaryColor;
    req.subscriptionPlanId.status = req.body.status || req.subscriptionPlanId.status;
    subscriptionPlan.edit(req.subscriptionPlanId)
      .then(output => {
        req.workflow.emit('response');
      })
      .catch(next);
  };

  /**
   * Deletes a Admin User
   * @param  {Object}   req  Request 
   * @param  {Object}   res  Response
   * @param  {Function} next Next is used to pass control to the next middleware function
   * @return {Promise}       The Promise
   */
  const deleteSubscriptionPlan = (req, res, next) => {
    req.subscriptionPlanId.status = app.config.contentManagement.subscriptionPlan.deleted;

    subscriptionPlan.edit(req.subscriptionPlanId)
      .then(output => {
        req.workflow.emit('response');
      })
      .catch(next);
  };
  /**
   * Changes(Suspend) the status of an Admin User
   * @param  {Object}   req  Request 
   * @param  {Object}   res  Response
   * @param  {Function} next Next is used to pass control to the next middleware function
   * @return {Promise}       The Promise
   */
  const changeStatus = (req, res, next) => {

    if (!req.session.user.roleInfo.isSuperAdmin) {
      return next({ 'errCode': 'N0_ACCESS' });
    }
    if (req.subscriptionPlanId.roleInfo.isSuperAdmin) {
      return next({ 'errCode': 'SUPER_ADMIN_CANNOT_BE_SUSPENDED' });
    }
    subscriptionPlan.changeStatus(req.subscriptionPlanId, req.body)
      .then(output => {
        if (req.body.accountStatus === app.config.user.accountStatus.admin.blocked) {
          return session.remove(req.subscriptionPlanId._id, app.config.user.role.admin).then(() => output);
        } else {
          return output;
        }
      })
      .then(output => {
        req.workflow.outcome.data = app.utility.format.admin(output);
        req.workflow.emit('response');
      })
      .catch(next);
  };

  return {
    add: addSubscriptionPlan,
    get: getSubscriptionPlan,
    edit: editSubscriptionPlan,
    list: getSubscriptionPlanList,
    delete: deleteSubscriptionPlan,
    changeStatus: changeStatus
  };

};