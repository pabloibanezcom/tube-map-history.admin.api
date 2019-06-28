let filterBodyForAction;
if (process.env.DEV_MODE === 'true') {
  filterBodyForAction = require('../../../../node-express-mongodb').util.filterBodyForAction;
} else {
  filterBodyForAction = require('node-express-mongodb').util.filterBodyForAction;
}

module.exports = filterBodyForAction;