const service = {};
const getTown = require('../util/getTown');

service.getUserInfo = async (modelsService, user) => {
  const extendedUser = await modelsService.getModel('User')
    .findOne({ _id: user.id })
    .populate({ path: 'towns', select: 'town role', populate: { path: 'town', select: 'name' } });
  return { statusCode: 200, data: extendedUser };
}

service.assignTownRoleToUser = async (modelsService, userId, townIdOrName, body) => {
  let newUserTown;
  if (!body.role) {
    return { statusCode: 400, data: 'No role defined' };
  }
  const town = await getTown(modelsService, townIdOrName, false);
  const UserTown = modelsService.getModel('UserTown');
  let userTown = await UserTown.findOne({ user: userId, town: town._id });
  if (!userTown) {
    userTown = new UserTown({
      user: userId,
      town: town,
      role: body.role
    });
    newUserTown = true;
  } else {
    userTown.role = body.role;
  }
  await userTown.save();

  if (newUserTown) {
    await modelsService.getModel('User').findOneAndUpdate({ _id: userId }, { "$push": { 'towns': userTown.id } });
    await modelsService.getModel('Town').findOneAndUpdate({ _id: town }, { "$push": { 'users': userTown.id } });
  }

  return { statusCode: 200, data: 'User role updated successfully' };
}

module.exports = service;