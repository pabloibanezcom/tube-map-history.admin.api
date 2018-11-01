const service = require('../services/station.service');

module.exports = (app, modelsService) => {

  const registerSearchStations = () => {
    const url = '/api/station';
    app.post(url,
      (req, res) => {
        service.searchStations(modelsService, req.body)
          .then(result => res.status(result.statusCode).send(result.data))
          .catch(err => res.status(500).send(err));
      });
    app.routesInfo['Station'].push({ model: 'Station', name: 'Search stations', method: 'POST', url: url });
  }

  const registerGetStationsByYearRange = () => {
    const url = '/api/station/year/:yearTo';
    app.get(url,
      (req, res) => {
        service.getStationsByYearRange(modelsService, req.params.yearTo)
          .then(result => res.status(result.statusCode).send(result.data))
          .catch(err => res.status(500).send(err));
      });
    app.get(`${url}/:yearFrom`,
      (req, res) => {
        service.getStationsByYearRange(modelsService, req.params.yearTo, req.params.yearFrom)
          .then(result => res.status(result.statusCode).send(result.data))
          .catch(err => res.status(500).send(err));
      });
    app.routesInfo['Station'].push({ model: 'Station', name: 'Get stations by year range', method: 'GET', url: url });
  }

  const registerUpdateStation = () => {
    const url = '/api/station/update/:id';
    app.put(url,
      (req, res) => {
        service.updateStation(modelsService, req.params.id, req.body)
          .then(result => res.status(result.statusCode).send(result.data))
          .catch(err => res.status(500).send(err));
      });
    app.routesInfo['Station'].push({ model: 'Station', name: 'Update station', method: 'PUT', url: url, body: { name: null, geometry: null, farezones: null, year: 1900, yearEnd: null } });
  }

  const registerAddConnection = () => {
    const url = '/api/station/update/:stationId/connection';
    app.post(url,
      (req, res) => {
        service.addConnection(modelsService, req.params.stationId, req.body)
          .then(result => res.status(result.statusCode).send(result.data))
          .catch(err => res.status(500).send(err));
      });
    app.routesInfo['Station'].push({ model: 'Station', name: 'Add connection', method: 'POST', url: url, body: { station: null, line: null, year: 1900, yearEnd: null } });
  }

  const registerUpdateConnection = () => {
    const url = '/api/station/update/:stationId/connection/:connectionId';
    app.put(url,
      (req, res) => {
        service.updateConnection(modelsService, req.params.stationId, req.params.connectionId, req.body)
          .then(result => res.status(result.statusCode).send(result.data))
          .catch(err => res.status(500).send(err));
      });
    app.routesInfo['Station'].push({ model: 'Station', name: 'Update connection', method: 'PUT', url: url, body: { station: null, line: null, year: 1900, yearEnd: null } });
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

  app.routesInfo['Station'] = [];
  registerSearchStations();
  registerGetStationsByYearRange();
  registerAddConnection();
  registerUpdateStation();
  registerUpdateConnection();
  registerGetStationWiki();

};