'use strict';

//////////////////
// Dependencies //
//////////////////
require('dotenv').config();
const express = require('express');
const helmet = require('helmet');

/////////////////////////////////
// Promise Configuration Setup //
/////////////////////////////////
global.Promise = require('bluebird');

if (process.env.NODE_ENV === 'production') {
  Promise.config({
    warnings: false,
    longStackTraces: false,
    cancellation: false,
    monitoring: false,
  });
} else {
  Promise.config({
    warnings: false,
    longStackTraces: true,
    cancellation: true,
    monitoring: true,
  });
}

//////////////////////////////
// Creating the express app //
//////////////////////////////
const app = express();

//////////////////////////
// Attach Helmet to app //
//////////////////////////
app.use(helmet());

///////////////////////////////////////
// Attaching the reference to config //
///////////////////////////////////////
app.config = require('./config')(app);

//////////////////////
// Express settings //
//////////////////////
app.disable('x-powered-by');
app.set('port', app.config.server.port);
app.set('views', `${__dirname}/views`);
app.set('view engine', 'pug');

///////////////////////////
// Express global locals //
///////////////////////////
app.locals.projectName = app.config.project.name;
app.locals.copyrightYear = app.config.project.copyrightYear;
app.locals.companyName = app.config.project.companyName;
app.locals.path = __dirname;

//////////////////////////////////////
// Attaching method-override module //
//////////////////////////////////////
app.use(require('method-override')());
/////////////////////////////////////////////////////
// Attaching the body-parser module for urlencoded //
/////////////////////////////////////////////////////
app.use(
  express.urlencoded({
    limit: '50mb',
    extended: true,
    parameterLimit: 50000,
  })
);

// app.use(
//   express.json({
//     limit: '50mb',
//   })
// );

///////////////////////////
// Attaching CORS module //
///////////////////////////
app.use(
  require('cors')({
    origin: '*',
    methods: ['PUT', 'GET', 'POST', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: [
      'accept',
      'content-type',
      'x-auth-deviceid',
      'x-auth-devicetype',
      'x-auth-token',
      'x-auth-latitude',
      'x-auth-longitude',
      'x-auth-notificationkey',
      'authorization',
    ],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  })
);

/////////////////////////////
// Attaching the utilities //
/////////////////////////////
app.utility = require('./utilities')(app);

/////////////////////////////////////////////////////////////
// Attaching the workflow module & default-language module //
/////////////////////////////////////////////////////////////
app.use(app.utility.attachWorkflow);

//////////////////////////////
// Set the Default Language //
//////////////////////////////
app.locals.defaultLanguage = 'en-us';

////////////////////////////////////////////////
// Connect the DB and Initialize the models ////
////////////////////////////////////////////////
const db = require('./db')(app);

//////////////////////
// attaching models //
//////////////////////

app.models = db.models;

app.db = db;

////////////////////////////
// Attaching the services //
////////////////////////////
app.service = require('./services')(app);

///////////////////////////
// Attaching the modules //
///////////////////////////
app.module = require('./api/modules')(app);

app.use('', express.static(`${__dirname}/public`));

if (process.env.MORGAN_LOG === 'true') {
  app.use(require('morgan')('dev'));
}

app.use('/api/v1', [
  //////////////////////////
  // Attaching the routes //
  //////////////////////////
  require('./api/controllers/')(app),

  ////////////////////////////////////
  // Attaching the response handler //
  ////////////////////////////////////
  require('./api/responseHandler/')(app),

  // The error handler must be before any other error middleware and after all controllers
  // process.env.SENTRY_DSN ? app.use(Sentry.Handlers.errorHandler()) : null,

  /////////////////////////////////////////
  // Attaching the default error handler //
  /////////////////////////////////////////
  app.utility.errorHandler,
]);

///////////////////////////////
// Default 404 error handler //
///////////////////////////////
app.use(function(req, res) {
  res.status(400).end();
});

//////////////////////////////////////
// Execute the init module (if any) //
//////////////////////////////////////
if (Object.prototype.hasOwnProperty.call(app.module, 'init')) {
  app.module.init(app, (error) => {
    if (error) {
      console.log(`Server can't be started.`);
      console.log(error);
      process.exit();
    } else {
      ///////////////////////
      // Listening on port //
      ///////////////////////
      app.server = app.listen(app.config.server.port, () =>
        console.log(`Server listening on : ${app.config.server.port}`)
      );
    }
  });
} else {
  console.log(`Server can't be started. As this project requires init module`);
  process.exit();
}
module.exports = app;