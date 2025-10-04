'use strict';

/**
 * This Controller handles all functionality of admin order
 * @module Controllers/Admin/order
 */
module.exports = function (app) {

  /**
   * order module
   * @type {Object}
   */
  const order = app.module.order;
  const bill = app.module.bill;
  const inventory = app.module.inventory;
  const tableSession = app.module.tableSession;

  /**
   * Adds a order
   * @param  {Object}   req  Request 
   * @param  {Object}   res  Response
   * @param  {Function} next Next is used to pass control to the next middleware function
   * @return {Promise}       The Promise
   */
  const addOrder = (req, res, next) => {
    let subTotal = 0;
    let total = 0; 

    // get active table session
    tableSession.getByTableId(req.body)
      .then(output1 => {

        // calculate total
        output1.cart.forEach(element => {
          subTotal += (element.price * element.quantity);
          if (element.subItems && element.subItems.length) {
            element.subItems.forEach(element1 => {
              subTotal += (element1.price * element1.quantity);
            });
          }
        });

        total = subTotal;

        // create order
        order.create({
          tableRef: req.body.tableRef,
          restaurantRef: req.body.restaurantRef,
          cart: output1.cart,
          subTotal,
          total,
          status: app.config.contentManagement.order.pending
        })
          .then(output => {

            // create bill
            bill.create({
              billNo: output.orderId,
              orderRef: output._id,
              subTotal,
              total,
              restaurantRef: req.body.restaurantRef
            })
            .then(output2 => {

              // update bill details in order
              output.billDetails = output2;
              order.updateBillDetails(output._id, output2);

              // update orderRef in table session
              output1.orderRef = output._id;
              tableSession.edit(output1);

              req.workflow.outcome.data = output;
              req.workflow.emit('response');
            }).catch(next);
          })
          .catch(next);
      })
      .catch(next);
  };

  /**
   * Fetches a order
   * @param  {Object}   req  Request 
   * @param  {Object}   res  Response
   * @param  {Function} next Next is used to pass control to the next middleware function
   * @return {Promise}       The Promise
   */
  const getOrder = (req, res, next) => {
    order.get(req.params.orderId)
      .then(output => {
        req.workflow.outcome.data = output;
        req.workflow.emit('response');
      })
      .catch(next);
  };

  /**
   * Edits a order
   * @param  {Object}   req  Request 
   * @param  {Object}   res  Response
   * @param  {Function} next Next is used to pass control to the next middleware function
   * @return {Promise}       The Promise
   */
  const editOrder = (req, res, next) => {

    if (req.body && Object.keys(req.body).length) {
      for (let item in req.body) {
        req.orderId[item] = req.body[item];
      }
    }

    inventory.rollbackInventory(req.orderId._id, req.body.cart)
      .then(output1 => {
        order.edit(req.orderId, req.session.user)
          .then(output => {
            bill.updateBillFromOrder(req.orderId.billRef, {
              subTotal: req.body.subTotal,
              total: req.body.total,
            });
            req.workflow.outcome.data = output;
            req.workflow.emit('response');
          })
          .catch(next);
      })
      .catch(next);
  };

  return {
    add: addOrder,
    get: getOrder,
    edit: editOrder
  };

};