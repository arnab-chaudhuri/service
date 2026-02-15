'use strict';

/**
 * This module handles all functionality of Admin Category
 * @module Modules/Category
 */
module.exports = function (app) {


  /**
   * category Model
   * @type {Mongoose.Model}
   */
  const Category = app.models.Category;

  /**
   * Creates a Category
   * @param  {Object} config  The config object
   * @return {Promise}        The promise
   */
  const createCategory = function (config, userRef) {
    config.restaurantRef = userRef.restaurantRef;
    config.createdBy = userRef._id;
    return Category.createCategory(config);
  };

  /**
   * Fetches a category by Id
   * @param  {String} categoryId  The category id
   * @return {Promise}        The promise
   */
  const findCategoryById = function (categoryId, userRef) {
    return Category.findById(categoryId)
    .then(categoryDetails => {
      if(!categoryDetails || (categoryDetails && 
        categoryDetails.restaurantRef.toString() !== userRef.restaurantRef.toString())) {
        return Promise.reject({
          'errCode': 'CATEGORY_NOT_FOUND'
        });
      } else {
        return Promise.resolve(categoryDetails);
      }
    });
  };

  /**
   * Edits a category
   * @param  {Object} editedCategory The edited category document
   * @return {Promise}           The promise
   */
  const editCategory = function (editedCategory, userRef) {

    if (editedCategory.restaurantRef.toString() !== userRef.restaurantRef.toString()) {
      return Promise.reject({
        'errCode': 'CATEGORY_NOT_FOUND'
      });
    }

    return Category.countDocuments({
      name: new RegExp(`^${editedCategory.name}$`, 'i'),
      status: app.config.contentManagement.category.active,
      restaurantRef: editedCategory.restaurantRef,
      _id: {
        $ne: editedCategory._id
      }
    })
      .then(count => count ? Promise.reject({
      'errCode': 'CATEGORY_ALREADY_EXISTS'
      }) : editedCategory.save());
  };

  /**
   * Fetches a list of categories
   * @param  {Object} options  The options object
   * @return {Promise}        The promise
   */
  const getList = function (options) {
    return Category.pagedFind(options);
  };

  /**
   * Removes a category
   * @param  {Object} category The category document
   * @return {Promise}     The promise
   */
  const removeCategory = function (category, userRef) {
    if (category.restaurantRef.toString() !== userRef.restaurantRef.toString()) {
      return Promise.reject({
        'errCode': 'CATEGORY_NOT_FOUND'
      });
    }
    return Category.removeCategory(category._id);
  };

  const updateMenuCount = (categoryId, value) => {
    return Category.findOne({
      _id: categoryId
    })
    .then(category =>{
      if (category) {
        category.totalMenu = value === 1 ? category.totalMenu + 1 : category.totalMenu - 1;
        return category.save(); 
      } else {
        return Promise.resolve(null);
      }
    });
  };

  return {
    'create': createCategory,
    'get': findCategoryById,
    'edit': editCategory,
    'list': getList,
    'remove': removeCategory,
    'updateMenuCount': updateMenuCount
  };
};