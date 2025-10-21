'use strict';

module.exports = function(app) {
  const addRole = {
    'name': {
      type: 'string',
      allowEmpty: false,
      required: true
    },
    'permissions': {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          'moduleName': {
            type: 'string',
            allowEmpty: false,
            required: true
          },
          'moduleKey': {
            type: 'string',
            allowEmpty: false,
            required: true,
            enum: app.config.adminRole.modules
          },
          // 'role': {
          //   type: 'number',
          //   allowEmpty: false,
          //   required: true,
          //   enum: Object.keys(app.config.adminRole.role).map(each => app.config.adminRole.role[each])
          // }
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
    'roleId': {
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
        },
        'moduleName': {
          type: 'string',
          allowEmpty: false
        },
      }
    }
  };

  return {
    add: addRole,
    edit: addRole,
    listQuery: listQuery,
    param: param,
    list: list,
  };

};