const app = require('../app');
const agent = require('supertest').agent(app);
const mockLine = require('./mock/line.json');
const mockStationA = require('./mock/stationA.json');
const mockStationB = require('./mock/stationB.json');

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

// GET FULL INFO FROM CONNECTION
describe('GET /api/connection/:connectionId', () => {

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
describe('POST /api/:town/connection', () => {

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
    const lineRes = await agent.get(`/api/line/${connection.line}`).set('Accept', 'application/json').expect('Content-Type', /json/).set('Authorization', `Bearer ${tokenA}`);
    expect(lineRes.body.connections.find(con => con._id === connectionRes.body._id)).not.toBeUndefined();
    const stationARes = await agent.get(`/api/station/${connection.stations[0]}`).set('Accept', 'application/json').expect('Content-Type', /json/).set('Authorization', `Bearer ${tokenA}`);
    expect(stationARes.body.connections.find(con => con._id === connectionRes.body._id)).not.toBeUndefined();
    const stationBRes = await agent.get(`/api/station/${connection.stations[1]}`).set('Accept', 'application/json').expect('Content-Type', /json/).set('Authorization', `Bearer ${tokenA}`);
    expect(stationARes.body.connections.find(con => con._id === connectionRes.body._id)).not.toBeUndefined();
    done();
  });

});

// UPDATE CONNECTION
describe('PUT /api/connection/:connectionId', () => {

  let tokenM1;
  let tokenM2;
  let tokenA;
  let connectionA;
  let connectionB;

  beforeAll(async (done) => {
    tokenM1 = await loginAsRole('M1');
    const mockConnection = await getFreshConnection();
    const connectionRes = await agent.post(`/api/london/connection`).send(mockConnection).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenM1}`).expect(200);
    connection = connectionRes.body;
    done();
  });

  it('when user is creator it can update connection', async (done) => {
    connectionA = await getFreshConnection();
    const modifedConnectionRes = await agent.put(`/api/connection/${connection._id}`).send({ ...connectionA, year: 1990 }).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenM1}`).expect(200);
    expect(modifedConnectionRes.body.year).toBe(1990);
    done();
  });

  it('when user is not creator it can not update connection', async (done) => {
    tokenM2 = await loginAsRole('M2');
    const mockConnection = await getFreshConnection();
    agent.put(`/api/connection/${connection._id}`).send({ ...mockConnection, year: 1990 }).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenM2}`).expect(401, done);
  });

  it('when user is admin it can update connection', async (done) => {
    tokenA = await loginAsRole('A');
    connectionB = await getFreshConnection();
    const modifedConnectionRes = await agent.put(`/api/connection/${connection._id}`).send({ ...connectionB, year: 1990 }).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`).expect(200);
    connectionB._id = modifedConnectionRes.body._id;
    expect(modifedConnectionRes.body.year).toBe(1990);
    done();
  });

  // it('when trying to update connection with same stations and line returns 400', async (done) => {
  //   agent.put(`/api/connection/${connectionB._id}`).send(connectionA).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`)
  //     .expect(400, done);
  // });

});