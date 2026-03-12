'use strict';
module.exports = function (app, mongoose) {
  const schema = new mongoose.Schema({
    name: {
      type: String,
      required: true
    },
    preCode: {
      type: String
    },
    code: {
      type: String
    },
    status: {
      type: Number,
      default: app.config.contentManagement.inventory.active
    },
    restaurantRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RestaurantOwner'
    },
    isDefault: {
      type: Boolean,
      default: false
    },
    image: {
      type: String
    },
    quantity: {
      type: Number,
      default: 0
    },
    unit: {
      type: Number
    },
    saveAsUnit: {
      type: Number
    },
    inAppDisplayable: {
      type: Boolean,
      default: false
    },
    locationList: [{
      location: {
        type: mongoose.Schema.Types.ObjectId,
      },
      avgRate: {
        type: Number,
        default: 0
      }, // rate by lowest unit
      quantity: {
        type: Number,
        default: 0
      },
      threshold: {
        type: Number,
        default: 0
      },
      thresholdUnit: {
        type: Number,
        default: 0
      },
      thresholdSaveAsUnit: {
        type: Number,
        default: 0
      },
      history: [{
        prevLocQuantity: {
          type: Number,
          default: 0
        },
        reOrderCount: {
          type: Number,
          default: 1
        },
        prevTotalQuantity: {
          type: Number,
          default: 0
        },
        quantity: {
          type: Number,
          default: 0
        },
        isDebited: {
          type: Boolean
        },
        date: {
          type: Date,
          default: Date.now
        },
        reason: {
          type: String
        },
        orderRef: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Order',
        },
        expenseRef: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Expense',
        }
      }]
    }],
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    }
  }, {
    versionKey: false,
    timestamps: true,
  });


  /**
   * this function is to add new inventory
   * @param  {String} name          name of the inventory
   * @param  {String} colorCode     colorCode of the inventory
   * @param  {String} inventoryType  inventoryType of the inventory
   * @return {Promise}            
   */
  schema.statics.createInventory = function (data) {
    const { name, restaurantRef } = data;
    return this.exist(name, restaurantRef)
      .then((doc) => doc ? Promise.reject({
        'errCode': 'INVENTORY_ALREADY_EXISTS'
      }) : (new this(data)).save());

  };
  /**
   * this is to check if any inventory exists with the name
   * @param  {String} name name of the inventory
   * @return {Promise}
   */
  schema.statics.exist = function (name, restaurantRef) {
    return this.countDocuments({
      name: name,
      status: app.config.contentManagement.inventory.active,
      restaurantRef: restaurantRef
    }).exec();
  };


  /**
   * this function is to remove inventory 
   * @param  {string} _id inventory id
   * @return {Promise}    Promise Object 
   */
  schema.statics.removeInventory = function (_id) {
    return this.findByIdAndRemove(_id).exec();
  };

  return schema;
};