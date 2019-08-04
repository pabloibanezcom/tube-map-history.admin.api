const app = require('../../app');
const agent = require('supertest').agent(app);
const faker = require('faker');

const signUpAndLogin = async (getUserId) => {
  const user = {
    email: faker.internet.email(),
    password: `${faker.internet.password(8)}A1`,
    body: {
      title: 'Mr.',
      firstName: faker.name.firstName(),
      lastName: faker.name.lastName(),
      genre: 'Male'
    }
  }
  await agent.post(`/api/signup?email=${user.email}&password=${user.password}`).send(user.body).set('Accept', 'application/json');
  const loginRes = await agent.get(`/api/login?email=${user.email}&password=${user.password}`);
  let userRes;
  if (getUserId) {
    userRes = await agent.get(`/api/user`).set('Accept', 'application/json').set('Authorization', `Bearer ${loginRes.body.token}`);
  }
  return {
    user: { ...user, _id: getUserId ? userRes.body._id : undefined },
    token: loginRes.body.token
  };
}

module.exports = signUpAndLogin;