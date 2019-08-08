const service = {};
const getTown = require('../util/getTown');
const transformDraftAmounts = require('../util/transformDraftAmounts');
const verifyRoles = require('../auth/role-verification');

service.getOwnUserInfo = async (modelsService, userId) => {
  const extendedUser = await modelsService.getModel('User')
    .findOne({ _id: userId })
    .populate([
      { path: 'drafts', select: 'name isPublished linesAmount stationsAmount connectionsAmount town', populate: { path: 'town', select: 'name url imgCard country year', populate: { path: 'country', select: 'code name' } } },
      { path: 'country' }
    ]);
  extendedUser.drafts = extendedUser.drafts.map(d => transformDraftAmounts(d));
  return { statusCode: 200, data: extendedUser };
}

service.getUserInfo = async (modelsService, user, userId) => {
  if (!verifyRoles(['A'], user)) {
    return { statusCode: 401, data: 'Unauthorized' };
  }
  if (!userId) {
    return { statusCode: 400, data: 'userId is required' };
  }
  const extendedUser = await modelsService.getModel('User')
    .findOne({ _id: userId })
    .populate([
      { path: 'drafts', select: 'name isPublished linesAmount stationsAmount connectionsAmount town', populate: { path: 'town', select: 'name' } },
      { path: 'country' }
    ]);
  extendedUser.drafts = extendedUser.drafts.map(d => transformDraftAmounts(d));
  return { statusCode: 200, data: extendedUser };
}

module.exports = service;