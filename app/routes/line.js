const service = require('../services/line.service');

module.exports = (app, modelsService) => {

  const registerGetLineFullInfo = () => {
    const url = '/api/line/full/:lineId';
    app.get(url,
      (req, res) => {
        service.getLineFullInfo(modelsService, req.params.lineId)
          .then(result => res.status(result.statusCode).send(result.data))
          .catch(err => res.status(500).send(err));
      });
    app.routesInfo['Line'].push({ model: 'Line', name: 'Get full info from line', method: 'GET', url: url });
  }

  const registerCalculateLineDistance = () => {
    const url = '/api/line/calculate-distance/:lineId';
    app.get(url,
      (req, res) => {
        service.calculateLineDistance(modelsService, req.params.lineId)
          .then(result => res.status(result.statusCode).send(result.data))
          .catch(err => res.status(500).send(err));
      });
    app.routesInfo['Line'].push({ model: 'Line', name: 'Calculate line distance', method: 'GET', url: url });
  }

  registerGetLineFullInfo();
  registerCalculateLineDistance();

};