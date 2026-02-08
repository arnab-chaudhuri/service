'use strict';
const Puid = require('puid');
const jwt = require('jsonwebtoken');
module.exports = function (app, mongoose) {
  const schema = new mongoose.Schema(
    {
      personalInfo: {
        fullName: { type: String },
        profilePicture: { type: String, default: '' },
        phone: {
          countryCode: { type: String },
          number: { type: String },
        },
        email: { type: String, required: false },
        nationality: {
          type: String,
        },
        dob: {
          type: Date,
        },
        anniversary: {
          type: Date,
        },
        gender: {
          type: Number,
          enum: Object.keys(app.config.user.gender).map((each) => app.config.user.gender[each]),
        },
      },
      isNotificationEnabled: {
        type: Boolean,
        default: true,
      },
      socialInfo: [
        {
          socialId: String,
          socialType: String, // e.g., 'google', 'facebook'
        },
      ],
      authenticationInfo: {
        otp: { code: String, timeout: Date },
        password: String,
      },
      loginType: String,
      accountStatus: {
        type: Number,
        required: true,
        default: app.config.user.accountStatus.user.pending,
      },
      userType: {
        type: Number,
        default: app.config.user.role.user,
      },
      preferredLanguage: {
        type: String,
        default: 'en',
      },
      sessionInfo: [{
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
      }],
    },
    {
      autoIndex: true,
      versionKey: false,
      timestamps: true,
    }
  );
  schema.index(
    {
      "personalInfo.phone.countryCode": 1,
      "personalInfo.phone.number": 1,
    },
    { unique: true, sparse: true }
  );

  schema.statics.signup = function (signupData) {
    let newUser = new this({
      personalInfo: signupData.personalInfo,
    });

    return this.findOne({
      'personalInfo.email': signupData.personalInfo.email,
    })
      .exec()
      .then((userDoc) => {
        if (!userDoc) {
          return Promise.resolve(userDoc);
        } else {
          if (userDoc.accountStatus === app.config.user.accountStatus.user.blocked) {
            return Promise.reject({ errCode: 'USER_BLOCKED' });
          } else if (userDoc.accountStatus === app.config.user.accountStatus.user.deleted) {
            return Promise.reject({ errCode: 'USER_DELETED' });
          } else if (userDoc.accountStatus === app.config.user.accountStatus.user.active) {
            return Promise.reject({ errCode: 'USER_ALREADY_EXISTS' });
          } else {
            return Promise.resolve(userDoc);
          }
        }
      })
      .then((userDoc) => {
        return app.utility.encryptPassword(signupData.password).then((encryptedPassword) => {
          return Promise.resolve({
            userDoc: userDoc,
            password: encryptedPassword,
          });
        });
      })
      .then(({ userDoc, password }) => {
        if (userDoc) {
          newUser = userDoc;
        }
        newUser.authenticationInfo.otp = {
          code: app.utility.generateOTP(5),
          timeout: new Date(new Date().getTime() + 60 * 60 * 1000),
        };
        newUser.authenticationInfo.password = password;

        return newUser.save().then((user) => {
          if (process.env.ENABLE_EMAIL_COMMUNICATIONS.trim().toUpperCase() === 'TRUE') {
            sendEmailOtp({
              otp: newUser.authenticationInfo.otp.code,
              emailId: user.personalInfo.email,
              userType: app.config.user.role.user,
              userId: user._id,
              firstName: user.personalInfo.firstName,
              emailName: 'userSignupOTP',
            });
          }

          return Promise.resolve({
            code: newUser.authenticationInfo.otp.code,
            timeout: new Date(new Date().getTime() + 60 * 60 * 1000),
          });
        });
      })
      .then((userDoc) => {
        return Promise.resolve({ userDoc });
      });
  };

  schema.statics.signupVerify = function ({ email, otp }) {
    return this.findOne({ 'personalInfo.email': email })
      .exec()
      .then((userDoc) => {
        if (!userDoc) {
          return Promise.reject({ errCode: 'USER_NOT_FOUND' });
        }
        if (userDoc.accountStatus === app.config.user.accountStatus.user.blocked) {
          return Promise.reject({ errCode: 'USER_BLOCKED' });
        }
        // verify email otp
        return this.verifyEmailOtp(email, otp);
      })
      .then((verifiedUserData) => {
        return this.findOneAndUpdate(
          { 'personalInfo.email': email },
          {
            $set: { accountStatus: app.config.user.accountStatus.user.active },
            $unset: {
              'authenticationInfo.otp': 1,
            },
          }
        )
          .exec()
          .then(() => {
            verifiedUserData.loginType === 'custom';
            return verifiedUserData.save().then((userDoc) => {
              return Promise.resolve({ userDoc: userDoc });
            });
          });
      });
  };

  schema.statics.verifyEmailOtp = function (email, otp) {
    return this.findOne({
      'personalInfo.email': email,
      accountStatus: {
        $ne: app.config.user.accountStatus.user.deleted,
      },
    })
      .exec()
      .then((userDoc) =>
        userDoc
          ? Promise.resolve(userDoc)
          : Promise.reject({
            errCode: 'USER_NOT_FOUND',
          })
      )
      .then((userDoc) =>
        userDoc.accountStatus !== app.config.user.accountStatus.user.blocked
          ? Promise.resolve(userDoc)
          : Promise.reject({
            errCode: 'USER_HAS_BEEN_SUSPENDED',
          })
      )
      .then((userDoc) => {
        let savedOTP = {
          code: userDoc.authenticationInfo.otp.code,
          timeout: userDoc.authenticationInfo.otp.timeout,
        };

        if (savedOTP.timeout && new Date() < savedOTP.timeout) {
          if (savedOTP.code === otp) {
            //////////////////////////
            // Unset the otp object //
            //////////////////////////
            userDoc
              .updateOne({
                $unset: {
                  'authenticationInfo.otp': 1,
                },
              })
              .exec();
            return Promise.resolve(userDoc);
          } else {
            return Promise.reject({
              errCode: 'OTP_INVALID',
            });
          }
        } else {
          //////////////////////////
          // Unset the otp object //
          //////////////////////////
          userDoc
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
      .then((userDoc) => Promise.resolve(userDoc));
  };

  /**
   * Creates a new OTP for forgot password
   * @param  {String}  email The email
   * @return {Promise}       The promise
   */
  schema.statics.resendEmailOtp = function (email) {
    return this.findOne({
      'personalInfo.email': email,
      accountStatus: {
        $ne: app.config.user.accountStatus.user.deleted,
      },
    })
      .exec()
      .then((userDoc) =>
        userDoc
          ? Promise.resolve(userDoc)
          : Promise.reject({
            errCode: 'USER_NOT_FOUND',
          })
      )
      .then((userDoc) =>
        userDoc.accountStatus !== app.config.user.accountStatus.user.blocked
          ? Promise.resolve(userDoc)
          : Promise.reject({
            errCode: 'USER_HAS_BEEN_SUSPENDED',
          })
      )
      .then((userDoc) => {
        userDoc.authenticationInfo.otp = {
          code: app.utility.generateOTP(5),
          timeout: new Date(new Date().getTime() + 60 * 60 * 1000),
        };

        return userDoc.save().then((userDoc) => {
          if (process.env.ENABLE_EMAIL_COMMUNICATIONS.trim().toUpperCase() === 'TRUE') {
            sendEmailOtp({
              otp: userDoc.authenticationInfo.otp.code,
              emailId: userDoc.personalInfo.email,
              userType: app.config.user.role.user,
              userId: userDoc._id,
              firstName: userDoc.personalInfo.firstName,
              emailName: 'userSignupOTP',
            });
          }
          return Promise.resolve(userDoc.authenticationInfo.otp);
        });
      });
  };

  schema.statics.loginValidate = function (email, password) {
    return this.findOne({
      'personalInfo.email': email,
    })
      .exec()
      .then((userDoc) =>
        userDoc
          ? Promise.resolve(userDoc)
          : Promise.reject({
            errCode: 'USER_NOT_FOUND',
          })
      )
      .then((userDoc) =>
        userDoc.accountStatus === app.config.user.accountStatus.user.deleted
          ? Promise.reject({
            errCode: 'USER_DELETED',
          })
          : Promise.resolve(userDoc)
      )
      .then((userDoc) =>
        userDoc.authenticationInfo.password && userDoc.authenticationInfo.password.length > 0
          ? Promise.resolve(userDoc)
          : userDoc.socialInfo && userDoc.socialInfo.length > 0
            ? Promise.reject({
              errCode: 'USER_IS_SOCIAL_REGISTERED',
            })
            : Promise.reject({ errCode: 'USER_NOT_FOUND' })
      )
      .then((userDoc) =>
        app.utility.validatePassword(password, userDoc.authenticationInfo.password).then((result) =>
          result
            ? Promise.resolve(userDoc)
            : Promise.reject({
              errCode: 'PASSWORD_MISMATCH',
            })
        )
      )
      .then((userDoc) =>
        userDoc.accountStatus === app.config.user.accountStatus.user.blocked
          ? Promise.reject({
            errCode: 'USER_BLOCKED',
          })
          : Promise.resolve(userDoc)
      )
      .then((userDoc) => {
        userDoc.loginType = 'custom';
        return userDoc.save().then((userDoc) => {
          return Promise.resolve({
            userDoc: userDoc,
            userType: app.config.user.role.user,
          });
        });
      });
  };

  schema.statics.socialLoginValidate = async function (socialId, socialType, firstName, lastName, email) {
    let userDoc = await this.findOne({ 'personalInfo.email': email }).exec();

    if (userDoc) {
      if (userDoc.accountStatus === app.config.user.accountStatus.user.deleted) {
        return Promise.reject({ errCode: 'USER_DELETED' });
      }
      if (userDoc.accountStatus === app.config.user.accountStatus.user.blocked) {
        return Promise.reject({ errCode: 'USER_BLOCKED' });
      }

      const exists = userDoc.socialInfo.some(
        (s) => s.socialId === socialId && s.socialType === socialType
      );
      const socialExists = userDoc.socialInfo.filter(
        (s) => s.socialType === socialType
      )[0];

      if (socialExists && socialExists.socialId && socialExists.socialId !== socialId) {
        return Promise.reject({ errCode: 'USER_ALREADY_REGISTERED_DIFFERENT_SOCIAL_ACCOUNT' });
      }

      if (!exists) {
        userDoc.socialInfo.push({ socialId, socialType });
      }

      userDoc.loginType = app.config.user.loginType[socialType];
      userDoc.accountStatus = app.config.user.accountStatus.user.active;

    } else {
      // create new user
      userDoc = new this({
        personalInfo: {
          firstName,
          lastName,
          email,
        },
        socialInfo: [{ socialId, socialType }],
        loginType: app.config.user.loginType[socialType],
        accountStatus: app.config.user.accountStatus.user.active,
      });
    }

    await userDoc.save();
    return {
      userDoc,
      userType: app.config.user.role.user,
    };
  };


  schema.statics.forgotPasswordCreateOTP = function (email) {
    return this.findOne({
      'personalInfo.email': email,
      accountStatus: {
        $ne: app.config.user.accountStatus.user.deleted,
      },
    })
      .exec()
      .then((userDoc) =>
        userDoc
          ? Promise.resolve(userDoc)
          : Promise.reject({
            errCode: 'USER_NOT_FOUND',
          })
      )
      .then((userDoc) =>
        userDoc.accountStatus !== app.config.user.accountStatus.user.blocked
          ? Promise.resolve(userDoc)
          : Promise.reject({
            errCode: 'USER_HAS_BEEN_SUSPENDED',
          })
      )
      .then((userDoc) => {
        userDoc.authenticationInfo.otp = {
          code: app.utility.generateOTP(5),
          timeout: new Date(new Date().getTime() + 60 * 60 * 1000),
        };

        return userDoc.save().then((userDoc) => {
          // if (process.env.ENABLE_EMAIL_COMMUNICATIONS.trim().toUpperCase() === 'TRUE') {
          sendEmailOtp({
            otp: userDoc.authenticationInfo.otp.code,
            emailId: userDoc.personalInfo.email,
            userType: app.config.user.role.user,
            userId: userDoc._id,
            firstName: userDoc.personalInfo.firstName,
            emailName: 'forgotPassword',
          });
          // }

          return Promise.resolve(userDoc.authenticationInfo.otp);
        });
      });
  };

  schema.statics.forgotPasswordVerifyOTP = function (email, otp, password) {
    return this.isPermittedToCallAPIByEmail(email)
      .then((userDoc) => {
        let savedOTP = {
          code: userDoc.authenticationInfo.otp.code,
          timeout: userDoc.authenticationInfo.otp.timeout,
        };

        if (savedOTP.timeout && new Date() < savedOTP.timeout) {
          if (savedOTP.code === otp) {
            //////////////////////////
            // Unset the otp object //
            //////////////////////////
            userDoc
              .updateOne({
                $unset: {
                  'authenticationInfo.otp': 1,
                },
              })
              .exec();
            return Promise.resolve(userDoc);
          } else {
            return Promise.reject({
              errCode: 'OTP_INVALID',
            });
          }
        } else {
          //////////////////////////
          // Unset the otp object //
          //////////////////////////
          userDoc
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
      .then((userDoc) =>
        app.utility.encryptPassword(password).then((hash) => {
          userDoc.authenticationInfo.password = hash;
          return userDoc.save();
        })
      );
  };

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
      return { err: false, token: decoded };
    } catch (err) {
      return { err: true, msg: err.message };
    }
  };

  schema.statics.decryptJwtToken = function (token) {
    return decryptJwtToken(token);
  };

  /**
   * Creates a new session
   * @param  {Number}   deviceType            The device type
   * @param  {String}   deviceId              The device id
   * @param  {Object}   userDoc               The user document
   * @return {Promise}                        The Promise
   */
  schema.statics.createSession = function (deviceType, deviceId, userDoc, notificationKey) {
    const tokenData = {
      id: userDoc._id,
      role: app.config.user.role.user,
      email: userDoc.personalInfo.email,
    };

    let jwtAccessToken = jwtTokenGenerator('30d', tokenData);
    let jwtRefreshToken = jwtTokenGenerator('300d', tokenData);

    let sessionInfo = {
      deviceType: deviceType,
      accessToken: jwtAccessToken.jwt,
      refreshToken: jwtRefreshToken.jwt,
      deviceId: deviceId,
    };

    if (notificationKey) {
      sessionInfo.notificationKey = notificationKey;
    }

    if (userDoc.sessionInfo && userDoc.sessionInfo.length) {
      userDoc.sessionInfo.push(sessionInfo);
    } else {
      userDoc.sessionInfo = [sessionInfo];
    }

    return this.removeSessionByDeviceId(deviceId)
      .then(() => (userDoc.save()))
      .then((savedUser) => {
        return Promise.resolve({
          userId: savedUser,
          userType: app.config.user.role.user,
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
  schema.statics.validateSession = function (accessToken, deviceType, deviceId, notificationKey) {
    let decryptedToken = decryptJwtToken(accessToken);
    if (decryptedToken.err) {
      if (decryptedToken.message && decryptedToken.message === 'jwt expired') {
        return Promise.reject({ errCode: 'ACCESS_TOKEN_EXPIRED' });
      } else {
        return Promise.reject({ errCode: 'SESSION_NOT_FOUND' });
      }
    }
    return this.findOne({
      'sessionInfo': {
        '$elemMatch': {
          'accessToken': decryptedToken.token,
          'deviceId': deviceId,
          'deviceType': deviceType,
          // 'destroyTime': {
          //   '$gt': new Date()
          // }
        }
      }
    })
      .exec()
      .then((userDoc) => {
        if (!userDoc) {
          return Promise.reject({ errCode: 'SESSION_NOT_FOUND' });
        }
        if (userDoc.accountStatus === app.config.user.accountStatus.user.blocked) {
          return Promise.reject({
            errCode: 'USER_HAS_BEEN_SUSPENDED',
          });
        }

        if (userDoc.accountStatus === app.config.user.accountStatus.user.deleted) {
          return Promise.reject({
            errCode: 'USER_HAS_BEEN_DELETED',
          });
        }
        let sessionIndex = userDoc.sessionInfo.findIndex(eachSession => {
          return (eachSession.deviceId.toString() === deviceId.toString() && eachSession.deviceType.toString() === deviceType.toString());
        });
        if (notificationKey) {
          userDoc.sessionInfo[sessionIndex].notificationKey = notificationKey;
        }
        return userDoc.save().then((savedUser) => {
          return Promise.resolve({
            userType: app.config.user.role.user,
            userId: savedUser,
            deviceId: savedUser.sessionInfo[sessionIndex].deviceId,
          });
        });
      });
  };
  schema.statics.refreshSession = function (refreshToken, deviceType, deviceId, notificationKey) {
    let decryptedToken = decryptJwtToken(refreshToken);
    if (decryptedToken.err) {
      if (decryptedToken.message && decryptedToken.message === 'jwt expired') {
        return Promise.reject({ errCode: 'REFRESH_TOKEN_EXPIRED' });
      } else {
        return Promise.reject({ errCode: 'SESSION_NOT_FOUND' });
      }
    }
    return this.findOne({
      'sessionInfo': {
        '$elemMatch': {
          'refreshToken': decryptedToken.token,
          'deviceId': deviceId,
          'deviceType': deviceType,
          // 'destroyTime': {
          //   '$gt': new Date()
          // }
        }
      }
    })
      .exec()
      .then((userDoc) => {
        if (!userDoc) {
          return Promise.reject({ errCode: 'SESSION_NOT_FOUND' });
        }

        if (userDoc.accountStatus === app.config.user.accountStatus.user.blocked) {
          return Promise.reject({
            errCode: 'USER_HAS_BEEN_SUSPENDED',
          });
        }

        if (userDoc.accountStatus === app.config.user.accountStatus.user.deleted) {
          return Promise.reject({
            errCode: 'USER_HAS_BEEN_DELETED',
          });
        }
        let sessionIndex = userDoc.sessionInfo.findIndex(eachSession => {
          return (eachSession.deviceId.toString() === deviceId.toString() && eachSession.deviceType.toString() === deviceType.toString());
        });
        if (notificationKey) {
          userDoc.sessionInfo[sessionIndex].notificationKey = notificationKey;
        }
        let jwtAccessToken = jwtTokenGenerator('30d');
        let jwtRefreshToken = jwtTokenGenerator('300d');
        userDoc.sessionInfo[sessionIndex].accessToken = jwtAccessToken.token;
        userDoc.sessionInfo[sessionIndex].refreshToken = jwtRefreshToken.token;
        return userDoc.save().then((savedUser) => {
          return Promise.resolve({
            userType: app.config.user.role.user,
            userId: savedUser,
            deviceId: savedUser.sessionInfo[sessionIndex].deviceId,
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
  schema.statics.removeSessionByUserId = function (userId) {
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

  schema.statics.removeSessionByDeviceId = function (deviceId) {
    return this.updateOne(
      {
        'sessionInfo.deviceId': deviceId,
      },
      {
        $unset: {
          sessionInfo: {
            deviceId: deviceId
          },
        },
      }
    ).exec();
  };

  schema.statics.removeSession = function (token, deviceType, deviceId) {
    return this.updateOne({
      'sessionInfo': {
        $elemMatch: {
          'deviceId': deviceId,
          'accessToken': token,
          'deviceType': deviceType,
        }
      }
    }, {
      $pull: {
        sessionInfo: {
          'deviceId': deviceId,
          'accessToken': token,
          'deviceType': deviceType
        }
      }
    })
      .exec();
  };

  const sendEmailOtp = ({ otp, userId, userType, emailId, firstName, emailName }) => {
    console.log("here in sendEmailOtp ", emailId);
    let emailNotification = app.config.notification.email(app, app.config.lang.defaultLanguage),
      multilangConfig = app.config.lang[app.config.lang.defaultLanguage];
    // create email template
    app.render(
      emailNotification[emailName].pageName,
      {
        greeting: multilangConfig.email[emailName].greeting,
        firstName,
        message: multilangConfig.email[emailName].message,
        otpText: multilangConfig.email[emailName].otpText,
        otp,
      },
      function (err, renderedText) {
        if (err) {
          console.log(err);
        } else {
          // send email
          app.service.notification.email.immediate({
            userId,
            userType,
            emailId,
            subject: emailNotification[emailName].subject,
            body: renderedText,
          });
        }
      }
    );
  };

  schema.statics.getProfile = function (token) {
    const decodedData = decryptJwtToken(token);
    const id = decodedData.token.data.id;
    return this.isPermittedToCallAPIById(id).then((userDoc) => {
      return Promise.resolve(userDoc);
    });
  };

  schema.statics.isPermittedToCallAPIById = function (id) {
    return this.findOne({
      _id: id,
      accountStatus: {
        $ne: app.config.user.accountStatus.user.deleted,
      },
    })
      .exec()
      .then((userDoc) =>
        userDoc
          ? Promise.resolve(userDoc)
          : Promise.reject({
            errCode: 'USER_NOT_FOUND',
          })
      )
      .then((userDoc) =>
        userDoc.accountStatus !== app.config.user.accountStatus.user.blocked
          ? Promise.resolve(userDoc)
          : Promise.reject({
            errCode: 'USER_HAS_BEEN_SUSPENDED',
          })
      )
      .then((userDoc) =>
        userDoc.accountStatus !== app.config.user.accountStatus.user.pending
          ? Promise.resolve(userDoc)
          : Promise.reject({
            errCode: 'USER_IS_NOT_ONBOARD',
          })
      );
  };

  schema.statics.isPermittedToCallAPIByEmail = function (email) {
    return this.findOne({
      'personalInfo.email': email,
      accountStatus: {
        $ne: app.config.user.accountStatus.user.deleted,
      },
    })
      .exec()
      .then((userDoc) =>
        userDoc
          ? Promise.resolve(userDoc)
          : Promise.reject({
            errCode: 'USER_NOT_FOUND',
          })
      )
      .then((userDoc) =>
        userDoc.accountStatus !== app.config.user.accountStatus.user.blocked
          ? Promise.resolve(userDoc)
          : Promise.reject({
            errCode: 'USER_HAS_BEEN_SUSPENDED',
          })
      )
      .then((userDoc) =>
        userDoc.accountStatus !== app.config.user.accountStatus.user.pending
          ? Promise.resolve(userDoc)
          : Promise.reject({
            errCode: 'USER_IS_NOT_ONBOARD',
          })
      );
  };

  return schema;
};
