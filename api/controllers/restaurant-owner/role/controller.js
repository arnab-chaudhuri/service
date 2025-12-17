'use strict';
/**
 * This Controller handles all functionality of admin role management
 * @module Controllers/Admin/Role
 */
module.exports = function(app) {

  /**
   * role module
   * @type {Object}
   */
  const role = app.module.role;

  /**
   * Adds a role
   * @param  {Object}   req  Request 
   * @param  {Object}   res  Response
   * @param  {Function} next Next is used to pass control to the next middleware function
   * @return {Promise}       The Promise
   */
  const addRole = (req, res, next) => {
    req.body.restaurantRef = req.session.user.restaurantRef;
    role.create(req.body)
      .then(output => {
        req.workflow.outcome.data = output;
        req.workflow.emit('response');
      })
      .catch(next);
  };

  /**
   * Fetches a role
   * @param  {Object}   req  Request 
   * @param  {Object}   res  Response
   * @param  {Function} next Next is used to pass control to the next middleware function
   * @return {Promise}       The Promise
   */
  const getRole = (req, res, next) => {
    role.get(req.params.roleId)
      .then(output => {
        req.workflow.outcome.data = output;
        req.workflow.emit('response');
      })
      .catch(next);
  };

  /**
   * Fetches a list of roles
   * @param  {Object}   req  Request 
   * @param  {Object}   res  Response
   * @param  {Function} next Next is used to pass control to the next middleware function
   * @return {Promise}       The Promise
   */
  const getRoleList = (req, res, next) => {
    let query = {
      skip: Number(req.query.skip) || app.config.page.defaultSkip,
      limit: Number(req.query.limit) || app.config.page.defaultLimit,
      filters: {
        status: app.config.contentManagement.role.active,
        restaurantRef: req.session.user.restaurantRef
      },
      sort: {}
    };

    if (req.body.filters) {
      let { name, moduleName } = req.body.filters;
      if (name) {
        query.filters.name = new RegExp(`^${name}`, 'ig');
      }
      if (moduleName) {
        query.filters['permissions.moduleName'] = moduleName;
      }
    }
    if (req.body.sortConfig) {
      let { name } = req.body.sortConfig;
      if (name) {
        query.sort.name = name;
      }
    }

    role.list(query)
      .then(output => {
        req.workflow.outcome.data = output;
        req.workflow.emit('response');
      })
      .catch(next);
  };

  /**
   * Edits a role
   * @param  {Object}   req  Request 
   * @param  {Object}   res  Response
   * @param  {Function} next Next is used to pass control to the next middleware function
   * @return {Promise}       The Promise
   */
  const editRole = (req, res, next) => {
    req.roleId.name = req.body.name;
    req.roleId.permissions = req.body.permissions;
    req.roleId.isManager = req.body.isManager;
    req.roleId.defaultModule = req.body.defaultModule;

    role.edit(req.roleId)
      .then(output => {
        req.workflow.outcome.data = output;
        req.workflow.emit('response');
      })
      .catch(next);
  };

  /**
   * Deletes a role
   * @param  {Object}   req  Request 
   * @param  {Object}   res  Response
   * @param  {Function} next Next is used to pass control to the next middleware function
   * @return {Promise}       The Promise
   */
  const deleteRole = (req, res, next) => {
    req.roleId.status = app.config.contentManagement.role.deleted;
    role.edit(req.roleId)
      .then(output => {
        req.workflow.outcome.data = output;
        req.workflow.emit('response');
      })
      .catch(next);
  };

  return {
    add: addRole,
    get: getRole,
    edit: editRole,
    list: getRoleList,
    delete: deleteRole
  };

};