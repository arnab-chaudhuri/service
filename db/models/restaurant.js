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
      defaultAppMenuView: {
        type: Number,
        default: app.config.contentManagement.defaultAppView.list
      },
      defaultAppModeLight: {
        type: Boolean,
        default: true
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
        price: Number,
        status: Number // 1: Active, 2: Deleted
      }],
      waters: [{
        name: String,
        price: Number,
        status: Number // 1: Active, 2: Deleted
      }]
    },
    billConfigDetails: {
      isLogo: {
        type: Boolean,
        default: true
      },
      isOutletName: {
        type: Boolean,
        default: true
      },
      isIntroduction: {
        type: Boolean,
        default: false
      },
      footerLine1: {
        type: String,
        default: 'Thank you for ordering!'
      },
      footerLine2: {
        type: String,
        default: '*** Visit Again ***'
      },
      footerLine3: {
        type: String,
        default: ''
      },
      receiptSize: {
        type: String,
        default: '57'
      }
    },
    inventoryLocations: [{
      name: String,
      code: String,
      status: {
        type: Number,
        default: app.config.contentManagement.location.active
      }
    }],
    inventoryCategories: [{
      name: String,
      code: String,
      status: {
        type: Number,
        default: app.config.contentManagement.invCategories.active
      }
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
    },
    serviceTaxDetails: {
      serviceTaxEnabled: {
        type: Boolean,
        default: false
      },
      serviceTax: {
        type: Number,
        default: 0
      }
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