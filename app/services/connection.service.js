const calculateDistance = require('../util/calculateDistance');

const service = {};

service.getConnectionsByYearRange = async (modelsService, yearTo, yearFrom) => {
  const yearFromQuery = yearFrom ? { $gt: parseInt(yearFrom) - 1 } : null;
  const connections = await modelsService.getModel('Connection')
    .find({ year: { ...yearFromQuery, $lt: parseInt(yearTo) + 1 } })
    .populate({ path: 'line', select: 'name shortName colour fontColour' })
    .populate({ path: 'stations', select: 'name geometry' })
  return { statusCode: 200, data: connections };
}

service.addConnection = async (modelsService, obj) => {
  const Connection = await modelsService.getModel('Connection');
  // Check if already exists a connection with the same two stations
  const existingCon = await Connection.findOne({ stations: obj.stations, line: obj.line });
  if (existingCon) {
    return { statusCode: 400, data: 'Connection with same two stations and line already exists' };
  }
  const Station = await modelsService.getModel('Station');
  const Line = await modelsService.getModel('Line');
  const stations = [];
  const line = await Line.findOne({ _id: obj.line });
  for (const s of obj.stations) {
    const station = await Station.findOne({ _id: s });
    stations.push(station);
  }
  if (!isConnectionValid(stations)) {
    return { statusCode: 400, data: 'Stations need to be two' };
  }
  const objSchema = {
    year: obj.year,
    yearEnd: obj.yearEnd,
    stations: obj.stations,
    distance: calculateDistance(stations[0].geometry.coordinates, stations[1].geometry.coordinates),
    line: obj.line,
  }
  const newObj = new Connection(objSchema);
  const doc = await newObj.save();
  await updateRelationship(false, stations, doc._id);
  await updateRelationship(false, [line], doc._id);
  return { statusCode: 200, data: doc };
}

service.removeConnection = async (modelsService, connectionId) => {
  const doc = await modelsService.getModel('Connection').findById(connectionId);
  await doc.remove();
  const stations = await modelsService.getModel('Station').find({ connections: { "$in": [connectionId] } });
  updateRelationship(true, stations, connectionId);
  const lines = await modelsService.getModel('Line').find({ connections: { "$in": [connectionId] } });
  updateRelationship(true, lines, connectionId);
  return { statusCode: 202, data: doc };
}

const isConnectionValid = (stations) => {
  if (!stations || stations.length !== 2) {
    return false;
  }
  return true;
}

const updateRelationship = async (removeMode, elementsToUpdate, connectionId) => {
  for (const e of elementsToUpdate) {
    if (!removeMode) {
      if (!e.connections) {
        e.connections = [];
      }
      e.connections.push(connectionId);
    } else {
      const index = e.connections.indexOf(connectionId);
      e.connections.splice(index, 1);
    }
    await e.save();
  }
  return;
}

module.exports = service;