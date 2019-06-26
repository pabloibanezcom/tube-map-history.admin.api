let getPostmanBodyFromModelDef;
if (process.env.DEV_MODE === 'true') {
  getPostmanBodyFromModelDef = require('../../../../scaffolding/node-express-mongodb').util.getPostmanBodyFromModelDef;
} else {
  getPostmanBodyFromModelDef = require('node-express-mongodb').util.getPostmanBodyFromModelDef;
}

module.exports = getPostmanBodyFromModelDef;