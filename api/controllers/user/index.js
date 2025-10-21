'use strict';
const expressRouter = require('express').Router;

const controllers = {
  auth: require('./auth/route'),
  common: require('./common/route'),
  profile: require('./profile/route'),
  category: require('./category/route'),
  language: require('./language/route'),
  menu: require('./menu/route'),
  restaurant: require('./restaurant/route'),
  order: require('./order/route'),
  feedback: require('./feedback/route'),
  tableSession: require('./tableSession/route'),
};
module.exports = function(app) {
  const options = {
    upload: app.utility.upload,
    validateBody: app.utility.apiValidate.body,
    validateQuery: app.utility.apiValidate.query,
    validateParams: app.utility.apiValidate.params,
    validateFile: app.utility.apiValidate.file,
  };

  ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  //                                                                                                                               //
  // PUBLIC ROUTES                                                                                                                 //
  //                                                                                                                               //
  ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  const publicRouter = expressRouter();

  /**
   * Authentication API Gateway
   */
  publicRouter.use('/auth', controllers.auth(app, options));
  publicRouter.use('/category', controllers.category(app, options));
  publicRouter.use('/menu', controllers.menu(app, options));
  publicRouter.use('/restaurant', controllers.restaurant(app, options));
  publicRouter.use('/order', controllers.order(app, options));
  publicRouter.use('/feedback', controllers.feedback(app, options));
  publicRouter.use('/table-session', controllers.tableSession(app, options));

  ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  //                                                                                                                               //
  // PRIVATE ROUTES                                                                                                                //
  //                                                                                                                               //
  ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  const privateRouter = expressRouter();

  privateRouter.use('/common', controllers.common(app, options));
  privateRouter.use('/profile', controllers.profile(app, options));
  privateRouter.use('/language', controllers.language(app, options));
  privateRouter.use('/category', controllers.category(app, options));
  privateRouter.use('/menu', controllers.menu(app, options));
  privateRouter.use('/restaurant', controllers.restaurant(app, options));
  return {
    public: publicRouter,
    private: privateRouter,
  };
};