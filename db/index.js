'use strict';

module.exports = function(app) {
  const mongoose = require('mongoose');

  /////////////////////////
  // Requiring db config //
  /////////////////////////
  const config = require('./config');

  ////////////////////////////////////////////////////
  // Setting Promise library to be used by Mongoose //
  ////////////////////////////////////////////////////
  mongoose.Promise = global.Promise;

  ///////////////////////////
  // Requiring the plugins //
  ///////////////////////////
  const plugins = {
    pagedFind: require('./plugins/pagedFind')(app),
  };

  //////////////////////////////////
  // Attaching the global plugins //
  //////////////////////////////////
  mongoose.plugin(plugins.pagedFind);

  /////////////////////////////////////////////////
  // Connecting to MongoDB and storing reference //
  /////////////////////////////////////////////////
  const db = mongoose.createConnection(
    process.env.DB_ENV === 'production' ? config.uri.production : config.uri.development, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  );

  ////////////////////////////////////////
  // Attaching db config to db instance //
  ////////////////////////////////////////
  db.config = config;

  ////////////////////////////////////////////////////
  // Initializing and attaching the Mongoose Models //
  ////////////////////////////////////////////////////
  db.models = {
    GlobalConfig: db.model('GlobalConfig', require('./models/globalConfig')(app, mongoose, plugins)),
    Notification: db.model('Notification', require('./models/notification')(app, mongoose, plugins)),
    Admin: db.model('Admin', require('./models/admin')(app, mongoose, plugins)),
    RestaurantOwner: db.model('RestaurantOwner', require('./models/restaurantOwner')(app, mongoose, plugins)),
    Restaurant: db.model('Restaurant', require('./models/restaurant')(app, mongoose, plugins)),
    User: db.model('User', require('./models/user')(app, mongoose, plugins)),
    Language: db.model('Language', require('./models/language')(app, mongoose, plugins)),
    Category: db.model('Category', require('./models/category')(app, mongoose, plugins)),
    FAQ: db.model('FAQ', require('./models/faq')(app, mongoose, plugins)),
    Role: db.model('Role', require('./models/role')(app, mongoose, plugins)),
    Menu: db.model('Menu', require('./models/menu')(app, mongoose, plugins)),
    ImageByAI: db.model('ImageByAI', require('./models/imageByAI')(app, mongoose, plugins)),
    Order: db.model('Order', require('./models/order')(app, mongoose, plugins)),
  };

  return db;
};