'use strict';

/**
 * This module handles all functionality of Admin Role Management
 * @module Modules/Role
 */
module.exports = function (app) {


  /**
   * Role Model
   * @type {Mongoose.Model}
   */
  const Role = app.models.Role;

  /**
   * Admin Model
   * @type {Mongoose.Model}
   */
  const Admin = app.models.Admin;

  /**
   * Creates a role
   * @param  {Object} config  The config object
   * @return {Promise}        The promise
   */
  const createRole = function (config) {
    return Role.createRole(config);
  };

  /**
   * Fetches a role by Id
   * @param  {String} roleId  The role id
   * @return {Promise}        The promise
   */
  const findRoleById = function (roleId) {
    return Role.findById(roleId);
  };

  /**
   * Edits a role
   * @param  {Object} editedRole The edited role document
   * @return {Promise}           The promise
   */
  const editRole = function (editedRole) {
    return Role.countDocuments({
      name: editedRole.name,
      restaurantRef: editedRole.restaurantRef,
      _id: {
        $ne: editedRole._id
      },
      'status': {
        $ne: app.config.contentManagement.role.deleted
      }
    })
      .then(count => count ? Promise.reject({
        'errCode': 'ROLE_ALREADY_EXISTS'
      }) : editedRole.save());
  };

  /**
   * Fetches a list of roles
   * @param  {Object} options  The options object
   * @return {Promise}        The promise
   */
  const getList = function (options) {
    return Role.pagedFind(options);
  };

  /**
   * Removes a role
   * @param  {Object} role The role document
   * @return {Promise}     The promise
   */
  const removeRole = function (role) {
    return Admin.exists({
      'roleInfo.roleId': role._id
    })
      .then((output) => {
        return output ? Promise.reject({
          'errCode': 'ADMIN_ALREADY_EXISTS_FOR_THIS_ROLE'
        }) : Role.removeRole(role._id);
      });
  };

  return {
    'create': createRole,
    'get': findRoleById,
    'edit': editRole,
    'list': getList,
    'remove': removeRole
  };
};