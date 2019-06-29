const service = {};
const getTown = require('../util/getTown');

service.getTownInfo = async (modelsService, townIdOrName) => {
  const town = await getTown(modelsService, townIdOrName, false, [{ path: 'users', select: 'user role', populate: { path: 'user', select: 'firstName lastName' } }]);
  if (!town) {

    return { statusCode: 404, data: 'Town not found' };
  }
  return { statusCode: 200, data: town };
}

service.getTowns = async (modelsService) => {
  const towns = await modelsService.getModel('Town').find({})
    .populate({ path: 'country', select: 'name code continent' })
    .select('name country url alias year');
  return { statusCode: 200, data: towns };
}

module.exports = service;