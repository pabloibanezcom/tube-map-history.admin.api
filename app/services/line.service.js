const paginateResults = require('../util/paginateResults');
const getTown = require('../util/getTown');
const verifyRoles = require('../auth/role-verification');
const transformMongooseErrors = require('../util/transformMongooseErrors');
const addCreatedAndModified = require('../util/addCreatedAndModified');
const service = {};

service.getLines = async (modelsService, townIdOrName) => {
  const townId = await getTown(modelsService, townIdOrName);
  if (!townId) {
    return { statusCode: 404, data: 'Town not found' };
  }
  const lines = await modelsService.getModel('Line')
    .find({ town: townId })
    .sort('order')
    .select('order key name shortName colour fontColour year distance stationsAmount lastModifiedDate lastModifiedUser');
  return { statusCode: 200, data: lines };
}

service.searchLines = async (modelsService, body) => {
  const searchParams = {
    filter: {},
    select: body.select || '',
    populate: body.populate || ''
  };
  if (body.filter && body.filter.name) {
    searchParams.filter.name = { $regex: body.filter.name, $options: 'i' };
  }
  let lines = await modelsService.getModel('Line')
    .find(searchParams.filter)
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

service.addLine = async (modelsService, user, townIdOrName, lineObj) => {
  const town = await getTown(modelsService, townIdOrName);
  if (!verifyRoles(['M', 'A'], user, town._id)) {
    return { statusCode: 401, data: 'Unauthorized' };
  }

  const Line = modelsService.getModel('Line');
  const line = new Line(addCreatedAndModified({ ...lineObj, town: town._id }, user, true));

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