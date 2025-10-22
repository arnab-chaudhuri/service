'use strict';

/**
 * This Controller handles all functionality of admin user
 * @module Controllers/Admin/Admin-User
 */

module.exports = function(app) {

  /**
   * adminUser Module
   * @type {Object}
   */
  const restaurantOwner = app.module.restaurantOwner;

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
  const addRestaurantMember = (req, res, next) => {
    req.body.restaurantRef = req.session.user.restaurantRef;
    req.body.accountStatus = app.config.user.accountStatus.restaurantOwner.active;
    
    restaurantOwner.crud.add(req.body)
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
  const getRestaurantMember = (req, res, next) => {
    restaurantOwner.crud.get(req.restaurantOwnerId)
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
  const getRestaurantMemberList = (req, res, next) => {
    let query = {
      skip: Number(req.query.skip) || app.config.page.defaultSkip,
      limit: Number(req.query.limit) || app.config.page.defaultLimit,
      filters: {
        accountStatus: app.config.user.accountStatus.restaurantOwner.active,
        restaurantRef: req.session.user.restaurantRef,
        _id: {
          '$ne': req.session.user._id
        }
      },
      sort: { createdAt: -1 },
      populate: {
        'path': 'roleInfo.roleId'
      },
      keys: '-authenticationInfo'
    };

    if (req.body.filters) {
      let { name, email, roleInfo } = req.body.filters;
      if (name) {
        query.filters['personalInfo.fullName'] = new RegExp(`^${name}`, 'ig');
      }
      if (email) {
        query.filters['personalInfo.email'] = new RegExp(`^${email}`, 'ig');
      }
      if (roleInfo) {
        query.filters.roleInfo = roleInfo;
      }
    }
    if (req.body.sortConfig) {
      let { name, email } = req.body.sortConfig;
      if (name) {
        query.sort['personalInfo.fullName'] = name;
      }
      if (email) {
        query.sort['personalInfo.email'] = email;
      }
    }

    restaurantOwner.crud.list(query)
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
  const editRestaurantMember = (req, res, next) => {
    req.restaurantOwnerId.personalInfo = req.body.personalInfo;
    req.restaurantOwnerId.roleInfo = req.body.roleInfo;
    restaurantOwner.crud.edit(req.restaurantOwnerId)
      .then(output => {
        return app.module.session.remove(req.restaurantOwnerId._id, app.config.user.role.restaurantOwner)
          .then(() => output);
      })
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
  const deleteRestaurantMember = (req, res, next) => {
    req.restaurantOwnerId.accountStatus = app.config.user.accountStatus.restaurantOwner.deleted;

    restaurantOwner.crud.edit(req.restaurantOwnerId)
      .then(output => {
        return app.module.session.remove(req.restaurantOwnerId._id, app.config.user.role.restaurantOwner)
          .then(() => output);
      })
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
    if (req.restaurantOwnerId.roleInfo.isSuperAdmin) {
      return next({ 'errCode': 'SUPER_ADMIN_CANNOT_BE_SUSPENDED' });
    }
    restaurantOwner.crud.changeStatus(req.restaurantOwnerId, req.body)
      .then(output => {
        if (req.body.accountStatus === app.config.user.accountStatus.admin.blocked) {
          return session.remove(req.restaurantOwnerId._id, app.config.user.role.admin).then(() => output);
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
    add: addRestaurantMember,
    get: getRestaurantMember,
    edit: editRestaurantMember,
    list: getRestaurantMemberList,
    delete: deleteRestaurantMember,
    changeStatus: changeStatus
  };

};