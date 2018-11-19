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
    const station = await Station.findOne({ _id: s }).populate({ path: 'connections', populate: { path: 'line' } });
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
    order: obj.order
  }
  const newObj = new Connection(objSchema);
  const doc = await newObj.save();
  doc.line = line;
  for (const s of stations) {
    await updateMarkerIcon(s, doc, 'add');
  }
  await updateRelationship(false, stations, doc._id);
  await updateRelationship(false, [line], doc._id);
  return { statusCode: 200, data: doc };
}

service.removeConnection = async (modelsService, connectionId) => {
  const doc = await modelsService.getModel('Connection').findById(connectionId)
    .populate({ path: 'stations', populate: { path: 'connections', populate: { path: 'line' } } });
  const stations = doc.stations;
  await doc.remove();
  for (const s of stations) {
    await updateMarkerIcon(s, doc, 'remove');
  }
  updateRelationship(true, stations, connectionId);
  const lines = await modelsService.getModel('Line').find({ connections: { "$in": [connectionId] } });
  updateRelationship(true, lines, connectionId);
  return { statusCode: 202, data: doc };
}

service.updateMarkerIconForAllStations = async (modelsService) => {
  const stations = await modelsService.getModel('Station').find({}).populate({ path: 'connections', populate: { path: 'line' } });
  for (const s of stations) {
    await updateMarkerIcon(s);
  }
  return { statusCode: 200, data: 'Stations markers updated correctly' };
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

const updateMarkerIcon = async (station, connection, operation) => {
  let connections;
  if (operation === 'add') {
    connections = [connection].concat(station.connections);
  } else if (operation === 'remove') {
    connections = station.connections.filter(c => c.id !== connection.id);
  } else {
    connections = station.connections.slice(0);
  }
  const uniqueLines = [...new Set(connections.map(c => { return c.line.shortName }))];
  station.markerIcon = uniqueLines.length === 1 ? uniqueLines[0] : 'multiple';
  // station.markerColor = uniqueLines.length === 1 ? uniqueLines[0].colour : '#fff';
  await station.save();
}

module.exports = service;