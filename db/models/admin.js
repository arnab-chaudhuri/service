'use strict';
/**
 * Unique ID generation module
 * @type {Npm.Module}
 */
const Puid = require('puid');
const jwt = require('jsonwebtoken');
module.exports = function (app, mongoose /*, plugins*/) {
  const adminSchema = new mongoose.Schema(
    {
      /**
       * Personal Info
       */
      personalInfo: {
        /**
         * First name
         */
        firstName: {
          type: String,
          required: true,
        },
        /**
         * Last name
         */
        lastName: {
          type: String,
          required: true,
        },
        /**
         * Full Name
         */
        fullName: {
          type: String,
        },
        /**
         * Profile pic link
         */
        profilePicture: {
          type: String,
          default: null,
        },

        /**
         * Email address
         */
        email: {
          type: String,
          required: true,
        },
        /**
         * Country
         */
        country: {
          type: String,
          default: 'ES',
        },
      },
      /**
       * Authentication Info
       */
      authenticationInfo: {
        /**
         * Password string
         */
        password: {
          type: String,
          required: true,
        },
        /**
         * OTP object
         */
        otp: {
          /**
           * Code string
           */
          code: String,

          /**
           * Time at which OTP will become invalid
           */
          timeout: Date,
        },
      },
      /**
       * Role Info
       */
      roleInfo: {
        isSuperAdmin: {
          type: Boolean,
          required: true,
        },
        roleId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Role',
        },
        isBusinessUser: {
          type: Boolean,
          default: false
        }
      },
      /**
       * Account Status
       */
      accountStatus: {
        type: Number,
        required: true,
        default: app.config.user.accountStatus.admin.active,
      },
      /**
       * Settings
       */
      settings: {
        selectedLanguage: {
          type: String,
          default: app.config.user.defaultLang,
        },
        timeZoneOffset: {
          type: Number,
        },
      },
      /**
       * Session Information
       */
      sessionInfo: {
        deviceId: {
          type: String,
        },
        deviceType: {
          type: Number,
        },
        accessToken: {
          type: String,
        },
        refreshToken: {
          type: String,
        },
        destroyTime: {
          type: Date,
        },
        notificationKey: {
          type: String,
        },
      },
    },
    {
      versionKey: false,
      timestamps: true,
      autoIndex: true,
    }
  );

  /**
   * Pre Hook to save name as full
   * @param  {Object} next) {                     this.fullName The Full Name
   */
  adminSchema.pre('save', function (next) {
    this.personalInfo.fullName = this.personalInfo.firstName + ' ' + this.personalInfo.lastName;
    next();
  });

  /**
   * Custom login details validation
   * @param  {String} email    The email address
   * @param  {String} password The password
   * @return {Promise}         The promise
   */
  adminSchema.statics.loginValidate = function (email, password) {
    return this.findOne({
      'personalInfo.email': email,
      accountStatus: {
        $ne: app.config.user.accountStatus.admin.deleted,
      },
    })
    .populate('roleInfo.roleId')
      .exec()
      .then((adminDoc) =>
        adminDoc
          ? Promise.resolve(adminDoc)
          : Promise.reject({
              errCode: 'ADMIN_NOT_FOUND',
            })
      )
      .then((adminDoc) =>
        app.utility.validatePassword(password, adminDoc.authenticationInfo.password).then((result) =>
          result
            ? Promise.resolve(adminDoc)
            : Promise.reject({
                errCode: 'PASSWORD_MISMATCH',
              })
        )
      )
      .then((adminDoc) =>
        adminDoc.accountStatus !== app.config.user.accountStatus.admin.blocked
          ? Promise.resolve(adminDoc)
          : Promise.reject({
              errCode: 'ADMIN_HAS_BEEN_SUSPENDED',
            })
      )
      .then((adminDoc) => {
        return Promise.resolve({
          userDoc: adminDoc,
          userType: app.config.user.role.admin,
        });
      });
  };

  /**
   * Creates a new OTP for forgot password
   * @param  {String}  email The email
   * @return {Promise}       The promise
   */
  adminSchema.statics.forgotPasswordCreateOTP = function (email) {
    return this.findOne({
      'personalInfo.email': email,
      accountStatus: {
        $ne: app.config.user.accountStatus.admin.deleted,
      },
    })
      .exec()
      .then((adminDoc) =>
        adminDoc
          ? Promise.resolve(adminDoc)
          : Promise.reject({
              errCode: 'ADMIN_NOT_FOUND',
            })
      )
      .then((adminDoc) =>
        adminDoc.accountStatus !== app.config.user.accountStatus.admin.blocked
          ? Promise.resolve(adminDoc)
          : Promise.reject({
              errCode: 'ADMIN_HAS_BEEN_SUSPENDED',
            })
      )
      .then((adminDoc) => {
        adminDoc.authenticationInfo.otp = {
          code: app.utility.generateOTP(4),
          timeout: new Date(new Date().getTime() + 60 * 60 * 1000),
        };

        return adminDoc.save().then((adminDoc) => {
          ////////////////////////////////////////
          //TODO: Send OTP for forgot password  //
          ///////////////////////////////////////
          let emailNotification = app.config.notification.email(app, app.config.lang.defaultLanguage),
            multilangConfig = app.config.lang[app.config.lang.defaultLanguage];
          // create email template
          // app.render(
          //   emailNotification.forgotPassword.pageName,
          //   {
          //     greeting: multilangConfig.email.forgotPassword.greeting,
          //     firstName: adminDoc.personalInfo.firstName,
          //     message: multilangConfig.email.forgotPassword.message,
          //     otpText: multilangConfig.email.forgotPassword.otpText,
          //     otp: adminDoc.authenticationInfo.otp.code,
          //   },
          //   function (err, renderedText) {
          //     if (err) {
          //       console.log(err);
          //     } else {
          //       // send email
          //       app.service.notification.email.immediate({
          //         userId: adminDoc._id,
          //         userType: app.config.user.role.admin,
          //         emailId: adminDoc.personalInfo.email,
          //         subject: emailNotification.forgotPassword.subject,
          //         body: renderedText,
          //       });
          //     }
          //   }
          // );

          return Promise.resolve(adminDoc.authenticationInfo.otp);
        });
      });
  };

  /**
   * Verifies the OTP and sets the new password
   * @param  {String}  email    The email
   * @param  {String}  otp      The OTP to be verified
   * @param  {String}  password The new password to be set
   * @return {Promise}          The promise
   */
  adminSchema.statics.forgotPasswordVerifyOTP = function (email, otp, password) {
    return this.findOne({
      'personalInfo.email': email,
      accountStatus: {
        $ne: app.config.user.accountStatus.admin.deleted,
      },
    })
      .exec()
      .then((adminDoc) =>
        adminDoc
          ? Promise.resolve(adminDoc)
          : Promise.reject({
              errCode: 'ADMIN_NOT_FOUND',
            })
      )
      .then((adminDoc) =>
        adminDoc.accountStatus !== app.config.user.accountStatus.admin.blocked
          ? Promise.resolve(adminDoc)
          : Promise.reject({
              errCode: 'ADMIN_HAS_BEEN_SUSPENDED',
            })
      )
      .then((adminDoc) => {
        let savedOTP = {
          code: adminDoc.authenticationInfo.otp.code,
          timeout: adminDoc.authenticationInfo.otp.timeout,
        };

        if (savedOTP.timeout && new Date() < savedOTP.timeout) {
          if (savedOTP.code === otp) {
            //////////////////////////
            // Unset the otp object //
            //////////////////////////
            adminDoc
              .updateOne({
                $unset: {
                  'authenticationInfo.otp': 1,
                },
              })
              .exec();
            return Promise.resolve(adminDoc);
          } else {
            return Promise.reject({
              errCode: 'OTP_INVALID',
            });
          }
        } else {
          //////////////////////////
          // Unset the otp object //
          //////////////////////////
          adminDoc
            .updateOne({
              $unset: {
                'authenticationInfo.otp': 1,
              },
            })
            .exec();
          return Promise.reject({
            errCode: 'OTP_TIMEDOUT',
          });
        }
      })
      .then((adminDoc) =>
        app.utility.encryptPassword(password).then((hash) => {
          adminDoc.authenticationInfo.password = hash;
          return adminDoc.save();
        })
      );
  };

  /**
   * Checks whether a document exists according to a condition
   * @param  {Object} query   The query object
   * @return {Promise}        The Promise
   */
  adminSchema.statics.exists = function (query) {
    return this.countDocuments(query).exec();
  };

  /**
   * Adds an admin to the system
   * @param  {Object} adminObj    The admin object to be added
   * @return {Promise}            The Promise
   */
  adminSchema.statics.addAdmin = function (adminObj) {
    return this.exists({
      'personalInfo.email': adminObj.personalInfo.email,
      accountStatus: {
        $ne: app.config.user.accountStatus.admin.deleted,
      },
    })
      .then((count) =>
        count
          ? Promise.reject({
              errCode: 'ADMIN_EMAIL_ALREADY_EXISTS',
            })
          : Promise.resolve()
      )
      .then(() => {
        // let password = app.utility.getRandomCode(8, true);
        let password = process.env.ADMIN_DEFAULT_PASSWORD;
        return app.utility
          .encryptPassword(password)
          .then((password) => {
            adminObj.authenticationInfo = {
              password: password,
            };
            return new this(adminObj).save();
          })
          .then((updatedAdminObj) => {
            ////////////////////////////////////////////////////
            //Send email to newly created restaurant owner    //
            ////////////////////////////////////////////////////
            let emailNotification = app.config.notification.email(app, app.config.lang.defaultLanguage),
              multilangConfig = app.config.lang[app.config.lang.defaultLanguage];
            // create email template
            // app.render(
            //   emailNotification.adminAddedByAdmin.pageName,
            //   {
            //     greeting: multilangConfig.email.adminAddedByAdmin.greeting,
            //     firstName: updatedAdminObj.personalInfo.firstName,
            //     message: multilangConfig.email.adminAddedByAdmin.message,
            //     emailText: multilangConfig.email.adminAddedByAdmin.emailText,
            //     email: updatedAdminObj.personalInfo.email,
            //     passwordText: multilangConfig.email.adminAddedByAdmin.passwordText,
            //     password: password,
            //   },
            //   function (err, renderedText) {
            //     if (err) {
            //       console.log(err);
            //     } else {
            //       // send email
            //       app.service.notification.email.immediate({
            //         userId: updatedAdminObj._id,
            //         userType: app.config.user.role.admin,
            //         emailId: updatedAdminObj.personalInfo.email,
            //         subject: emailNotification.adminAddedByAdmin.subject,
            //         body: renderedText,
            //       });
            //     }
            //   }
            // );
            ////////
            //End //
            ////////
            return Promise.resolve(updatedAdminObj);
          });
      });
  };


  //////////////////////
  // Session Handling //
  //////////////////////

  const jwtTokenGenerator = (expiresIn, data) => {
    let puid = new Puid().generate();
    return {
      token: puid,
      jwt: jwt.sign(
        {
          token: puid,
          data,
        },
        'secret',
        { expiresIn: expiresIn }
      ),
    };
  };
  const decryptJwtToken = (token) => {
    try {
      var decoded = jwt.verify(token, 'secret');
      return { err: false, token: decoded.token };
    } catch (err) {
      return { err: true, msg: err.message };
    }
  };

  /**
   * Creates a new session
   * @param  {Number}   deviceType            The device type
   * @param  {String}   deviceId              The device id
   * @param  {Object}   userDoc               The user document
   * @return {Promise}                        The Promise
   */
  adminSchema.statics.createSession = function (deviceType, deviceId, userDoc, notificationKey) {
    const tokenData = {
      id: userDoc._id,
      role: app.config.user.role.admin,
      email: userDoc.personalInfo.email,
    };
    let jwtAccessToken = jwtTokenGenerator('30d', tokenData);
    let jwtRefreshToken = jwtTokenGenerator('300d', tokenData);
    let sessionInfo = {
      deviceType: deviceType,
      accessToken: jwtAccessToken.token,
      refreshToken: jwtRefreshToken.token,
      deviceId: deviceId,
    };

    if (notificationKey) {
      sessionInfo.notificationKey = notificationKey;
    }
    userDoc.sessionInfo = sessionInfo;

    return this.removeSessionByDeviceId(deviceId)
      .then(() => this.removeSessionByUserId(userDoc._id))
      .then(() => userDoc.save())
      .then((savedUser) => {
        return Promise.resolve({
          userId: savedUser,
          userType: app.config.user.role.admin,
          deviceId: savedUser.sessionInfo.deviceId,
          accessToken: jwtAccessToken.jwt,
          refreshToken: jwtRefreshToken.jwt,
        });
      });
  };

  /**
   * Validates a session
   * @param  {String}  token       The unique token
   * @param  {Number}  deviceType  The device type
   * @param  {String}  deviceId    The device id
   * @param  {Boolean} getUserInfo True, if user doc is to be retrieved along with token
   * @return {Promise}             The Promise
   */
  adminSchema.statics.validateSession = function (accessToken, deviceType, deviceId, notificationKey) {
    let decryptedToken = decryptJwtToken(accessToken);
    if (decryptedToken.err) {
      if (decryptedToken.message && decryptedToken.message === 'jwt expired') {
        return Promise.reject({ errCode: 'ACCESS_TOKEN_EXPIRED' });
      } else {
        return Promise.reject({ errCode: 'SESSION_NOT_FOUND' });
      }
    }
    return this.findOne({
      'sessionInfo.accessToken': decryptedToken.token,
      'sessionInfo.deviceId': deviceId,
      'sessionInfo.deviceType': deviceType,
    })
      .exec()
      .then((userDoc) => {
        if (!userDoc) {
          return Promise.reject({ errCode: 'SESSION_NOT_FOUND' });
        }

        if (userDoc.accountStatus === app.config.user.accountStatus.admin.blocked) {
          return Promise.reject({
            errCode: 'ADMIN_HAS_BEEN_SUSPENDED',
          });
        }

        if (userDoc.accountStatus === app.config.user.accountStatus.admin.deleted) {
          return Promise.reject({
            errCode: 'ADMIN_HAS_BEEN_DELETED',
          });
        }
        if (notificationKey) {
          userDoc.sessionInfo.notificationKey = notificationKey;
        }
        return userDoc.save().then((savedUser) => {
          return Promise.resolve({
            userType: app.config.user.role.admin,
            userId: savedUser,
            deviceId: savedUser.sessionInfo.deviceId,
          });
        });
      });
  };
  adminSchema.statics.refreshSession = function (refreshToken, deviceType, deviceId, notificationKey) {
    let decryptedToken = decryptJwtToken(refreshToken);
    if (decryptedToken.err) {
      if (decryptedToken.message && decryptedToken.message === 'jwt expired') {
        return Promise.reject({ errCode: 'REFRESH_TOKEN_EXPIRED' });
      } else {
        return Promise.reject({ errCode: 'SESSION_NOT_FOUND' });
      }
    }
    return this.findOne({
      'sessionInfo.refreshToken': decryptedToken.token,
      'sessionInfo.deviceId': deviceId,
      'sessionInfo.deviceType': deviceType,
    })
      .exec()
      .then((userDoc) => {
        if (!userDoc) {
          return Promise.reject({ errCode: 'SESSION_NOT_FOUND' });
        }

        if (userDoc.accountStatus === app.config.user.accountStatus.admin.blocked) {
          return Promise.reject({
            errCode: 'ADMIN_HAS_BEEN_SUSPENDED',
          });
        }

        if (userDoc.accountStatus === app.config.user.accountStatus.admin.deleted) {
          return Promise.reject({
            errCode: 'ADMIN_HAS_BEEN_DELETED',
          });
        }
        if (notificationKey) {
          userDoc.sessionInfo.notificationKey = notificationKey;
        }
        let jwtAccessToken = jwtTokenGenerator('30d');
        let jwtRefreshToken = jwtTokenGenerator('300d');
        userDoc.sessionInfo.accessToken = jwtAccessToken.token;
        userDoc.sessionInfo.refreshToken = jwtRefreshToken.token;
        return userDoc.save().then((savedUser) => {
          return Promise.resolve({
            userType: app.config.user.role.admin,
            userId: savedUser,
            deviceId: savedUser.sessionInfo.deviceId,
            accessToken: jwtAccessToken.jwt,
            refreshToken: jwtRefreshToken.jwt,
          });
        });
      });
  };

  /**
   * Removes a session by its userId
   * @param  {String}  userId      The ObjectId of the user
   * @return {Promise}             The Promise
   */
  adminSchema.statics.removeSessionByUserId = function (userId) {
    return this.updateOne(
      {
        _id: userId,
      },
      {
        $unset: {
          sessionInfo: 1,
        },
      }
    ).exec();
  };

  adminSchema.statics.removeSessionByDeviceId = function (deviceId) {
    return this.updateOne(
      {
        'sessionInfo.deviceId': deviceId,
      },
      {
        $unset: {
          sessionInfo: 1,
        },
      }
    ).exec();
  };

  adminSchema.statics.removeSession = function (token, deviceType, deviceId) {
    return this.updateOne(
      {
        'sessionInfo.deviceId': deviceId,
        'sessionInfo.token': token,
        'sessionInfo.deviceType': deviceType,
      },
      {
        $unset: {
          sessionInfo: 1,
        },
      }
    ).exec();
  };

  return adminSchema;
};
