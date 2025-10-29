'use strict';

module.exports = function(app) {
  const addInventory = {
    'name': {
      type: 'string',
      allowEmpty: false,
      required: true
    },
    'quantity': {
      type: 'number',
      allowEmpty: false,
      required: true
    },
    'unit': {
      type: 'number',
      allowEmpty: false,
      required: true
    },
    'locationId': {
      type: 'string',
      required: true,
      'conform': function(value) {
        return app.utility.checkMongooseObjectId(value);
      }
    },
     'categoryId': {
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
    'inventoryId': {
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
    add: addInventory,
    edit: addInventory,
    listQuery: listQuery,
    param: param,
    list: list,
  };

};