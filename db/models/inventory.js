'use strict';
module.exports = function (app, mongoose) {
  const schema = new mongoose.Schema({
    name: {
      type: String,
      required: true
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
      ref: 'RestaurantOwner',
      required: true
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
    inAppDisplayable: {
      type: Boolean,
      default: false
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

  schema.index({ name: 1, restaurantRef: 1, status: app.config.contentManagement.inventory.active }, { unique: true });

  return schema;
};