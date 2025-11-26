"use strict";

module.exports = {
  modules: [
    "dashboard",
    "orders",
    "bills",
    "inventory",
    "inventoryLocations",
    "inventoryCategories",
    "inventoryStocks",
    "menu",
    "restaurant",
    "table",
    "feedbacks",
    "purchase",
    "roles",
    "members",
    "printQR"
  ],
  role: {
    read: 1,
    edit: 2,
    delete: 3,
    all: 4
  },
};

