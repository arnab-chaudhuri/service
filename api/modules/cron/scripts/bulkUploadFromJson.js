'use strict';

const cron = require('node-cron');
const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');
const { MenuMock } = require('./menu');

function cleanAndTag(str) {
  // List of prepositions to remove (extend as needed)
  const stopWords = ["and", "or", "the", "of", "in", "on", "with", "a", "an"];

  // Extract only words with alphabets
  const words = str.match(/[A-Za-z]+/g) || [];

  // Filter out prepositions (case-insensitive)
  const filtered = words.filter(
    (w) => !stopWords.includes(w.toLowerCase())
  );

  return filtered.map((w) => w.toLowerCase());
}

const bulkUpload = async (app) => {
  console.log('bulk upload cron job started');
  const Category = app.models.Category;
  const Menu = app.models.Menu;
  const ImageByAI = app.models.ImageByAI;

  // const uploadDir = path.join(__dirname, 'public', 'uploads');
  const uploadDir = path.join(__dirname, '../../../../public/uploads');
  // console.log('uploads directory', uploadDir);
  if (fs.existsSync(uploadDir)) {
    const files = fs.readdirSync(uploadDir);
    // const data = JSON.parse(fs.readFileSync(file, "utf-8"));
    const json = MenuMock;
    // console.log("json ",json);

    const obj = {};

    json.categories.forEach(each => {
      obj[each.name] = each.items;
    });

    // console.log("obj ", obj);

    if (Object.keys(obj).length) {
      let catOrder = 0;
      for (const categoryName in obj) {
        let categoryDoc = await Category.findOne({
          name: categoryName,
          restaurantRef: "697dd57b3d87285d513877c1",
          createdBy: "697dd57b3d87285d513877c5"
        });
        if (!categoryDoc) {
          catOrder++;
          categoryDoc = await Category.create({
            order: catOrder,
            name: categoryName,
            filterText: categoryName.split(' ').slice(0, 2).join(' '),
            restaurantRef: "697dd57b3d87285d513877c1",
            createdBy: "697dd57b3d87285d513877c5",
            totalMenu: obj[categoryName].length
          });
        }

        const menuItems = obj[categoryName];
        let menuOrder = 0;
        for (const menuItem of menuItems) {
          menuOrder++;
          const { name, price, isVeg, description } = menuItem;

          const cleaned = cleanAndTag(name);
          
          const results = await ImageByAI.find({
            $expr: {
              $gte: [
                { $size: { $setIntersection: ["$tags", cleaned] } }, 
                2 // <-- at least 2 matches required
              ]
            }
          });

          // console.log("results ", results.map(r => r.url).slice(0, 2))

          await Menu.insertMany([{
            order: menuOrder,
            name,
            isVeg,
            images: results.length ? results.map(r => r.url).slice(0, 1) : [],
            description: description || "",
            price,
            categoryRef: categoryDoc._id,
            restaurantRef: "697dd57b3d87285d513877c1",
            createdBy: "697dd57b3d87285d513877c5",
            isCreatedByImmeDine: true
          }], { ordered: false });

        }
      }
    }
    console.log("completed ");


    // if (files && files.length) {
    //   // console.log('files found in uploads directory', files);
    //   const jsonFiles = files.filter((file) => file.endsWith('.json'));
    // //   console.log('excel files found in uploads directory', jsonFiles);






    // //   if (jsonFiles && jsonFiles.length) {
    // //     for (const file of jsonFiles) {
    // //       // console.log('file found in uploads directory', file);
    // //       const filePath = path.join(uploadDir, file);
    // //       // console.log('file path', filePath);
    // //       if (filePath) {
    // //         // updating the status of the file to completed
    // //         // FileUpload.findOne({
    // //         //   uploadedFileName: file,
    // //         // }).then((uploadedFile) => {
    // //         //   if (uploadedFile) {
    // //         //     // console.log('file found in database', uploadedFile);
    // //         //     uploadedFile.status = app.config.fileUpload.status.completed;
    // //         //     uploadedFile.save();
    // //         //   }
    // //         // });

    // //         try {
    // //           const json = xlsx.readFile(filePath);

    // //           console.log("json ", json)
    // //         //   const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    // //         //   const rows = xlsx.utils.sheet_to_json(worksheet);

    // //         //   const groupedMenu = rows.reduce((acc, item) => {
    // //         //     const category = item.CATEGORY;
    // //         //     const name = item["NAME"];
    // //         //     const description = item["DESCRIPTION"];
    // //         //     const ingredients = item["INGREDIENTS"];

    // //         //     if (!acc[category]) acc[category] = [];
    // //         //     acc[category].push({name, description, ingredients});
    // //         //     return acc;
    // //         //   }, {});

    // //         //   console.log("groupedMenu ", groupedMenu)

    // //         //   if (Object.keys(groupedMenu).length) {
    // //         //     for (const categoryName in groupedMenu) {
    // //         //       let categoryDoc = await Category.findOne({ 
    // //         //         name: categoryName, 
    // //         //         restaurantRef: "689721e0bd4872dc0c7912c4",
    // //         //         createdBy: "689721e0bd4872dc0c7912c7"
    // //         //        });
    // //         //       if (!categoryDoc) {
    // //         //         categoryDoc = await Category.create({ 
    // //         //           name: categoryName, 
    // //         //           restaurantRef: "689721e0bd4872dc0c7912c4",
    // //         //           createdBy: "689721e0bd4872dc0c7912c7"
    // //         //         });
    // //         //       }

    // //         //       const menuItems = groupedMenu[categoryName];
    // //         //       for (const menuItem of menuItems) {
    // //         //         const {name, description, ingredients} = menuItem;

    // //         //         await Menu.insertMany([{
    // //         //           name,
    // //         //           description,
    // //         //           ingredients,
    // //         //           categoryRef: categoryDoc._id,
    // //         //           restaurantRef: "689721e0bd4872dc0c7912c4",
    // //         //           createdBy: "689721e0bd4872dc0c7912c7"
    // //         //         }], { ordered: false });

    // //         //       }



    // //         //     }
    // //         //   }
    // //         //   console.log("completed ");

    // //           // console.log('rows found in excel file', rows);
    // //           // console.log('data found in excel file', data);
    // //           // const insertedDocs = await Story.insertMany(data, { ordered: false });
    // //           // remove the file after uploading
    // //           // if (filePath) {
    // //           //   fs.unlinkSync(filePath);
    // //           // }
    // //           // // increase story count in city reference
    // //           // updateCity(insertedDocs, city);
    // //           // console.log('Bulk upload completed successfully! ');
    // //         } catch (err) {
    // //           console.log('Error in bulk upload ', JSON.stringify(err));
    // //           // if (err.insertedDocs) {
    // //           //   // remove the file after uploading
    // //           //   if (filePath) {
    // //           //     fs.unlinkSync(filePath);
    // //           //   }
    // //           //   if (err.insertedDocs.length) {
    // //           //     updateCity(err.insertedDocs, city);
    // //           //   }
    // //           // }
    // //         }
    // //       }
    // //     }
    // //   }
    // }
  } else {
    console.warn(`Upload directory not found: ${uploadDir}`);
  }
};

module.exports = function (app) {
  // cron will run every 1 hour, for testing make 0 as * for minute
  cron.schedule('* * * * *', () => {
    console.log('cron will run every minute');
    bulkUpload(app);
  });
};
