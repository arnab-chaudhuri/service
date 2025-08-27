'use strict';

module.exports = function(app) {


  const bulkUploadCron = require('./scripts/bulkUploadCron');
  const bulkUploadFfromJsonCron = require('./scripts/bulkUploadFromJson');
  const updateNewStory = require('./scripts/updateNewStory');


  function executeCron() {
    // bulkUploadCron(app);
    // bulkUploadFfromJsonCron(app);
    // updateNewStory(app);
  }
  return executeCron;
};