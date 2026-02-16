'use strict';

module.exports = function(app) {

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
    'subscriptionPlanId': {
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
        'roleName': {
          type: 'number',
          enum: [1, -1]
        },
        'name': {
          type: 'number',
          enum: [1, -1]
        },
        'email': {
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
        },
        'roleInfo': {
          'type': 'object',
          'isSuperSubscriptionPlan': {
            type: 'boolean'
          },
          'roleId': {
            type: 'string',
            allowEmpty: false,
            'conform': function(value) {
              return app.utility.checkMongooseObjectId(value);
            }
          },
        },
        'email': {
          type: 'string',
          format: 'email',
          allowEmpty: false
        },
      }
    }
  };

  return {
    listQuery: listQuery,
    param: param,
    list: list,
  };

};