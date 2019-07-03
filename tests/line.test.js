const app = require('../app')
const agent = require('supertest').agent(app)
const mockLine = require('./mock/line.json');
const loginAsRole = require('./helpers/loginAsRole');

// GET LINES IN TOWN
describe('GET /api/:town/lines', () => {

  let town;
  let lines;

  beforeAll(async (done) => {
    townRes = await agent.get('/api/town/london');
    town = townRes.body;
    done();
  });

  it('it gets json with all lines in town when town url', async (done) => {
    const linesRes = await agent.get(`/api/${town.url}/lines`).set('Accept', 'application/json').expect('Content-Type', /json/)
      .expect(200);
    lines = linesRes.body;
    done();
  });

  it('it gets json with all lines in town when town id and should be the same as with url', async (done) => {
    const linesFromIdRes = await agent.get(`/api/${town.url}/lines`).set('Accept', 'application/json').expect('Content-Type', /json/)
      .expect(200);
    expect(linesFromIdRes.body).toEqual(lines);
    done();
  });

  it('it gets 404 when town does not exit', async (done) => {
    agent.get('/api/londinium/lines').set('Accept', 'application/json')
      .expect(404, done)
  });
});

// GET FULL INFO FROM LINE
describe('GET /api/line/:lineId', () => {

  let tokenA;
  let line;

  beforeAll(async (done) => {
    tokenA = await loginAsRole('A');
    const lineRes = await agent.post(`/api/london/line`).send(mockLine).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    line = lineRes.body;
    done();
  });

  it('when user is not logged it can not see line info', async (done) => {
    agent.get(`/api/line/${line._id}`).set('Accept', 'application/json')
      .expect(401, done);
  });

  it('when user is logged it can see line info', async (done) => {
    const lineRetrieved = await agent.get(`/api/line/${line._id}`).set('Accept', 'application/json').expect('Content-Type', /json/).set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    expect(lineRetrieved.body.key).toBe(line.key);
    expect(lineRetrieved.body.year).toBe(line.year);
    done();
  });

})

// ADD LINE
describe('POST /api/:town/line', () => {

  let tokenU;
  let tokenM1;
  let tokenA;

  beforeAll(async (done) => {
    tokenU = await loginAsRole('U');
    tokenM1 = await loginAsRole('M1');
    tokenA = await loginAsRole('A');
    done();
  });

  it('when user is not logged it can not add line', async (done) => {
    agent.post(`/api/london/line`).send(mockLine).set('Accept', 'application/json')
      .expect(401, done);
  });

  it('when user is not town manager it can not add line', async (done) => {
    agent.post(`/api/london/line`).send(mockLine).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenU}`)
      .expect(401, done);
  });

  it('when user is town manager it can add line', async (done) => {
    agent.post(`/api/london/line`).send(mockLine).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenM1}`)
      .expect(200, done);
  });

  it('when user is admin it can add line', async (done) => {
    agent.post(`/api/london/line`).send(mockLine).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`)
      .expect(200, done);
  });

  it('when line does not contain order it returns bad request', async (done) => {
    agent.post(`/api/london/line`).send({ ...mockLine, order: null }).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`)
      .expect(400, done);
  });

  it('when line key is not key format it returns bad request', async (done) => {
    agent.post(`/api/london/line`).send({ ...mockLine, key: 'test line' }).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`)
      .expect(400, done);
  });

  it('when line year is not a valid value it returns bad request', async (done) => {
    agent.post(`/api/london/line`).send({ ...mockLine, year: 2050 }).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`)
      .expect(400, done);
  });

  it('when line key and line town already exits it returns bad request', async (done) => {
    agent.post(`/api/london/line`).send({ ...mockLine, year: 2050 }).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`)
      .expect(400, done);
  });

});

// UPDATE LINE
describe('PUT /api/:town/line/:lineId', () => {

  let tokenM1;
  let tokenM2;
  let tokenA;
  let line;

  beforeAll(async (done) => {
    tokenM1 = await loginAsRole('M1');
    const lineRes = await agent.post(`/api/london/line`).send(mockLine).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenM1}`).expect(200);
    line = lineRes.body;
    done();
  });

  it('when user is creator it can update line', async (done) => {
    const modifedLineRes = await agent.put(`/api/line/${line._id}`).send({ ...mockLine, shortName: 'New short name' }).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenM1}`).expect(200);
    expect(modifedLineRes.body.shortName).toBe('New short name');
    done();
  });

  it('when user is not creator it can not update line', async (done) => {
    tokenM2 = await loginAsRole('M2');
    agent.put(`/api/line/${line._id}`).send({ ...mockLine, shortName: 'New short name' }).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenM2}`).expect(401, done);
  });

  it('when user is admin it can update line', async (done) => {
    tokenA = await loginAsRole('A');
    const modifedLineRes = await agent.put(`/api/line/${line._id}`).send({ ...mockLine, shortName: 'New short name by admin' }).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenM1}`).expect(200);
    expect(modifedLineRes.body.shortName).toBe('New short name by admin');
    done();
  });
});

// DELETE LINE
describe('DELETE /api/line/:lineId', () => {

  let tokenM1;
  let tokenM2;
  let tokenA;
  let line1;
  let line2;

  beforeAll(async (done) => {
    tokenM1 = await loginAsRole('M1');
    const lineRes1 = await agent.post(`/api/london/line`).send(mockLine).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenM1}`).expect(200);
    line1 = lineRes1.body;
    const lineRes2 = await agent.post(`/api/london/line`).send(mockLine).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenM1}`).expect(200);
    line2 = lineRes2.body;
    done();
  });

  it('when user is creator it can delete line', async (done) => {
    await agent.delete(`/api/line/${line1._id}`).set('Authorization', `Bearer ${tokenM1}`).expect(200);
    agent.get(`/api/line/${line1._id}`).set('Authorization', `Bearer ${tokenM1}`).expect(404, done);
  });

  it('when user is not creator it can not delete line', async (done) => {
    tokenM2 = await loginAsRole('M2');
    agent.delete(`/api/line/${line2._id}`).set('Authorization', `Bearer ${tokenM2}`).expect(401, done);
  });

  it('when user is admin it can delete line', async (done) => {
    tokenA = await loginAsRole('A');
    await agent.delete(`/api/line/${line2._id}`).set('Authorization', `Bearer ${tokenA}`).expect(200);
    agent.get(`/api/line/${line2._id}`).set('Authorization', `Bearer ${tokenA}`).expect(404, done);
  });
});