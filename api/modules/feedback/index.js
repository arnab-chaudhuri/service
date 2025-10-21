'use strict';

/**
 * This module handles all functionality of Admin Feedback
 * @module Modules/Feedback
 */
module.exports = function (app) {
  const mongoose = require('mongoose');

  /**
   * feedback Model
   * @type {Mongoose.Model}
   */
  const Feedback = app.models.Feedback;

  /**
   * Creates a Feedback
   * @param  {Object} config  The config object
   * @return {Promise}        The promise
   */
  const createFeedback = function (config, userRef) {
    if (userRef) {
      config.reviewerDetails = {
        ...config.reviewerDetails,
        userRef: userRef._id
      }
    }
    return Feedback.createFeedback(config);

  };

  /**
   * Fetches a feedback by Id
   * @param  {String} feedbackId  The feedback id
   * @return {Promise}        The promise
   */
  const findFeedbackById = function (feedbackId, userRef) {
    return Feedback.findById(feedbackId)
      .then(feedbackDetails => {
        if (!feedbackDetails || (feedbackDetails && userRef &&
          feedbackDetails.restaurantRef.toString() !== userRef.restaurantRef.toString())) {
          return Promise.reject({
            'errCode': 'FEEDBACK_NOT_FOUND'
          });
        } else {
          return Promise.resolve(feedbackDetails);
        }
      });
  };

  /**
   * Edits a feedback
   * @param  {Object} editedFeedback The edited feedback document
   * @return {Promise}           The promise
   */
  const editFeedback = function (editedFeedback, userRef) {

    if (userRef && editedFeedback.restaurantRef.toString() !== userRef.restaurantRef.toString()) {
      return Promise.reject({
        'errCode': 'FEEDBACK_NOT_FOUND'
      });
    }

    return editedFeedback.save();
  };

  /**
   * Fetches a list of inventories
   * @param  {Object} options  The options object
   * @return {Promise}        The promise
   */
  const getList = function (options) {
    return Feedback.pagedFind(options);
  };

  /**
   * Removes a feedback
   * @param  {Object} feedback The feedback document
   * @return {Promise}     The promise
   */
  const removeFeedback = function (feedback, userRef) {
    if (userRef && feedback.restaurantRef.toString() !== userRef.restaurantRef.toString()) {
      return Promise.reject({
        'errCode': 'FEEDBACK_NOT_FOUND'
      });
    }
    return Feedback.removeFeedback(feedback._id);
  };

  return {
    'create': createFeedback,
    'get': findFeedbackById,
    'edit': editFeedback,
    'list': getList,
    'remove': removeFeedback,
  };
};