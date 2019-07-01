const app = require('../app')
const agent = require('supertest').agent(app)
const mockStation = require('./mock/station.json');
const loginAsRole = require('./helpers/loginAsRole');

// ADD STATION
describe('POST /api/:town/station', () => {

  let tokenU;
  let tokenM1;
  let tokenA;

  beforeAll(async (done) => {
    tokenU = await loginAsRole('U');
    tokenM1 = await loginAsRole('M1');
    tokenA = await loginAsRole('A');
    done();
  });

  it('when user is not logged it can not add station', async (done) => {
    agent.post(`/api/london/station`).send(mockStation).set('Accept', 'application/json')
      .expect(401, done);
  });

  it('when user is not town manager it can not add station', async (done) => {
    agent.post(`/api/london/station`).send(mockStation).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenU}`)
      .expect(401, done);
  });

  it('when user is town manager it can add station', async (done) => {
    agent.post(`/api/london/station`).send(mockStation).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenM1}`)
      .expect(200, done);
  });

  it('when user is admin it can add station', async (done) => {
    agent.post(`/api/london/station`).send(mockStation).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`)
      .expect(200, done);
  });

  it('when station does not contain name it returns bad request', async (done) => {
    agent.post(`/api/london/station`).send({ ...mockStation, name: null }).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`)
      .expect(400, done);
  });

  it('when station does not contain geometry it returns bad request', async (done) => {
    agent.post(`/api/london/station`).send({ ...mockStation, geometry: 'test station' }).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`)
      .expect(400, done);
  });

  it('when station year is not a valid value it returns bad request', async (done) => {
    agent.post(`/api/london/station`).send({ ...mockStation, year: 2050 }).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`)
      .expect(400, done);
  });

});

// UPDATE STATION
describe('PUT /api/station/:stationId', () => {

  let tokenM1;
  let tokenM2;
  let tokenA;
  let station;

  beforeAll(async (done) => {
    tokenM1 = await loginAsRole('M1');
    const stationRes = await agent.post(`/api/london/station`).send(mockStation).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenM1}`).expect(200);
    station = stationRes.body;
    done();
  });

  it('when user is creator it can update station', async (done) => {
    const modifedStationRes = await agent.put(`/api/station/${station._id}`).send({ ...mockStation, name: 'New station name' }).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenM1}`).expect(200);
    expect(modifedStationRes.body.name).toBe('New station name');
    done();
  });

  it('when user is not creator it can not update station', async (done) => {
    tokenM2 = await loginAsRole('M2');
    agent.put(`/api/station/${station._id}`).send({ ...mockStation, name: 'New station name' }).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenM2}`).expect(401, done);
  });

  it('when user is admin it can update station', async (done) => {
    tokenA = await loginAsRole('A');
    const modifedStationRes = await agent.put(`/api/station/${station._id}`).send({ ...mockStation, name: 'New station name' }).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenM1}`).expect(200);
    expect(modifedStationRes.body.name).toBe('New station name');
    done();
  });
});

// DELETE STATION
describe('DELETE /api/station/:stationId', () => {

  let tokenM1;
  let tokenM2;
  let tokenA;
  let station1;
  let station2;

  beforeAll(async (done) => {
    tokenM1 = await loginAsRole('M1');
    const stationRes1 = await agent.post(`/api/london/station`).send(mockStation).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenM1}`).expect(200);
    station1 = stationRes1.body;
    const stationRes2 = await agent.post(`/api/london/station`).send(mockStation).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenM1}`).expect(200);
    station2 = stationRes2.body;
    done();
  });

  it('when user is creator it can delete station', async (done) => {
    await agent.delete(`/api/station/${station1._id}`).set('Authorization', `Bearer ${tokenM1}`).expect(200);
    agent.get(`/api/station/${station1._id}`).expect(404, done);
  });

  it('when user is not creator it can not delete station', async (done) => {
    tokenM2 = await loginAsRole('M2');
    agent.delete(`/api/station/${station2._id}`).set('Authorization', `Bearer ${tokenM2}`).expect(401, done);
  });

  it('when user is admin it can delete station', async (done) => {
    tokenA = await loginAsRole('A');
    await agent.delete(`/api/station/${station2._id}`).set('Authorization', `Bearer ${tokenA}`).expect(200);
    agent.get(`/api/station/${station2._id}`).expect(404, done);
  });
});