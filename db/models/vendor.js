'use strict';
module.exports = function(app, mongoose) {
  const schema = new mongoose.Schema({
    name: {
      type: String,
      required: true
    },
    restaurantRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true
    },
    status: {
      type: Number,
      default: app.config.contentManagement.vendor.active
    }
  }, {
    versionKey: false,
    timestamps: true,
  });

  /**
   * this function is to add new vendor
   * @param  {String} question   question of the vendor
   * @param  {String} answer     answer of the vendor
   * @return {Promise}            
   */
  schema.statics.createVendor = function (data) {
    return new this(data).save();

  };
  /**
   * this is to check if any vendor exists with the name
   * @param  {String} name name of the vendor
   * @return {Promise}
   */
  schema.statics.exist = function (name) {
    return this.countDocuments({
      name
    }).exec();
  };


  /**
   * this function is to remove vendor 
   * @param  {string} _id vendor id
   * @return {Promise}    Promise Object 
   */
  schema.statics.removeVendor = function (_id) {
    return this.findByIdAndRemove(_id).exec();
  };
  return schema;
};