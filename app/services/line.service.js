const service = {};

service.getLineFullInfo = async (modelsService, lineId) => {
  const line = await modelsService.getModel('Line')
    .findById(lineId)
    .select('name shortName colour fontColour startStations')
    .populate({ path: 'connections', select: 'stations year yearEnd distance', populate: { path: 'stations', select: 'name' } })
  if (!line) {
    return { statusCode: 404, data: 'Line not found' };
  }
  return { statusCode: 200, data: { ...line._doc, connections: sortConnections(line._doc.connections, line._doc.startStations) } };
}

const sortConnections = (connections, startStations) => {
  return connections;
}

module.exports = service;