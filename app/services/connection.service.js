const calculateDistance = require('../util/calculateDistance');
const paginateResults = require('../util/paginateResults');
const verifyRoles = require('../auth/role-verification');
const transformMongooseErrors = require('../util/transformMongooseErrors');
const addCreatedAndModified = require('../util/addCreatedAndModified');
const validatePagination = require('../util/validatePagination');

const service = {};

// service.getConnectionsByYearRange = async (modelsService, townIdOrName, yearTo, yearFrom) => {
//   const townId = await getTown(modelsService, townIdOrName);
//   if (!townId) {
//     return { statusCode: 404, data: 'Town not found' };
//   }
//   const yearFromQuery = yearFrom ? { $gt: parseInt(yearFrom) - 1 } : null;
//   const connections = await modelsService.getModel('Connection')
//     .find({ town: townId, year: { ...yearFromQuery, $lt: parseInt(yearTo) + 1 } })
//     .populate({ path: 'line', select: 'name shortName colour fontColour' })
//     .populate({ path: 'stations', select: 'name geometry' })
//   return { statusCode: 200, data: connections };
// }

service.searchConnections = async (modelsService, user, draftId, body) => {
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

  let connections = await modelsService.getModel('Connection')
    .find(searchParams.filter)
    .sort(searchParams.sort)
    .select(searchParams.select)
    .populate(searchParams.populate);

  return { statusCode: 200, data: paginateResults(connections, body.pagination) };
}

service.getConnectionFullInfo = async (modelsService, user, connectionId) => {
  if (!verifyRoles(['U', 'A'], user)) {
    return { statusCode: 401, data: 'Unauthorized' };
  }
  const connection = await modelsService.getModel('Connection')
    .findById(connectionId)
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

service.addConnection = async (modelsService, user, draftId, connectionObj) => {
  if (!verifyRoles(['M', 'A'], user, draftId)) {
    return { statusCode: 401, data: 'Unauthorized' };
  }

  const draft = await modelsService.getModel('Draft').findOne({ _id: draftId });
  if (!draft) {
    return { statusCode: 404, data: 'Draft does not exist' };
  }

  if (draft.isPublished) {
    return { statusCode: 403, data: 'Draft can not be updated as it is published' };
  }

  const Connection = modelsService.getModel('Connection');
  const existingCon = await Connection.findOne({ stations: connectionObj.stations, line: connectionObj.line });
  if (existingCon) {
    return { statusCode: 400, data: 'Connection with same two stations and line already exists' };
  }

  const stations = await modelsService.getModel('Station').find({ '_id': { $in: connectionObj.stations }, 'draft': draftId }).populate({ path: 'connections', populate: { path: 'line' } });
  if (stations.length !== 2) {
    return { statusCode: 400, data: 'Stations need to be two' };
  }
  const objSchema = {
    draft: draftId,
    line: connectionObj.line,
    stations: connectionObj.stations.sort(),
    year: connectionObj.year,
    yearEnd: connectionObj.yearEnd,
    distance: calculateDistance(stations[0].geometry.coordinates, stations[1].geometry.coordinates),
  }
  const connection = new Connection(addCreatedAndModified(objSchema, user, true));

  try {
    connection.save();
  }
  catch (err) {
    return { statusCode: 400, data: transformMongooseErrors(err) };
  }

  const line = await modelsService.getModel('Line').findOne({ _id: connectionObj.line });

  stations.forEach(station => updateMarkerIcon(station, connection, 'add'));
  updateRelationship(false, stations, connection._id);
  updateRelationship(false, [line], connection._id);

  for (const s of stations) {
    await s.save();
  }
  await line.save();

  // Add connection ref to draft
  draft.connections.push(connection._id);
  await draft.save();

  return { statusCode: 200, data: connection };
}

service.updateConnection = async (modelsService, user, connectionId, connectionObj) => {
  const connection = await modelsService.getModel('Connection').findOne({ _id: connectionId }).populate({ path: 'draft', select: 'isPublished' });
  if (!connection) {
    return { statusCode: 404, data: 'Connection does not exist' };
  }

  if (!verifyRoles(['M', 'A'], user, connection.draft._id)) {
    return { statusCode: 401, data: 'Unauthorized' };
  }

  if (connection.draft.isPublished) {
    return { statusCode: 403, data: 'Draft can not be updated as it is published' };
  }

  connectionObj.stations.sort();

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
  if (!connection) {
    return { statusCode: 404, data: 'Connection does not exist' };
  }

  const draft = await modelsService.getModel('Draft').findOne({ _id: connection.draft });

  if (!verifyRoles(['M', 'A'], user, draft._id)) {
    return { statusCode: 401, data: 'Unauthorized' };
  }

  if (draft.isPublished) {
    return { statusCode: 403, data: 'Draft can not be updated as it is published' };
  }

  try {
    await connection.remove();
  }
  catch (err) {
    return { statusCode: 400, data: transformMongooseErrors(err) };
  }

  const line = await modelsService.getModel('Line').findOne({ _id: connection.line });
  const stations = await modelsService.getModel('Station').find({ '_id': { $in: connection.stations }, 'draft': draft._id }).populate({ path: 'connections', populate: { path: 'line' } });

  stations.forEach(station => updateMarkerIcon(station, connection, 'remove'));
  updateRelationship(true, stations, connection._id);
  updateRelationship(true, [line], connection._id);

  for (const s of stations) {
    await s.save();
  }
  await line.save();

  // Remove connection ref from draft
  draft.connections = draft.connections.filter(c => !c.equals(connection._id));
  await draft.save();

  return { statusCode: 200, data: `${connection._id} was removed` };
}

// service.updateMarkerIconForAllStations = async (modelsService) => {
//   const stations = await modelsService.getModel('Station').find({}).populate({ path: 'connections', populate: { path: 'line' } });
//   for (const s of stations) {
//     await updateMarkerIcon(s);
//   }
//   return { statusCode: 200, data: 'Stations markers updated correctly' };
// }

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