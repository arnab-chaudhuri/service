'use strict';

module.exports = function(app) {
  const addMenu = {
    'name': {
      type: 'string',
      allowEmpty: false,
      required: true
    },
    'order': {
      type: 'number',
      allowEmpty: false,
      required: true
    },
    categoryRef: {
      type: 'string',
      required: true,
      'conform': function(value) {
        return app.utility.checkMongooseObjectId(value);
      }
    },
    price: {
      type: 'number'
    },
    description: {
      type: 'string'
    },
    isVeg: {
      type: 'boolean'
    },
    isNonVeg: {
      type: 'boolean'
    },
    isSpicy: {
      type: 'boolean'
    },
    isAvailable: {
      type: 'boolean'
    },
    ingredients: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          'name': {
            type: 'string',
          },
          'unit': {
            type: 'number'
          },
          'quantity': {
            type: 'number'
          }
        }
      }
    }
  };

   const editMenu = {
    'name': {
      type: 'string'
    },
    'order': {
      type: 'number'
    },
    categoryRef: {
      type: 'string',
      'conform': function(value) {
        return app.utility.checkMongooseObjectId(value);
      }
    },
    price: {
      type: 'number'
    },
    description: {
      type: 'string'
    },
    isVeg: {
      type: 'boolean'
    },
    isNonVeg: {
      type: 'boolean'
    },
    isSpicy: {
      type: 'boolean'
    },
    isAvailable: {
      type: 'boolean'
    },
    ingredients: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          'name': {
            type: 'string',
          },
          'unit': {
            type: 'number'
          },
          'quantity': {
            type: 'number'
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
    'menuId': {
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

  const getMenuImages = {
    name: {
      type: 'string',
      allowEmpty:false,
      required: true
    }
  };

  return {
    add: addMenu,
    edit: editMenu,
    listQuery: listQuery,
    param: param,
    list: list, 
    getMenuImages: getMenuImages
  };

};