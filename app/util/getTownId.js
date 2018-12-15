const ObjectId = require('mongoose').Types.ObjectId;

const getTownId = async (modelsService, townIdOrName) => {
  if (ObjectId.isValid(townIdOrName)) {
    return townIdOrName;
  } else {
    const town = await modelsService.getModel('Town').findOne({ url: townIdOrName });
    return town ? town.id : null;
  }
}

module.exports = getTownId;