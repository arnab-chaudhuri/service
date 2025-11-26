'use strict';
module.exports = function(app, mongoose) {
  const schema = new mongoose.Schema({
    description: {
      type: String,
      required: true
    },
    email: {
      type: String
    },
    phoneNumber: {
      type: String
    },
    name: {
      type: String
    }
  }, {
    versionKey: false,
    timestamps: true,
  });

  /**
   * this function is to add new query
   * @param  {String} question   question of the query
   * @param  {String} answer     answer of the query
   * @return {Promise}            
   */
  schema.statics.createQuery = function (data) {
    return (new this(data)).save();
  };


  /**
   * this function is to remove query 
   * @param  {string} _id query id
   * @return {Promise}    Promise Object 
   */
  schema.statics.removeQuery = function (_id) {
    return this.findByIdAndRemove(_id).exec();
  };
  return schema;
};