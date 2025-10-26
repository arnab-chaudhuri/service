'use strict';
module.exports = function(app, mongoose) {
  const schema = new mongoose.Schema({
    name: {
      type: String,
      required: true
    },
    introductoryText: {
      type: String
    },
    logo: {
      type: String,
    },
    primaryColor: {
      type: String
    },
    secondaryColor: {
      type: String
    },
    status: {
      type: Number,
      default: app.config.contentManagement.restaurant.active
    },
    createdByAdmin: {
      type: Boolean,
      default: false
    },
    config: {
      hideCardView: {
        type: Boolean,
        default: false
      },
      hideMenuDetails: {
        type: Boolean,
        default: false
      },
      showBanner: {
        type: Boolean,
        default: false
      },
      chargePerParcel: {
        type: Number,
        default: 0
      },
      menuEnabled: {
        type: Boolean,
        default: true
      },
      orderEnabled: {
        type: Boolean,
        default: false
      },
      parcels: [{
        name: String,
        price: Number
      }]
    },
    inventoryLocations: [{
      name: String,
      code: String
    }],
    inventoryCategories: [{
      name: String
    }],
    gstDetails: {
      gstEnabled: {
        type: Boolean,
        default: false
      },
      cgst: {
        type: Number,
        default: 2.5
      },
      sgst: {
        type: Number,
        default: 2.5
      },
    }
  }, {
    versionKey: false,
    timestamps: true,
  });


  /**
   * this function is to add new restaurant
   * @param  {String} name          name of the restaurant
   * @param  {String} colorCode     colorCode of the restaurant
   * @param  {String} restaurantType  restaurantType of the restaurant
   * @return {Promise}            
   */
  schema.statics.createRestaurant = function (data) {
    const { name } = data;
    return this.exist(name)
      .then((doc) => doc ? Promise.reject({
        'errCode': 'RESTAURANT_ALREADY_EXISTS'
      }) : (new this(data)).save());

  };
  /**
   * this is to check if any restaurant exists with the name
   * @param  {String} name name of the restaurant
   * @return {Promise}
   */
  schema.statics.exist = function (name) {
    return this.countDocuments({
      name: name,
      status: app.config.contentManagement.restaurant.active
    }).exec();
  };


  /**
   * this function is to remove restaurant 
   * @param  {string} _id restaurant id
   * @return {Promise}    Promise Object 
   */
  schema.statics.removeRestaurant = function (_id) {
    return this.findByIdAndRemove(_id).exec();
  };

  return schema;
};