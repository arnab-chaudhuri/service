'use strict';

module.exports = {
  s3: {
    // 'apiVersion': '2006-03-01',
    region: process.env.S3_REGION,
    bucket: process.env.NODE_ENV === 'production' ? 'immedine-bucket' : 'immedine-bucket',
    accessKeyId: process.env.S3_ACCESS_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    maxRetries: 5,
    timeout: 240000,
  },

  ses: {
    accessKeyId: process.env.SES_ACCESSKEYID,
    secretAccessKey: process.env.SES_SECRETACCESSKEY,
    region: process.env.SES_REGION,
    apiVersion: '2010-12-01',
  },
  sns: {
    accessKeyId: process.env.SNS_ACCESS_ID,
    secretAccessKey: process.env.SNS_SECRET_ACCESS_KEY,
    region: process.env.SNS_REGION,
    apiVersion: '2010-03-31',
  },
  // app.config.aws.sns
};
