'use strict';
module.exports = function(app, mongoose) {
  const schema = new mongoose.Schema({
    tableRef: { type: mongoose.Schema.Types.ObjectId, ref: "Table" },
    restaurantRef: { type: mongoose.Schema.Types.ObjectId, ref: "Restaurant" },
    startedAt: { type: Date, default: Date.now },
    endedAt: Date,
    status: {
      type: Number,
      default: app.config.contentManagement.tableSession.active
    },
    orderRef: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
    cart: [{
      name: String,
      quantity: {
        type: Number,
        default: 0
      },
      price: {
        type: Number,
        default: 0
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
        quantity: {
          type: Number,
          default: 0
        },
        price: {
          type: Number,
          default: 0
        },
        served: {
          type: Boolean,
          default: false
        }
      }]
    }],
  }, {
    versionKey: false,
    timestamps: true,
  });

  /**
   * this function is to add new tableSession
   * @return {Promise}            
   */
  schema.statics.createTableSession = function (data) {
    return (new this(data)).save();
  };


  /**
   * this function is to remove tableSession 
   * @param  {string} _id tableSession id
   * @return {Promise}    Promise Object 
   */
  schema.statics.removeTableSession = function (_id) {
    return this.findByIdAndRemove(_id).exec();
  };
  return schema;
};