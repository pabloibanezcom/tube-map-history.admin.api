const service = require('../services/town.service');

module.exports = (app, modelsService) => {

  const registerGetTownInfo = () => {
    const url = '/api/town/:townId';
    app.get(url,
      (req, res) => {
        service.getTownInfo(modelsService, req.params.townId)
          .then(result => res.status(result.statusCode).send(result.data))
          .catch(err => res.status(500).send(err));
      });
    app.routesInfo['Town'].push({ model: 'Town', name: 'Get town info', method: 'GET', url: url });
  }

  app.routesInfo['Town'] = [];
  registerGetTownInfo();

};