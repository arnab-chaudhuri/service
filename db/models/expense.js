'use strict';
module.exports = function (app, mongoose) {
  const schema = new mongoose.Schema({
    vendorRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      required: true
    },
    amount: {
      type: Number,
      required: true,
      default: 0
    },
    status: {
      type: Number,
      default: app.config.contentManagement.expense.active
    },
    restaurantRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RestaurantOwner',
      required: true
    },
    items: [{
      itemRef: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Inventory',
      },
      amount: {
        type: Number,
        default: 0
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
      locationList: [{
        location: {
          type: mongoose.Schema.Types.ObjectId,
        },
        quantity: {
          type: Number,
          default: 0
        },
        quantityUnit: {
          type: Number,
          default: 0
        },
        quantitySaveAsUnit: {
          type: Number,
          default: 0
        },
      }]
    }]
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
  schema.statics.createExpense = function (data) {
    return (new this(data)).save();

  };

  /**
   * this function is to remove inventory 
   * @param  {string} _id inventory id
   * @return {Promise}    Promise Object 
   */
  schema.statics.removeExpense = function (_id) {
    return this.findByIdAndRemove(_id).exec();
  };

  return schema;
};