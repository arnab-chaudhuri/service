'use strict';
module.exports = function (app, mongoose) {
  const schema = new mongoose.Schema({
    rating: {
      type: Number,
      required: true,
      default: 0
    },
    review: {
      type: String,
      required: true,
    },
    reviewerDetails: {
      fullName: {
        type: String,
      },
      email: {
        type: String,
      },

      phone: {
        countryCode: { type: String, default: 'IN' },
        number: { type: String },
      },

      userRef: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    },
    status: {
      type: Number,
      default: app.config.contentManagement.feedback.active
    },
    restaurantRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant'
    },
    orderRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order'
    },
  }, {
    versionKey: false,
    timestamps: true,
  });


  /**
   * this function is to add new feedback
   * @param  {String} name          name of the feedback
   * @param  {String} colorCode     colorCode of the feedback
   * @param  {String} feedbackType  feedbackType of the feedback
   * @return {Promise}            
   */
  schema.statics.createFeedback = function (data) {
    return (new this(data)).save();

  };

  /**
   * this function is to remove feedback 
   * @param  {string} _id feedback id
   * @return {Promise}    Promise Object 
   */
  schema.statics.removeFeedback = function (_id) {
    return this.findByIdAndRemove(_id).exec();
  };

  return schema;
};