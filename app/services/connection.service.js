const calculateDistance = require('../util/calculateDistance');
const paginateResults = require('../util/paginateResults');
const getTown = require('../util/getTown');
const verifyRoles = require('../auth/role-verification');
const transformMongooseErrors = require('../util/transformMongooseErrors');
const addCreatedAndModified = require('../util/addCreatedAndModified');
const validatePagination = require('../util/validatePagination');

const service = {};

service.getConnectionsByYearRange = async (modelsService, townIdOrName, yearTo, yearFrom) => {
  const townId = await getTown(modelsService, townIdOrName);
  if (!townId) {
    return { statusCode: 404, data: 'Town not found' };
  }
  const yearFromQuery = yearFrom ? { $gt: parseInt(yearFrom) - 1 } : null;
  const connections = await modelsService.getModel('Connection')
    .find({ town: townId, year: { ...yearFromQuery, $lt: parseInt(yearTo) + 1 } })
    .populate({ path: 'line', select: 'name shortName colour fontColour' })
    .populate({ path: 'stations', select: 'name geometry' })
  return { statusCode: 200, data: connections };
}

service.getConnectionFullInfo = async (modelsService, user, connectionId) => {
  if (!verifyRoles(['U', 'A'], user)) {
    return { statusCode: 401, data: 'Unauthorized' };
  }
  const connection = await modelsService.getModel('Connection').findOne({ _id: connectionId })
    .populate([
      { path: 'town', select: 'name country' },
      { path: 'line', select: 'name shortName colour fontColour' },
      { path: 'stations', select: 'name year markerIcon' }
    ]);
  if (!connection) {
    return { statusCode: 404, data: 'Connection not found' };
  }
  return { statusCode: 200, data: connection };
}

service.addConnection = async (modelsService, user, townIdOrName, connectionObj) => {
  const town = await getTown(modelsService, townIdOrName);
  if (!verifyRoles(['M', 'A'], user, town._id)) {
    return { statusCode: 401, data: 'Unauthorized' };
  }

  const Connection = modelsService.getModel('Connection');
  const existingCon = await Connection.findOne({ stations: connectionObj.stations, line: connectionObj.line });
  if (existingCon) {
    return { statusCode: 400, data: 'Connection with same two stations and line already exists' };
  }

  const stations = await modelsService.getModel('Station').find({ '_id': { $in: connectionObj.stations }, 'town': town._id }).populate({ path: 'connections', populate: { path: 'line' } });
  if (stations.length !== 2) {
    return { statusCode: 400, data: 'Stations need to be two' };
  }
  const objSchema = {
    town: town._id,
    line: connectionObj.line,
    stations: connectionObj.stations.sort(),
    year: connectionObj.year,
    yearEnd: connectionObj.yearEnd,
    distance: calculateDistance(stations[0].geometry.coordinates, stations[1].geometry.coordinates),
  }
  const newObj = new Connection(addCreatedAndModified(objSchema, user, true));

  let doc;

  try {
    doc = await newObj.save();
  }
  catch (err) {
    return { statusCode: 400, data: transformMongooseErrors(err) };
  }

  const line = await modelsService.getModel('Line').findOne({ _id: connectionObj.line });
  doc.line = line;

  stations.forEach(station => updateMarkerIcon(station, doc, 'add'));
  updateRelationship(false, stations, doc._id);
  updateRelationship(false, [line], doc._id);

  for (const s of stations) {
    await s.save();
  }
  await line.save();

  return { statusCode: 200, data: doc };
}

service.updateConnection = async (modelsService, user, connectionId, connectionObj) => {
  connectionObj.stations.sort();
  const connection = await modelsService.getModel('Connection').findOne({ _id: connectionId });
  if (!verifyRoles(['C', 'A'], user, null, connection)) {
    return { statusCode: 401, data: 'Unauthorized' };
  }

  const oldLine = connection.line;
  const newLine = connectionObj.line;
  const oldStations = connection.stations;
  const newStations = connectionObj.stations;

  if (oldLine !== newLine || oldStations !== newStations) {
    const existingCon = await modelsService.getModel('Connection').findOne({ _id: { $ne: connectionId }, stations: connectionObj.stations, line: connectionObj.line });
    if (existingCon) {
      return { statusCode: 400, data: 'Connection with same two stations and line already exists' };
    }
  }

  const stations = await modelsService.getModel('Station').find({ '_id': { $in: connectionObj.stations } }).populate({ path: 'connections', populate: { path: 'line' } });
  if (stations.length !== 2) {
    return { statusCode: 400, data: 'Stations need to be two' };
  }

  Object.assign(connection, addCreatedAndModified(connectionObj, user, false));

  try {
    await connection.save();
  }
  catch (err) {
    return { statusCode: 400, data: transformMongooseErrors(err) };
  }

  // Removing from old line if change
  if (oldLine !== newLine) {
    const oldLineDoc = await modelsService.getModel('Line').findOne({ _id: oldLine });
    updateRelationship(true, [oldLineDoc], connection._id);
    await oldLineDoc.save();

    const newLineDoc = await modelsService.getModel('Line').findOne({ _id: newLine });
    updateRelationship(false, [newLineDoc], connection._id);
    await newLineDoc.save();
  }

  // Removing from old station/s if change
  if (oldStations !== newStations) {
    for (const stationId of oldStations) {
      if (!newStations.find(sId => sId == stationId)) {
        const oldStationDoc = await modelsService.getModel('Station').findOne({ _id: stationId });
        updateRelationship(true, [oldStationDoc], connection._id);
        await oldStationDoc.save();
      }
    }

    for (const stationId of newStations) {
      if (!oldStations.find(sId => sId == stationId)) {
        const newStationDoc = await modelsService.getModel('Station').findOne({ _id: stationId });
        updateRelationship(false, [newStationDoc], connection._id);
        await newStationDoc.save();
      }
    }
  }

  return { statusCode: 200, data: connection };

}

service.deleteConnection = async (modelsService, user, connectionId) => {
  const connection = await modelsService.getModel('Connection').findOne({ _id: connectionId });
  if (!verifyRoles(['C', 'A'], user, null, connection)) {
    return { statusCode: 401, data: 'Unauthorized' };
  }

  try {
    await connection.remove();
    return { statusCode: 200, data: `${connection._id} was removed` };
  }
  catch (err) {
    return { statusCode: 400, data: transformMongooseErrors(err) };
  }
}

service.updateMarkerIconForAllStations = async (modelsService) => {
  const stations = await modelsService.getModel('Station').find({}).populate({ path: 'connections', populate: { path: 'line' } });
  for (const s of stations) {
    await updateMarkerIcon(s);
  }
  return { statusCode: 200, data: 'Stations markers updated correctly' };
}

const updateRelationship = (removeMode, elementsToUpdate, connectionId) => {
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
  }
  return;
}

const updateMarkerIcon = (station, connection, operation) => {
  let connections;
  if (operation === 'add') {
    connections = [connection].concat(station.connections);
  } else if (operation === 'remove') {
    connections = station.connections.filter(c => c.id !== connection.id);
  } else {
    connections = station.connections.slice(0);
  }
  const uniqueLines = [...new Set(connections.map(c => { return c.line.key }))];
  station.markerIcon = uniqueLines.length === 1 ? uniqueLines[0] : 'multiple';
  return;
}

module.exports = service;