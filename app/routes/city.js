const service = require('../services/city.service');

module.exports = (app, modelsService) => {

  const registerGetCityInfo = () => {
    const url = '/api/city/:cityId';
    app.get(url,
      (req, res) => {
        service.getCityInfo(modelsService, req.params.cityId)
          .then(result => res.status(result.statusCode).send(result.data))
          .catch(err => res.status(500).send(err));
      });
    app.routesInfo['City'].push({ model: 'City', name: 'Get city info', method: 'GET', url: url });
  }

  app.routesInfo['City'] = [];
  registerGetCityInfo();

};