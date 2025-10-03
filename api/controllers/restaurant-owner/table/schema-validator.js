'use strict';

module.exports = function(app) {
  const addTable = {
    'tableIds': {
      type: 'array',
      required: true,
      items: {
        type: 'object',
        properties: {
          'tableId': {
            type: 'string',
          },
          'noOfSeats': {
            type: 'number',
          },
        }
      }
    }
  };

  const editTable = {
    'tableId': {
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
    'tableId': {
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
    add: addTable,
    edit: editTable,
    listQuery: listQuery,
    param: param,
    list: list,
  };

};