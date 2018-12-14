const paginateResults = require('../util/paginateResults');
const service = {};

service.getLines = async (modelsService) => {
  const lines = await modelsService.getModel('Line')
    .find({})
    .sort('order')
    .select('order name shortName colour fontColour year distance stationsAmount');
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

service.getLineFullInfo = async (modelsService, lineId) => {
  const line = await modelsService.getModel('Line')
    .findById(lineId)
    .select('name shortName colour fontColour startStations year distance')
    .populate({ path: 'connections', select: 'stations year yearEnd distance', populate: { path: 'stations', select: 'name' } })
  if (!line) {
    return { statusCode: 404, data: 'Line not found' };
  }
  return { statusCode: 200, data: { ...line._doc, connections: sortConnections(line._doc.connections, line._doc.startStations) } };
}

service.calculateLineDistance = async (modelsService, lineId) => {
  const line = await modelsService.getModel('Line')
    .findById(lineId)
    .populate({ path: 'connections', select: 'distance' })
  if (!line) {
    return { statusCode: 404, data: 'Line not found' };
  }
  line.distance = line.connections.map(c => c.distance).reduce((prev, next) => { return prev + next });
  await line.save();
  return { statusCode: 202, data: `${line.name} total distance: ${line.distance}` };
}

const sortConnections = (connections, startStations) => {
  return connections;
}

module.exports = service;