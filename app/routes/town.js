const service = require('../services/town.service');
const getPostmanBodyFromModelDef = require('../util/getPostmanBodyFromModelDef');
const filterBodyForAction = require('../util/filterBodyForAction');
const log500 = require('../util/log500');

module.exports = (app, modelsService, passport, modelDefinition) => {

  const registerGetTowns = () => {
    const url = '/api/towns';
    app.get(url,
      passport.authenticate('local-user', { session: false }),
      (req, res) => {
        service.getTowns(modelsService, req.user)
          .then(result => res.status(result.statusCode).send(result.data))
          .catch(err => { log500(err); res.status(500).send(err) });
      });
    app.routesInfo['Town'].push({ model: 'Town', name: 'Get towns', method: 'GET', url: url, auth: ['U', 'A'] });
  }

  const registerGetTownInfo = () => {
    const url = '/api/town/:town';
    app.get(url,
      passport.authenticate('local-user', { session: false }),
      (req, res) => {
        service.getTownInfo(modelsService, req.user, req.params.town)
          .then(result => res.status(result.statusCode).send(result.data))
          .catch(err => { log500(err); res.status(500).send(err) });
      });
    app.routesInfo['Town'].push({ model: 'Town', name: 'Get town info', method: 'GET', url: url, auth: ['U', 'A'] });
  }

  const registerAddTown = () => {
    const url = '/api/town';
    app.post(url,
      passport.authenticate('local-user', { session: false }),
      (req, res) => {
        service.addTown(modelsService, req.user, filterBodyForAction(modelDefinition, 'add', req.body))
          .then(result => res.status(result.statusCode).send(result.data))
          .catch(err => { log500(err); res.status(500).send(err) });
      });
    app.routesInfo['Town'].push({ model: 'Town', name: 'Add town', method: 'POST', url: url, auth: ['A'], body: getPostmanBodyFromModelDef(modelDefinition, 'add') });
  }

  const registerUpdateTown = () => {
    const url = '/api/town/:townId';
    app.put(url,
      passport.authenticate('local-user', { session: false }),
      (req, res) => {
        service.updateTown(modelsService, req.user, req.params.townId, filterBodyForAction(modelDefinition, 'update', req.body))
          .then(result => res.status(result.statusCode).send(result.data))
          .catch(err => { log500(err); res.status(500).send(err) });
      });
    app.routesInfo['Town'].push({ model: 'Town', name: 'Update town', method: 'PUT', url: url, auth: ['A'], body: getPostmanBodyFromModelDef(modelDefinition, 'update') });
  }

  const registerDeleteTown = () => {
    const url = '/api/town/:townId';
    app.delete(url,
      passport.authenticate('local-user', { session: false }),
      (req, res) => {
        service.deleteTown(modelsService, req.user, req.params.townId)
          .then(result => res.status(result.statusCode).send(result.data))
          .catch(err => { log500(err); res.status(500).send(err) });
      });
    app.routesInfo['Town'].push({ model: 'Town', name: 'Delete town', method: 'DELETE', url: url, auth: ['A'] });
  }

  app.routesInfo['Town'] = [];
  registerGetTowns();
  registerGetTownInfo();
  registerAddTown();
  registerUpdateTown();
  registerDeleteTown();

};