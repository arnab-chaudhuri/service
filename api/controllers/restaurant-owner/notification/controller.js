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

  const getUnreadCount = (req, res, next) => {
    notification
      .unreadNotificationCount({
        restaurantRef: req.session.user.restaurantRef.toString(),
        user: req.session.user._id.toString(),
        seen: false
      })
      .then((output) => {
        req.workflow.outcome.data = output;

        req.workflow.emit('response');
      })
      .catch(next);
  };

  const markAllAsRead = (req, res, next) => {
    notification
      .markAllAsRead({
        restaurantRef: req.session.user.restaurantRef.toString(),
        _id: req.session.user._id.toString(),
      })
      .then((output) => {
        req.workflow.emit('response');
      })
      .catch(next);
  };

  const getAll = (req, res, next) => {
    let query = {
      skip: Number(req.query.skip) || app.config.page.defaultSkip,
      limit: Number(req.query.limit) || app.config.page.defaultLimit,
      filters: {
        restaurantRef: req.session.user.restaurantRef.toString(),
        user: req.session.user._id.toString()
      },
      sort: {
        createdAt: -1
      }
    };
    notification
      .list(query)
      .then((output) => {
        req.workflow.outcome.data = output;

        req.workflow.emit('response');
      })
      .catch(next);
  };

  return {
    createNotification: createNotification,
    get: getAll,
    getUnreadCount: getUnreadCount,
    markAllAsRead: markAllAsRead
  };
};
