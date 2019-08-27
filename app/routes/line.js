const service = require('../services/line.service');
const getPostmanBodyFromModelDef = require('../util/getPostmanBodyFromModelDef');
const filterBodyForAction = require('../util/filterBodyForAction');
const log500 = require('../util/log500');
const defaultSearchBody = require('./defaultRequestBodies/default_search.json');

module.exports = (app, modelsService, passport, modelDefinition) => {

  const registerSearchLines = () => {
    const url = '/api/:draftId/line/search';
    app.post(url,
      passport.authenticate('local-user', { session: false }),
      (req, res) => {
        service.searchLines(modelsService, req.user, req.params.draftId, req.body)
          .then(result => res.status(result.statusCode).send(result.data))
          .catch(err => { log500(err); res.status(500).send(err) });
      });
    app.routesInfo['Line'].push({ model: 'Line', name: 'Search line', method: 'POST', url: url, auth: ['U', 'A'], body: defaultSearchBody });
  }

  const registerGetLineFullInfo = () => {
    const url = '/api/line/:lineId';
    app.get(url,
      passport.authenticate('local-user', { session: false }),
      (req, res) => {
        service.getLineFullInfo(modelsService, req.user, req.params.lineId)
          .then(result => res.status(result.statusCode).send(result.data))
          .catch(err => { log500(err); res.status(500).send(err) });
      });
    app.routesInfo['Line'].push({ model: 'Line', name: 'Get full info from line', method: 'GET', url: url, auth: ['U', 'A'] });
  }

  const registerAddLine = () => {
    const url = '/api/:draftId/line';
    app.post(url,
      passport.authenticate('local-user-with-drafts', { session: false }),
      (req, res) => {
        service.addLine(modelsService, req.user, req.params.draftId, filterBodyForAction(modelDefinition, 'add', req.body))
          .then(result => res.status(result.statusCode).send(result.data))
          .catch(err => { log500(err); res.status(500).send(err) });
      });
    app.routesInfo['Line'].push({ model: 'Line', name: 'Add line', method: 'POST', url: url, auth: ['M', 'A'], body: getPostmanBodyFromModelDef(modelDefinition, 'add') });
  }

  const registerUpdateLine = () => {
    const url = '/api/line/:lineId';
    app.put(url,
      passport.authenticate('local-user-with-drafts', { session: false }),
      (req, res) => {
        service.updateLine(modelsService, req.user, req.params.lineId, filterBodyForAction(modelDefinition, 'update', req.body))
          .then(result => res.status(result.statusCode).send(result.data))
          .catch(err => { log500(err); res.status(500).send(err) });
      });
    app.routesInfo['Line'].push({ model: 'Line', name: 'Update line', method: 'PUT', url: url, auth: ['C', 'A'], body: getPostmanBodyFromModelDef(modelDefinition, 'update') });
  }

  const registerDeleteLine = () => {
    const url = '/api/line/:lineId';
    app.delete(url,
      passport.authenticate('local-user-with-drafts', { session: false }),
      (req, res) => {
        service.deleteLine(modelsService, req.user, req.params.lineId)
          .then(result => res.status(result.statusCode).send(result.data))
          .catch(err => { log500(err); res.status(500).send(err) });
      });
    app.routesInfo['Line'].push({ model: 'Line', name: 'Delete line', method: 'DELETE', url: url, auth: ['C', 'A'] });
  }

  app.routesInfo['Line'] = [];
  registerSearchLines();
  registerGetLineFullInfo();
  registerAddLine();
  registerUpdateLine();
  registerDeleteLine();

};