const app = require('../../app')
const agent = require('supertest').agent(app)
const roles = require('../mock/roles.json');

const loginAsRole = async (role) => {
  return new Promise((resolve, reject) => {
    agent
      .get(`/api/login?email=${roles[role].email}&password=${roles[role].password}`)
      .expect(200)
      .then(response => {
        resolve(response.body.token);
      })
      .catch(err => console.log(err));

  });
}

module.exports = loginAsRole;