'use strict';
module.exports = function (app, mongoose) {
  const schema = new mongoose.Schema({
    images: [{
      type: String
    }],
    languagesRef: [{
      code: String,
      name: String,
      description: String,
      ingredients: [{
        type: String
      }]
    }],
    name: {
      type: String,
      required: true
    },
    order: {
      type: Number,
      // required: true,
    },
    status: {
      type: Number,
      default: app.config.contentManagement.menu.active
    },
    restaurantRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant'
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RestaurantOwner'
    },
    isCreatedByImmeDine: {
      type: Boolean,
    },
    categoryRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: true
    },
    price: {
      type: Number,
      default: 0
    },
    isVeg: {
      type: Boolean,
      default: false
    },
    isNonVeg: {
      type: Boolean,
      default: false
    },
    isSpicy: {
      type: Boolean,
      default: false
    },
    noOfOrders: {
      type: Number,
      default: 0
    },
    avgRating: {
      type: Number,
      default: 0
    },
    totalRatings: {
      type: Number,
      default: 0
    },
    description: {
      type: String
    },
    ingredients: [{
      name: String,
      quantity: Number,
      unit: Number,
      location: {
        type: String
      },
      inventoryRef: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Inventory'
      },
      showInApp: {
        type: Boolean,
        default: true
      }
    }],
    isAvailable: {
      type: Boolean,
      default: false
    },
    preparationTime: {
      type: Number,
      default: 0
    },
    availability: {
      startTime: {
        type: String
      },
      endTime: {
        type: String
      }
    }
  }, {
    versionKey: false,
    timestamps: true,
  });


  /**
   * this function is to add new menu
   * @param  {String} name          name of the menu
   * @param  {String} colorCode     colorCode of the menu
   * @param  {String} menuType  menuType of the menu
   * @return {Promise}            
   */
  schema.statics.createMenu = function (data) {
    const { name, restaurantRef } = data;
    return this.exist(name, restaurantRef)
      .then((doc) => doc ? Promise.reject({
        'errCode': 'MENU_ALREADY_EXISTS'
      }) : (new this(data)).save());

  };
  /**
   * this is to check if any menu exists with the name
   * @param  {String} name name of the menu
   * @return {Promise}
   */
  schema.statics.exist = function (name, restaurantRef) {
    return this.countDocuments({
      name: new RegExp(`^${name}$`, 'i'),
      status: app.config.contentManagement.menu.active,
      restaurantRef: restaurantRef
    }).exec();
  };


  /**
   * this function is to remove menu 
   * @param  {string} _id menu id
   * @return {Promise}    Promise Object 
   */
  schema.statics.removeMenu = function (_id) {
    return this.findByIdAndRemove(_id).exec();
  };

  schema.index({ name: 1, categoryRef: 1, restaurantRef: 1, status: app.config.contentManagement.menu.active }, { unique: true });

  return schema;
};