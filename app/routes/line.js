const service = require('../services/line.service');
const getPostmanBodyFromModelDef = require('../util/getPostmanBodyFromModelDef');
const filterBodyForAction = require('../util/filterBodyForAction');

module.exports = (app, modelsService, passport, modelDefinition) => {

  const registerGetLines = () => {
    const url = '/api/:town/lines';
    app.get(url,
      (req, res) => {
        service.getLines(modelsService, req.params.town)
          .then(result => res.status(result.statusCode).send(result.data))
          .catch(err => res.status(500).send(err));
      });
    app.routesInfo['Line'].push({ model: 'Line', name: 'Get lines in town', method: 'GET', url: url });
  }

  const registerGetLineFullInfo = () => {
    const url = '/api/line/:lineId';
    app.get(url,
      (req, res) => {
        service.getLineFullInfo(modelsService, req.params.lineId)
          .then(result => res.status(result.statusCode).send(result.data))
          .catch(err => res.status(500).send(err));
      });
    app.routesInfo['Line'].push({ model: 'Line', name: 'Get full info from line', method: 'GET', url: url });
  }

  const registerAddLine = () => {
    const url = '/api/:town/line';
    app.post(url,
      passport.authenticate('local-user', { session: false }),
      (req, res) => {
        service.addLine(modelsService, req.user, req.params.town, filterBodyForAction(modelDefinition, 'add', req.body))
          .then(result => res.status(result.statusCode).send(result.data))
          .catch(err => res.status(500).send(err));
      });
    app.routesInfo['Line'].push({ model: 'Line', name: 'Add line', method: 'POST', url: url, auth: true, body: getPostmanBodyFromModelDef(modelDefinition, 'add') });
  }

  const registerUpdateLine = () => {
    const url = '/api/line/:lineId';
    app.put(url,
      passport.authenticate('local-user-with-towns', { session: false }),
      (req, res) => {
        service.updateLine(modelsService, req.user, req.params.lineId, filterBodyForAction(modelDefinition, 'update', req.body))
          .then(result => res.status(result.statusCode).send(result.data))
          .catch(err => res.status(500).send(err));
      });
    app.routesInfo['Line'].push({ model: 'Line', name: 'Update line', method: 'PUT', url: url, auth: true, body: getPostmanBodyFromModelDef(modelDefinition, 'update') });
  }

  app.routesInfo['Line'] = [];
  registerGetLines();
  registerGetLineFullInfo();
  registerAddLine();
  registerUpdateLine();

};