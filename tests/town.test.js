const app = require('../app')
const agent = require('supertest').agent(app)

let someTownId;

describe('GET /api/towns', function () {
  it('it get json with all towns', function (done) {
    agent
      .get('/api/towns')
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200)
      .end((err, res) => {
        if (err) {
          return done(err);
        }
        someTownId = res.body[0]._id;
        return done();
      });
  });
});

describe('GET /api/town/:town', function () {
  it('it get json with town info when townId exits', function (done) {
    agent
      .get(`/api/town/${someTownId}`)
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200, done)
  });

  it('it get 404 when townId does not exit', function (done) {
    agent
      .get('/api/town/111111')
      .set('Accept', 'application/json')
      .expect(404, done)
  });
});

