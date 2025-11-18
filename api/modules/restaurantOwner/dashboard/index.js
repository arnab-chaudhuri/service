'use strict';

/**
 * This module handles all functionality of dashboard portion in admin
 * @module Modules/Admin/Dashboard
 */

module.exports = function (app) {
  const mongoose = require('mongoose');

  const Category = app.models.Category;
  const Menu = app.models.Menu;
  const Order = app.models.Order;
  const Bill = app.models.Bill;

  const getLast7DaysOrder = async (restaurantId) => {
    const last7days = await Order.aggregate([
      // 1. Match last 7 days
      {
        $match: {
          restaurantRef: new mongoose.Types.ObjectId(restaurantId),
          createdAt: {
            $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        }
      },

      // 2. Group day-wise
      {
        $group: {
          _id: {
            day: { $dayOfWeek: "$createdAt" }, // 1=Sun, 7=Sat
            date: {
              $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
            }
          },
          orders: { $sum: 1 }
        }
      },

      // 3. Sort by date
      { $sort: { "_id.date": 1 } },

      // 4. Final projection
      {
        $project: {
          _id: 0,
          day: {
            $arrayElemAt: [
              ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
              { $subtract: ["$_id.day", 1] }
            ]
          },
          orders: 1,
          date: "$_id.date"
        }
      }
    ]);

    // Build LAST 7 DAYS array
    const last7 = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);

      const key = d.toISOString().split("T")[0];
      const dayName = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getDay()];

      const found = last7days.find(x => x.date === key);

      last7.push({
        day: dayName,
        orders: found?.orders || 0
      });
    }

    return Promise.resolve(last7);

  };

  const getMonthlySale = async (restaurantId) => {
    const result = await Bill.aggregate([

      // 1. Filters
      {
        $match: {
          restaurantRef: new mongoose.Types.ObjectId(restaurantId),
          "paymentDetails.status": app.config.contentManagement.paymentStatus.paid  // paid
        }
      },

      // 2. Convert date to the first day of that month
      {
        $set: {
          monthStart: {
            $dateFromParts: {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" },
              day: 1
            }
          }
        }
      },

      // 3. Densify → ensures all months exist
      {
        $densify: {
          field: "monthStart",
          range: {
            step: 1,
            unit: "month",
            bounds: "full"
          }
        }
      },

      // 4. Now group by month (missing months will have no totals)
      {
        $group: {
          _id: "$monthStart",
          totalSale: { $sum: "$total" }
        }
      },

      // 5. Restrict to last 12 months only
      {
        $match: {
          _id: {
            $gte: new Date(
              new Date().getFullYear(),
              new Date().getMonth() - 11,
              1
            )
          }
        }
      },

      // 6. Format proper output with zero fallback
      {
        $project: {
          _id: 0,
          year: { $year: "$_id" },
          month: { $month: "$_id" },
          totalSale: { $ifNull: ["$totalSale", 0] }
        }
      },

      // 7. Sort chronologically
      { $sort: { year: 1, month: 1 } }
    ]);
    return Promise.resolve(result);

  };

  const getStats = (restaurantId) => {
    return Promise.all([
      Order.countDocuments({
        restaurantRef: restaurantId,
        status: app.config.contentManagement.order.completed,
      }).exec(),
      Order.find({
        restaurantRef: restaurantId,
        createdAt: {
          $gte: new Date(new Date().setHours(0, 0, 0, 0)),
          $lt: new Date(new Date().setHours(23, 59, 59, 999)),
        },
      }, {
        _id: 1,
        idbId: 1,
        status: 1,
        orderId: 1,
        tableId: 1,
        orderType: 1
      }).sort({ createdAt: -1 }).exec(),
      Menu.find({
        restaurantRef: restaurantId,
        noOfOrders: {
          $gt: 0
        }
      })
        .sort({ noOfOrders: -1 })
        .limit(10)
        .select('name noOfOrders images').exec(),
      getMonthlySale(restaurantId),
      getLast7DaysOrder(restaurantId),
    ]).spread((totalOrder, todayOrders, mostOrderedItems, monthlySale, last7DaysOrder) => {
      return {
        totalOrder,
        todayOrders,
        mostOrderedItems,
        monthlySale,
        last7DaysOrder
      };
    });

  };
  return { getStats };
};