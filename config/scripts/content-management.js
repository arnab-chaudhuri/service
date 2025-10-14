'use strict';

const category = require("../../db/models/category");

module.exports = {
  category: {
    active: 1,
    deleted: 2
  },
  inventory: {
    active: 1,
    deleted: 2
  },
  menu: {
    active: 1,
    deleted: 2
  },
  restaurant: {
    active: 1,
    deleted: 2,
    unPublished: 3
  },
  language: {
    active: 1,
    deleted: 2
  },
  faq: {
    active: 1,
    deleted: 2
  },
  order: {
    active: 1,
    cooking: 2,
    served: 3,
    completed: 4,
    deleted: 5, // need to be changed -> cancelled
    pending: 6
  },
  orderType: {
    inStore: 1,
    swiggy: 2,
    zomato: 3,
    takeaway: 4,
    others: 5
  },
  bill: {
    active: 1,
    completed: 4,
    deleted: 5, // need to be changed -> cancelled
    pending: 6
  },
  paymentStatus: {
    pending: 1,
    paid: 2,
    refund: 3,
    failed: 4,
    cancelled: 5
  },
  paymentMode: {
    offline: 1,
    online: 2
  },
  paymentSubMode: {
    upi: 1,
    card: 2,
    other: 3
  },
  table: {
    active: 1,
    inActive: 2,
    deleted: 3
  },
  tableSession: {
    active: 1,
    closed: 2
  },
};