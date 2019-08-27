const app = require('../app');
const agent = require('supertest').agent(app);
const signUpAndLogin = require('./helpers/signUpAndLogin');
const mockDraft = require('./mock/draft.json');
const mockStation = require('./mock/station.json');
const loginAsRole = require('./helpers/loginAsRole');
const stationSearchBody = require('./mock/station_search_body.json');
const isSorted = require('./helpers/isSorted');

// SEARCH STATIONS
// POST /api/:draftId/station/search
describe('SEARCH STATIONS', () => {

  const stationsLength = 3;
  const stations = [];
  let manager;
  let tokenA;
  let draft;

  beforeAll(async (done) => {
    tokenA = await loginAsRole('A');
    manager = await signUpAndLogin();
    const addDraftRes = await agent.post(`/api/london/draft`).send(mockDraft).set('Accept', 'application/json').set('Authorization', `Bearer ${manager.token}`);
    draft = addDraftRes.body;

    for (let i = 0; i < stationsLength; i++) {
      const res = await agent.post(`/api/${draft._id}/station`).send({ ...mockStation, name: `${mockStation.name}_${i}` }).set('Accept', 'application/json').set('Authorization', `Bearer ${manager.token}`);
      stations.push(res.body)
    }

    done();
  });

  it('when user is not logged it can not search stations', async (done) => {
    agent.post(`/api/${draft._id}/station/search`).set('Accept', 'application/json')
      .expect(401, done);
  });

  it('when user is logged it can search stations', async (done) => {
    agent.post(`/api/${draft._id}/station/search`).send(stationSearchBody).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`)
      .expect(200, done);
  });

  it('when body does not contain proper pagination it returns 400', async (done) => {
    agent.post(`/api/${draft._id}/station/search`).send({ ...stationSearchBody, pagination: null }).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`)
      .expect(400, done);
  });

  it('when filter name is defined returns only stations with name containing it', async (done) => {
    const response = await agent.post(`/api/${draft._id}/station/search`).send({ ...stationSearchBody, filter: { ...stationSearchBody.filter, name: stations[0].name } }).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`);
    expect(response.body.elements.length).toBe(1);
    done();
  });

  it('when sort asc is defined returns stations sorted', async (done) => {
    const response = await agent.post(`/api/${draft._id}/station/search`).send({ ...stationSearchBody, sort: { name: 1 } }).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`);
    expect(isSorted(response.body.elements, 'name')).toBe(true);
    done();
  });

  it('when sort desc is defined returns stations sorted', async (done) => {
    const response = await agent.post(`/api/${draft._id}/station/search`).send({ ...stationSearchBody, sort: { year: -1 } }).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`);
    expect(isSorted(response.body.elements, 'year', true)).toBe(true);
    done();
  });

  it('when select is defined returns stations with only properties in select', async (done) => {
    const response = await agent.post(`/api/${draft._id}/station/search`).send({ ...stationSearchBody, select: 'name geometry' }).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`);
    expect(response.body.elements.every(station => station.name && station.geometry && !station.markerIcon && !station.year)).toBe(true);
    done();
  });

  it('when populate is defined returns stations with population applied', async (done) => {
    const response = await agent.post(`/api/${draft._id}/station/search`)
      .send({ ...stationSearchBody, populate: { path: 'connections', select: 'stations', populate: { path: 'stations', select: 'name' } } })
      .set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`);
    expect(response.body.elements.every(station => station.connections
      && station.connections.every(connection => connection.stations
        && connection.stations.every(station => station && station.name)))).toBe(true);
    done();
  });

});

// GET FULL INFO FROM STATION
// GET /api/station/:stationId
describe('GET FULL INFO FROM STATION', () => {

  let manager;
  let tokenA;
  let station;
  let draft;

  beforeAll(async (done) => {
    tokenA = await loginAsRole('A');
    manager = await signUpAndLogin();

    const addDraftRes = await agent.post(`/api/london/draft`).send(mockDraft).set('Accept', 'application/json').set('Authorization', `Bearer ${manager.token}`);
    draft = addDraftRes.body;
    const stationRes = await agent.post(`/api/${draft._id}/station`).send(mockStation).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    station = stationRes.body;

    done();
  });

  it('when user is not logged it can not see station info', async (done) => {
    agent.get(`/api/station/${station._id}`).set('Accept', 'application/json')
      .expect(401, done);
  });

  it('when user is logged it can see station info', async (done) => {
    const stationRetrieved = await agent.get(`/api/station/${station._id}`).set('Accept', 'application/json').expect('Content-Type', /json/).set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    expect(stationRetrieved.body.key).toBe(station.key);
    expect(stationRetrieved.body.year).toBe(station.year);
    done();
  });

})

// ADD STATION
// POST /api/:draftId/station
describe('ADD STATION', () => {

  let nonManager;
  let manager;
  let tokenA;
  let draft;

  beforeAll(async (done) => {
    tokenA = await loginAsRole('A');
    nonManager = await signUpAndLogin();
    manager = await signUpAndLogin();
    const addDraftRes = await agent.post(`/api/london/draft`).send(mockDraft).set('Accept', 'application/json').set('Authorization', `Bearer ${manager.token}`);

    draft = addDraftRes.body;
    done();
  });

  it('when draft does not exist it returns 404', async (done) => {
    agent.post(`/api/5d2e641edf7da5311cac46f6/station`).send(mockStation).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`)
      .expect(404, done);
  });

  it('when draft is published it returns 403', async (done) => {
    await agent.put(`/api/draft/${draft._id}/publish`).set('Authorization', `Bearer ${tokenA}`);
    agent.post(`/api/${draft._id}/station`).send(mockStation).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`)
      .expect(403);
    await agent.put(`/api/draft/${draft._id}/unpublish`).set('Authorization', `Bearer ${tokenA}`);
    done();
  });

  it('when user is not logged it can not add station', async (done) => {
    agent.post(`/api/${draft._id}/station`).send(mockStation).set('Accept', 'application/json')
      .expect(401, done);
  });

  it('when user is not draft manager it can not add station', async (done) => {
    agent.post(`/api/${draft._id}/station`).send(mockStation).set('Accept', 'application/json').set('Authorization', `Bearer ${nonManager.token}`)
      .expect(401, done);
  });

  it('when user is draft manager it can add station', async (done) => {
    agent.post(`/api/${draft._id}/station`).send(mockStation).set('Accept', 'application/json').set('Authorization', `Bearer ${manager.token}`)
      .expect(200, done);
  });

  it('when user is admin it can add station', async (done) => {
    agent.post(`/api/${draft._id}/station`).send(mockStation).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`)
      .expect(200, done);
  });

  it('when station is added station ref is added to draft', async (done) => {
    const resStation = await agent.post(`/api/${draft._id}/station`).send(mockStation).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    const resDraft = await agent.get(`/api/draft/${draft._id}`).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`);
    expect(resDraft.body.stations.find(l => l === resStation.body._id)).toBeDefined();
    done();
  });

  it('when station does not contain geometry it returns bad request', async (done) => {
    agent.post(`/api/${draft._id}/station`).send({ ...mockStation, geometry: null }).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`)
      .expect(400, done);
  });

  it('when station year is not a valid value it returns bad request', async (done) => {
    agent.post(`/api/${draft._id}/station`).send({ ...mockStation, year: 2050 }).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`)
      .expect(400, done);
  });

  it('when station key and station town already exits it returns bad request', async (done) => {
    agent.post(`/api/${draft._id}/station`).send({ ...mockStation, year: 2050 }).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`)
      .expect(400, done);
  });

});

// UPDATE STATION
// PUT /api/:town/station/:stationId
describe('UPDATE STATION', () => {

  let nonManager;
  let manager;
  let tokenA;
  let draft;
  let station;

  beforeAll(async (done) => {
    tokenA = await loginAsRole('A');
    nonManager = await signUpAndLogin();
    manager = await signUpAndLogin();

    const addDraftRes = await agent.post(`/api/london/draft`).send(mockDraft).set('Accept', 'application/json').set('Authorization', `Bearer ${manager.token}`);
    draft = addDraftRes.body;
    const addstationRes = await agent.post(`/api/${draft._id}/station`).send(mockStation).set('Accept', 'application/json').set('Authorization', `Bearer ${manager.token}`);
    station = addstationRes.body;

    done();
  });

  it('when station does not exist it returns 404', async (done) => {
    agent.put(`/api/station/5d2e641edf7da5311cac46f6`).send({ ...mockStation, name: 'New station name' }).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`)
      .expect(404, done);
  });

  it('when draft is published it returns 403', async (done) => {
    await agent.put(`/api/draft/${draft._id}/publish`).set('Authorization', `Bearer ${tokenA}`);
    agent.put(`/api/station/${station._id}`).send({ ...mockStation, name: 'Name is not going to change' }).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`)
      .expect(403);
    await agent.put(`/api/draft/${draft._id}/unpublish`).set('Authorization', `Bearer ${tokenA}`);
    done();
  });

  it('when user is not manager it can not update station', async (done) => {
    agent.put(`/api/station/${station._id}`).send({ ...mockStation, name: 'New station name' }).set('Accept', 'application/json').set('Authorization', `Bearer ${nonManager.token}`)
      .expect(401, done);
  });

  it('when user is draft manager it can update station', async (done) => {
    const res = await agent.put(`/api/station/${station._id}`).send({ ...mockStation, name: 'New station name' }).set('Accept', 'application/json').set('Authorization', `Bearer ${manager.token}`)
      .expect(200);
    expect(res.body.name).toBe('New station name');
    done();
  });

  it('when user is admin it can update station', async (done) => {
    const res = await agent.put(`/api/station/${station._id}`).send({ ...mockStation, name: 'Another station name' }).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    expect(res.body.name).toBe('Another station name');
    done();
  });

});

// DELETE STATION
// DELETE /api/station/:stationId
describe('DELETE STATION', () => {

  let nonManager;
  let manager;
  let tokenA;
  let draft;
  let station1;
  let station2;
  let station3;

  beforeAll(async (done) => {
    tokenA = await loginAsRole('A');
    nonManager = await signUpAndLogin();
    manager = await signUpAndLogin();

    const addDraftRes = await agent.post(`/api/london/draft`).send(mockDraft).set('Accept', 'application/json').set('Authorization', `Bearer ${manager.token}`);
    draft = addDraftRes.body;
    const addstation1Res = await agent.post(`/api/${draft._id}/station`).send(mockStation).set('Accept', 'application/json').set('Authorization', `Bearer ${manager.token}`);
    station1 = addstation1Res.body;
    const addstation2Res = await agent.post(`/api/${draft._id}/station`).send(mockStation).set('Accept', 'application/json').set('Authorization', `Bearer ${manager.token}`);
    station2 = addstation2Res.body;
    const addstation3Res = await agent.post(`/api/${draft._id}/station`).send(mockStation).set('Accept', 'application/json').set('Authorization', `Bearer ${manager.token}`);
    station3 = addstation3Res.body;

    done();
  });

  it('when station does not exist it returns 404', async (done) => {
    agent.delete(`/api/station/5d2e641edf7da5311cac46f6`).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`)
      .expect(404, done);
  });

  it('when draft is published it returns 403', async (done) => {
    await agent.put(`/api/draft/${draft._id}/publish`).set('Authorization', `Bearer ${tokenA}`);
    agent.delete(`/api/station/${station1._id}`).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`)
      .expect(403);
    await agent.put(`/api/draft/${draft._id}/unpublish`).set('Authorization', `Bearer ${tokenA}`);
    done();
  });

  it('when user is not manager it can not delete station', async (done) => {
    agent.delete(`/api/station/${station1._id}`).set('Accept', 'application/json').set('Authorization', `Bearer ${nonManager.token}`)
      .expect(401, done);
  });

  it('when user is draft manager it can delete station', async (done) => {
    agent.delete(`/api/station/${station1._id}`).set('Accept', 'application/json').set('Authorization', `Bearer ${manager.token}`)
      .expect(200, done);
  });

  it('when user is admin it can delete station', async (done) => {
    agent.delete(`/api/station/${station2._id}`).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`)
      .expect(200, done);
  });

  it('when station is deleted station ref is removed from draft', async (done) => {
    await agent.delete(`/api/station/${station3._id}`).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    const resDraft = await agent.get(`/api/draft/${draft._id}`).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`);
    expect(resDraft.body.stations.find(l => l === station3._id)).not.toBeDefined();
    done();
  });

});