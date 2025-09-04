'use strict';

/**
 * This module handles all functionality of Admin Menu
 * @module Modules/Menu
 */

function cleanAndTag(str) {
  // List of prepositions to remove (extend as needed)
  const stopWords = ["and", "or", "the", "of", "in", "on", "with", "a", "an"];

  // Extract only words with alphabets
  const words = str.match(/[A-Za-z]+/g) || [];

  // Filter out prepositions (case-insensitive)
  const filtered = words.filter(
    (w) => !stopWords.includes(w.toLowerCase())
  );

  return filtered.map((w) => w.toLowerCase());
}

module.exports = function (app) {
  const ImageByAI = app.models.ImageByAI;

  /**
   * Fetches a menu by Id
   * @param  {String} menuId  The menu id
   * @return {Promise}        The promise
   */
  const getImages = function (name) {
    return ImageByAI.find({
      $expr: {
        $gte: [
          { $size: { $setIntersection: ["$tags", cleanAndTag(name)] } },
          2 // <-- at least 2 matches required
        ]
      }
    }).select("url tags")
      .then(imgList => {
        return Promise.resolve(imgList);
      });
  };

  return {
    'list': getImages,
  };
};