'use strict';

module.exports = function (app) {
  /////////////
  // edit   //
  /////////////

  const add = {
    name: {
      type: 'string',
      allowEmpty: false,
      required: true
    },
    introductoryText: {
      type: 'string'
    },
    logo: {
      type: 'string',
      format: 'url',
    },
    primaryThmeColor: {
      type: 'string'
    },
    secondaryThmeColor: {
      type: 'string',
    }
  };

  const edit = {
    name: {
      type: 'string',
      allowEmpty: false,
      required: true
    },
    introductoryText: {
      type: 'string'
    },
    logo: {
      type: 'string',
      format: 'url',
    },
    primaryThmeColor: {
      type: 'string'
    },
    secondaryThmeColor: {
      type: 'string',
    }
  };

  const updateGstDetails = {
    gstEnabled: {
      type: 'boolean',
      allowEmpty: false,
      required: true
    },
    cgst: {
      type: 'number'
    },
    sgst: {
      type: 'number'
    }
  }

  return {
    add: add,
    edit: edit,
    updateGstDetails: updateGstDetails
  };
};
