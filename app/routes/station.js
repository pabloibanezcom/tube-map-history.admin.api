const service = require('../services/station.service');

module.exports = (app, modelsService) => {

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
  registerUpdateStation();
  registerGetStationWiki();

};