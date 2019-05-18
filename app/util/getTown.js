const ObjectId = require('mongoose').Types.ObjectId;

const getTown = async (modelsService, townIdOrName, onlyId = true, customPopulate = []) => {
  let town;
  if (ObjectId.isValid(townIdOrName)) {
    if (onlyId) {
      return townIdOrName;
    }
    town = await modelsService.getModel('Town').findOne({ _id: townIdOrName }).populate([{ path: 'country', select: 'name code continent' }].concat(customPopulate));
  } else {
    town = await modelsService.getModel('Town').findOne({ url: townIdOrName }).populate([{ path: 'country', select: 'name code continent' }].concat(customPopulate));
  }
  return town;
}

module.exports = getTown;