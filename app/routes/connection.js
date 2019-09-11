const service = require('../services/connection.service');
const getPostmanBodyFromModelDef = require('../util/getPostmanBodyFromModelDef');
const log500 = require('../util/log500');
const defaultSearchBody = require('./defaultRequestBodies/default_search.json');

module.exports = (app, modelsService, passport, modelDefinition) => {

  const registerSearchConnections = () => {
    const url = '/api/:draftId/connection/search';
    app.post(url,
      passport.authenticate('local-user', { session: false }),
      (req, res) => {
        service.searchConnections(modelsService, req.user, req.params.draftId, req.body)
          .then(result => res.status(result.statusCode).send(result.data))
          .catch(err => { log500(err); res.status(500).send(err) });
      });
    app.routesInfo['Connection'].push({ model: 'Connection', name: 'Search connection', method: 'POST', url: url, auth: ['U', 'A'], body: defaultSearchBody });
  }

  const registerGetConnectionFullInfo = () => {
    const url = '/api/connection/:connectionId';
    app.get(url,
      passport.authenticate('local-user', { session: false }),
      (req, res) => {
        service.getConnectionFullInfo(modelsService, req.user, req.params.connectionId)
          .then(result => res.status(result.statusCode).send(result.data))
          .catch(err => { log500(err); res.status(500).send(err) });
      });
    app.routesInfo['Connection'].push({ model: 'Connection', name: 'Get full info from connection', method: 'GET', url: url, auth: ['U', 'A'] });
  }

  const registerAddConnection = () => {
    const url = '/api/:draftId/connection';
    app.post(url,
      passport.authenticate('local-user-with-drafts', { session: false }),
      (req, res) => {
        service.addConnection(modelsService, req.user, req.params.draftId, req.body)
          .then(result => res.status(result.statusCode).send(result.data))
          .catch(err => { log500(err); res.status(500).send(err) });
      });
    app.routesInfo['Connection'].push({ model: 'Connection', name: 'Add connection', method: 'POST', url: url, auth: ['M', 'A'], body: getPostmanBodyFromModelDef(modelDefinition, 'add') });
  }

  const registerUpdateConnection = () => {
    const url = '/api/connection/:connectionId';
    app.put(url,
      passport.authenticate('local-user-with-drafts', { session: false }),
      (req, res) => {
        service.updateConnection(modelsService, req.user, req.params.connectionId, req.body)
          .then(result => res.status(result.statusCode).send(result.data))
          .catch(err => { log500(err); res.status(500).send(err) });
      });
    app.routesInfo['Connection'].push({ model: 'Connection', name: 'Update connection', method: 'PUT', url: url, auth: ['C', 'A'], body: getPostmanBodyFromModelDef(modelDefinition, 'update') });
  }

  const registerDeleteConnection = () => {
    const url = '/api/connection/:connectionId';
    app.delete(url,
      passport.authenticate('local-user-with-drafts', { session: false }),
      (req, res) => {
        service.deleteConnection(modelsService, req.user, req.params.connectionId)
          .then(result => res.status(result.statusCode).send(result.data))
          .catch(err => { log500(err); res.status(500).send(err) });
      });
    app.routesInfo['Connection'].push({ model: 'Connection', name: 'Delete connection', method: 'DELETE', url: url, auth: ['C', 'A'] });
  }

  app.routesInfo['Connection'] = [];
  registerSearchConnections();
  registerGetConnectionFullInfo();
  registerAddConnection();
  registerUpdateConnection();
  registerDeleteConnection();

};