const app = require('../../app')
const agent = require('supertest').agent(app)

const roles = {
  U: {
    email: 'nomanager@gmail.com',
    password: 'nomanager'
  },
  M1: {
    email: 'london.manager1@gmail.com',
    password: 'london.manager1'
  },
  M2: {
    email: 'london.manager2@gmail.com',
    password: 'london.manager2'
  },
  A: {
    email: 'admin@gmail.com',
    password: 'admin'
  },
}

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