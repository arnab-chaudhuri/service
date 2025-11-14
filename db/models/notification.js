'use strict';

module.exports = function (app, mongoose /*, plugins*/) {
  const notificationSchema = new mongoose.Schema(
    {
      /**
       * ObjectId of the user to whom this notification is addressed
       */
      user: {
        type: mongoose.Schema.Types.ObjectId,
      },
      restaurantRef: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Restaurant'
      },
      /**
       *
       * This field will be used with userId to populate the proper data
       */
      userType: {
        type: Number,
        validate: {
          isAsync: false,
          validator: function (v) {
            return Object.keys(app.config.user.role).some((e) => app.config.user.role[e] === v);
          },
          message: app.utility.message.INVALID('userType'),
        },
      },

      /**
       * True, if the notification has been seen
       */
      seen: {
        type: Boolean,
        default: false,
      },
      isActionable: {
        type: Boolean,
        default: false,
      },
      /**
       * inApp Content
       */
      inAppContent: {
        notificationType: {
          type: String,
        },
        info: Object,
      },
    },
    {
      versionKey: false,
      timestamps: true,
    }
  );

  return notificationSchema;
};
