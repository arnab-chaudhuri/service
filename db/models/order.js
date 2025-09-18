'use strict';
module.exports = function (app, mongoose) {
  const schema = new mongoose.Schema({
    orderId: {
      type: String,
      required: true
    },
    status: {
      type: Number,
      default: app.config.contentManagement.order.active
    },
    restaurantRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RestaurantOwner',
    },
    addedByOwner: {
      type: Boolean,
      default: false
    },
    cart: [{
      name: String,
      quantity: Number,
      price: Number,
      menuRef: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Menu'
      }
    }],
    subTotal: {
      type: Number,
      required: true,
      default: 0
    },
    total: {
      type: Number,
      required: true,
      default: 0
    },
    tableRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant',
    },
    tableId: {
      type: String
    },
    gstDetails: {
      cgst: {
        type: Number,
        default: 0
      },
      sgst: {
        type: Number,
        default: 0
      }
    },
    // in Store: 1, Swiggy: 2, Zomato: 3, other: 4
    orderType: {
      type: Number,
      default: app.config.contentManagement.orderType.inStore
    },
    paymentDetails: {
      // online: 1, offline: 2
      mode: {
        type: Number
      },
      // UPI: 1, card: 2, other: 3 - only for online
      subMode: {
        type: Number
      },
      otherMode: {
        type: String
      },
      // pending: 1, paid: 2, refund: 3, failed: 4
      status: {
        type: Number,
        default: app.config.contentManagement.paymentStatus.pending
      }
    }
  }, {
    versionKey: false,
    timestamps: true,
  });


  /**
   * this function is to add new order
   * @param  {String} name          name of the order
   * @param  {String} colorCode     colorCode of the order
   * @param  {String} orderType  orderType of the order
   * @return {Promise}            
   */
  schema.statics.createOrder = function (data) {
    return (new this(data)).save();
  };


  /**
   * this function is to remove order 
   * @param  {string} _id order id
   * @return {Promise}    Promise Object 
   */
  schema.statics.removeOrder = function (_id) {
    return this.findByIdAndRemove(_id).exec();
  };

  return schema;
};