'use strict';
/**
 * This Controller handles all functionality of admin menu
 * @module Controllers/Admin/menu
 */
module.exports = function(app) {

  /**
   * menu module
   * @type {Object}
   */
  const menu = app.module.menu;
  const category = app.module.category;
  const imageByAI = app.module.imageByAI;
  const order = app.module.order;

  /**
   * Adds a menu
   * @param  {Object}   req  Request 
   * @param  {Object}   res  Response
   * @param  {Function} next Next is used to pass control to the next middleware function
   * @return {Promise}       The Promise
   */
  const addMenu = (req, res, next) => {
    menu.create(req.body, req.session.user)
      .then(output => {
        category.updateMenuCount(req.body.categoryRef, 1);
        req.workflow.outcome.data = output;
        req.workflow.emit('response');
      })
      .catch(next);
  };

  /**
   * Fetches a menu
   * @param  {Object}   req  Request 
   * @param  {Object}   res  Response
   * @param  {Function} next Next is used to pass control to the next middleware function
   * @return {Promise}       The Promise
   */
  const getMenu = (req, res, next) => {
    menu.get(req.params.menuId,req.session.user)
      .then(output => {
        req.workflow.outcome.data = output;
        req.workflow.emit('response');
      })
      .catch(next);
  };

  /**
   * Fetches a list of menus
   * @param  {Object}   req  Request 
   * @param  {Object}   res  Response
   * @param  {Function} next Next is used to pass control to the next middleware function
   * @return {Promise}       The Promise
   */
  const getMenuList = (req, res, next) => {
    let query = {
      skip: Number(req.query.skip) || app.config.page.defaultSkip,
      limit: Number(req.query.limit) || app.config.page.defaultLimit,
      filters: {
        status: app.config.contentManagement.menu.active,
        restaurantRef: req.session.user.restaurantRef
      },
      populate: [{
        path: 'ingredients.inventoryRef',
        select: 'name unit quantity'
      }],
      sort: {
        order: 1
      }
    };

    if (req.body.filters) {
      let { name, categoryRef, isVeg } = req.body.filters;
      if (name) {
        query.filters.name = new RegExp(`^${name}`, 'ig');
      }
      if (categoryRef) {
        query.filters.categoryRef = categoryRef;
      }
      if (isVeg !== null && isVeg !== undefined) {
        query.filters.isVeg = isVeg;
      }
    }
    if (req.body.sortConfig) {
      let { name,order } = req.body.sortConfig;
      if (name) {
        query.sort.name = name;
      }
      if (order) {
        query.sort.order = order;
      }
    }

    menu.list(query)
      .then(output => {
        req.workflow.outcome.data = output;
        req.workflow.emit('response');
      })
      .catch(next);
  };

  /**
   * Edits a menu
   * @param  {Object}   req  Request 
   * @param  {Object}   res  Response
   * @param  {Function} next Next is used to pass control to the next middleware function
   * @return {Promise}       The Promise
   */
  const editMenu = (req, res, next) => {
    // req.menuId.name = req.body.name;
    // req.menuId.order = req.body.order;

    for (const item in req.body) {
      req.menuId[item] = req.body[item]
    }

    menu.edit(req.menuId, req.session.user)
      .then(output => {
        req.workflow.outcome.data = output;
        req.workflow.emit('response');
      })
      .catch(next);
  };

  /**
   * Deletes a menu
   * @param  {Object}   req  Request 
   * @param  {Object}   res  Response
   * @param  {Function} next Next is used to pass control to the next middleware function
   * @return {Promise}       The Promise
   */
  const deleteMenu = async (req, res, next) => {
    const isPresent = await order.isMenuInOrderCart(req.menuId._id, req.menuId.restaurantRef);
    if (isPresent) {
      return next({ 'errCode': 'MENU_ITEM_CANNOT_BE_DELETED' });
    }
    req.menuId.status = app.config.contentManagement.menu.deleted;
    menu.edit(req.menuId, req.session.user)
      .then(output => {
        category.updateMenuCount(req.menuId.categoryRef, -1);
        req.workflow.emit('response');
      })
      .catch(next);
  };

  const bulkAdd = (req, res, next) => {
    // uploadFile.create({
    //   originalFileName: req.files.excel.originalname,
    //   uploadedFileName: req.files.excel.filename
    // })
    // .then(output => {
    //   req.workflow.outcome.data = req.files.excel.getPath;
    //   req.workflow.emit('response');
    // })
    // .catch(next);
    req.workflow.outcome.data = req.files.excel.getPath;
    req.workflow.emit('response');
    
  };

  const getMenuImages = (req, res, next) => {
    imageByAI.list(req.body.name)
      .then(output => {
        req.workflow.outcome.data = output;
        req.workflow.emit('response');
      })
      .catch(next);
  };

  return {
    add: addMenu,
    get: getMenu,
    edit: editMenu,
    list: getMenuList,
    delete: deleteMenu,
    bulkAdd: bulkAdd,
    getMenuImages: getMenuImages
  };

};