const service = require('../services/town.service');

module.exports = (app, modelsService) => {

  const registerGetTowns = () => {
    const url = '/api/towns';
    app.get(url,
      (req, res) => {
        service.getTowns(modelsService)
          .then(result => res.status(result.statusCode).send(result.data))
          .catch(err => res.status(500).send(err));
      });
    app.routesInfo['Town'].push({ model: 'Town', name: 'Get towns', method: 'GET', url: url });
  }

  const registerGetTownInfo = () => {
    const url = '/api/town/:town';
    app.get(url,
      (req, res) => {
        service.getTownInfo(modelsService, req.params.town)
          .then(result => res.status(result.statusCode).send(result.data))
          .catch(err => res.status(500).send(err));
      });
    app.routesInfo['Town'].push({ model: 'Town', name: 'Get town info', method: 'GET', url: url });
  }

  app.routesInfo['Town'] = [];
  registerGetTowns();
  registerGetTownInfo();

};