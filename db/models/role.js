'use strict';

module.exports = function (app, mongoose /*, plugins*/) {
  const roleSchema = new mongoose.Schema({
    'name': {
      type: String,
      required: true
    },
    restaurantRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant'
    },
    defaultModule: {
      key: {
        type: String,
        default: 'dashboard'
      },
      name: {
        type: String,
        default: 'Dashboard'
      }
    },
    isManager: {
      type: Boolean,
      default: false
    },
    status: {
      type: Number,
      default: app.config.contentManagement.role.active
    },
    'permissions': [{
      'moduleKey': {
        'type': String,
        'required': true
      },
      'moduleName': {
        'type': String,
        'required': true
      },
      'role': {
        'type': Number,
        default: app.config.adminRole.role.all
      }
    }]
  }, {
    'versionKey': false,
    'timestamps': true,
    'usePushEach': true
  });

  /**
   * this function is to add new role
   * @param  {String} name        name of the role
   * @param  {Array} permissions  array of permissions
   * @return {Promise}            
   */
  roleSchema.statics.createRole = function ({name, permissions, restaurantRef, isManager}) {
    return this.exist(name, restaurantRef)
      .then((doc) => doc ? Promise.reject({
        'errCode': 'ROLE_ALREADY_EXISTS'
      }) : (new this({
        name: name,
        permissions: permissions,
        restaurantRef: restaurantRef,
        isManager: isManager || false
      })).save());

  };
  /**
   * this is to check if any role exists with the name
   * @param  {String} name name of the role
   * @return {Promise}
   */
  roleSchema.statics.exist = function (name, restaurantRef) {
    return this.countDocuments({
      name: name,
      restaurantRef: restaurantRef,
      status: {
        '$ne': app.config.contentManagement.role.deleted
      }
    }).exec();
  };


  /**
   * this function is to remove role 
   * @param  {string} _id role id
   * @return {Promise}    Promise Object 
   */
  roleSchema.statics.removeRole = function (_id) {
    return this.findByIdAndRemove(_id).exec();
  };

  return roleSchema;
};