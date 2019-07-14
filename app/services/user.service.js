const service = {};
const getTown = require('../util/getTown');
const verifyRoles = require('../auth/role-verification');

service.getOwnUserInfo = async (modelsService, userId) => {
  const extendedUser = await modelsService.getModel('User')
    .findOne({ _id: userId })
    .populate({ path: 'towns', select: 'town role', populate: { path: 'town', select: 'name' } });
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
    .populate({ path: 'towns', select: 'town role', populate: { path: 'town', select: 'name' } });
  return { statusCode: 200, data: extendedUser };
}

service.assignTownRoleToUser = async (modelsService, user, assignedUserId, townIdOrName, body) => {

  if (!verifyRoles(['A'], user)) {
    return { statusCode: 401, data: 'Unauthorized' };
  }
  if (!body.role) {
    return { statusCode: 400, data: 'No role defined' };
  }
  let newUserTown;
  const town = await getTown(modelsService, townIdOrName, false);
  const UserTown = modelsService.getModel('UserTown');
  let userTown = await UserTown.findOne({ user: assignedUserId, town: town._id });
  if (!userTown) {
    userTown = new UserTown({
      user: assignedUserId,
      town: town,
      role: body.role
    });
    newUserTown = true;
  } else {
    userTown.role = body.role;
  }
  await userTown.save();

  if (newUserTown) {
    await modelsService.getModel('User').findOneAndUpdate({ _id: assignedUserId }, { "$push": { 'towns': userTown.id } });
    await modelsService.getModel('Town').findOneAndUpdate({ _id: town }, { "$push": { 'users': userTown.id } });
  }

  return { statusCode: 200, data: 'User role updated successfully' };
}

module.exports = service;