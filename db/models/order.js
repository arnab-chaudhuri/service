'use strict';
module.exports = function (app, mongoose) {
  const schema = new mongoose.Schema({
    orderId: {
      type: String,
      required: true
    },
    idbId: {
      type: String,
      required: true
    },
    note: {
      type: String
    },
    noteByCustomer: {
      type: String
    },
    reOrderCount: {
      type: Number,
      default: 1
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
      isNewToCart: {
        type: Boolean,
        default: false
      },
      dateTime: {
        type: Date,
        default: Date.now
      },
      served: {
        type: Boolean,
        default: false
      },
      menuRef: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Menu'
      },
      subItems: [{
        name: String,
        quantity: Number,
        price: Number,
        served: {
          type: Boolean,
          default: false
        },
      }]
    }],
    isOnline: {
      type: Boolean,
      default: true
    },
    tableRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Table',
    },
    tableId: {
      type: String
    },
    isRestoredWhileCancel: {
      type: Boolean,
      default: true
    },
    // in Store: 1, Swiggy: 2, Zomato: 3, other: 4
    orderType: {
      type: Number,
      default: app.config.contentManagement.orderType.inStore
    },
    billRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bill',
    },
    reasonForCancellation: {
      type: String
    },
    userRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    parcelDetails: {
      items: [{
        name: String,
        count: Number,
        price: Number
      }],
      count: {
        type: Number,
        default: 0
      },
      totalCost: {
        type: Number,
        default: 0
      }
    },
    waterDetails: {
      items: [{
        name: String,
        count: Number,
        price: Number
      }],
      count: {
        type: Number,
        default: 0
      },
      totalCost: {
        type: Number,
        default: 0
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