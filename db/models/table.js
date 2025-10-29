'use strict';
module.exports = function (app, mongoose) {
  const schema = new mongoose.Schema({
    tableId: {
      type: String,
      required: true
    },
    qrCodeUrl: {
      type: String
    },
    status: {
      type: Number,
      default: app.config.contentManagement.table.active
    },
    restaurantRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true
    },
    noOfSeats: {
      type: Number,
      default: 0
    },
    env: {
      type: Number,
      default: 1
    },
    style: {
      type: Number,
      default: 1
    },
    shape: {
      type: Number,
      default: 1
    },
    height: {
      type: Number,
      default: 1
    },
    currentSessionRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TableSession"
    }
  }, {
    versionKey: false,
    timestamps: true,
  });

  /**
   * this function is to add new table
   * @return {Promise}            
   */
  schema.statics.createTable = function (data) {
    const { tableId } = data;
    return this.exist(tableId)
      .then((doc) => doc ? Promise.reject({
        'errCode': 'TABLE_ALREADY_EXISTS'
      }) : (new this(data)).save());

  };
  /**
   * this is to check if any table exists with the question
   * @param  {String} tableId tableId of the table
   * @return {Promise}
   */
  schema.statics.exist = function (tableId) {
    return this.countDocuments({
      tableId: tableId
    }).exec();
  };


  /**
   * this function is to remove table 
   * @param  {string} _id table id
   * @return {Promise}    Promise Object 
   */
  schema.statics.removeTable = function (_id) {
    return this.findByIdAndRemove(_id).exec();
  };
  return schema;
};