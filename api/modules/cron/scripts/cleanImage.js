const cron = require("node-cron");

module.exports = function (app) {
  // cron will run every 1 hour, for testing make 0 as * for minute
  cron.schedule('* * * * *', async () => {
    const Menu = app.models.Menu;
    const Category = app.models.Category;
    const ImageByAI = app.models.ImageByAI;
    // Configure AWS SDK
    console.log('cron will run every minute');
    const removeS3Prefix = (url) => {
      if (!url) return url;

      // Virtual-hosted
      let cleaned = url.replace(
        /^https:\/\/[^.]+\.s3\.[^.]+\.amazonaws\.com\//,
        ""
      );

      // Path-style
      cleaned = cleaned.replace(
        /^https:\/\/s3\.[^.]+\.amazonaws\.com\/[^/]+\//,
        ""
      );

      return cleaned;
    };

    async function cleanMenuImages() {
      const menus = await Menu.find();

      for (const menu of menus) {
        if (Array.isArray(menu.images)) {
          menu.images = menu.images.map((img) => removeS3Prefix(img));
          await menu.save();
        }
      }

      console.log("Menu images cleaned for all items!");
    }

    async function cleanCategoryImages() {
      const categories = await Category.find();

      for (const category of categories) {
        category.image = removeS3Prefix(category.image);
        await category.save();
      }

      console.log("Category images cleaned for all items!");
    }

    async function cleanAIImages() {
      const images = await ImageByAI.find();

      for (const img of images) {
        img.url = removeS3Prefix(img.url);
        await img.save();
      }

      console.log("AI images cleaned for all items!");
    }

    cleanAIImages()
      .then(() => {
        console.log('Done');
      })
      .catch((err) => console.error(err));



  });
};
