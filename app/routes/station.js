const service = require('../services/station.service');
const getPostmanBodyFromModelDef = require('../util/getPostmanBodyFromModelDef');
const filterBodyForAction = require('../util/filterBodyForAction');

module.exports = (app, modelsService, passport, modelDefinition) => {

  const registerSearchStations = () => {
    const url = '/api/:town/station/search';
    app.post(url,
      (req, res) => {
        service.searchStations(modelsService, req.params.town, req.body)
          .then(result => res.status(result.statusCode).send(result.data))
          .catch(err => res.status(500).send(err));
      });
    app.routesInfo['Station'].push({ model: 'Station', name: 'Search stations', method: 'POST', url: url });
  }

  const registerGetStationsByYearRange = () => {
    const url = '/api/:town/station/year/:yearTo';
    app.get(url,
      (req, res) => {
        service.getStationsByYearRange(modelsService, req.params.town, req.params.yearTo)
          .then(result => res.status(result.statusCode).send(result.data))
          .catch(err => res.status(500).send(err));
      });
    app.get(`${url}/:yearFrom`,
      (req, res) => {
        service.getStationsByYearRange(modelsService, req.params.town, req.params.yearTo, req.params.yearFrom)
          .then(result => res.status(result.statusCode).send(result.data))
          .catch(err => res.status(500).send(err));
      });
    app.routesInfo['Station'].push({ model: 'Station', name: 'Get stations by year range in town', method: 'GET', url: url });
  }

  const registerGetStationFull = () => {
    const url = '/api/station/:id';
    app.get(url,
      (req, res) => {
        service.getStationFull(modelsService, req.params.id)
          .then(result => res.status(result.statusCode).send(result.data))
          .catch(err => res.status(500).send(err));
      });
    app.routesInfo['Station'].push({ model: 'Station', name: 'Get station full data', method: 'GET', url: url });
  }

  const registerAddStation = () => {
    const url = '/api/:town/station';
    app.post(url,
      passport.authenticate('local-user-with-towns', { session: false }),
      (req, res) => {
        service.addStation(modelsService, req.user, req.params.town, filterBodyForAction(modelDefinition, 'add', req.body))
          .then(result => res.status(result.statusCode).send(result.data))
          .catch(err => res.status(500).send(err));
      });
    app.routesInfo['Station'].push({ model: 'Station', name: 'Add station', method: 'POST', url: url, auth: ['M', 'A'], body: getPostmanBodyFromModelDef(modelDefinition, 'add') });
  }

  const registerUpdateStation = () => {
    const url = '/api/station/:stationId';
    app.put(url,
      passport.authenticate('local-user-with-towns', { session: false }),
      (req, res) => {
        service.updateStation(modelsService, req.user, req.params.stationId, filterBodyForAction(modelDefinition, 'update', req.body))
          .then(result => res.status(result.statusCode).send(result.data))
          .catch(err => res.status(500).send(err));
      });
    app.routesInfo['Station'].push({ model: 'Station', name: 'Update station', method: 'PUT', url: url, auth: ['C', 'A'], body: getPostmanBodyFromModelDef(modelDefinition, 'update') });
  }

  const registerDeleteStation = () => {
    const url = '/api/station/:stationId';
    app.delete(url,
      passport.authenticate('local-user-with-towns', { session: false }),
      (req, res) => {
        service.deleteStation(modelsService, req.user, req.params.stationId)
          .then(result => res.status(result.statusCode).send(result.data))
          .catch(err => res.status(500).send(err));
      });
    app.routesInfo['Station'].push({ model: 'Station', name: 'Delete station', method: 'DELETE', url: url, auth: ['C', 'A'] });
  }

  const registerGetStationWiki = () => {
    const url = '/api/station/wiki/:station';
    app.get(url,
      (req, res) => {
        service.getStationWiki(req.params.station)
          .then(result => res.status(result.statusCode).send(result.data))
          .catch(err => res.status(500).send(err));
      });
    app.routesInfo['Station'].push({ model: 'Station', name: 'Get station wiki', method: 'GET', url: url });
  }

  registerSearchStations();
  registerGetStationsByYearRange();
  registerGetStationFull();
  registerAddStation();
  registerUpdateStation();
  registerDeleteStation();
  registerGetStationWiki();

};