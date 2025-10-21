'use strict';

module.exports = function(app) {
  const addFeedback = {
    'review': {
      type: 'string',
      allowEmpty: false,
      required: true
    },
    'rating': {
      type: 'number',
      allowEmpty: false,
      required: true
    },
    reviewerDetails: {
      type: 'object',
      properties: {
        'fullName': {
          type: 'string',
          allowEmpty: false
        },
        'email': {
          type: 'string'
        },
      }
    }
  };

  const editFeedback = {
    'feedbackId': {
      type: 'string',
      allowEmpty: false,
      required: true
    }
  };

  const listQuery = {
    'skip': {
      type: 'string',
      'conform': function(value) {
        return app.utility.isValidate.isNumber(value);
      }
    },
    'limit': {
      type: 'string',
      'conform': function(value) {
        return app.utility.isValidate.isNumber(value);
      }
    }
  };

  const param = {
    'feedbackId': {
      type: 'string',
      required: true,
      'conform': function(value) {
        return app.utility.checkMongooseObjectId(value);
      }
    }
  };

  const list = {
    'sortConfig': {
      type: 'object',
      properties: {
        'name': {
          type: 'number',
          enum: [1, -1]
        }
      }
    },
    'filters': {
      type: 'object',
      properties: {
        'name': {
          type: 'string',
          allowEmpty: false
        }
      }
    }
  };

  return {
    add: addFeedback,
    edit: editFeedback,
    listQuery: listQuery,
    param: param,
    list: list,
  };

};