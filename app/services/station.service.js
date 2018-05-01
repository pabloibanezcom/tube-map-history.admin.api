const wikipedia = require("node-wikipedia");
const service = {};

service.getStationsByYear = async (modelsService, year) => {
  const stations = await modelsService.getModel('Station')
  .find({ year: { $lt: parseInt(year) + 1 } })
  .populate({ path: 'connections.line', select: 'name colour' })
  .populate({ path: 'connections.station', select: 'name geometry' })
  return { statusCode: 200, data: stations };
}

service.addConnectionToStation = async (modelsService, body) => {
  const station = await modelsService.getModel('Station').findOne({_id: body.station});
  const line = await modelsService.getModel('Line').findOne({_id: body.line});
  const otherStation = await modelsService.getModel('Station').findOne({_id: body.otherStation});
  if (!station || !line || !otherStation ) {
    return { statusCode: 404, data: 'Data not found' };
  }
  if (station.connections === null || station.connections === undefined ) {
    station.connections = [];
  }
  station.connections.push({
    line: line._id,
    station: otherStation._id,
    year: body.year
  });
  await station.save();
  return { statusCode: 200, data: { station: station, line: line, otherStation: otherStation} };
}

service.updateConnection = async (modelsService, body) => {
  const station = await modelsService.getModel('Station').findOne({_id: body.station});
  const con = station.connections[0];
  const line = await modelsService.getModel('Line').findOne({_id: body.line});
  const otherStation = await modelsService.getModel('Station').findOne({_id: body.otherStation});
  if (!station || !line || !otherStation ) {
    return { statusCode: 404, data: 'Data not found' };
  }
  con.line = line._id;
  con.station = otherStation._id;
  con.year = body.year;
  await station.save();
  return { statusCode: 200, data: { station: station, line: line, otherStation: otherStation} };
}

service.getStationWiki = async (stationName) => {
  wikipedia.page.data("Clifford_Brown", { content: true }, function(response) {
    console.log(response);
  });
  return { statusCode: 200, data: {} };
}

module.exports = service;