'use strict';

module.exports = function(app) {


  const bulkUploadCron = require('./scripts/bulkUploadCron');
  const bulkUploadFfromJsonCron = require('./scripts/bulkUploadFromJson');
  const fetchS3URLCron = require('./scripts/fetchS3URLCron');
  const cleanImage = require('./scripts/cleanImage');


  function executeCron() {
    // bulkUploadCron(app);
    // bulkUploadFfromJsonCron(app);
    // fetchS3URLCron(app);
    // cleanImage(app);
  }
  return executeCron;
};