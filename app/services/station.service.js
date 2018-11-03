const paginateResults = require('../util/paginateResults');
const wikipedia = require("node-wikipedia");
const service = {};

service.searchStations = async (modelsService, body) => {
  const searchParams = {
    filter: {},
    select: body.select || '',
    populate: body.populate || ''
  };
  if (body.filter && body.filter.name) {
    searchParams.filter.name = { $regex: body.filter.name, $options: 'i' };
  }
  if (body.filter && body.filter.year) {
    searchParams.filter.year = { $gte: body.filter.year.min, $lte: body.filter.year.max };
  }
  if (body.filter && body.filter.line) {
    searchParams.filter.connections = { $exists: true, $not: { $size: 0 } };
  }
  let stations = await modelsService.getModel('Station')
    .find(searchParams.filter)
    .select(searchParams.select)
    .populate(searchParams.populate);
  if (body.filter && body.filter.numberLines) {
    stations = stations.filter(st => {
      const lines = [];
      st.connections.map(c => {
        if (!lines.includes(c.line.id)) {
          lines.push(c.line.id);
        }
      });
      return lines.length >= body.filter.numberLines.min && lines.length <= body.filter.numberLines.max;
    });
  }
  if (body.filter && body.filter.line) {
    stations = stations.filter(st => st.connections.some(c => c.line.equals(body.filter.line)));
  }
  return { statusCode: 200, data: paginateResults(stations, body.pagination) };
}

service.getStationsByYearRange = async (modelsService, yearTo, yearFrom) => {
  const yearFromQuery = yearFrom ? { $gt: parseInt(yearFrom) - 1 } : null;
  const stations = await modelsService.getModel('Station')
    .find({ year: { ...yearFromQuery, $lt: parseInt(yearTo) + 1 } });
  return { statusCode: 200, data: stations };
}

service.updateStation = async (modelsService, stationId, body) => {
  const station = await modelsService.getModel('Station').findOne({ _id: stationId });
  station.name = body.name;
  station.geometry = body.geometry;
  station.farezones = body.farezones;
  station.year = body.year;
  station.yearEnd = body.yearEnd;
  await station.save();
  return { statusCode: 200, data: station };
}

service.addConnection = async (modelsService, stationId, body) => {
  const station = await modelsService.getModel('Station').findOne({ _id: stationId });
  if (!station) {
    return { statusCode: 404, data: 'Station not found' };
  }
  const line = await modelsService.getModel('Line').findOne({ _id: body.line });
  const otherStation = await modelsService.getModel('Station').findOne({ _id: body.station });
  if (!station || !line || !otherStation) {
    return { statusCode: 404, data: 'Data not found' };
  }
  station.connections.push({
    line: line._id,
    station: otherStation._id,
    year: body.year,
    yearEnd: body.yearEnd
  });
  await station.save();
  return { statusCode: 200, data: station };
}

service.updateConnection = async (modelsService, stationId, connectionId, body) => {
  const station = await modelsService.getModel('Station').findOne({ _id: stationId });
  if (!station) {
    return { statusCode: 404, data: 'Station not found' };
  }
  const con = station.connections.find(c => c.id === connectionId);
  if (!con) {
    return { statusCode: 404, data: 'Connection not found' };
  }
  const line = await modelsService.getModel('Line').findOne({ _id: body.line });
  const otherStation = await modelsService.getModel('Station').findOne({ _id: body.station });
  if (!station || !line || !otherStation) {
    return { statusCode: 404, data: 'Data not found' };
  }
  con.line = line._id;
  con.station = otherStation._id;
  con.year = body.year;
  con.yearEnd = body.yearEnd;
  await station.save();
  return { statusCode: 200, data: station };
}

service.getStationWiki = async (stationName) => {
  wikipedia.page.data("Clifford_Brown", { content: true }, function (response) {
    console.log(response);
  });
  return { statusCode: 200, data: {} };
}

module.exports = service;