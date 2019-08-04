const app = require('../app');
const agent = require('supertest').agent(app);
const signUpAndLogin = require('./helpers/signUpAndLogin');
const mockDraft = require('./mock/draft.json');
const mockLine = require('./mock/line.json');
const mockStationA = require('./mock/stationA.json');
const mockStationB = require('./mock/stationB.json');
const connectionSearchBody = require('./mock/connection_search_body.json');
const isSorted = require('./helpers/isSorted');
const loginAsRole = require('./helpers/loginAsRole');

const getFreshLine = async (token, draftId) => {
  const lineRes = await agent.post(`/api/${draftId}/line`).send(mockLine).set('Accept', 'application/json').set('Authorization', `Bearer ${token}`);
  return lineRes.body;
}

const getFreshStation = async (token, draftId, type) => {
  const stationRes = await agent.post(`/api/${draftId}/station`).send(type === 'A' ? mockStationA : mockStationB).set('Accept', 'application/json').set('Authorization', `Bearer ${token}`);
  return stationRes.body;
}

const getFreshConnection = async (token, draftId) => {
  const line = await getFreshLine(token, draftId);
  const stations = [
    await getFreshStation(token, draftId, 'A'),
    await getFreshStation(token, draftId, 'B')
  ];
  return {
    line: line._id,
    stations: stations.map(s => s._id),
    year: 2000
  };
}

const addFreshConnection = async (token, draftId) => {
  const connection = await getFreshConnection(token, draftId);
  const res = await agent.post(`/api/${draftId}/connection`).send(connection).set('Accept', 'application/json').set('Authorization', `Bearer ${token}`).expect(200);
  return res.body;
}

const getLine = async (token, lineId) => {
  const lineRes = await agent.get(`/api/line/${lineId}`).set('Accept', 'application/json').expect('Content-Type', /json/).set('Authorization', `Bearer ${token}`);
  return lineRes.body;
}

const getStation = async (token, stationId) => {
  const stationRes = await agent.get(`/api/station/${stationId}`).set('Accept', 'application/json').expect('Content-Type', /json/).set('Authorization', `Bearer ${token}`);
  return stationRes.body;
}

// SEARCH CONNECTIONS
// POST /api/:draftId/connection/search
describe('SEARCH CONNECTIONS', () => {

  const connectionsLength = 3;
  const connections = [];
  let manager;
  let tokenA;
  let draft;

  beforeAll(async (done) => {
    tokenA = await loginAsRole('A');
    manager = await signUpAndLogin();
    const addDraftRes = await agent.post(`/api/london/draft`).send(mockDraft).set('Accept', 'application/json').set('Authorization', `Bearer ${manager.token}`);
    draft = addDraftRes.body;

    for (let i = 0; i < connectionsLength; i++) {
      const connection = await addFreshConnection(manager.token, draft._id);
      connections.push(connection)
    }

    done();
  });

  it('when user is not logged it can not search connections', async (done) => {
    agent.post(`/api/${draft._id}/connection/search`).set('Accept', 'application/json')
      .expect(401, done);
  });

  it('when user is logged it can search connections', async (done) => {
    agent.post(`/api/${draft._id}/connection/search`).send(connectionSearchBody).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`)
      .expect(200, done);
  });

  it('when body does not contain proper pagination it returns 400', async (done) => {
    agent.post(`/api/${draft._id}/connection/search`).send({ ...connectionSearchBody, pagination: null }).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`)
      .expect(400, done);
  });

  it('when sort asc is defined returns connections sorted', async (done) => {
    const response = await agent.post(`/api/${draft._id}/connection/search`).send({ ...connectionSearchBody, sort: { year: 1 } }).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`);
    expect(isSorted(response.body.elements, 'year')).toBe(true);
    done();
  });

  it('when sort desc is defined returns connections sorted', async (done) => {
    const response = await agent.post(`/api/${draft._id}/connection/search`).send({ ...connectionSearchBody, sort: { year: -1 } }).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`);
    expect(isSorted(response.body.elements, 'year', true)).toBe(true);
    done();
  });

  it('when select is defined returns connections with only properties in select', async (done) => {
    const response = await agent.post(`/api/${draft._id}/connection/search`).send({ ...connectionSearchBody, select: 'year' }).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`);
    expect(response.body.elements.every(connection => connection.year && !connection.line && !connection.stations)).toBe(true);
    done();
  });

  it('when populate is defined returns connections with population applied', async (done) => {
    const response = await agent.post(`/api/${draft._id}/connection/search`)
      .send({ ...connectionSearchBody, populate: { path: 'stations', select: 'name year' } })
      .set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`);
    expect(response.body.elements.every(connection => connection.stations
      && connection.stations.every(station => station && station.name && station.year && !station.geometry))).toBe(true);
    done();
  });

});

// GET FULL INFO FROM CONNECTION
// GET /api/connection/:connectionId
describe('GET FULL INFO FROM CONNECTION', () => {

  let manager;
  let tokenU;
  let connection;
  let draft;

  beforeAll(async (done) => {
    manager = await signUpAndLogin();
    tokenU = await loginAsRole('U');

    const addDraftRes = await agent.post(`/api/london/draft`).send(mockDraft).set('Accept', 'application/json').set('Authorization', `Bearer ${manager.token}`);
    draft = addDraftRes.body;

    connection = await addFreshConnection(manager.token, draft._id);
    done();
  });

  it('when user is not logged it can not see connection info', async (done) => {
    agent.get(`/api/connection/${connection._id}`).set('Accept', 'application/json')
      .expect(401, done);
  });

  it('when user is logged it can see connection info', async (done) => {
    const res = await agent.get(`/api/connection/${connection._id}`).set('Accept', 'application/json').expect('Content-Type', /json/).set('Authorization', `Bearer ${tokenU}`)
      .expect(200);
    expect(res.body.year).toBe(connection.year);
    done();
  });

})

// ADD CONNECTION
// POST /api/:town/connection
describe('ADD CONNECTION', () => {

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
    const mockConnection = await getFreshConnection(manager.token, draft._id);
    agent.post(`/api/5d2e641edf7da5311cac46f6/connection`).send(mockConnection).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`)
      .expect(404, done);
  });

  it('when draft is published it returns 403', async (done) => {
    const mockConnection = await getFreshConnection(manager.token, draft._id);
    await agent.put(`/api/draft/${draft._id}/publish`).set('Authorization', `Bearer ${tokenA}`);
    agent.post(`/api/${draft._id}/connection`).send(mockConnection).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`)
      .expect(403);
    await agent.put(`/api/draft/${draft._id}/unpublish`).set('Authorization', `Bearer ${tokenA}`);
    done();
  });

  it('when user is not logged it can not add connection', async (done) => {
    const mockConnection = await getFreshConnection(manager.token, draft._id);
    agent.post(`/api/${draft._id}/connection`).send(mockConnection).set('Accept', 'application/json')
      .expect(401, done);
  });

  it('when user is not draft manager it can not add connection', async (done) => {
    const mockConnection = await getFreshConnection(manager.token, draft._id);
    agent.post(`/api/${draft._id}/connection`).send(mockConnection).set('Accept', 'application/json').set('Authorization', `Bearer ${nonManager.token}`)
      .expect(401, done);
  });

  it('when user is draft manager it can add connection', async (done) => {
    const mockConnection = await getFreshConnection(manager.token, draft._id);
    agent.post(`/api/${draft._id}/connection`).send(mockConnection).set('Accept', 'application/json').set('Authorization', `Bearer ${manager.token}`)
      .expect(200, done);
  });

  it('when user is admin it can add connection', async (done) => {
    const mockConnection = await getFreshConnection(manager.token, draft._id);
    agent.post(`/api/${draft._id}/connection`).send(mockConnection).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`)
      .expect(200, done);
  });

  it('when trying to add connection with same stations and line returns 400', async (done) => {
    const mockConnection = await getFreshConnection(manager.token, draft._id);
    await agent.post(`/api/${draft._id}/connection`).send(mockConnection).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    const anotherMockConnection = await getFreshConnection(manager.token, draft._id);
    agent.post(`/api/${draft._id}/connection`).send({ ...anotherMockConnection, line: mockConnection.line, stations: mockConnection.stations }).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`)
      .expect(400, done);
  });

  it('when trying to add connection with one station returns 400', async (done) => {
    const mockConnection = await getFreshConnection(manager.token, draft._id);
    agent.post(`/api/${draft._id}/connection`).send({ ...mockConnection, stations: mockConnection.stations.splice(-1, 1) }).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`)
      .expect(400, done);
  });

  it('when trying to add connection with three stations returns 400', async (done) => {
    const mockConnection = await getFreshConnection(manager.token, draft._id);
    mockConnection.stations.push(await getFreshStation(manager.token, draft._id, 'A'));
    agent.post(`/api/${draft._id}/connection`).send(mockConnection).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`)
      .expect(400, done);
  });

  it('when connection is added line ref is added to draft', async (done) => {
    const mockConnection = await getFreshConnection(manager.token, draft._id);
    const res = await agent.post(`/api/${draft._id}/connection`).send(mockConnection).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    const resDraft = await agent.get(`/api/draft/${draft._id}`).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`);
    expect(resDraft.body.connections.find(c => c === res.body._id)).toBeDefined();
    done();
  });

  it('when connection is added its line and stations must have it in their connections', async (done) => {
    const mockConnection = await getFreshConnection(manager.token, draft._id);
    const connectionRes = await agent.post(`/api/${draft._id}/connection`).send(mockConnection).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`);
    const line = await getLine(tokenA, mockConnection.line);
    expect(line.connections.find(con => con._id === connectionRes.body._id)).not.toBeUndefined();
    const stationA = await getStation(tokenA, mockConnection.stations[0]);
    expect(stationA.connections.find(con => con._id === connectionRes.body._id)).not.toBeUndefined();
    const stationB = await getStation(tokenA, mockConnection.stations[1]);
    expect(stationB.connections.find(con => con._id === connectionRes.body._id)).not.toBeUndefined();
    done();
  });

});

// UPDATE CONNECTION
// PUT /api/connection/:connectionId
describe('UPDATE CONNECTION', () => {

  let nonManager;
  let manager;
  let tokenA;
  let draft;
  let connection;

  beforeAll(async (done) => {
    tokenA = await loginAsRole('A');
    nonManager = await signUpAndLogin();
    manager = await signUpAndLogin();
    const addDraftRes = await agent.post(`/api/london/draft`).send(mockDraft).set('Accept', 'application/json').set('Authorization', `Bearer ${manager.token}`);

    draft = addDraftRes.body;
    connection = await addFreshConnection(manager.token, draft._id);

    done();
  });

  it('when connection does not exist it returns 404', async (done) => {
    agent.put(`/api/connection/5d2e641edf7da5311cac46f6`).send({ ...connection, year: 1995 }).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`)
      .expect(404, done);
  });

  it('when draft is published it returns 403', async (done) => {
    await agent.put(`/api/draft/${draft._id}/publish`).set('Authorization', `Bearer ${tokenA}`);
    agent.put(`/api/connection/${connection._id}`).send({ ...connection, year: 1995 }).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`)
      .expect(403);
    await agent.put(`/api/draft/${draft._id}/unpublish`).set('Authorization', `Bearer ${tokenA}`);
    done();
  });

  it('when user is not manager it can not update connection', async (done) => {
    agent.put(`/api/connection/${connection._id}`).send({ ...connection, year: 1995 }).set('Accept', 'application/json').set('Authorization', `Bearer ${nonManager.token}`)
      .expect(401, done);
  });

  it('when user is draft manager it can update connection', async (done) => {
    const res = await agent.put(`/api/connection/${connection._id}`).send({ ...connection, year: 1997 }).set('Accept', 'application/json').set('Authorization', `Bearer ${manager.token}`)
      .expect(200);
    expect(res.body.year).toBe(1997);
    done();
  });

  it('when user is admin it can update connection', async (done) => {
    const res = await agent.put(`/api/connection/${connection._id}`).send({ ...connection, year: 1999 }).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    expect(res.body.year).toBe(1999);
    done();
  });

  it('when trying to update connection with existing stations and line in other connection returns 400', async (done) => {
    const anotherConnection = await addFreshConnection(manager.token, draft._id);
    agent.put(`/api/connection/${anotherConnection._id}`).send({ ...anotherConnection, line: connection.line, stations: connection.stations }).set('Accept', 'application/json').set('Authorization', `Bearer ${manager.token}`)
      .expect(400, done);
  });

  it('when connection line is updated connection ref must be in new line and must be removed from old line', async (done) => {
    let oldLine = await getLine(manager.token, connection.line);
    expect(oldLine.connections.find(con => con._id === connection._id)).not.toBeUndefined();
    let newLine = await getFreshLine(manager.token, draft._id);
    await agent.put(`/api/connection/${connection._id}`).send({ ...connection, line: newLine._id }).set('Accept', 'application/json').set('Authorization', `Bearer ${manager.token}`);
    oldLine = await getLine(manager.token, connection.line);
    expect(oldLine.connections.find(con => con._id === connection._id)).toBeUndefined();
    newLine = await getLine(manager.token, newLine._id);
    expect(newLine.connections.find(con => con._id === connection._id)).not.toBeUndefined();
    done();
  });

  it('when connection station/s are updated connection ref must be in new station/s and must be removed from old station/s', async (done) => {
    let oldStationA = await getStation(manager.token, connection.stations[0]);
    let oldStationB = await getStation(manager.token, connection.stations[1]);
    expect(oldStationA.connections.find(con => con._id === connection._id)).toBeDefined();
    expect(oldStationB.connections.find(con => con._id === connection._id)).toBeDefined();
    let newStationA = await getFreshStation(manager.token, draft._id);
    await agent.put(`/api/connection/${connection._id}`).send({ ...connection, stations: [newStationA._id, oldStationB._id] }).set('Accept', 'application/json').set('Authorization', `Bearer ${manager.token}`);
    oldStationA = await getStation(manager.token, connection.stations[0]);
    expect(oldStationA.connections.find(con => con._id === connection._id)).not.toBeDefined();
    newStationA = await getStation(manager.token, newStationA._id);
    expect(newStationA.connections.find(con => con._id === connection._id)).toBeDefined();
    oldStationB = await getStation(manager.token, connection.stations[1]);
    expect(oldStationB.connections.find(con => con._id === connection._id)).toBeDefined();
    done();
  });

});

// DELETE CONNECTION
// DELETE /api/connection/:connectionId
describe('DELETE CONNECTION', () => {

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

  it('when line does not exist it returns 404', async (done) => {
    agent.delete(`/api/connection/5d2e641edf7da5311cac46f6`).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`)
      .expect(404, done);
  });

  it('when draft is published it returns 403', async (done) => {
    const connection = await addFreshConnection(manager.token, draft._id);
    await agent.put(`/api/draft/${draft._id}/publish`).set('Authorization', `Bearer ${tokenA}`);
    agent.delete(`/api/connection/${connection._id}`).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`)
      .expect(403);
    await agent.put(`/api/draft/${draft._id}/unpublish`).set('Authorization', `Bearer ${tokenA}`);
    done();
  });

  it('when user is not manager it can not delete connection', async (done) => {
    const connection = await addFreshConnection(manager.token, draft._id);
    agent.delete(`/api/connection/${connection._id}`).set('Accept', 'application/json').set('Authorization', `Bearer ${nonManager.token}`)
      .expect(401, done);
  });

  it('when user is draft manager it can delete connection', async (done) => {
    const connection = await addFreshConnection(manager.token, draft._id);
    agent.delete(`/api/connection/${connection._id}`).set('Accept', 'application/json').set('Authorization', `Bearer ${manager.token}`)
      .expect(200, done);
  });

  it('when user is admin it can delete connection', async (done) => {
    const connection = await addFreshConnection(manager.token, draft._id);
    agent.delete(`/api/connection/${connection._id}`).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`)
      .expect(200, done);
  });

  it('when connection is deleted line ref is removed from draft', async (done) => {
    const connection = await addFreshConnection(manager.token, draft._id);
    await agent.delete(`/api/connection/${connection._id}`).set('Accept', 'application/json').set('Authorization', `Bearer ${manager.token}`)
      .expect(200);
    const resDraft = await agent.get(`/api/draft/${draft._id}`).set('Accept', 'application/json').set('Authorization', `Bearer ${manager.token}`);
    expect(resDraft.body.connections.find(c => c === connection._id)).not.toBeDefined();
    done();
  });

  it('when connection is deleted it must be removed from line and stations refs', async (done) => {
    const connection = await addFreshConnection(manager.token, draft._id);
    let line = await getLine(manager.token, connection.line);
    let stationA = await getStation(manager.token, connection.stations[0]);
    let stationB = await getStation(manager.token, connection.stations[0]);
    expect(line.connections.find(con => con._id === connection._id)).not.toBeUndefined();
    expect(stationA.connections.find(con => con._id === connection._id)).not.toBeUndefined();
    expect(stationB.connections.find(con => con._id === connection._id)).not.toBeUndefined();
    await agent.delete(`/api/connection/${connection._id}`).set('Authorization', `Bearer ${manager.token}`).expect(200);
    line = await getLine(manager.token, connection.line);
    stationA = await getStation(manager.token, connection.stations[0]);
    stationB = await getStation(manager.token, connection.stations[0]);
    expect(line.connections.find(con => con._id === connection._id)).toBeUndefined();
    expect(stationA.connections.find(con => con._id === connection._id)).toBeUndefined();
    expect(stationB.connections.find(con => con._id === connection._id)).toBeUndefined();
    done();
  });
});