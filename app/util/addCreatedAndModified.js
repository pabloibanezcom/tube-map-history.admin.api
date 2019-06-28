let addCreatedAndModified;
if (process.env.DEV_MODE === 'true') {
  addCreatedAndModified = require('../../../../node-express-mongodb').util.addCreatedAndModified;
} else {
  addCreatedAndModified = require('node-express-mongodb').util.addCreatedAndModified;
}

module.exports = addCreatedAndModified;