const service = {};

service.getCityInfo = async (modelsService, cityId) => {
  const stations = await modelsService.getModel('Station').count({});
  const lines = await modelsService.getModel('Line').count({});
  const connections = await modelsService.getModel('Connection').count({});
  const result = {
    years: 155,
    stations: stations,
    lines: lines,
    connections: connections
  };
  return { statusCode: 200, data: result };
}

module.exports = service;