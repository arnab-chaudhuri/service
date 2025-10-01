'use strict';
/**
 * This Controller handles all functionality of restaurantOwner profile
 * @module Controllers/RestaurantOwner/Profile
 */
module.exports = function (app) {
  /**
   * restaurantOwner module
   * @type {Object}
   */
  const restaurantOwner = app.module.restaurantOwner;

  /**
   * Get Profile
   * @param  {Object}   req  Request
   * @param  {Object}   res  Response
   * @param  {Function} next Next is used to pass control to the next middleware function
   * @return {Promise}       The Promise
   */
  const getProfile = (req, res, next) => {
    req.workflow.outcome.data = app.utility.format.user(req.session.user);
    req.workflow.emit('response');
  };

  /**
   * Set Profile
   * @param  {Object}   req  Request
   * @param  {Object}   res  Response
   * @param  {Function} next Next is used to pass control to the next middleware function
   * @return {Promise}       The Promise
   */
  const setProfile = (req, res, next) => {
    // console.log("req.body", req.body)
    restaurantOwner.profile
      .set(req.session.user, req.body)
      .then((profile) => {
        req.workflow.outcome.data = app.utility.format.user(profile);
        req.workflow.emit('response');
      })
      .catch(next);
  };

  /**
   * Change Password
   * @param  {Object}   req  Request
   * @param  {Object}   res  Response
   * @param  {Function} next Next is used to pass control to the next middleware function
   * @return {Promise}       The Promise
   */
  const changePassword = (req, res, next) => {
    restaurantOwner.profile
      .changePassword(req.session.user, req.body.oldPassword, req.body.newPassword)
      .then(() => req.workflow.emit('response'))
      .catch(next);
  };

  /**
   * Logout
   * @param  {Object}   req  Request
   * @param  {Object}   res  Response
   * @param  {Function} next Next is used to pass control to the next middleware function
   * @return {Promise}       The Promise
   */
  const logout = (req, res, next) => {
    restaurantOwner.profile
      .logout({
        token: req.token,
        deviceType: req.headers['x-auth-devicetype'],
        deviceId: req.headers['x-auth-deviceid'],
      })
      .then(() => req.workflow.emit('response'))
      .catch(next);
  };

  return {
    getProfile: getProfile,
    setProfile: setProfile,
    changePassword: changePassword,
    logout: logout,
  };
};
