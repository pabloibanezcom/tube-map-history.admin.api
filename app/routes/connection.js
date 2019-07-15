const service = require('../services/connection.service');
const getPostmanBodyFromModelDef = require('../util/getPostmanBodyFromModelDef');
const defaultSearchBody = require('./defaultRequestBodies/default_search.json');

module.exports = (app, modelsService, passport, modelDefinition) => {

  // const registerGetConnectionsByYearRange = () => {
  //   const url = '/api/:town/connection/year/:yearTo';
  //   app.get(url,
  //     (req, res) => {
  //       service.getConnectionsByYearRange(modelsService, req.params.town, req.params.yearTo)
  //         .then(result => res.status(result.statusCode).send(result.data))
  //         .catch(err => res.status(500).send(err));
  //     });
  //   app.get(`${url}/:yearFrom`,
  //     (req, res) => {
  //       service.getConnectionsByYearRange(modelsService, req.params.town, req.params.yearTo, req.params.yearFrom)
  //         .then(result => res.status(result.statusCode).send(result.data))
  //         .catch(err => res.status(500).send(err));
  //     });
  //   app.routesInfo['Connection'].push({ model: 'Connection', name: 'Get connections by year range in town', method: 'GET', url: url });
  // }

  const registerSearchConnections = () => {
    const url = '/api/:draftId/connection/search';
    app.post(url,
      passport.authenticate('local-user', { session: false }),
      (req, res) => {
        service.searchConnections(modelsService, req.user, req.params.draftId, req.body)
          .then(result => res.status(result.statusCode).send(result.data))
          .catch(err => res.status(500).send(err));
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
          .catch(err => res.status(500).send(err));
      });
    app.routesInfo['Connection'].push({ model: 'Connection', name: 'Get full info from connection', method: 'GET', url: url, auth: ['U', 'A'] });
  }

  const registerAddConnection = () => {
    const url = '/api/:draftId/connection';
    app.post(url,
      passport.authenticate('local-user-with-towns', { session: false }),
      (req, res) => {
        service.addConnection(modelsService, req.user, req.params.draftId, req.body)
          .then(result => res.status(result.statusCode).send(result.data))
          .catch(err => res.status(500).send(err));
      });
    app.routesInfo['Connection'].push({ model: 'Connection', name: 'Add connection', method: 'POST', url: url, auth: ['M', 'A'], body: getPostmanBodyFromModelDef(modelDefinition, 'add') });
  }

  const registerUpdateConnection = () => {
    const url = '/api/connection/:connectionId';
    app.put(url,
      passport.authenticate('local-user-with-towns', { session: false }),
      (req, res) => {
        service.updateConnection(modelsService, req.user, req.params.connectionId, req.body)
          .then(result => res.status(result.statusCode).send(result.data))
          .catch(err => res.status(500).send(err));
      });
    app.routesInfo['Connection'].push({ model: 'Connection', name: 'Update connection', method: 'PUT', url: url, auth: ['C', 'A'], body: getPostmanBodyFromModelDef(modelDefinition, 'update') });
  }

  const registerDeleteConnection = () => {
    const url = '/api/connection/:connectionId';
    app.delete(url,
      passport.authenticate('local-user-with-towns', { session: false }),
      (req, res) => {
        service.deleteConnection(modelsService, req.user, req.params.connectionId)
          .then(result => res.status(result.statusCode).send(result.data))
          .catch(err => res.status(500).send(err));
      });
    app.routesInfo['Connection'].push({ model: 'Connection', name: 'Delete connection', method: 'DELETE', url: url, auth: ['C', 'A'] });
  }

  const registerUpdateMarkerIconForAllStations = () => {
    const url = '/api/connection/udpate-station-markers';
    app.get(url,
      (req, res) => {
        service.updateMarkerIconForAllStations(modelsService)
          .then(result => res.status(result.statusCode).send(result.data))
          .catch(err => res.status(500).send(err));
      });
  }

  app.routesInfo['Connection'] = [];
  // registerGetConnectionsByYearRange();
  registerSearchConnections();
  registerGetConnectionFullInfo();
  registerAddConnection();
  registerUpdateConnection();
  registerDeleteConnection();
  registerUpdateMarkerIconForAllStations();

};