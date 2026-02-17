'use strict';
module.exports = function (app, mongoose) {
  const schema = new mongoose.Schema({
    name: {
      type: String,
      required: true
    },
    status: {
      type: Number,
      default: app.config.contentManagement.subscriptionPlan.active
    },
    price: {
      type: Number,
      required: true,
    },
    tenureInDays: {
      type: Number,
      required: true,
    },
    type: {
      type: Number,
      required: true,
      default: app.config.contentManagement.subscriptionPlanType.subscription
    },
    tier: {
      type: Number,
      required: true,
      default: app.config.contentManagement.subscriptionTier.base
    },
    features: [{
      name: String,
      id: Number
    }],
    order: Number,
    accessModules: [{
      'moduleKey': {
        'type': String
      },
      'moduleName': {
        'type': String
      },
    }],
  }, {
    versionKey: false,
    timestamps: true,
  });

  /**
   * this function is to add new subscriptionPlan
   * @param  {String} question   question of the subscriptionPlan
   * @param  {String} answer     answer of the subscriptionPlan
   * @return {Promise}            
   */
  schema.statics.createSubscriptionPlan = function (data) {
    const {name} = data;
    return this.exist(name)
      .then((doc) => doc ? Promise.reject({
        'errCode': 'PLAN_ALREADY_EXISTS'
      }) : (new this(data)).save());

  };
  /**
   * this is to check if any subscriptionPlan exists with the name
   * @param  {String} name name of the subscriptionPlan
   * @return {Promise}
   */
  schema.statics.exist = function (name) {
    return this.countDocuments({
      name
    }).exec();
  };


  /**
   * this function is to remove subscriptionPlan 
   * @param  {string} _id subscriptionPlan id
   * @return {Promise}    Promise Object 
   */
  schema.statics.removeSubscriptionPlan = function (_id) {
    return this.findByIdAndRemove(_id).exec();
  };
  return schema;
};