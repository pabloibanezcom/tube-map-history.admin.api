const service = require("../services/draft.service");
const getPostmanBodyFromModelDef = require("../util/getPostmanBodyFromModelDef");
const filterBodyForAction = require("../util/filterBodyForAction");
const log500 = require('../util/log500');
const defaultSearchBody = require("./defaultRequestBodies/default_search.json");

module.exports = (app, modelsService, passport, modelDefinition) => {
  const registerSearchDrafts = () => {
    const url = "/api/draft/search";
    app.post(
      url,
      passport.authenticate("local-user", { session: false }),
      (req, res) => {
        service
          .searchDrafts(modelsService, req.user, req.body)
          .then(result => res.status(result.statusCode).send(result.data))
          .catch(err => { log500(err); res.status(500).send(err) });
      }
    );
    app.routesInfo["Draft"].push({
      model: "Draft",
      name: "Search drafts",
      method: "POST",
      url: url,
      auth: ["U", "A"],
      body: { ...defaultSearchBody, select: undefined, populate: undefined }
    });
  };

  const registerGetDraftSummary = () => {
    const url = "/api/draft/:draftId";
    app.get(
      url,
      passport.authenticate("local-user", { session: false }),
      (req, res) => {
        service
          .getDraftSummary(modelsService, req.user, req.params.draftId)
          .then(result => res.status(result.statusCode).send(result.data))
          .catch(err => { log500(err); res.status(500).send(err) });
      }
    );
    app.routesInfo["Draft"].push({
      model: "Draft",
      name: "Get draft summary",
      method: "GET",
      url: url,
      auth: ["U", "A"]
    });
  };

  const registerAddDraft = () => {
    const url = "/api/:town/draft";
    app.post(
      url,
      passport.authenticate("local-user-with-drafts", { session: false }),
      (req, res) => {
        service
          .addDraft(
            modelsService,
            req.user,
            req.params.town,
            filterBodyForAction(modelDefinition, "add", req.body)
          )
          .then(result => res.status(result.statusCode).send(result.data))
          .catch(err => { log500(err); res.status(500).send(err) });
      }
    );
    app.routesInfo["Draft"].push({
      model: "Draft",
      name: "Add draft",
      method: "POST",
      url: url,
      auth: ["U", "A"],
      body: getPostmanBodyFromModelDef(modelDefinition, "add")
    });
  };

  const registerUpdateDraft = () => {
    const url = "/api/draft/:draftId";
    app.put(
      url,
      passport.authenticate("local-user-with-drafts", { session: false }),
      (req, res) => {
        service
          .updateDraft(
            modelsService,
            req.user,
            req.params.draftId,
            filterBodyForAction(modelDefinition, "update", req.body)
          )
          .then(result => res.status(result.statusCode).send(result.data))
          .catch(err => { log500(err); res.status(500).send(err) });
      }
    );
    app.routesInfo["Draft"].push({
      model: "Draft",
      name: "Update draft",
      method: "PUT",
      url: url,
      auth: ["M", "A"],
      body: getPostmanBodyFromModelDef(modelDefinition, "update")
    });
  };

  const registerDeleteDraft = () => {
    const url = "/api/draft/:draftId";
    app.delete(
      url,
      passport.authenticate("local-user-with-drafts", { session: false }),
      (req, res) => {
        service
          .deleteDraft(modelsService, req.user, req.params.draftId)
          .then(result => res.status(result.statusCode).send(result.data))
          .catch(err => { log500(err); res.status(500).send(err) });
      }
    );
    app.routesInfo["Draft"].push({
      model: "Draft",
      name: "Delete draft",
      method: "DELETE",
      url: url,
      auth: ["M", "A"]
    });
  };

  const registerDuplicateDraft = () => {
    const url = "/api/draft/:draftId/duplicate";
    app.put(
      url,
      passport.authenticate("local-user-with-drafts", { session: false }),
      (req, res) => {
        service
          .duplicateDraft(modelsService, req.user, req.params.draftId)
          .then(result => res.status(result.statusCode).send(result.data))
          .catch(err => { log500(err); res.status(500).send(err) });
      }
    );
    app.routesInfo["Draft"].push({
      model: "Draft",
      name: "Duplicate draft",
      method: "PUT",
      url: url,
      auth: ["M", "A"]
    });
  };

  const registerRequestPublication = () => {
    const url = "/api/draft/:draftId/publish-request";
    app.put(
      url,
      passport.authenticate("local-user-with-drafts", { session: false }),
      (req, res) => {
        service
          .requestPublication(modelsService, req.user, req.params.draftId)
          .then(result => res.status(result.statusCode).send(result.data))
          .catch(err => { log500(err); res.status(500).send(err) });
      }
    );
    app.routesInfo["Draft"].push({
      model: "Draft",
      name: "Request publication",
      method: "PUT",
      url: url,
      auth: ["M", "A"]
    });
  };

  const registerPublishDraft = () => {
    const url = "/api/draft/:draftId/publish";
    app.put(
      url,
      passport.authenticate("local-user-with-drafts", { session: false }),
      (req, res) => {
        service
          .publishDraft(modelsService, req.user, req.params.draftId)
          .then(result => res.status(result.statusCode).send(result.data))
          .catch(err => { log500(err); res.status(500).send(err) });
      }
    );
    app.routesInfo["Draft"].push({
      model: "Draft",
      name: "Publish draft",
      method: "PUT",
      url: url,
      auth: ["A"]
    });
  };

  const registerUnpublishDraft = () => {
    const url = "/api/draft/:draftId/unpublish";
    app.put(
      url,
      passport.authenticate("local-user-with-drafts", { session: false }),
      (req, res) => {
        service
          .unpublishDraft(modelsService, req.user, req.params.draftId)
          .then(result => res.status(result.statusCode).send(result.data))
          .catch(err => { log500(err); res.status(500).send(err) });
      }
    );
    app.routesInfo["Draft"].push({
      model: "Draft",
      name: "Unpublish draft",
      method: "PUT",
      url: url,
      auth: ["A"]
    });
  };

  const registerAddManager = () => {
    const url = "/api/draft/:draftId/add-manager/:userId";
    app.put(
      url,
      passport.authenticate("local-user-with-drafts", { session: false }),
      (req, res) => {
        service
          .addManager(
            modelsService,
            req.user,
            req.params.draftId,
            req.params.userId
          )
          .then(result => res.status(result.statusCode).send(result.data))
          .catch(err => { log500(err); res.status(500).send(err) });
      }
    );
    app.routesInfo["Draft"].push({
      model: "Draft",
      name: "Add manager to draft",
      method: "PUT",
      url: url,
      auth: ["M", "A"]
    });
  };

  const registerRemoveManager = () => {
    const url = "/api/draft/:draftId/remove-manager/:userId";
    app.put(
      url,
      passport.authenticate("local-user-with-drafts", { session: false }),
      (req, res) => {
        service
          .removeManager(
            modelsService,
            req.user,
            req.params.draftId,
            req.params.userId
          )
          .then(result => res.status(result.statusCode).send(result.data))
          .catch(err => { log500(err); res.status(500).send(err) });
      }
    );
    app.routesInfo["Draft"].push({
      model: "Draft",
      name: "Remove manager from draft",
      method: "PUT",
      url: url,
      auth: ["A"]
    });
  };

  app.routesInfo["Draft"] = [];
  registerSearchDrafts();
  registerGetDraftSummary();
  registerAddDraft();
  registerUpdateDraft();
  registerDeleteDraft();
  registerDuplicateDraft();
  registerRequestPublication();
  registerPublishDraft();
  registerUnpublishDraft();
  registerAddManager();
  registerRemoveManager();
};
