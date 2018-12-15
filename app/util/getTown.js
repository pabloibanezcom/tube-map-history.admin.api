const ObjectId = require('mongoose').Types.ObjectId;

const getTown = async (modelsService, townIdOrName, onlyId = true) => {
  let town;
  if (ObjectId.isValid(townIdOrName)) {
    if (onlyId) {
      return onlyId;
    }
    town = await modelsService.getModel('Town').findOne({ _id: townIdOrName });
  } else {
    town = await modelsService.getModel('Town').findOne({ url: townIdOrName });
  }
  return town;
}

module.exports = getTown;