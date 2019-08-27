const service = require('../services/station.service');
const getPostmanBodyFromModelDef = require('../util/getPostmanBodyFromModelDef');
const filterBodyForAction = require('../util/filterBodyForAction');
const log500 = require('../util/log500');
const defaultSearchBody = require('./defaultRequestBodies/default_search.json');

module.exports = (app, modelsService, passport, modelDefinition) => {

  // const registerGetStationsByYearRange = () => {
  //   const url = '/api/:town/station/year/:yearTo';
  //   app.get(url,
  //     (req, res) => {
  //       service.getStationsByYearRange(modelsService, req.params.town, req.params.yearTo)
  //         .then(result => res.status(result.statusCode).send(result.data))
  //         .catch(err => { log500(err); res.status(500).send(err) });
  //     });
  //   app.get(`${url}/:yearFrom`,
  //     (req, res) => {
  //       service.getStationsByYearRange(modelsService, req.params.town, req.params.yearTo, req.params.yearFrom)
  //         .then(result => res.status(result.statusCode).send(result.data))
  //         .catch(err => { log500(err); res.status(500).send(err) });
  //     });
  //   app.routesInfo['Station'].push({ model: 'Station', name: 'Get stations by year range in town', method: 'GET', url: url });
  // }

  const registerSearchStations = () => {
    const url = '/api/:draftId/station/search';
    app.post(url,
      passport.authenticate('local-user', { session: false }),
      (req, res) => {
        service.searchStations(modelsService, req.user, req.params.draftId, req.body)
          .then(result => res.status(result.statusCode).send(result.data))
          .catch(err => { log500(err); res.status(500).send(err) });
      });
    app.routesInfo['Station'].push({ model: 'Station', name: 'Search stations', method: 'POST', url: url, auth: ['U', 'A'], body: defaultSearchBody });
  }

  const registerGetStationFullInfo = () => {
    const url = '/api/station/:stationId';
    app.get(url,
      passport.authenticate('local-user', { session: false }),
      (req, res) => {
        service.getStationFullInfo(modelsService, req.user, req.params.stationId)
          .then(result => res.status(result.statusCode).send(result.data))
          .catch(err => { log500(err); res.status(500).send(err) });
      });
    app.routesInfo['Station'].push({ model: 'Station', name: 'Get full info from station', method: 'GET', url: url, auth: ['U', 'A'] });
  }

  const registerAddStation = () => {
    const url = '/api/:draftId/station';
    app.post(url,
      passport.authenticate('local-user-with-drafts', { session: false }),
      (req, res) => {
        service.addStation(modelsService, req.user, req.params.draftId, filterBodyForAction(modelDefinition, 'add', req.body))
          .then(result => res.status(result.statusCode).send(result.data))
          .catch(err => { log500(err); res.status(500).send(err) });
      });
    app.routesInfo['Station'].push({ model: 'Station', name: 'Add station', method: 'POST', url: url, auth: ['M', 'A'], body: getPostmanBodyFromModelDef(modelDefinition, 'add') });
  }

  const registerUpdateStation = () => {
    const url = '/api/station/:stationId';
    app.put(url,
      passport.authenticate('local-user-with-drafts', { session: false }),
      (req, res) => {
        service.updateStation(modelsService, req.user, req.params.stationId, filterBodyForAction(modelDefinition, 'update', req.body))
          .then(result => res.status(result.statusCode).send(result.data))
          .catch(err => { log500(err); res.status(500).send(err) });
      });
    app.routesInfo['Station'].push({ model: 'Station', name: 'Update station', method: 'PUT', url: url, auth: ['C', 'A'], body: getPostmanBodyFromModelDef(modelDefinition, 'update') });
  }

  const registerDeleteStation = () => {
    const url = '/api/station/:stationId';
    app.delete(url,
      passport.authenticate('local-user-with-drafts', { session: false }),
      (req, res) => {
        service.deleteStation(modelsService, req.user, req.params.stationId)
          .then(result => res.status(result.statusCode).send(result.data))
          .catch(err => { log500(err); res.status(500).send(err) });
      });
    app.routesInfo['Station'].push({ model: 'Station', name: 'Delete station', method: 'DELETE', url: url, auth: ['C', 'A'] });
  }

  // registerGetStationsByYearRange();
  registerSearchStations();
  registerGetStationFullInfo();
  registerAddStation();
  registerUpdateStation();
  registerDeleteStation();

};