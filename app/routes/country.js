const service = require('../services/country.service');

module.exports = (app, modelsService) => {

  const registerGetCountries = () => {
    const url = '/api/countries';
    app.get(url,
      (req, res) => {
        service.getCountries(modelsService)
          .then(result => res.status(result.statusCode).send(result.data))
          .catch(err => res.status(500).send(err));
      });
    app.routesInfo['Country'].push({ model: 'Country', name: 'Get countries', method: 'GET', url: url });
  }

  app.routesInfo['Country'] = [];
  registerGetCountries();

};