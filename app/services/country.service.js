const service = {};

service.getCountries = async (modelsService) => {
  const countries = await modelsService.getModel('Country')
    .find({})
    .sort('name')
    .select('code name continent');
  return { statusCode: 200, data: countries };
}

module.exports = service;