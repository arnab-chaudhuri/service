'use strict';


module.exports = function( /*app*/ ) {
  const config = {
    project: require('./scripts/project'),
    server: require('./scripts/server'),
    page: require('./scripts/page'),
    lang: require('./scripts/lang'),
    countryCode: require('./scripts/country-phone'),
    user: require('./scripts/user'),
    globalConfig: require('./scripts/global-config'),
    aws: require('./scripts/aws'),
    fileUpload: require('./scripts/fileUpload'),
    notification: require('./scripts/notification'),
    contentManagement: require('./scripts/content-management'),
    featureConfig: require('./scripts/feature-config'),
    adminRole: require('./scripts/admin-role')

  };

  return config;
};