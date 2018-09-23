const service = require('../services/connection.service');

module.exports = (app, modelsService) => {

  const registerGetConnectionsByYearRange = () => {
    const url = '/api/connection/year/:yearTo';
    app.get(url,
      (req, res) => {
        service.getConnectionsByYearRange(modelsService, req.params.yearTo)
          .then(result => res.status(result.statusCode).send(result.data))
          .catch(err => res.status(500).send(err));
      });
    app.get(`${url}/:yearFrom`,
      (req, res) => {
        service.getConnectionsByYearRange(modelsService, req.params.yearTo, req.params.yearFrom)
          .then(result => res.status(result.statusCode).send(result.data))
          .catch(err => res.status(500).send(err));
      });
    app.routesInfo['Connection'].push({ model: 'Connection', name: 'Get connections by year range', method: 'GET', url: url });
  }

  const registerAddConnection = () => {
    const url = '/api/connection/add';
    app.post(url,
      (req, res) => {
        service.addConnection(modelsService, req.body)
          .then(result => res.status(result.statusCode).send(result.data))
          .catch(err => { console.log(err); res.status(500).send(err) });
      });
    app.routesInfo['Connection'].push({ model: 'Connection', name: 'Add connection', method: 'POST', url: url, body: { year: 1900, yearEnd: null, stations: [], line: null, } });
  }

  const registerRemoveConnection = () => {
    const url = '/api/connection/:id';
    app.delete(url,
      (req, res) => {
        service.removeConnection(modelsService, req.params.id)
          .then(result => res.status(result.statusCode).send(result.data))
          .catch(err => res.status(500).send(err));
      });
    app.routesInfo['Connection'].push({ model: 'Connection', name: 'Remove connection', method: 'DELETE', url: url });
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
  registerGetConnectionsByYearRange();
  registerAddConnection();
  registerRemoveConnection();
  registerUpdateMarkerIconForAllStations();

};