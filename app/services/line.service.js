const paginateResults = require('../util/paginateResults');
const getDraft = require('../util/getDraft');
const verifyRoles = require('../auth/role-verification');
const transformMongooseErrors = require('../util/transformMongooseErrors');
const addCreatedAndModified = require('../util/addCreatedAndModified');
const validatePagination = require('../util/validatePagination');
const service = {};

service.searchLines = async (modelsService, user, draftId, body) => {
  if (!verifyRoles(['U', 'A'], user)) {
    return { statusCode: 401, data: 'Unauthorized' };
  }
  if (!validatePagination(body.pagination)) {
    return { statusCode: 400, data: 'Bad request: Pagination is wrong format' };
  }

  const searchParams = {
    filter: {
      draft: draftId
    },
    sort: body.sort || '',
    select: body.select || '',
    populate: body.populate || ''
  };

  if (body.filter && body.filter.name) {
    searchParams.filter.name = { $regex: body.filter.name, $options: 'i' };
  }

  let lines = await modelsService.getModel('Line')
    .find(searchParams.filter)
    .sort(searchParams.sort)
    .select(searchParams.select)
    .populate(searchParams.populate);

  return { statusCode: 200, data: paginateResults(lines, body.pagination) };
}

service.getLineFullInfo = async (modelsService, user, lineId) => {
  if (!verifyRoles(['U', 'A'], user)) {
    return { statusCode: 401, data: 'Unauthorized' };
  }
  const line = await modelsService.getModel('Line')
    .findById(lineId)
    .select('name key shortName colour fontColour startStations year distance lastModifiedDate lastModifiedUser')
    .populate(
      [
        { path: 'connections', select: 'stations year yearEnd distance', populate: { path: 'stations', select: 'name markerIcon' } },
        { path: 'lastModifiedUser', select: 'firstName lastName country' },
        { path: 'created.user', select: 'firstName lastName country' }
      ]
    )
  if (!line) {
    return { statusCode: 404, data: 'Line not found' };
  }
  return { statusCode: 200, data: { ...line._doc, connections: sortConnections(line._doc.connections, line._doc.startStations) } };
}

service.calculateLineDistance = async (modelsService, lineId) => {
  const line = await smodelsService.getModel('Line')
    .findById(lineId)
    .populate({ path: 'connections', select: 'distance' })
  if (!line) {
    return { statusCode: 404, data: 'Line not found' };
  }
  line.distance = line.connections.map(c => c.distance).reduce((prev, next) => { return prev + next });
  await line.save();
  return { statusCode: 202, data: `${line.name} total distance: ${line.distance}` };
}

service.addLine = async (modelsService, user, draftId, lineObj) => {
  const draft = await getDraft(modelsService, draftId);
  if (!verifyRoles(['M', 'A'], user, draft.town._id)) {
    return { statusCode: 401, data: 'Unauthorized' };
  }

  const Line = modelsService.getModel('Line');
  const line = new Line(addCreatedAndModified({ ...lineObj, draft: draftId }, user, true));

  try {
    const doc = await line.save();
    return { statusCode: 200, data: doc };
  }
  catch (err) {
    return { statusCode: 400, data: transformMongooseErrors(err) };
  }
}

service.updateLine = async (modelsService, user, lineId, lineObj) => {
  const line = await modelsService.getModel('Line').findOne({ _id: lineId });
  if (!verifyRoles(['C', 'A'], user, null, line)) {
    return { statusCode: 401, data: 'Unauthorized' };
  }

  Object.assign(line, addCreatedAndModified(lineObj, user, false));

  try {
    await line.save();
    return { statusCode: 200, data: line };
  }
  catch (err) {
    return { statusCode: 400, data: transformMongooseErrors(err) };
  }
}

service.deleteLine = async (modelsService, user, lineId) => {
  const line = await modelsService.getModel('Line').findOne({ _id: lineId });
  if (!verifyRoles(['C', 'A'], user, null, line)) {
    return { statusCode: 401, data: 'Unauthorized' };
  }

  try {
    await line.remove();
    return { statusCode: 200, data: `${line.name} (${line.key}) was removed` };
  }
  catch (err) {
    return { statusCode: 400, data: transformMongooseErrors(err) };
  }
}

const sortConnections = (connections, startStations) => {
  return connections;
}

module.exports = service;