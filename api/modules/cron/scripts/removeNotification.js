'use strict';

const cron = require('node-cron');

async function deleteOldNotifications(app, days = 15) {
  const Notification = app.models.Notification; 
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const result = await Notification.deleteMany({
      createdAt: { $lt: cutoffDate }
    });

    console.log(
      `[CRON] Deleted ${result.deletedCount} notifications older than ${days} days`
    );
  } catch (error) {
    console.error("[CRON] Failed to delete old notifications:", error);
  }
}

module.exports = function (app) {
  // cron will run Runs Daily at 2 AM
  cron.schedule("0 2 * * *", async () => {
  // console.log("[CRON] Running notification cleanup job...");
  await deleteOldNotifications(app, 15);
});
};
