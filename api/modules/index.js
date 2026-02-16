'use strict';

module.exports = function(app) {
  const init = require('./init');
  const globalConfig = require('./globalConfig')(app);
  const session = require('./session')(app);
  const admin = require('./admin')(app);
  const restaurantOwner = require('./restaurantOwner')(app);
  const user = require('./user')(app);
  const notification = require('./notification')(app);
  const adminUser = require('./adminUser')(app);
  const role = require('./role')(app);
  const language = require('./language')(app);
  const category = require('./category')(app);
  const restaurant = require('./restaurant')(app);
  const faq = require('./faq')(app);
  const menu = require('./menu')(app);
  const order = require('./order')(app);
  const subscriptionPlan = require('./subscriptionPlan')(app);
  const bill = require('./bill')(app);
  const inventory = require('./inventory')(app);
  const table = require('./table')(app);
  const sse = require('./sse')(app);
  const feedback = require('./feedback')(app);
  const vendor = require('./vendor')(app);
  const query = require('./query')(app);
  const expense = require('./expense')(app);
  const tableSession = require('./tableSession')(app);
  const imageByAI = require('./imageByAI')(app);
  const cron = require('./cron')(app)();

  return {
    init,
    query,
    globalConfig,
    session,
    vendor,
    admin,
    restaurantOwner,
    restaurant,
    user,
    notification,
    adminUser,
    role,
    expense,
    language,
    category,
    faq,
    cron,
    inventory,
    table,
    imageByAI,
    menu,
    order,
    bill,
    tableSession,
    sse,
    feedback,
    subscriptionPlan
  };
};