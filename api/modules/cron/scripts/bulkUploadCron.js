'use strict';

const cron = require('node-cron');
const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');

const bulkUpload = async (app) => {
  console.log('bulk upload cron job started');
  const Category = app.models.Category;
  const Menu = app.models.Menu;
  // const uploadDir = path.join(__dirname, 'public', 'uploads');
  const uploadDir = path.join(__dirname, '../../../../public/uploads');
  // console.log('uploads directory', uploadDir);
  if (fs.existsSync(uploadDir)) {
    const files = fs.readdirSync(uploadDir);

    if (files && files.length) {
      // console.log('files found in uploads directory', files);
      const excelFiles = files.filter((file) => file.endsWith('.xlsx') || file.endsWith('.xls'));
      // console.log('excel files found in uploads directory', excelFiles);
      if (excelFiles && excelFiles.length) {
        for (const file of excelFiles) {
          // console.log('file found in uploads directory', file);
          const filePath = path.join(uploadDir, file);
          // console.log('file path', filePath);
          if (filePath) {
            // updating the status of the file to completed
            // FileUpload.findOne({
            //   uploadedFileName: file,
            // }).then((uploadedFile) => {
            //   if (uploadedFile) {
            //     // console.log('file found in database', uploadedFile);
            //     uploadedFile.status = app.config.fileUpload.status.completed;
            //     uploadedFile.save();
            //   }
            // });

            try {
              const workbook = xlsx.readFile(filePath);

              const worksheet = workbook.Sheets[workbook.SheetNames[0]];
              const rows = xlsx.utils.sheet_to_json(worksheet);

              const groupedMenu = rows.reduce((acc, item) => {
                const category = item.CATEGORY;
                const name = item["NAME"];
                const description = item["DESCRIPTION"];
                const ingredients = item["INGREDIENTS"];

                if (!acc[category]) acc[category] = [];
                acc[category].push({name, description, ingredients});
                return acc;
              }, {});

              console.log("groupedMenu ", groupedMenu)

              if (Object.keys(groupedMenu).length) {
                for (const categoryName in groupedMenu) {
                  let categoryDoc = await Category.findOne({ 
                    name: categoryName, 
                    restaurantRef: "689721e0bd4872dc0c7912c4",
                    createdBy: "689721e0bd4872dc0c7912c7"
                   });
                  if (!categoryDoc) {
                    categoryDoc = await Category.create({ 
                      name: categoryName, 
                      restaurantRef: "689721e0bd4872dc0c7912c4",
                      createdBy: "689721e0bd4872dc0c7912c7"
                    });
                  }

                  const menuItems = groupedMenu[categoryName];
                  for (const menuItem of menuItems) {
                    const {name, description, ingredients} = menuItem;

                    await Menu.insertMany([{
                      name,
                      description,
                      ingredients,
                      categoryRef: categoryDoc._id,
                      restaurantRef: "689721e0bd4872dc0c7912c4",
                      createdBy: "689721e0bd4872dc0c7912c7"
                    }], { ordered: false });

                  }

                  

                }
              }
              console.log("completed ");

              // console.log('rows found in excel file', rows);
              // console.log('data found in excel file', data);
              // const insertedDocs = await Story.insertMany(data, { ordered: false });
              // remove the file after uploading
              // if (filePath) {
              //   fs.unlinkSync(filePath);
              // }
              // // increase story count in city reference
              // updateCity(insertedDocs, city);
              // console.log('Bulk upload completed successfully! ');
            } catch (err) {
              console.log('Error in bulk upload ', JSON.stringify(err));
              // if (err.insertedDocs) {
              //   // remove the file after uploading
              //   if (filePath) {
              //     fs.unlinkSync(filePath);
              //   }
              //   if (err.insertedDocs.length) {
              //     updateCity(err.insertedDocs, city);
              //   }
              // }
            }
          }
        }
      }
    }
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
