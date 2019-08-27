const app = require('../app');
const agent = require('supertest').agent(app);
const signUpAndLogin = require('./helpers/signUpAndLogin');
const mockDraft = require('./mock/draft.json');
const loginAsRole = require('./helpers/loginAsRole');
const draftSearchBody = require('./mock/draft_search_body.json');

// SEARCH DRAFTS
// POST /api/draft/search
describe('SEARCH DRAFTS', () => {

  let tokenU;

  beforeAll(async (done) => {
    tokenU = await loginAsRole('U');
    done();
  });

  it('when user is not logged it can not search drafts', async (done) => {
    agent.post(`/api/draft/search`).set('Accept', 'application/json')
      .expect(401, done);
  });

  it('when body does not contain proper pagination it returns 400', async (done) => {
    agent.post(`/api/draft/search`).send({ ...draftSearchBody, pagination: null }).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenU}`)
      .expect(400, done);
  });

  it('when user is logged it can search drafts', async (done) => {
    agent.post(`/api/draft/search`).send(draftSearchBody).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenU}`)
      .expect(200, done);
  });

});

// GET DRAFT SUMMARY
// GET /api/draft/:draftId
describe('GET DRAFT SUMMARY', () => {

  let user;
  let manager;
  let draft;

  beforeAll(async (done) => {
    user = await signUpAndLogin();
    manager = await signUpAndLogin();

    const addDraftRes = await agent.post(`/api/london/draft`).send(mockDraft).set('Accept', 'application/json').set('Authorization', `Bearer ${manager.token}`)
      .expect(200);
    draft = addDraftRes.body;

    done();
  });

  it('when user is not logged it can not get draft summary', async (done) => {
    agent.get(`/api/draft/${draft._id}`).set('Accept', 'application/json')
      .expect(401, done);
  });

  it('when draft does not exist it returns 404', async (done) => {
    agent.get(`/api/draft/5d2e641edf7da5311cac46f6`).set('Accept', 'application/json').set('Authorization', `Bearer ${manager.token}`)
      .expect(404, done);
  });

  it('when user is logged it can get draft summary', async (done) => {
    const res = await agent.get(`/api/draft/${draft._id}`).set('Accept', 'application/json').set('Authorization', `Bearer ${user.token}`)
      .expect(200);
    expect(res.body.name).toBe(mockDraft.name);
    expect(res.body.description).toBe(mockDraft.description);
    done();
  });
});

// ADD DRAFT
// POST /api/:town/draft
describe('ADD DRAFT', () => {

  let user;

  it('when user is not logged it can not add draft', async (done) => {
    agent.post(`/api/london/draft`).send(mockDraft).set('Accept', 'application/json')
      .expect(401, done);
  });

  it('when draft does not contain name it returns bad request', async (done) => {
    user = await signUpAndLogin();
    agent.post(`/api/london/draft`).send({ ...mockDraft, name: null }).set('Accept', 'application/json').set('Authorization', `Bearer ${user.token}`)
      .expect(400, done);
  });

  it('when draft does not contain description it returns bad request', async (done) => {
    user = await signUpAndLogin();
    agent.post(`/api/london/draft`).send({ ...mockDraft, description: null }).set('Accept', 'application/json').set('Authorization', `Bearer ${user.token}`)
      .expect(400, done);
  });

  it('when user is logged it can add draft', async (done) => {
    user = await signUpAndLogin();
    agent.post(`/api/london/draft`).send(mockDraft).set('Accept', 'application/json').set('Authorization', `Bearer ${user.token}`)
      .expect(200, done);
  });

  it('when draft is added its ref is added to town and user', async (done) => {
    user = await signUpAndLogin();
    const draftRes = await agent.post(`/api/london/draft`).send(mockDraft).set('Accept', 'application/json').set('Authorization', `Bearer ${user.token}`)
      .expect(200);
    const townRes = await agent.get(`/api/town/london`).set('Authorization', `Bearer ${user.token}`);
    expect(townRes.body.drafts.find(d => d._id === draftRes.body._id)).toBeDefined();
    const userRes = await agent.get(`/api/user`).set('Authorization', `Bearer ${user.token}`);
    expect(userRes.body.drafts.find(d => d._id === draftRes.body._id)).toBeDefined();
    done();
  });

  it('when user already manages a town draft it returns 403', async (done) => {
    agent.post(`/api/london/draft`).send(mockDraft).set('Accept', 'application/json').set('Authorization', `Bearer ${user.token}`)
      .expect(403, done);
  });

});

// UPDATE DRAFT
// PUT /api/draft/:draftId
describe('UPDATE DRAFT', () => {

  let nonManager;
  let manager;
  let tokenA;
  let draft;

  beforeAll(async (done) => {
    tokenA = await loginAsRole('A');
    manager = await signUpAndLogin();
    const addDraftRes = await agent.post(`/api/london/draft`).send(mockDraft).set('Accept', 'application/json').set('Authorization', `Bearer ${manager.token}`);

    draft = addDraftRes.body;
    done();
  });

  it('when user is not manager it can not update draft', async (done) => {
    nonManager = await signUpAndLogin();
    agent.put(`/api/draft/${draft._id}`).send({ ...mockDraft, name: 'New draft name' }).set('Accept', 'application/json').set('Authorization', `Bearer ${nonManager.token}`)
      .expect(401, done);
  });

  it('when draft does not exist it returns 404', async (done) => {
    agent.put(`/api/draft/5d2e641edf7da5311cac46f6`).send({ ...mockDraft, name: 'New draft name' }).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`)
      .expect(404, done);
  });

  it('when draft is published it returns 403', async (done) => {
    await agent.put(`/api/draft/${draft._id}/publish`).set('Authorization', `Bearer ${tokenA}`);
    agent.put(`/api/draft/${draft._id}`).send({ ...mockDraft, name: 'Another draft name' }).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`)
      .expect(403);
    await agent.put(`/api/draft/${draft._id}/unpublish`).set('Authorization', `Bearer ${tokenA}`);
    done();
  });

  it('when user is draft manager it can update draft', async (done) => {
    const modifedDraftRes = await agent.put(`/api/draft/${draft._id}`).send({ ...mockDraft, name: 'New draft name' }).set('Accept', 'application/json').set('Authorization', `Bearer ${manager.token}`)
      .expect(200);
    expect(modifedDraftRes.body.name).toBe('New draft name');
    done();
  });

  it('when user is admin it can update draft', async (done) => {
    const modifedDraftRes = await agent.put(`/api/draft/${draft._id}`).send({ ...mockDraft, name: 'Another draft name' }).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    expect(modifedDraftRes.body.name).toBe('Another draft name');
    done();
  });

});

// DELETE DRAFT
// DELETE /api/draft/:draftId
describe('DELETE DRAFT', () => {

  let nonManager;
  let manager;
  let tokenA;
  let draftL;
  let draftM;

  beforeAll(async (done) => {
    tokenA = await loginAsRole('A');
    manager = await signUpAndLogin();
    let addDraftRes = await agent.post(`/api/london/draft`).send(mockDraft).set('Accept', 'application/json').set('Authorization', `Bearer ${manager.token}`);
    draftL = addDraftRes.body;

    addDraftRes = await agent.post(`/api/madrid/draft`).send(mockDraft).set('Accept', 'application/json').set('Authorization', `Bearer ${manager.token}`);
    draftM = addDraftRes.body;

    done();
  });

  it('when user is not manager it can not delete draft', async (done) => {
    nonManager = await signUpAndLogin();
    agent.delete(`/api/draft/${draftL._id}`).set('Accept', 'application/json').set('Authorization', `Bearer ${nonManager.token}`)
      .expect(401, done);
  });

  it('when draft does not exist it returns 404', async (done) => {
    agent.delete(`/api/draft/111111111111111111111111`).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`)
      .expect(404, done);
  });

  it('when draft is published it returns 403', async (done) => {
    await agent.put(`/api/draft/${draftL._id}/publish`).set('Authorization', `Bearer ${tokenA}`);
    agent.delete(`/api/draft/${draftL._id}`).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`)
      .expect(403);
    await agent.put(`/api/draft/${draftL._id}/unpublish`).set('Authorization', `Bearer ${tokenA}`);
    done();
  });

  it('when user is draft manager it can delete draft', async (done) => {
    await agent.delete(`/api/draft/${draftL._id}`).set('Accept', 'application/json').set('Authorization', `Bearer ${manager.token}`)
      .expect(200);
    done();
  });

  it('when user is admin it can delete draft', async (done) => {
    await agent.delete(`/api/draft/${draftM._id}`).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    done();
  });

  it('when draft is deleted its ref is deleted from town and user', async (done) => {
    const draftRes = await agent.post(`/api/london/draft`).send(mockDraft).set('Accept', 'application/json').set('Authorization', `Bearer ${manager.token}`)
      .expect(200);
    let townRes = await agent.get(`/api/town/london`).set('Authorization', `Bearer ${manager.token}`);
    expect(townRes.body.drafts.find(d => d._id === draftRes.body._id)).toBeDefined();
    let userRes = await agent.get(`/api/user`).set('Authorization', `Bearer ${manager.token}`);
    expect(userRes.body.drafts.find(d => d._id === draftRes.body._id)).toBeDefined();

    await agent.delete(`/api/draft/${draftRes.body._id}`).set('Accept', 'application/json').set('Authorization', `Bearer ${manager.token}`)
      .expect(200);
    townRes = await agent.get(`/api/town/london`).set('Authorization', `Bearer ${manager.token}`);
    expect(townRes.body.drafts.find(d => d._id === draftRes.body._id)).not.toBeDefined();
    userRes = await agent.get(`/api/user`).set('Authorization', `Bearer ${manager.token}`);
    expect(userRes.body.drafts.find(d => d._id === draftRes.body._id)).not.toBeDefined();

    done();
  });

});

// DUPLICATE DRAFT
// PUT /api/draft/:draftId/duplicate
describe('DUPLICATE DRAFT', () => {

  let nonManager;
  let manager;
  let tokenA;
  let draft;

  beforeAll(async (done) => {
    tokenA = await loginAsRole('A');
    manager = await signUpAndLogin();
    const addDraftRes = await agent.post(`/api/london/draft`).send(mockDraft).set('Accept', 'application/json').set('Authorization', `Bearer ${manager.token}`);

    draft = addDraftRes.body;
    done();
  });

  it('when user is not manager it can not delete draft', async (done) => {
    nonManager = await signUpAndLogin();
    agent.put(`/api/draft/${draft._id}/duplicate`).set('Accept', 'application/json').set('Authorization', `Bearer ${nonManager.token}`)
      .expect(401, done);
  });

  it('when draft does not exist it returns 404', async (done) => {
    agent.put(`/api/draft/111111111111111111111111/duplicate`).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`)
      .expect(404, done);
  });

  it('when draft is not published and user is not admin it returns 403', async (done) => {
    agent.put(`/api/draft/${draft._id}/duplicate`).set('Accept', 'application/json').set('Authorization', `Bearer ${manager.token}`)
      .expect(403);
    done();
  });

  it('when user is draft manager and draft is published it can duplicate draft', async (done) => {
    await agent.put(`/api/draft/${draft._id}/publish`).set('Authorization', `Bearer ${tokenA}`);
    await agent.put(`/api/draft/${draft._id}/duplicate`).set('Accept', 'application/json').set('Authorization', `Bearer ${manager.token}`)
      .expect(200);
    const userRes = await agent.get(`/api/user`).set('Authorization', `Bearer ${manager.token}`);
    expect(userRes.body.drafts[1].name).toBe(`Copy of ${userRes.body.drafts[0].name}`);
    expect(userRes.body.drafts[1].description).toBe(userRes.body.drafts[0].description);
    expect(userRes.body.drafts[1].linesAmount).toBe(userRes.body.drafts[0].linesAmount);
    expect(userRes.body.drafts[1].stationsAmount).toBe(userRes.body.drafts[0].stationsAmount);
    expect(userRes.body.drafts[1].connectionsAmount).toBe(userRes.body.drafts[0].connectionsAmount);
    expect(userRes.body.drafts[1].town).toEqual(userRes.body.drafts[0].town);
    await agent.delete(`/api/draft/${userRes.body.drafts[1]._id}`).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    done();
  });

  it('when draft is duplicated its ref is added to town and user', async (done) => {
    const draftRes = await agent.put(`/api/draft/${draft._id}/duplicate`).set('Accept', 'application/json').set('Authorization', `Bearer ${manager.token}`)
      .expect(200);
    const townRes = await agent.get(`/api/town/london`).set('Authorization', `Bearer ${manager.token}`);
    expect(townRes.body.drafts.find(d => d._id === draftRes.body._id)).toBeDefined();
    const userRes = await agent.get(`/api/user`).set('Authorization', `Bearer ${manager.token}`);
    expect(userRes.body.drafts.find(d => d._id === draftRes.body._id)).toBeDefined();
    done();
  });

});

// REQUEST PUBLICATION
// PUT /api/draft/:draftId/publish-request
describe('REQUEST PUBLICATION', () => {

  let nonManager;
  let manager;
  let tokenA;
  let draftM;
  let draftA;

  beforeAll(async (done) => {
    tokenA = await loginAsRole('A');
    manager = await signUpAndLogin();
    let addDraftRes = await agent.post(`/api/london/draft`).send(mockDraft).set('Accept', 'application/json').set('Authorization', `Bearer ${manager.token}`);
    draftL = addDraftRes.body;

    addDraftRes = await agent.post(`/api/madrid/draft`).send(mockDraft).set('Accept', 'application/json').set('Authorization', `Bearer ${manager.token}`);
    draftM = addDraftRes.body;

    done();
  });

  it('when user is not manager it can not request publication', async (done) => {
    nonManager = await signUpAndLogin();
    agent.put(`/api/draft/${draftL._id}/publish-request`).set('Accept', 'application/json').set('Authorization', `Bearer ${nonManager.token}`)
      .expect(401, done);
  });

  it('when draft does not exist it returns 404', async (done) => {
    agent.put(`/api/draft/111111111111111111111111/publish-request`).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`)
      .expect(404, done);
  });

  it('when draft is published it returns 403', async (done) => {
    await agent.put(`/api/draft/${draftL._id}/publish`).set('Authorization', `Bearer ${tokenA}`);
    agent.put(`/api/draft/${draftL._id}/publish-request`).set('Accept', 'application/json').set('Authorization', `Bearer ${manager.token}`)
      .expect(403);
    await agent.put(`/api/draft/${draftL._id}/unpublish`).set('Authorization', `Bearer ${tokenA}`);
    done();
  });

  it('when user is draft manager and draft is not published it can request publication', async (done) => {
    await agent.put(`/api/draft/${draftL._id}/publish-request`).set('Accept', 'application/json').set('Authorization', `Bearer ${manager.token}`)
      .expect(200);
    const res = await agent.get(`/api/draft/${draftL._id}`).set('Accept', 'application/json').set('Authorization', `Bearer ${manager.token}`);
    expect(res.body.publicationRequest).toBe(true);
    done();
  });

  it('when user is admin and draft is not published it can request publication', async (done) => {
    await agent.put(`/api/draft/${draftM._id}/publish-request`).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    const res = await agent.get(`/api/draft/${draftM._id}`).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`);
    expect(res.body.publicationRequest).toBe(true);
    done();
  });
});

// PUBLISH DRAFT
// PUT /api/draft/:draftId/publish
describe('PUBLISH DRAFT', () => {

  let nonManager;
  let manager;
  let tokenA;
  let draft;

  beforeAll(async (done) => {
    tokenA = await loginAsRole('A');
    manager = await signUpAndLogin();
    const addDraftRes = await agent.post(`/api/london/draft`).send(mockDraft).set('Accept', 'application/json').set('Authorization', `Bearer ${manager.token}`);

    draft = addDraftRes.body;
    done();
  });

  it('when user is not manager it can not publish', async (done) => {
    nonManager = await signUpAndLogin();
    agent.put(`/api/draft/${draft._id}/publish`).set('Accept', 'application/json').set('Authorization', `Bearer ${nonManager.token}`)
      .expect(401, done);
  });

  it('when user is manager it can not publish', async (done) => {
    nonManager = await signUpAndLogin();
    agent.put(`/api/draft/${draft._id}/publish`).set('Accept', 'application/json').set('Authorization', `Bearer ${manager.token}`)
      .expect(401, done);
  });

  it('when draft does not exist it returns 404', async (done) => {
    agent.put(`/api/draft/111111111111111111111111/publish`).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`)
      .expect(404, done);
  });

  it('when draft is published it returns 403', async (done) => {
    await agent.put(`/api/draft/${draft._id}/publish`).set('Authorization', `Bearer ${tokenA}`);
    agent.put(`/api/draft/${draft._id}/publish`).set('Accept', 'application/json').set('Authorization', `Bearer ${manager.token}`)
      .expect(403);
    await agent.put(`/api/draft/${draft._id}/unpublish`).set('Authorization', `Bearer ${tokenA}`);
    done();
  });

  it('when user is admin it can publish', async (done) => {
    await agent.put(`/api/draft/${draft._id}/publish`).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    const res = await agent.get(`/api/draft/${draft._id}`).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`);
    expect(res.body.publicationRequest).toBe(false);
    expect(res.body.isPublished).toBe(true);
    done();
  });

});

// UNPUBLISH DRAFT
// PUT /api/draft/:draftId/unpublish
describe('UNPUBLISH DRAFT', () => {

  let nonManager;
  let manager;
  let tokenA;
  let draft;

  beforeAll(async (done) => {
    tokenA = await loginAsRole('A');
    manager = await signUpAndLogin();
    const addDraftRes = await agent.post(`/api/london/draft`).send(mockDraft).set('Accept', 'application/json').set('Authorization', `Bearer ${manager.token}`);

    draft = addDraftRes.body;
    done();
  });

  it('when user is not manager it can not unpublish', async (done) => {
    nonManager = await signUpAndLogin();
    agent.put(`/api/draft/${draft._id}/unpublish`).set('Accept', 'application/json').set('Authorization', `Bearer ${nonManager.token}`)
      .expect(401, done);
  });

  it('when user is manager it can not unpublish', async (done) => {
    nonManager = await signUpAndLogin();
    agent.put(`/api/draft/${draft._id}/unpublish`).set('Accept', 'application/json').set('Authorization', `Bearer ${manager.token}`)
      .expect(401, done);
  });

  it('when draft does not exist it returns 404', async (done) => {
    agent.put(`/api/draft/111111111111111111111111/unpublish`).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`)
      .expect(404, done);
  });

  it('when draft is not published it returns 403', async (done) => {
    agent.put(`/api/draft/${draft._id}/unpublish`).set('Accept', 'application/json').set('Authorization', `Bearer ${manager.token}`)
      .expect(403);
    done();
  });

  it('when user is admin it can unpublish', async (done) => {
    await agent.put(`/api/draft/${draft._id}/publish`).set('Authorization', `Bearer ${tokenA}`);
    await agent.put(`/api/draft/${draft._id}/unpublish`).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    const res = await agent.get(`/api/draft/${draft._id}`).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`);
    expect(res.body.publicationRequest).toBe(false);
    expect(res.body.isPublished).toBe(false);
    done();
  });

});

// ADD MANAGER
// PUT /api/draft/:draftId/add-manager/:userId
describe('ADD MANAGER', () => {

  let nonManager;
  let managerA;
  let managerB;
  let newManager;
  let tokenA;
  let draftA;
  let draftB;

  beforeAll(async (done) => {
    tokenA = await loginAsRole('A');
    managerA = await signUpAndLogin(true);
    managerB = await signUpAndLogin(true);
    newManager = await signUpAndLogin(true);

    const addDraftARes = await agent.post(`/api/london/draft`).send(mockDraft).set('Accept', 'application/json').set('Authorization', `Bearer ${managerA.token}`);
    const addDraftBRes = await agent.post(`/api/london/draft`).send(mockDraft).set('Accept', 'application/json').set('Authorization', `Bearer ${managerB.token}`);

    draftA = addDraftARes.body;
    draftB = addDraftBRes.body;
    done();
  });

  it('when user is not manager it can not add manager', async (done) => {
    nonManager = await signUpAndLogin();
    agent.put(`/api/draft/${draftA._id}/add-manager/${newManager.user._id}`).set('Accept', 'application/json').set('Authorization', `Bearer ${nonManager.token}`)
      .expect(401, done);
  });

  it('when draft does not exist it returns 404', async (done) => {
    agent.put(`/api/draft/111111111111111111111111/add-manager/${newManager.user._id}`).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`)
      .expect(404, done);
  });

  it('when user does not exist it returns 404', async (done) => {
    agent.put(`/api/draft/${draftA._id}/add-manager/111111111111111111111111`).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`)
      .expect(404, done);
  });

  it('when draft is published it returns 403', async (done) => {
    await agent.put(`/api/draft/${draftA._id}/publish`).set('Authorization', `Bearer ${tokenA}`);
    agent.put(`/api/draft/${draftA._id}/add-manager/${newManager.user._id}`).set('Accept', 'application/json').set('Authorization', `Bearer ${managerA.token}`)
      .expect(403);
    await agent.put(`/api/draft/${draftA._id}/unpublish`).set('Authorization', `Bearer ${tokenA}`);
    done();
  });

  it('when user is manager it can add manager', async (done) => {
    await agent.put(`/api/draft/${draftA._id}/add-manager/${newManager.user._id}`).set('Accept', 'application/json').set('Authorization', `Bearer ${managerA.token}`)
      .expect(200);
    const resDraft = await agent.get(`/api/draft/${draftA._id}`).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`);
    const resManager = await agent.get(`/api/user/${newManager.user._id}`).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`);

    expect(resDraft.body.managers.find(m => m._id === newManager.user._id)).toBeDefined();
    expect(resManager.body.drafts.find(d => d._id === draftA._id)).toBeDefined();
    done();
  });

  it('when user is admin it can add manager', async (done) => {
    await agent.put(`/api/draft/${draftA._id}/remove-manager/${newManager.user._id}`).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`);
    await agent.put(`/api/draft/${draftA._id}/add-manager/${newManager.user._id}`).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    const resDraft = await agent.get(`/api/draft/${draftA._id}`).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`);
    const resManager = await agent.get(`/api/user/${newManager.user._id}`).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`);

    expect(resDraft.body.managers.find(m => m._id === newManager.user._id)).toBeDefined();
    expect(resManager.body.drafts.find(d => d._id === draftA._id)).toBeDefined();
    done();
  });

  it('when new manager is already manager in draft it returns 403', async (done) => {
    agent.put(`/api/draft/${draftA._id}/add-manager/${newManager.user._id}`).set('Accept', 'application/json').set('Authorization', `Bearer ${managerA.token}`)
      .expect(403);
    done();
  });

  it('when new manager is already manager in another town draft it returns 403', async (done) => {
    agent.put(`/api/draft/${draftA._id}/add-manager/${newManager.user._id}`).set('Accept', 'application/json').set('Authorization', `Bearer ${managerA.token}`)
      .expect(403);
    done();
  });


});

// REMOVE MANAGER
// PUT /api/draft/:draftId/remove-manager/:userId
describe('REMOVE MANAGER', () => {

  let managerA;
  let managerB;
  let tokenA;
  let draft;

  beforeAll(async (done) => {
    tokenA = await loginAsRole('A');
    managerA = await signUpAndLogin(true);
    managerB = await signUpAndLogin(true);

    const addDraftRes = await agent.post(`/api/london/draft`).send(mockDraft).set('Accept', 'application/json').set('Authorization', `Bearer ${managerA.token}`);
    draft = addDraftRes.body;
    await agent.put(`/api/draft/${draft._id}/add-manager/${managerB.user._id}`).set('Authorization', `Bearer ${tokenA}`)
      .expect(200);

    done();
  });

  it('when user is not admin it can not remove manager', async (done) => {
    agent.put(`/api/draft/${draft._id}/remove-manager/${managerB.user._id}`).set('Accept', 'application/json').set('Authorization', `Bearer ${managerA.token}`)
      .expect(401, done);
  });

  it('when draft does not exist it returns 404', async (done) => {
    agent.put(`/api/draft/111111111111111111111111/remove-manager/${managerB.user._id}`).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`)
      .expect(404, done);
  });

  it('when draft is published it returns 403', async (done) => {
    await agent.put(`/api/draft/${draft._id}/publish`).set('Authorization', `Bearer ${tokenA}`);
    agent.put(`/api/draft/${draft._id}/remove-manager/${managerB.user._id}`).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`)
      .expect(403);
    await agent.put(`/api/draft/${draft._id}/unpublish`).set('Authorization', `Bearer ${tokenA}`);
    done();
  });

  it('when user is not manager in draft it returns 403', async (done) => {
    agent.put(`/api/draft/${draft._id}/remove-manager/111111111111111111111111`).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`)
      .expect(403);
    done();
  });

  it('when user is admin it can remove manager', async (done) => {
    await agent.put(`/api/draft/${draft._id}/remove-manager/${managerB.user._id}`).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`)
      .expect(200);

    const resDraft = await agent.get(`/api/draft/${draft._id}`).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`);
    const resManager = await agent.get(`/api/user/${managerB.user._id}`).set('Accept', 'application/json').set('Authorization', `Bearer ${tokenA}`);

    expect(resDraft.body.managers.find(m => m._id === managerB.user._id)).not.toBeDefined();
    expect(resManager.body.drafts.find(d => d._id === draft._id)).not.toBeDefined();

    done();
  });

});