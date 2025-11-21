'use strict';

/**
 * This Controller handles all functionality of restaurantOwner auth
 * @module Controllers/RestaurantOwner/Auth
 */
module.exports = function (app) {
  /**
   * restaurantOwner module
   * @type {Object}
   */
  const restaurantOwner = app.module.restaurantOwner;
  const restaurant = app.module.restaurant;

  /**
   * Login
   * @param  {Object}   req  Request
   * @param  {Object}   res  Response
   * @param  {Function} next Next is used to pass control to the next middleware function
   * @return {Promise}       The Promise
   */
  const login = (req, res, next) => {
    restaurantOwner.auth
      .login(
        {
          deviceType: req.headers['x-auth-devicetype'],
          deviceId: req.headers['x-auth-deviceid'],
        },
        {
          email: req.body.email,
          password: req.body.password,
        }
      )
      .then((output) =>
        app.module.session.set(
          output.userType,
          output.userDoc,
          req.headers['x-auth-devicetype'],
          req.headers['x-auth-deviceid'],
          req.headers['x-auth-notificationkey']
        )
      )
      .then((output) => {
        req.workflow.outcome.data = {
          accessToken: output.accessToken,
          refreshToken: output.refreshToken,
          user: app.utility.format.user(output.userId),
        };
        req.workflow.emit('response');
      })
      .catch(next);
  };

  /**
   * Forgot Password - Request OTP
   * @param  {Object}   req  Request
   * @param  {Object}   res  Response
   * @param  {Function} next Next is used to pass control to the next middleware function
   * @return {Promise}       The Promise
   */
  const forgotPasswordRequestOTP = (req, res, next) => {
    restaurantOwner.auth.forgotPassword
      .create(req.body.email)
      .then((output) => {
        if (process.env.NODE_ENV === 'testing' || process.env.NODE_ENV === 'development') {
          req.workflow.outcome.data = {};
          req.workflow.outcome.data.otp = output.code;
        }

        req.workflow.emit('response');
      })
      .catch(next);
  };

  /**
   * Forgot Password - Verify OTP
   * @param  {Object}   req  Request
   * @param  {Object}   res  Response
   * @param  {Function} next Next is used to pass control to the next middleware function
   * @return {Promise}       The Promise
   */
  const forgotPasswordVerifyOTP = (req, res, next) => {
    restaurantOwner.auth.forgotPassword
      .verify(req.body.token, req.body.password)
      .then((output) => req.workflow.emit('response'))
      .catch(next);
  };

  const signupRequest = (req, res, next) => {
    restaurant.create({
      name: req.body.restaurantDetails.name,
      introductoryText: req.body.restaurantDetails.introductoryText,
      status: app.config.contentManagement.restaurant.unPublished
    })
      .then((output) => {
        // req.workflow.outcome.data = output;
        const data = {
          personalInfo: {
            fullName: req.body.ownerDetails.fullName,
            phone: req.body.ownerDetails.phone,
            email: req.body.ownerDetails.email,
            password: req.body.ownerDetails.password
          },
          restaurantRef: output._id,
          from: 'signup'
        };
        if (req.body.socialId) {
          data.socialInfo = [{ socialId: req.body.socialId, socialType: req.body.provider }];
          data.loginType = app.config.user.loginType[req.body.provider];
          data.accountStatus = app.config.user.accountStatus.restaurantOwner.active;
        }
        restaurantOwner.crud.add(data)
        .then(() => {
          req.workflow.emit('response');
        })
        .catch(next);
      })
      .catch(next);
  };

  const verifyToken = (req, res, next) => {
    const {token} = req.body;
    restaurantOwner.auth
      .verifyToken(token, 'reset')
      .then((output) => {
        // req.workflow.outcome.data = app.utility.format.user(output);
        req.workflow.emit('response');
      })
      .catch(next);
  };

  const verifyRegistrationToken = (req, res, next) => {
    const {token} = req.body;
    restaurantOwner.auth
      .verifyToken(token, 'registration')
      .then((output) => {
        req.workflow.outcome.data = app.utility.format.user(output);
        req.workflow.emit('response');
      })
      .catch(next);
  };

  const socialLogin = (req, res, next) => {
    restaurantOwner.auth
      .socialLogin(
        {
          socialType: req.body.provider,
          socialId: req.body.socialId,
          fullName: req.body.fullName,
          email: req.body.email,
        }
      )
      .then((output) => {
        if (output.message && output.message === "NEW_REGISTER") {
          req.workflow.outcome.data = output;
          req.workflow.emit('response');
        } else {
          return new Promise.resolve(output);
        }
      })
      .then((output) =>
        app.module.session.set(
          output.userType,
          output.userDoc,
          req.headers['x-auth-devicetype'],
          req.headers['x-auth-deviceid'],
          req.headers['x-auth-notificationkey']
        )
      )
      .then((output) => {
        req.workflow.outcome.data = {
          accessToken: output.accessToken,
          refreshToken: output.refreshToken,
          user: app.utility.format.user(output.userId),
        };
        req.workflow.emit('response');
      })
      .catch(next);
  }

  const sendVerificationLink = (req, res, next) => {
    restaurantOwner.auth
      .sendVerificationLink(req.body)
      .then((output) => {
        if (process.env.NODE_ENV === 'development') {
          req.workflow.outcome.data = output;
        }
        req.workflow.emit('response');
      })
      .catch(next);
  };

  return {
    login: login,
    forgotPassword: {
      requestOTP: forgotPasswordRequestOTP,
      verifyOTP: forgotPasswordVerifyOTP,
    },
    socialLogin,
    verifyToken: verifyToken,
    verifyRegistrationToken: verifyRegistrationToken,
    signupRequest: signupRequest,
    sendVerificationLink
  };
};
