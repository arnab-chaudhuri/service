'use strict';
/**
 * This Controller handles all functionality of admin feedback
 * @module Controllers/Admin/feedback
 */
module.exports = function(app) {

  /**
   * feedback module
   * @type {Object}
   */
  const feedback = app.module.feedback;

  /**
   * Fetches a feedback
   * @param  {Object}   req  Request 
   * @param  {Object}   res  Response
   * @param  {Function} next Next is used to pass control to the next middleware function
   * @return {Promise}       The Promise
   */
  const getFeedback = (req, res, next) => {
    feedback.get(req.params.feedbackId,req.session.user)
      .then(output => {
        req.workflow.outcome.data = output;
        req.workflow.emit('response');
      })
      .catch(next);
  };

  /**
   * Fetches a list of Inventories
   * @param  {Object}   req  Request 
   * @param  {Object}   res  Response
   * @param  {Function} next Next is used to pass control to the next middleware function
   * @return {Promise}       The Promise
   */
  const getFeedbackList = (req, res, next) => {
    let query = {
      skip: Number(req.query.skip) || app.config.page.defaultSkip,
      limit: Number(req.query.limit) || app.config.page.defaultLimit,
      filters: {
        status: {
          '$ne': app.config.contentManagement.feedback.deleted
        },
        restaurantRef: req.session.user.restaurantRef
      },
      sort: {},
      populate: [{
        path: 'restaurantRef',
        select: 'name'
      }, {
        path: 'orderRef',
        select: 'orderId'
      }]
    };

    if (req.body.filters) {
      let { status } = req.body.filters;
      
      if (status) {
        query.filters.status = status;
      }
    }

    feedback.list(query)
      .then(output => {
        req.workflow.outcome.data = output;
        req.workflow.emit('response');
      })
      .catch(next);
  };

  /**
   * Edits a feedback
   * @param  {Object}   req  Request 
   * @param  {Object}   res  Response
   * @param  {Function} next Next is used to pass control to the next middleware function
   * @return {Promise}       The Promise
   */
  const editFeedback = (req, res, next) => {

    if (req.body && Object.keys(req.body).length) {
      for (let prop in req.body) {
        req.feedbackId[prop] = req.body[prop];
      }
    }
    feedback.edit(req.feedbackId, req.session.user)
      .then(output => {
        req.workflow.outcome.data = output;
        req.workflow.emit('response');
      })
      .catch(next);
  };

  /**
   * Deletes a feedback
   * @param  {Object}   req  Request 
   * @param  {Object}   res  Response
   * @param  {Function} next Next is used to pass control to the next middleware function
   * @return {Promise}       The Promise
   */
  const deleteFeedback = (req, res, next) => {
    req.feedbackId.status = app.config.contentManagement.feedback.deleted;
    feedback.edit(req.feedbackId, req.session.user)
      .then(output => {
        req.workflow.emit('response');
      })
      .catch(next);
  };

  return {
    get: getFeedback,
    edit: editFeedback,
    list: getFeedbackList,
    delete: deleteFeedback
  };

};