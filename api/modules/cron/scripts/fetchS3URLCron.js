const AWS = require("aws-sdk");
const cron = require("node-cron");

// Function to list all objects in a bucket (with pagination)
async function listAllObjects(bucket, prefix = "", s3) {
  let isTruncated = true;
  let marker;
  let allKeys = [];

  while (isTruncated) {
    const params = {
      Bucket: bucket,
      Prefix: prefix, // optional folder path
      Marker: marker,
    };

    const response = await s3.listObjectsV2(params).promise();

    const contents = response.Contents || [];
    contents.forEach((obj) => {
      allKeys.push(obj.Key);
    });

    isTruncated = response.IsTruncated;
    marker = response.NextMarker || (contents.length && contents[contents.length - 1].Key);
  }

  return allKeys;
}

// Function to generate image URLs
function generateUrls(keys, bucket, region) {
  return keys.map(
    (key) =>
      `${key}`
  );
}

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

const createTags = (urls) => {
  const fullArr = [];
  urls = urls.filter(url => url.includes('.jpg') || url.includes('.png'));
  urls.forEach(url => {
    const name = url.split('/').pop().split('.')[0];
    const cleaned = cleanAndTag(name);
    if (!cleaned.includes(cleaned.join(' '))) {
      cleaned.push(cleaned.join(' '));
    }
    fullArr.push({url,tags: cleaned});
  });
  return fullArr;
};

module.exports = function (app) {
  // cron will run every 1 hour, for testing make 0 as * for minute
  cron.schedule('* * * * *', async () => {
    // Configure AWS SDK
    console.log('cron will run every minute');
    const ImageByAI = app.models.ImageByAI;
    const s3 = new AWS.S3({
      accessKeyId: app.config.aws.s3.accessKeyId,
      secretAccessKey: app.config.aws.s3.secretAccessKey,
      region: app.config.aws.s3.region
    });
    // console.log("s3 ",s3);
    const keys = await listAllObjects(app.config.aws.s3.bucket, "common/menu/", s3);
    // console.log("keys ", keys);
    const urls = generateUrls(keys, app.config.aws.s3.bucket, app.config.aws.s3.region);
    // console.log("urls ", urls);
    const tagsWithUrl = createTags(urls);
    await ImageByAI.bulkWrite(
      tagsWithUrl.map(tag => ({
        updateOne: {
          filter: { url: tag.url },      // check if URL exists
          update: { $setOnInsert: tag }, // insert only new ones
          upsert: true
        }
      }))
    );
    console.log("Tags inserted or skipped duplicates");

    
  });
};
