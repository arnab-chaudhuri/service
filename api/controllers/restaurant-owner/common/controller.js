'use strict';
/**
 * This Controller handles all functionality of admin common routes
 * @module Controllers/Admin/Common
 */
const removeS3Prefix = (url) => {
  if (!url) return url;

  // Virtual-hosted
  let cleaned = url.replace(
    /^https:\/\/[^.]+\.s3\.[^.]+\.amazonaws\.com\//,
    ""
  );

  // Path-style
  cleaned = cleaned.replace(
    /^https:\/\/s3\.[^.]+\.amazonaws\.com\/[^/]+\//,
    ""
  );

  return cleaned;
};
module.exports = (app) => {
  const story = app.module.story;

  const uploadImage = (req, res, next) => {
    req.workflow.outcome.data = removeS3Prefix(req.files.image.getPath);
    req.workflow.emit('response');
  };

  const uploadImages = (req, res, next) => {
    req.workflow.outcome.data = req.files.map(eachImage => removeS3Prefix(eachImage.getPath));
    req.workflow.emit('response');
  };

  const uploadAudio = (req, res, next) => {
    req.workflow.outcome.data = req.files.audio.getPath;
    req.workflow.emit('response');
  };

  const uploadVideo = (req, res, next) => {
    req.workflow.outcome.data = req.files.video.getPath;
    req.workflow.emit('response');
  };

  return { uploadImage, uploadAudio, uploadVideo, uploadImages };
};
