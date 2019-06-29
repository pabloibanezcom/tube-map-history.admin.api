const app = require('../app')
const agent = require('supertest').agent(app)

describe('GET /api/countries', function () {
  it('it get json with all countries', function (done) {
    agent
      .get('/api/countries')
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200)
      .end((err, res) => {
        if (err) {
          return done(err);
        }
        expect(res.body.length).toBe(224);
        return done();
      });
  });
});