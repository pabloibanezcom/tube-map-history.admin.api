const service = {};

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