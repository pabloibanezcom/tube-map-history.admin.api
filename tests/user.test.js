const faker = require('faker');
const app = require('../app');
const agent = require('supertest').agent(app);
const mockUser = require('./mock/user.json');
const loginAsRole = require('./helpers/loginAsRole');

const generatePassWord = () => {
  return `${faker.internet.password()}1A`;
}

// LOGIN
// GET /api/login
describe('LOGIN', () => {

  let user;

  beforeAll(async (done) => {
    user = {
      email: faker.internet.email(),
      password: generatePassWord()
    };
    agent.post(`/api/signup?email=${user.email}&password=${user.password}`).send(mockUser).set('Accept', 'application/json')
      .expect(200, done);
  });

  it('when user tries to login with right email and password it gets user token', async (done) => {
    const res = await agent.get(`/api/login?email=${user.email}&password=${user.password}`)
      .expect(200);
    expect(res.body.token).toBeDefined();
    done();
  });

  it('when user tries to login with wrong email it gets 400', async (done) => {
    agent.get(`/api/login?email=anotheremail@gmail.com&password=${user.password}`)
      .expect(400, done);
  });

  it('when user tries to login with wrong email it gets 400', async (done) => {
    agent.get(`/api/login?email=anotheremail@gmail.com&password=${user.password}`)
      .expect(400, done);
  });
});

// SIGNUP
// POST /api/signup
describe('SIGNUP', () => {
  it('when user tries to signup with right email and password and data it gets registered', async (done) => {
    agent.post(`/api/signup?email=${faker.internet.email()}&password=${generatePassWord()}`).send(mockUser).set('Accept', 'application/json')
      .expect(200, done);
  });

  it('when user tries to signup with wrong email it returns 400', async (done) => {
    agent.post(`/api/signup?email=somewrongemail&password=${generatePassWord()}`).send(mockUser).set('Accept', 'application/json')
      .expect(400, done);
  });

  it('when user tries to signup with wrong password it returns 400', async (done) => {
    agent.post(`/api/signup?email=${faker.internet.email()}&password=wrongpassword`).send(mockUser).set('Accept', 'application/json')
      .expect(400, done);
  });

  it('when user tries to signup with wrong user title it returns 400', async (done) => {
    agent.post(`/api/signup?email=${faker.internet.email()}&password=${generatePassWord()}`).send({ ...mockUser, title: 'AAA' }).set('Accept', 'application/json')
      .expect(400, done);
  });

  it('when user tries to signup without user firstName it returns 400', async (done) => {
    agent.post(`/api/signup?email=${faker.internet.email()}&password=${generatePassWord()}`).send({ ...mockUser, firstName: null }).set('Accept', 'application/json')
      .expect(400, done);
  });

  it('when user tries to signup without user lastName it returns 400', async (done) => {
    agent.post(`/api/signup?email=${faker.internet.email()}&password=${generatePassWord()}`).send({ ...mockUser, firstName: null }).set('Accept', 'application/json')
      .expect(400, done);
  });

  it('when user tries to signup with wrong user genre it returns 400', async (done) => {
    agent.post(`/api/signup?email=${faker.internet.email()}&password=${generatePassWord()}`).send({ ...mockUser, genre: 'AAA' }).set('Accept', 'application/json')
      .expect(400, done);
  });

  it('when user tries to signup with existing email it returns 409', async (done) => {
    const email = faker.internet.email();
    await agent.post(`/api/signup?email=${email}&password=${generatePassWord()}`).send(mockUser).set('Accept', 'application/json');
    agent.post(`/api/signup?email=${email}&password=${generatePassWord()}`).send(mockUser).set('Accept', 'application/json')
      .expect(409, done);
  });

});

// GET OWN USER INFO
// GET /api/user
describe('GET OWN USER INFO', () => {

  let tokenU;
  let tokenM1;
  let tokenA;

  beforeAll(async (done) => {
    tokenU = await loginAsRole('U');
    tokenM1 = await loginAsRole('M1');
    tokenA = await loginAsRole('A');
    done();
  });

  it('when user is not logged it can not get any user info', async (done) => {
    agent.get(`/api/user`).set('Accept', 'application/json')
      .expect(401, done);
  });

  it('when user is normal user it can get own user info', async (done) => {
    const res = await agent.get(`/api/user`).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenU}`)
      .expect(200);
    expect(res.body.local.email).toBe('nomanager@gmail.com');
    done();
  });

  it('when user is manager user it can get own user info', async (done) => {
    const res = await agent.get(`/api/user`).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenM1}`)
      .expect(200);
    expect(res.body.local.email).toBe('london.manager1@gmail.com');
    done();
  });

  it('when user is admin user it can get own user info', async (done) => {
    const res = await agent.get(`/api/user`).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    expect(res.body.local.email).toBe('admin@gmail.com');
    done();
  });
});

// GET USER INFO
// GET /api/user/:userId
describe('GET USER INFO', () => {

  let tokenM1;
  let tokenA;
  let userA;

  beforeAll(async (done) => {
    tokenM1 = await loginAsRole('M1');
    tokenA = await loginAsRole('A');

    const email = faker.internet.email();
    const password = generatePassWord();
    await agent.post(`/api/signup?email=${email}&password=${password}`).send(mockUser).set('Accept', 'application/json');
    const loginRes = await agent.get(`/api/login?email=${email}&password=${password}`);
    const userInfoRes = await agent.get(`/api/user`).set('Accept', 'application/json').set('Authorization', `Bearer ${loginRes.body.token}`);
    userA = userInfoRes.body;

    done();
  });

  it('when user is not logged it can not get any user info', async (done) => {
    agent.get(`/api/user/${userA._id}`).set('Accept', 'application/json')
      .expect(401, done);
  });

  it('when user is manager user it can not get any user info', async (done) => {
    agent.get(`/api/user/${userA._id}`).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenM1}`)
      .expect(401, done);
  });

  it('when user is admin user it can get any user info', async (done) => {
    const res = await agent.get(`/api/user/${userA._id}`).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    expect(res.body.firstName).toBe(mockUser.firstName);
    done();
  });

});
