const app = require('../app');
const agent = require('supertest').agent(app);
const mockLine = require('./mock/line.json');
const mockStationA = require('./mock/stationA.json');
const mockStationB = require('./mock/stationB.json');
const connectionSearchBody = require('./mock/connection_search_body.json');
const isSorted = require('./helpers/isSorted');

const loginAsRole = require('./helpers/loginAsRole');

let tokenA;

const getFreshLine = async () => {
  const lineRes = await agent.post(`/api/london/line`).send(mockLine).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`);
  return lineRes.body;
}

const getFreshStation = async (type) => {
  const stationRes = await agent.post(`/api/london/station`).send(type === 'A' ? mockStationA : mockStationB).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`);
  return stationRes.body;
}

const getFreshConnection = async () => {
  const line = await getFreshLine();
  const stations = [
    await getFreshStation('A'),
    await getFreshStation('B')
  ];
  return {
    line: line._id,
    stations: stations.map(s => s._id),
    year: 2000
  };
}

const addFreshConnection = async (token) => {
  const connection = await getFreshConnection();
  const res = await agent.post(`/api/london/connection`).send(connection).set('Accept', 'application/json').set('Authorization', `Bearer ${token}`).expect(200);
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
// POST /api/:town/connection/search
describe('SEARCH CONNECTIONS', () => {

  let tokenA;

  beforeAll(async (done) => {
    tokenA = await loginAsRole('A');
    done();
  });

  it('when user is not logged it can not search connections', async (done) => {
    agent.post(`/api/london/connection/search`).set('Accept', 'application/json')
      .expect(401, done);
  });

  it('when user is logged it can search connections', async (done) => {
    agent.post(`/api/london/connection/search`).send(connectionSearchBody).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`)
      .expect(200, done);
  });

  it('when body does not contain proper pagination it returns 400', async (done) => {
    agent.post(`/api/london/connection/search`).send({ ...connectionSearchBody, pagination: null }).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`)
      .expect(400, done);
  });

  it('when sort asc is defined returns connections sorted', async (done) => {
    const response = await agent.post(`/api/london/connection/search`).send({ ...connectionSearchBody, sort: { year: 1 } }).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`);
    expect(isSorted(response.body.elements, 'year')).toBe(true);
    done();
  });

  it('when sort desc is defined returns connections sorted', async (done) => {
    const response = await agent.post(`/api/london/connection/search`).send({ ...connectionSearchBody, sort: { year: -1 } }).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`);
    expect(isSorted(response.body.elements, 'year', true)).toBe(true);
    done();
  });

  it('when select is defined returns connections with only properties in select', async (done) => {
    const response = await agent.post(`/api/london/connection/search`).send({ ...connectionSearchBody, select: 'year' }).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`);
    expect(response.body.elements.every(connection => connection.year && !connection.line && !connection.stations)).toBe(true);
    done();
  });

  it('when populate is defined returns connections with population applied', async (done) => {
    const response = await agent.post(`/api/london/connection/search`)
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

  let connection;
  let line;
  let stations;

  beforeAll(async (done) => {
    tokenA = await loginAsRole('A');

    line = await getFreshLine();
    stations = [
      await getFreshStation('A'),
      await getFreshStation('B')
    ];

    const connectionBody = {
      line: line._id,
      stations: stations.map(s => s._id),
      year: 2000
    }

    const connectionRes = await agent.post(`/api/london/connection`).send(connectionBody).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    connection = connectionRes.body;
    done();
  });

  it('when user is not logged it can not see connection info', async (done) => {
    agent.get(`/api/connection/${connection._id}`).set('Accept', 'application/json')
      .expect(401, done);
  });

  it('when user is logged it can see connection info', async (done) => {
    const connectionRetrieved = await agent.get(`/api/connection/${connection._id}`).set('Accept', 'application/json').expect('Content-Type', /json/).set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    expect(connectionRetrieved.body.year).toBe(connection.year);
    done();
  });

})

// ADD CONNECTION
// POST /api/:town/connection
describe('ADD CONNECTION', () => {

  let tokenU;
  let tokenM1;
  let tokenA;
  let connection;

  beforeAll(async (done) => {
    tokenU = await loginAsRole('U');
    tokenM1 = await loginAsRole('M1');
    tokenA = await loginAsRole('A');
    done();
  });

  it('when user is not logged it can not add connection', async (done) => {
    agent.post(`/api/london/connection`).send({}).set('Accept', 'application/json')
      .expect(401, done);
  });

  it('when user is not town manager it can not add connection', async (done) => {
    agent.post(`/api/london/connection`).send({}).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenU}`)
      .expect(401, done);
  });

  it('when user is town manager it can add connection', async (done) => {
    const mockConnection = await getFreshConnection();
    agent.post(`/api/london/connection`).send(mockConnection).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenM1}`)
      .expect(200, done);
  });

  it('when user is admin it can add connection', async (done) => {
    connection = await getFreshConnection();
    agent.post(`/api/london/connection`).send(connection).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`)
      .expect(200, done);
  });

  it('when trying to add connection with same stations and line returns 400', async (done) => {
    agent.post(`/api/london/connection`).send(connection).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`)
      .expect(400, done);
  });

  it('when trying to add connection with one station returns 400', async (done) => {
    connection = await getFreshConnection();
    agent.post(`/api/london/connection`).send({ ...connection, stations: connection.stations.shift() }).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`)
      .expect(400, done);
  });

  it('when trying to add connection with three stations returns 400', async (done) => {
    connection = await getFreshConnection();
    const thirdStation = await getFreshStation();
    connection.stations.push(thirdStation);
    agent.post(`/api/london/connection`).send(connection).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`)
      .expect(400, done);
  });

  it('when connection is added its line and stations must have it in their connections', async (done) => {
    connection = await getFreshConnection();
    const connectionRes = await agent.post(`/api/london/connection`).send(connection).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`);
    const line = await getLine(tokenA, connection.line);
    expect(line.connections.find(con => con._id === connectionRes.body._id)).not.toBeUndefined();
    const stationA = await getStation(tokenA, connection.stations[0]);
    expect(stationA.connections.find(con => con._id === connectionRes.body._id)).not.toBeUndefined();
    const stationB = await getStation(tokenA, connection.stations[1]);
    expect(stationB.connections.find(con => con._id === connectionRes.body._id)).not.toBeUndefined();
    done();
  });

});

// UPDATE CONNECTION
// PUT /api/connection/:connectionId
describe('UPDATE CONNECTION', () => {

  let tokenM1;
  let tokenM2;
  let tokenA;
  let mockConnectionA;
  let mockConnectionB;
  let connectionAId;
  let connectionBId;

  beforeAll(async (done) => {
    tokenM1 = await loginAsRole('M1');
    tokenM2 = await loginAsRole('M2');
    tokenA = await loginAsRole('A');
    mockConnectionA = await getFreshConnection();
    const connectionResA = await agent.post(`/api/london/connection`).send(mockConnectionA).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenM1}`).expect(200);
    connectionAId = connectionResA.body._id;
    mockConnectionB = await getFreshConnection();
    const connectionResB = await agent.post(`/api/london/connection`).send(mockConnectionB).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenM1}`).expect(200);
    connectionBId = connectionResB.body._id;
    done();
  });

  it('when user is creator it can update connection', async (done) => {
    const modifedConnectionRes = await agent.put(`/api/connection/${connectionAId}`).send({ ...mockConnectionA, year: 1990 }).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenM1}`).expect(200);
    expect(modifedConnectionRes.body.year).toBe(1990);
    done();
  });

  it('when user is not creator it can not update connection', async (done) => {
    agent.put(`/api/connection/${connectionAId}`).send({ ...mockConnectionA, year: 1990 }).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenM2}`).expect(401, done);
  });

  it('when user is admin it can update connection', async (done) => {
    const modifedConnectionRes = await agent.put(`/api/connection/${connectionBId}`).send({ ...mockConnectionB, year: 1995 }).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`).expect(200);
    expect(modifedConnectionRes.body.year).toBe(1995);
    done();
  });

  it('when trying to update connection with existing stations and line in other connection returns 400', async (done) => {
    agent.put(`/api/connection/${connectionBId}`).send(mockConnectionA).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`)
      .expect(400, done);
  });

  it('when connection line is updated connection ref must be in new line and must be removed from old line', async (done) => {
    const connection = await getFreshConnection();
    const connectionRes = await agent.post(`/api/london/connection`).send(connection).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`).expect(200);
    let oldLine = await getLine(tokenA, connectionRes.body.line._id);
    expect(oldLine.connections.find(con => con._id === connectionRes.body._id)).not.toBeUndefined();
    let newLine = await getFreshLine();
    await agent.put(`/api/connection/${connectionRes.body._id}`).send({ ...connection, line: newLine._id }).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`);
    oldLine = await getLine(tokenA, connectionRes.body.line._id);
    expect(oldLine.connections.find(con => con._id === connectionRes.body._id)).toBeUndefined();
    newLine = await getLine(tokenA, newLine._id);
    expect(newLine.connections.find(con => con._id === connectionRes.body._id)).not.toBeUndefined();
    done();
  });

  it('when connection station/s are updated connection ref must be in new station/s and must be removed from old station/s', async (done) => {
    const connection = await getFreshConnection();
    const connectionRes = await agent.post(`/api/london/connection`).send(connection).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`).expect(200);
    let oldStationA = await getStation(tokenA, connectionRes.body.stations[0]);
    let oldStationB = await getStation(tokenA, connectionRes.body.stations[1]);
    expect(oldStationA.connections.find(con => con._id === connectionRes.body._id)).not.toBeUndefined();
    expect(oldStationB.connections.find(con => con._id === connectionRes.body._id)).not.toBeUndefined();
    let newStationA = await getFreshStation();
    await agent.put(`/api/connection/${connectionRes.body._id}`).send({ ...connection, stations: [newStationA._id, oldStationB._id] }).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`);
    oldStationA = await getStation(tokenA, connectionRes.body.stations[0]);
    expect(oldStationA.connections.find(con => con._id === connectionRes.body._id)).toBeUndefined();
    newStationA = await getStation(tokenA, newStationA._id);
    expect(newStationA.connections.find(con => con._id === connectionRes.body._id)).not.toBeUndefined();
    oldStationB = await getStation(tokenA, connectionRes.body.stations[1]);
    expect(oldStationB.connections.find(con => con._id === connectionRes.body._id)).not.toBeUndefined();
    done();
  });

});

// DELETE CONNECTION
// DELETE /api/connection/:connectionId
describe('DELETE CONNECTION', () => {

  let tokenM1;
  let tokenM2;
  let tokenA;
  let connectionA;
  let connectionB;

  beforeAll(async (done) => {
    tokenM1 = await loginAsRole('M1');
    tokenM2 = await loginAsRole('M2');
    tokenA = await loginAsRole('A');
    mockConnectionA = await getFreshConnection();
    const connectionResA = await agent.post(`/api/london/connection`).send(mockConnectionA).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenM1}`).expect(200);
    connectionA = connectionResA.body;
    mockConnectionB = await getFreshConnection();
    const connectionResB = await agent.post(`/api/london/connection`).send(mockConnectionB).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenM1}`).expect(200);
    connectionB = connectionResB.body;
    done();
  });

  it('when user is creator it can delete connection', async (done) => {
    await agent.delete(`/api/connection/${connectionA._id}`).set('Authorization', `Bearer ${tokenM1}`).expect(200);
    agent.get(`/api/connection/${connectionA._id}`).set('Authorization', `Bearer ${tokenM1}`).expect(404, done);
  });

  it('when user is not creator it can not delete connection', async (done) => {
    agent.delete(`/api/connection/${connectionB._id}`).set('Authorization', `Bearer ${tokenM2}`).expect(401, done);
  });

  it('when user is admin it can delete connection', async (done) => {
    await agent.delete(`/api/connection/${connectionB._id}`).set('Authorization', `Bearer ${tokenA}`).expect(200);
    agent.get(`/api/connection/${connectionB._id}`).set('Authorization', `Bearer ${tokenA}`).expect(404, done);
  });

  it('when connection is deleted it must be removed from line and stations refs', async (done) => {
    const connection = await addFreshConnection(tokenA);
    let line = await getLine(tokenA, connection.line._id);
    let stationA = await getStation(tokenA, connection.stations[0]);
    let stationB = await getStation(tokenA, connection.stations[0]);
    expect(line.connections.find(con => con._id === connection._id)).not.toBeUndefined();
    expect(stationA.connections.find(con => con._id === connection._id)).not.toBeUndefined();
    expect(stationB.connections.find(con => con._id === connection._id)).not.toBeUndefined();
    await agent.delete(`/api/connection/${connection._id}`).set('Authorization', `Bearer ${tokenA}`).expect(200);
    line = await getLine(tokenA, connection.line._id);
    stationA = await getStation(tokenA, connection.stations[0]);
    stationB = await getStation(tokenA, connection.stations[0]);
    expect(line.connections.find(con => con._id === connection._id)).toBeUndefined();
    expect(stationA.connections.find(con => con._id === connection._id)).toBeUndefined();
    expect(stationB.connections.find(con => con._id === connection._id)).toBeUndefined();
    done();
  });
});