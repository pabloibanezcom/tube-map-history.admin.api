const service = require('../services/station.service');

module.exports = (app, modelsService) => {

  const registerGetStationsByYear = () => {
    const url = '/api/station/year/:year';
    app.get(url,
      (req, res) => {
        service.getStationsByYear(modelsService, req.params.year)
          .then(result => res.status(result.statusCode).send(result.data))
          .catch(err => res.status(500).send(err));
      });
    app.routesInfo['Station'].push({ model: 'Station', name: 'Get stations by year', method: 'GET', url: url });
  }

  const registerAddConnectionToStation = () => {
    const url = '/api/station/connection/new';
    app.post(url,
      (req, res) => {
        service.addConnectionToStation(modelsService, req.body)
          .then(result => res.status(result.statusCode).send(result.data))
          .catch(err => res.status(500).send(err));
      });
    app.routesInfo['Station'].push({ model: 'Station', name: 'Add connection', method: 'POST', url: url, body: { station: null, line: null, otherStation: null, year: 1900 } });
  }

  const registerUpdateConnection = () => {
    const url = '/api/station/connection/update';
    app.post(url,
      (req, res) => {
        service.updateConnection(modelsService, req.body)
          .then(result => res.status(result.statusCode).send(result.data))
          .catch(err => res.status(500).send(err));
      });
    app.routesInfo['Station'].push({ model: 'Station', name: 'Update connection', method: 'POST', url: url, body: { station: null, connection: null, line: null, otherStation: null, year: 1900 } });
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

  registerGetStationsByYear();
  registerAddConnectionToStation();
  registerUpdateConnection();
  registerGetStationWiki();

};