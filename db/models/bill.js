'use strict';
module.exports = function (app, mongoose) {
  const schema = new mongoose.Schema({
    billNo: {
      type: String,
      required: true
    },
    offlineId: {
      type: String
    },
    isCGSTDisabled: {
      type: Boolean,
      default: false
    },
    isRoundOff: {
      type: Boolean,
      default: true
    },
    isSGSTDisabled: {
      type: Boolean,
      default: false
    },
    isServiceTaxDisabled: {
      type: Boolean,
      default: false
    },
    restaurantRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RestaurantOwner',
    },
    addedByOwner: {
      type: Boolean,
      default: false
    },
    orderRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
    },
    subTotal: {
      type: Number,
      required: true,
      default: 0
    },
    total: {
      type: Number,
      required: true,
      default: 0
    },
    discountDetails: {
      discountType: {
        type: Number // 1: flat, 2: percentage
      },
      value: {
        type: Number,
        default: 0
      },
      discountedAmount: {
        type: Number,
        default: 0
      }
    },
    gstDetails: {
      cgst: {
        type: Number,
        default: 0
      },
      sgst: {
        type: Number,
        default: 0
      },
      cgstInPercentage: {
        type: Number,
        default: 0
      },
      sgstInPercentage: {
        type: Number,
        default: 0
      }
    },
    serviceTaxDetails: {
      serviceTax: {
        type: Number,
        default: 0
      },
      serviceTaxInPercentage: {
        type: Number,
        default: 0
      },
    },
    paymentDetails: {
      // online: 1, offline: 2
      mode: {
        type: Number
      },
      // UPI: 1, card: 2, other: 3 - only for online
      subMode: {
        type: Number
      },
      otherMode: {
        type: String
      },
      // pending: 1, paid: 2, refund: 3, failed: 4, cancelled: 5
      status: {
        type: Number,
        default: app.config.contentManagement.paymentStatus.pending
      }
    }
  }, {
    versionKey: false,
    timestamps: true,
  });


  /**
   * this function is to add new bill
   * @param  {String} name          name of the bill
   * @param  {String} colorCode     colorCode of the bill
   * @param  {String} billType  billType of the bill
   * @return {Promise}            
   */
  schema.statics.createBill = function (data) {
    return (new this(data)).save();
  };


  /**
   * this function is to remove bill 
   * @param  {string} _id bill id
   * @return {Promise}    Promise Object 
   */
  schema.statics.removeBill = function (_id) {
    return this.findByIdAndRemove(_id).exec();
  };

  return schema;
};