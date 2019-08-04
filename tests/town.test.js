const faker = require('faker');
const app = require('../app');
const agent = require('supertest').agent(app);
const mockTownWithoutCountry = require('./mock/town.json');
const loginAsRole = require('./helpers/loginAsRole');

// GET TOWNS
// GET /api/town/all
describe('GET TOWNS', function () {

  let tokenU;
  let tokenA;

  beforeAll(async (done) => {
    tokenU = await loginAsRole('U');
    tokenA = await loginAsRole('A');
    done();
  });

  it('when user is not logged it can not get towns', async (done) => {
    agent.get('/api/town/all').expect(401, done);
  });

  it('when user is logged it can get towns', async (done) => {
    agent.get('/api/town/all').set('Authorization', `Bearer ${tokenU}`).expect(200, done);
  });

  it('when user is admin it can get towns', async (done) => {
    agent.get('/api/town/all').set('Authorization', `Bearer ${tokenA}`).expect(200, done);
  });

});

// GET TOWN INFO
// GET /api/town/:town
describe('GET TOWN INFO', function () {

  let tokenU;
  let tokenA;
  let someTownId

  beforeAll(async (done) => {
    tokenU = await loginAsRole('U');
    tokenA = await loginAsRole('A');
    const getTownsRes = await agent.get('/api/town/all').set('Authorization', `Bearer ${tokenA}`);
    someTownId = getTownsRes.body[0]._id;
    done();
  });

  it('when user is not logged it can not get towns', async (done) => {
    agent.get(`/api/town/${someTownId}`).expect(401, done);
  });

  it('when user is logged it can get towns', async (done) => {
    agent.get(`/api/town/${someTownId}`).set('Authorization', `Bearer ${tokenU}`).expect(200, done);
  });

  it('when user is admin it can get towns', async (done) => {
    agent.get(`/api/town/${someTownId}`).set('Authorization', `Bearer ${tokenA}`).expect(200, done);
  });

  it('when towns does not exist it gets 404', async (done) => {
    agent.get('/api/town/111111').set('Authorization', `Bearer ${tokenA}`).expect(404, done);
  });

});

// ADD TOWN
// POST /api/town
describe('ADD TOWN', () => {

  let tokenU;
  let tokenA;
  let mockTown;

  beforeAll(async (done) => {
    tokenU = await loginAsRole('U');
    tokenA = await loginAsRole('A');

    const countriesRes = await agent.get('/api/countries');
    mockTown = { ...mockTownWithoutCountry, url: faker.random.uuid(), country: countriesRes.body.find(c => c.name === 'Spain')._id };

    done();
  });

  it('when user is not logged it can not add town', async (done) => {
    agent.post(`/api/town`).send(mockTown).set('Accept', 'application/json')
      .expect(401, done);
  });

  it('when user is logged it can add town', async (done) => {
    agent.post(`/api/town`).send(mockTown).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenU}`)
      .expect(200, done);
  });

  it('when user is admin it can add town', async (done) => {
    mockTown.url = faker.random.uuid();
    agent.post(`/api/town`).send(mockTown).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`)
      .expect(200, done);
  });

  it('when town contains url that already exists it returns bad request', async (done) => {
    agent.post(`/api/town`).send(mockTown).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`)
      .expect(400, done);
  });


  it('when town does not contain name it returns bad request', async (done) => {
    agent.post(`/api/town`).send({ ...mockTown, name: null }).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`)
      .expect(400, done);
  });

  it('when town does not contain url it returns bad request', async (done) => {
    agent.post(`/api/town`).send({ ...mockTown, url: null }).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`)
      .expect(400, done);
  });

  it('when town url already exists it returns bad request', async (done) => {
    agent.post(`/api/town`).send({ ...mockTown, url: null }).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`)
      .expect(400, done);
  });

  it('when town does not contain center it returns bad request', async (done) => {
    agent.post(`/api/town`).send({ ...mockTown, center: null }).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`)
      .expect(400, done);
  });

  it('when town does not contain zoom it returns bad request', async (done) => {
    agent.post(`/api/town`).send({ ...mockTown, zoom: null }).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`)
      .expect(400, done);
  });

  it('when town does not contain alias it returns bad request', async (done) => {
    agent.post(`/api/town`).send({ ...mockTown, alias: null }).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`)
      .expect(400, done);
  });

  it('when town year is not a valid value it returns bad request', async (done) => {
    agent.post(`/api/town`).send({ ...mockTown, year: 2050 }).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`)
      .expect(400, done);
  });

  it('when town does not contain country it returns bad request', async (done) => {
    agent.post(`/api/town`).send({ ...mockTown, country: null }).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`)
      .expect(400, done);
  });

});

// UPDATE TOWN
// PUT /api/town/:townId
describe('UPDATE TOWN', () => {

  let tokenA;
  let tokenM2;
  let town;

  beforeAll(async (done) => {
    tokenA = await loginAsRole('A');
    const countriesRes = await agent.get('/api/countries');
    mockTown = { ...mockTownWithoutCountry, url: faker.random.uuid(), country: countriesRes.body.find(c => c.name === 'Spain')._id };
    const townRes = await agent.post(`/api/town`).send(mockTown).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`).expect(200);
    town = townRes.body;
    done();
  });

  it('when user is admin it can update town', async (done) => {
    const modifedTownRes = await agent.put(`/api/town/${town._id}`).send({ ...mockTown, name: 'New town name' }).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`).expect(200);
    expect(modifedTownRes.body.name).toBe('New town name');
    done();
  });

  it('when user is not admin it can not update town', async (done) => {
    tokenM2 = await loginAsRole('M2');
    agent.put(`/api/town/${town._id}`).send({ ...mockTown, name: 'New town name' }).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenM2}`).expect(401, done);
  });

});

// DELETE TOWN
// DELETE /api/town/:townId
describe('DELETE TOWN', () => {

  let tokenM1;
  let tokenA;
  let town;

  beforeAll(async (done) => {
    tokenM1 = await loginAsRole('M1');
    tokenA = await loginAsRole('A');

    const countriesRes = await agent.get('/api/countries');
    mockTown = { ...mockTownWithoutCountry, url: faker.random.uuid(), country: countriesRes.body.find(c => c.name === 'Spain')._id };

    const townRes = await agent.post(`/api/town`).send(mockTown).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`).expect(200);
    town = townRes.body;

    done();
  });

  it('when user is not admin it can not delete line', async (done) => {
    agent.delete(`/api/town/${town._id}`).set('Authorization', `Bearer ${tokenM1}`).expect(401, done);
  });

  it('when user is admin it can delete line', async (done) => {
    await agent.delete(`/api/town/${town._id}`).set('Authorization', `Bearer ${tokenA}`).expect(200);
    agent.get(`/api/town/${town._id}`).set('Authorization', `Bearer ${tokenA}`).expect(404, done);
  });
});
