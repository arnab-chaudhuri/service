'use strict';

/**
 * This Controller handles all functionality of Global Config
 * @module Controllers/Admin/GlobalConfig
 */
module.exports = function (app) {
  /**
   * admin module
   * @type {Object}
   */
  const notification = app.module.notification;
  /**
   * send notification
   * @param  {Object}   req  Request
   * @param  {Object}   res  Response
   * @param  {Function} next Next is used to pass control to the next middleware function
   * @return {Promise}       The Promise
   */
  const createNotification = (req, res, next) => {
    notification
      .createNotification(req.body, req.session.user)
      .then((output) => {
        req.workflow.outcome.data = output;

        req.workflow.emit('response');
      })
      .catch(next);
  };

  const getAll = (req, res, next) => {
    notification
      .list({
        restaurantRef: req.session.user.restaurantRef,
        user: req.session.user._id
      })
      .then((output) => {
        req.workflow.outcome.data = output;

        req.workflow.emit('response');
      })
      .catch(next);
  };

  return {
    createNotification: createNotification,
    get: getAll
  };
};
