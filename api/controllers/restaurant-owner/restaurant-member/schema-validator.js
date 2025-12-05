'use strict';

module.exports = function(app) {

  const addAdminUser = {
    personalInfo: {
      type: 'object',
      required: true,
      allowEmpty: false,
      properties: {
        fullName: {
          type: 'string',
          required: true,
          allowEmpty: false
        },
        email: {
          type: 'string',
          required: true,
          allowEmpty: false,
          format: 'email'
        }
      }
    },
    roleInfo: {
      type: 'object',
      required: true,
      allowEmpty: false,
      properties: {
        isSuperRestaurantOwner: {
          type: 'boolean',
          required: true,
          allowEmpty: false
        },
        roleId: {
          type: 'string',
          'conform': function(value) {
            return app.utility.checkMongooseObjectId(value);
          }
        }
      }
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
    'restaurantOwnerId': {
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
          'isSuperAdmin': {
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
    add: addAdminUser,
    edit: addAdminUser,
    listQuery: listQuery,
    param: param,
    list: list,
  };

};