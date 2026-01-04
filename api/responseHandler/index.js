'use strict';

module.exports = function (app) {
  /**
   * The list of error codes
   * @type {Array}
   */
  const errorCodes = require('./scripts/errorCodes')(app);
  const commonController = require('../controllers/common/controller')(app);


  /**
   * Retrieves the numerical error code from the textual error code
   * @param  {String} code The textual error code
   * @return {Number}      The numerical error code
   */
  const getErrorCode = function (errCode) {
    let errorCode = errorCodes[errCode];
    if (!errorCode) {
      console.log(`${errCode} -> doesn't have error code`);
      if (app.get('env') !== 'production') {
        return errCode;
      }
    }
    return errorCode || 403;
  };

  /**
   * Handles success responses to the client
   * @param  {Object}   req  The request object
   * @param  {Object}   res  The response object
   * @param  {Function} next The next middleware
   */
  const successHandler = function (req, res /*, next*/) {
    if (req.workflow.outcome.data) {
      res.status(200).json({
        success: true,
        data: req.workflow.outcome.data,
      });
    } else {
      res.status(400).end();
    }
  };

  /**
   * Handles error responses to the client
   * @param  {Object}   err  The error object
   * @param  {Object}   req  The request object
   * @param  {Object}   res  The response object
   * @param  {Function} next The next middleware
   */
  // const errorHandler = function (err, req, res, next) {

  //   /**
  //    * Types of errors
  //    *
  //    * 1. API & DB validation errors (400)
  //    * 2. Business logic errors, DB errors (including, duplicate) (500)
  //    * 3. 3rd party API errors (424)
  //    * 4. Unhandled/other errors (500)
  //    */

  //   app.utility.fileHandler(req.files, true);

  //   if (typeof err === 'object' && err.hasOwnProperty('errCode') && typeof err.errCode === 'string') {
  //     let statusCode;
  //     let response = {
  //       'success': false,
  //       'errorCode': getErrorCode(err.errCode)
  //     };

  //     if (err.hasOwnProperty('errorDetails')) {
  //       response.errorDetails = err.errorDetails;
  //     }

  //     if (app.get('env') !== 'production') {
  //       if (!req.workflow) {
  //         return next(err);
  //       }

  //       if (req.workflow.outcome.errors.length) {
  //         response.errors = req.workflow.outcome.errors;
  //       }
  //       if ((Object.keys(req.workflow.outcome.errfor).length)) {
  //         response.errfor = req.workflow.outcome.errfor;
  //       }
  //       if (typeof response.errorCode === 'string') {
  //         response.error_code = [response.errorCode]; // jshint ignore:line
  //         response.errorCode = 403;
  //       }
  //     }
  //     if (response.errorCode && response.errorCode === 400 || response.errorCode === 404 || response.errorCode === 403) {
  //       statusCode = response.errorCode;
  //     }
  //     else {
  //       statusCode = 200;
  //     }

  //     return res.status((response.errorCode) ? statusCode : 500).json(response);
  //   } else {
  //     return next(err);
  //   }
  // };

  const errorHandler = async function (err, req, res, next) {
    console.log('in error handler', err);

    const errorMeta = {
      isTypeError: err instanceof TypeError,
      isReferenceError: err instanceof ReferenceError,
      isSyntaxError: err instanceof SyntaxError,
      isValidationError:
        err.name === 'ValidationError' ||
        err.name === 'CastError',
      isDuplicateError: err.code === 11000,
      isMongoError: !!err.name && err.name.toLowerCase().includes('mongo'),
      isThirdPartyError: err.isAxiosError || err.status === 424,
      isAuthError: [401, 403, 419].includes(err.status || err.errCode),
      isServerError: (err.status || 500) >= 500,
    };

    /* -----------------------------
     * 2. Build error payload
     * ----------------------------- */

    const errorPayload = {
      name: err.name,
      message: err.message,
      stack: err.stack,
      url: req.originalUrl,
      method: req.method,
      body: req.body,
      headers: req.headers,
      user: req.session?.user?._id,
      restaurantRef: req.session?.user?.restaurantRef,
      time: new Date().toISOString(),
    };

    /* -----------------------------
     * 3. Decide if email is required
     * ----------------------------- */

    const shouldTriggerMail =
      (
        errorMeta.isTypeError ||
        errorMeta.isReferenceError ||
        errorMeta.isSyntaxError ||
        errorMeta.isMongoError ||
        errorMeta.isThirdPartyError ||
        errorMeta.isServerError
      ) &&
      !errorMeta.isValidationError &&
      !errorMeta.isAuthError &&
      app.get('env') === 'production';

    /* -----------------------------
     * 4. Trigger mail (safe & async)
     * ----------------------------- */

    if (shouldTriggerMail) {
      try {
        req.body.errorPayload = JSON.stringify(errorPayload);
        req.body.noReturn = true;
        req.body.err = err;

        Promise.resolve(
          commonController.triggerEmail(req, res, next)
        ).catch(mailErr => {
          console.error('❌ Failed to send error mail', mailErr);
        });
      } catch (mailErr) {
        console.error('❌ Failed to send error mail', mailErr);
      }
    }
    /**
     * Types of errors
     *
     * 1. API & DB validation errors (400)
     * 2. Business logic errors, DB errors (including, duplicate) (500)
     * 3. 3rd party API errors (424)
     * 4. Unhandled/other errors (500)
     */

    app.utility.fileHandler(req.files, true);

    if (typeof err === 'object' && err.hasOwnProperty('errCode') && typeof err.errCode === 'string') {
      let response = {
        success: false,
        errorCode: getErrorCode(err.errCode),
      };
      if (err.hasOwnProperty('errorDetails')) {
        response.errorDetails = err.errorDetails;
      }

      if (app.get('env') !== 'production') {
        console.log(err);

        if (!req.workflow) {
          return next(err);
        }

        if (req.workflow.outcome.errors.length) {
          response.errors = req.workflow.outcome.errors;
        }
        if (Object.keys(req.workflow.outcome.errfor).length) {
          response.errfor = req.workflow.outcome.errfor;
        }
        if (typeof response.errorCode === 'string') {
          response.error_code = [response.errorCode]; // jshint ignore:line
          response.errorCode = 403;
        }
      }
      console.log("req ", req.headers)
      if (!response.errorCode) {
        console.log("trigger mail")
      }
      return res.status(response.errorCode ? req.headers["x-auth-devicetype"] === "3" ? 419 : 200 : 500).json(response);
    } else {
      return next(err);
    }
  };

  return [successHandler, errorHandler];
};
