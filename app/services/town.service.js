const service = {};
const getTown = require('../util/getTown');

service.getTownInfo = async (modelsService, townIdOrName) => {
  const town = await getTown(modelsService, townIdOrName, false);
  if (!town) {
    return { statusCode: 404, data: 'Town not found' };
  }
  return { statusCode: 200, data: town };
}

module.exports = service;