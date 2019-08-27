const log500 = require('../util/log500');
const service = require('../services/user.service');

module.exports = (app, modelsService, passport) => {

  const registerGetOwnUserInfo = () => {
    const url = '/api/user';
    app.get(url,
      passport.authenticate('local-user', { session: false }),
      (req, res) => {
        service.getOwnUserInfo(modelsService, req.user)
          .then(result => res.status(result.statusCode).send(result.data))
          .catch(err => { log500(err); res.status(500).send(err) });
      });
    app.routesInfo['User'].push({ model: 'User', name: 'Get own user info', method: 'GET', url: url, auth: ['U', 'M', 'A'] });
  }

  const registerGetUserInfo = () => {
    const url = '/api/user/:userId';
    app.get(url,
      passport.authenticate('local-user', { session: false }),
      (req, res) => {
        service.getUserInfo(modelsService, req.user, req.params.userId)
          .then(result => res.status(result.statusCode).send(result.data))
          .catch(err => { log500(err); res.status(500).send(err) });
      });
    app.routesInfo['User'].push({ model: 'User', name: 'Get user info', method: 'GET', url: url, auth: ['A'] });
  }

  registerGetOwnUserInfo();
  registerGetUserInfo();

};