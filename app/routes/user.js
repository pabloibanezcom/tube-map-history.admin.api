const service = require('../services/user.service');

module.exports = (app, modelsService, passport) => {

  const registerGetUserInfo = () => {
    const url = '/api/user';
    app.get(url,
      passport.authenticate('local-user', { session: false }),
      (req, res) => {
        service.getUserInfo(modelsService, req.user)
          .then(result => res.status(result.statusCode).send(result.data))
          .catch(err => res.status(500).send(err));
      });
    app.routesInfo['User'].push({ model: 'User', name: 'Get user info', method: 'GET', url: url });
  }

  const registerAssignTownRoleToUser = () => {
    const url = '/api/user/town/role/:userId/:town';
    app.put(url,
      passport.authenticate('local-user', { session: false }),
      (req, res) => {
        service.assignTownRoleToUser(modelsService, req.params.userId, req.params.town, req.body)
          .then(result => res.status(result.statusCode).send(result.data))
          .catch(err => res.status(500).send(err));
      });
    app.routesInfo['User'].push({ model: 'User', name: 'Assign town role to user', method: 'PUT', url: url, auth: ['A'], body: { role: null } });
  }

  registerGetUserInfo();
  registerAssignTownRoleToUser();

};