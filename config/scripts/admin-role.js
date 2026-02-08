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
    "tableSettings",
    "brandSettings",
    "outletSettings",
    "userInterfaceSettings",
    "table",
    "feedbacks",
    "purchase",
    "roles",
    "members",
    "customers",
    "printQR",
    "history"
  ],
  role: {
    read: 1,
    edit: 2,
    delete: 3,
    all: 4
  },
};

