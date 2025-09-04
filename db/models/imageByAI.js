'use strict';
module.exports = function(app, mongoose) {
  const schema = new mongoose.Schema({
    url: {
      type: String,
      required: true
    },
    tags: {
      type: [String]
    }
  }, {
    versionKey: false,
    timestamps: true,
  });


  /**
   * this function is to add new image
   * @param  {String} name          name of the image
   * @param  {String} colorCode     colorCode of the image
   * @param  {String} imageType  imageType of the image
   * @return {Promise}            
   */
  schema.statics.createImage = function (data) {
    return new this(data).save();

  };

  /**
   * this function is to remove image 
   * @param  {string} _id image id
   * @return {Promise}    Promise Object 
   */
  schema.statics.removeImage = function (_id) {
    return this.findByIdAndRemove(_id).exec();
  };

  return schema;
};