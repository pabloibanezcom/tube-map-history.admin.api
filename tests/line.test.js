const app = require('../app');
const agent = require('supertest').agent(app);
const signUpAndLogin = require('./helpers/signUpAndLogin');
const mockDraft = require('./mock/draft.json');
const mockLine = require('./mock/line.json');
const loginAsRole = require('./helpers/loginAsRole');
const lineSearchBody = require('./mock/line_search_body.json');
const isSorted = require('./helpers/isSorted');

// SEARCH LINES
// POST /api/:draftId/line/search
describe('SEARCH LINES', () => {

  const linesLength = 3;
  const lines = [];
  let manager;
  let tokenA;
  let draft;

  beforeAll(async (done) => {
    tokenA = await loginAsRole('A');
    manager = await signUpAndLogin();
    const addDraftRes = await agent.post(`/api/london/draft`).send(mockDraft).set('Accept', 'application/json').set('Authorization', `Bearer ${manager.token}`);
    draft = addDraftRes.body;

    for (let i = 0; i < linesLength; i++) {
      const res = await agent.post(`/api/${draft._id}/line`).send({ ...mockLine, name: `${mockLine.name}_${i}` }).set('Accept', 'application/json').set('Authorization', `Bearer ${manager.token}`);
      lines.push(res.body)
    }

    done();
  });

  it('when user is not logged it can not search lines', async (done) => {
    agent.post(`/api/${draft._id}/line/search`).set('Accept', 'application/json')
      .expect(401, done);
  });

  it('when user is logged it can search lines', async (done) => {
    agent.post(`/api/${draft._id}/line/search`).send(lineSearchBody).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`)
      .expect(200, done);
  });

  it('when body does not contain proper pagination it returns 400', async (done) => {
    agent.post(`/api/${draft._id}/line/search`).send({ ...lineSearchBody, pagination: null }).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`)
      .expect(400, done);
  });

  it('when filter name is defined returns only lines with name containing it', async (done) => {
    const response = await agent.post(`/api/${draft._id}/line/search`).send({ ...lineSearchBody, filter: { ...lineSearchBody.filter, name: lines[0].name } }).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`);
    expect(response.body.elements.length).toBe(1);
    done();
  });

  it('when sort asc is defined returns lines sorted', async (done) => {
    const response = await agent.post(`/api/${draft._id}/line/search`).send({ ...lineSearchBody, sort: { name: 1 } }).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`);
    expect(isSorted(response.body.elements, 'name')).toBe(true);
    done();
  });

  it('when sort desc is defined returns lines sorted', async (done) => {
    const response = await agent.post(`/api/${draft._id}/line/search`).send({ ...lineSearchBody, sort: { year: -1 } }).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`);
    expect(isSorted(response.body.elements, 'year', true)).toBe(true);
    done();
  });

  it('when select is defined returns lines with only properties in select', async (done) => {
    const response = await agent.post(`/api/${draft._id}/line/search`).send({ ...lineSearchBody, select: 'name key' }).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`);
    expect(response.body.elements.every(line => line.name && line.key && !line.shortName && !line.year)).toBe(true);
    done();
  });

  it('when populate is defined returns lines with population applied', async (done) => {
    const response = await agent.post(`/api/${draft._id}/line/search`)
      .send({ ...lineSearchBody, populate: { path: 'connections', select: 'stations', populate: { path: 'stations', select: 'name' } } })
      .set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`);
    expect(response.body.elements.every(line => line.connections
      && line.connections.every(connection => connection.stations
        && connection.stations.every(station => station && station.name)))).toBe(true);
    done();
  });

});

// GET FULL INFO FROM LINE
// GET /api/line/:lineId
describe('GET FULL INFO FROM LINE', () => {

  let manager;
  let tokenA;
  let line;
  let draft;

  beforeAll(async (done) => {
    tokenA = await loginAsRole('A');
    manager = await signUpAndLogin();

    const addDraftRes = await agent.post(`/api/london/draft`).send(mockDraft).set('Accept', 'application/json').set('Authorization', `Bearer ${manager.token}`);
    draft = addDraftRes.body;
    const lineRes = await agent.post(`/api/${draft._id}/line`).send(mockLine).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`)
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
// POST /api/:draftId/line
describe('ADD LINE', () => {

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
    agent.post(`/api/5d2e641edf7da5311cac46f6/line`).send(mockLine).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`)
      .expect(404, done);
  });

  it('when draft is published it returns 403', async (done) => {
    await agent.put(`/api/draft/${draft._id}/publish`).set('Authorization', `Bearer ${tokenA}`);
    agent.post(`/api/${draft._id}/line`).send(mockLine).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`)
      .expect(403);
    await agent.put(`/api/draft/${draft._id}/unpublish`).set('Authorization', `Bearer ${tokenA}`);
    done();
  });

  it('when user is not logged it can not add line', async (done) => {
    agent.post(`/api/${draft._id}/line`).send(mockLine).set('Accept', 'application/json')
      .expect(401, done);
  });

  it('when user is not draft manager it can not add line', async (done) => {
    agent.post(`/api/${draft._id}/line`).send(mockLine).set('Accept', 'application/json').set('Authorization', `Bearer ${nonManager.token}`)
      .expect(401, done);
  });

  it('when user is draft manager it can add line', async (done) => {
    agent.post(`/api/${draft._id}/line`).send(mockLine).set('Accept', 'application/json').set('Authorization', `Bearer ${manager.token}`)
      .expect(200, done);
  });

  it('when user is admin it can add line', async (done) => {
    agent.post(`/api/${draft._id}/line`).send(mockLine).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`)
      .expect(200, done);
  });

  it('when line is added line ref is added to draft', async (done) => {
    const resLine = await agent.post(`/api/${draft._id}/line`).send(mockLine).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    const resDraft = await agent.get(`/api/draft/${draft._id}`).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`);
    expect(resDraft.body.lines.find(l => l === resLine.body._id)).toBeDefined();
    done();
  });

  it('when line does not contain order it returns bad request', async (done) => {
    agent.post(`/api/${draft._id}/line`).send({ ...mockLine, order: null }).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`)
      .expect(400, done);
  });

  it('when line key is not key format it returns bad request', async (done) => {
    agent.post(`/api/${draft._id}/line`).send({ ...mockLine, key: 'test line' }).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`)
      .expect(400, done);
  });

  it('when line year is not a valid value it returns bad request', async (done) => {
    agent.post(`/api/${draft._id}/line`).send({ ...mockLine, year: 2050 }).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`)
      .expect(400, done);
  });

  it('when line key and line town already exits it returns bad request', async (done) => {
    agent.post(`/api/${draft._id}/line`).send({ ...mockLine, year: 2050 }).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`)
      .expect(400, done);
  });

});

// UPDATE LINE
// PUT /api/:town/line/:lineId
describe('UPDATE LINE', () => {

  let nonManager;
  let manager;
  let tokenA;
  let draft;
  let line;

  beforeAll(async (done) => {
    tokenA = await loginAsRole('A');
    nonManager = await signUpAndLogin();
    manager = await signUpAndLogin();

    const addDraftRes = await agent.post(`/api/london/draft`).send(mockDraft).set('Accept', 'application/json').set('Authorization', `Bearer ${manager.token}`);
    draft = addDraftRes.body;
    const addLineRes = await agent.post(`/api/${draft._id}/line`).send(mockLine).set('Accept', 'application/json').set('Authorization', `Bearer ${manager.token}`);
    line = addLineRes.body;

    done();
  });

  it('when line does not exist it returns 404', async (done) => {
    agent.put(`/api/line/5d2e641edf7da5311cac46f6`).send({ ...mockLine, name: 'New line name' }).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`)
      .expect(404, done);
  });

  it('when draft is published it returns 403', async (done) => {
    await agent.put(`/api/draft/${draft._id}/publish`).set('Authorization', `Bearer ${tokenA}`);
    agent.put(`/api/line/${line._id}`).send({ ...mockLine, name: 'Name is not going to change' }).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`)
      .expect(403);
    await agent.put(`/api/draft/${draft._id}/unpublish`).set('Authorization', `Bearer ${tokenA}`);
    done();
  });

  it('when user is not manager it can not update line', async (done) => {
    agent.put(`/api/line/${line._id}`).send({ ...mockLine, name: 'New line name' }).set('Accept', 'application/json').set('Authorization', `Bearer ${nonManager.token}`)
      .expect(401, done);
  });

  it('when user is draft manager it can update line', async (done) => {
    const res = await agent.put(`/api/line/${line._id}`).send({ ...mockLine, name: 'New line name' }).set('Accept', 'application/json').set('Authorization', `Bearer ${manager.token}`)
      .expect(200);
    expect(res.body.name).toBe('New line name');
    done();
  });

  it('when user is admin it can update line', async (done) => {
    const res = await agent.put(`/api/line/${line._id}`).send({ ...mockLine, name: 'Another line name' }).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    expect(res.body.name).toBe('Another line name');
    done();
  });

});

// DELETE LINE
// DELETE /api/line/:lineId
describe('DELETE LINE', () => {

  let nonManager;
  let manager;
  let tokenA;
  let draft;
  let line1;
  let line2;
  let line3;

  beforeAll(async (done) => {
    tokenA = await loginAsRole('A');
    nonManager = await signUpAndLogin();
    manager = await signUpAndLogin();

    const addDraftRes = await agent.post(`/api/london/draft`).send(mockDraft).set('Accept', 'application/json').set('Authorization', `Bearer ${manager.token}`);
    draft = addDraftRes.body;
    const addLine1Res = await agent.post(`/api/${draft._id}/line`).send(mockLine).set('Accept', 'application/json').set('Authorization', `Bearer ${manager.token}`);
    line1 = addLine1Res.body;
    const addLine2Res = await agent.post(`/api/${draft._id}/line`).send(mockLine).set('Accept', 'application/json').set('Authorization', `Bearer ${manager.token}`);
    line2 = addLine2Res.body;
    const addLine3Res = await agent.post(`/api/${draft._id}/line`).send(mockLine).set('Accept', 'application/json').set('Authorization', `Bearer ${manager.token}`);
    line3 = addLine3Res.body;

    done();
  });

  it('when line does not exist it returns 404', async (done) => {
    agent.delete(`/api/line/5d2e641edf7da5311cac46f6`).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`)
      .expect(404, done);
  });

  it('when draft is published it returns 403', async (done) => {
    await agent.put(`/api/draft/${draft._id}/publish`).set('Authorization', `Bearer ${tokenA}`);
    agent.delete(`/api/line/${line1._id}`).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`)
      .expect(403);
    await agent.put(`/api/draft/${draft._id}/unpublish`).set('Authorization', `Bearer ${tokenA}`);
    done();
  });

  it('when user is not manager it can not delete line', async (done) => {
    agent.delete(`/api/line/${line1._id}`).set('Accept', 'application/json').set('Authorization', `Bearer ${nonManager.token}`)
      .expect(401, done);
  });

  it('when user is draft manager it can delete line', async (done) => {
    agent.delete(`/api/line/${line1._id}`).set('Accept', 'application/json').set('Authorization', `Bearer ${manager.token}`)
      .expect(200, done);
  });

  it('when user is admin it can delete line', async (done) => {
    agent.delete(`/api/line/${line2._id}`).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`)
      .expect(200, done);
  });

  it('when line is deleted line ref is removed from draft', async (done) => {
    await agent.delete(`/api/line/${line3._id}`).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    const resDraft = await agent.get(`/api/draft/${draft._id}`).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`);
    expect(resDraft.body.lines.find(l => l === line3._id)).not.toBeDefined();
    done();
  });

});