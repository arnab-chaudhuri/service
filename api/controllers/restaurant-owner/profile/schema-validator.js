'use strict';

module.exports = function (app) {
  const profilePhoto = {
    profilePicture: {
      type: 'object',
    },
  };

  /////////////
  // Profile //
  /////////////

  const setProfile = {
    firstName: {
      type: 'string',
      allowEmpty: false,
      conform: function (value) {
        return app.utility.isValidate.isNameComponent(value);
      },
    },
    lastName: {
      type: 'string',
      allowEmpty: false,
      conform: function (value) {
        return app.utility.isValidate.isNameComponent(value);
      },
    },
    email: {
      type: 'string',
      format: 'email',
      allowEmpty: false,
    },
  };

  /////////////////////
  // Change Password //
  /////////////////////
  const changePassword = {
    newPassword: {
      type: 'string',
      required: true,
    },
    oldPassword: {
      type: 'string',
      required: true,
    },
  };

  const verifyPin = {
    pin: {
      type: 'string',
      required: true,
      allowEmpty: false
    }
  };

  return {
    profilePhoto: profilePhoto,
    set: setProfile,
    changePassword: changePassword,
    verifyPin: verifyPin
  };
};
