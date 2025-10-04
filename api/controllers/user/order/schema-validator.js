'use strict';

module.exports = function(app) {
  const addOrder = {
    'cart': {
      type: 'array',
      required: true,
      allowEmpty: false,
      items: {
        type: 'object',
        properties: {
          'name': {
            type: 'string',
            required: true,
            allowEmpty: false,
          },
          'quantity': {
            type: 'number',
            required: true,
            allowEmpty: false,
          },
          'price': {
            type: 'number',
            required: true,
            allowEmpty: false,
          },
          'menuRef': {
            type: 'string',
            conform: function (value) {
              return app.utility.checkMongooseObjectId(value);
            },
          }
        }
      },
    },
    'subTotal': {
      type: 'number',
      allowEmpty: false,
      required: true
    },
    'total': {
      type: 'number',
      allowEmpty: false,
      required: true
    },
    'tableId': {
      type: 'string'
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
    'orderId': {
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
    add: addOrder,
    edit: addOrder,
    listQuery: listQuery,
    param: param,
    list: list,
  };

};