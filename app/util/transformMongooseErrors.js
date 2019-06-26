let transformMongooseErrors;
if (process.env.DEV_MODE === 'true') {
  transformMongooseErrors = require('../../../../scaffolding/node-express-mongodb').util.transformMongooseErrors;
} else {
  transformMongooseErrors = require('node-express-mongodb').util.transformMongooseErrors;
}

module.exports = transformMongooseErrors;