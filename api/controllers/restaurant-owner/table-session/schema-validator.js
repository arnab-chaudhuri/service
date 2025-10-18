'use strict';

module.exports = function(app) {
  
  const param = {
    'tableId': {
      type: 'string',
      required: true,
      'conform': function(value) {
        return app.utility.checkMongooseObjectId(value);
      }
    }
  };

  return {
    param: param
  };

};