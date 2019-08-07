const paginateResults = require('../util/paginateResults');
const getTown = require('../util/getTown');
const verifyRoles = require('../auth/role-verification');
const validatePagination = require('../util/validatePagination');
const transformMongooseErrors = require('../util/transformMongooseErrors');
const addCreatedAndModified = require('../util/addCreatedAndModified');
const duplicateLine = require('../util/duplicateLine');
const duplicateStation = require('../util/duplicateStation');
const duplicateConnection = require('../util/duplicateConnection');

const service = {};

const draftPopulate = [
  { path: 'town', select: 'name url country', populate: { path: 'country', select: 'name code continent' } },
  { path: 'managers', select: 'local firstName lastName title genre country', populate: { path: 'country', select: 'name' } },
  { path: 'lines', select: 'order key name shortName colour fontColour year distance stationsAmount' },
  { path: 'stations', select: 'name year yearEnd markerIcon markerColor' }
];

const applyCountersToDraft = (draft) => {
  return {
    ...draft,
    stationsAmount: draft.stations.length,
    linesAmount: draft.lines.length,
    connectionsAmount: draft.connections.length,
    stations: undefined,
    lines: undefined,
    connections: undefined
  }
}

service.searchDrafts = async (modelsService, user, body) => {
  if (!verifyRoles(['U', 'A'], user)) {
    return { statusCode: 401, data: 'Unauthorized' };
  }
  if (!validatePagination(body.pagination)) {
    return { statusCode: 400, data: 'Bad request: Pagination is wrong format' };
  }

  const searchParams = {
    filter: {
    },
    sort: body.sort || '',
    select: body.select || '',
    populate: body.populate || ''
  };

  if (body.filter && body.filter.name) {
    searchParams.filter.name = { $regex: body.filter.name, $options: 'i' };
  }

  let drafts = await modelsService.getModel('Draft')
    .find(searchParams.filter)
    .sort(searchParams.sort)
    .populate(draftPopulate);

  return { statusCode: 200, data: paginateResults(drafts.map(d => applyCountersToDraft(d._doc)), body.pagination) };
}

service.getDraftSummary = async (modelsService, user, draftId) => {
  if (!verifyRoles(['U', 'A'], user)) {
    return { statusCode: 401, data: 'Unauthorized' };
  }

  const draft = await modelsService.getModel('Draft').findOne({ _id: draftId }).populate(draftPopulate);
  if (!draft) {
    return { statusCode: 404, data: 'Draft does not exist' };
  }

  return { statusCode: 200, data: draft };
}

service.addDraft = async (modelsService, user, townNameOrId, draftObj) => {

  if (!verifyRoles(['U', 'A'], user)) {
    return { statusCode: 401, data: 'Unauthorized' };
  }

  const town = await getTown(modelsService, townNameOrId, false, [{ path: 'drafts', select: 'managers status' }]);
  if (!town) {
    return { statusCode: 404, data: 'Town does not exist' };
  }

  // If user already manages a town draft (not published) it return 403
  if (user.drafts.some(d => d.town.equals(town._id) && !d.isPublished)) {
    return { statusCode: 403, data: 'User already has a draft non published for this town' };
  }

  const Draft = modelsService.getModel('Draft');
  const draft = new Draft(addCreatedAndModified({ ...draftObj, town: town._id, managers: [user._id], status: 'draft' }, user, true));

  try {
    await draft.save();
  }
  catch (err) {
    return { statusCode: 400, data: transformMongooseErrors(err) };
  }

  town.drafts.push(draft._id);
  await town.save();

  user.drafts.push(draft._id);
  await user.save();

  return { statusCode: 200, data: draft };
}

service.updateDraft = async (modelsService, user, draftId, draftObj) => {
  if (!verifyRoles(['M', 'A'], user, draftId)) {
    return { statusCode: 401, data: 'Unauthorized' };
  }

  const draft = await modelsService.getModel('Draft').findOne({ _id: draftId });
  if (!draft) {
    return { statusCode: 404, data: 'Draft does not exist' };
  }

  if (draft.isPublished) {
    return { statusCode: 403, data: 'Draft can not be updated as it is published' };
  }

  Object.assign(draft, addCreatedAndModified(draftObj, user, false));

  try {
    await draft.save();
    return { statusCode: 200, data: draft };
  }
  catch (err) {
    return { statusCode: 400, data: transformMongooseErrors(err) };
  }
}

service.deleteDraft = async (modelsService, user, draftId) => {
  if (!verifyRoles(['M', 'A'], user, draftId)) {
    return { statusCode: 401, data: 'Unauthorized' };
  }

  const draft = await modelsService.getModel('Draft').findOne({ _id: draftId });
  if (!draft) {
    return { statusCode: 404, data: 'Draft does not exist' };
  }

  if (draft.isPublished) {
    return { statusCode: 403, data: 'Draft can not be deleted as it is published' };
  }

  // Delete lines, stations and connections of draft
  const connectionsDelete = await modelsService.getModel('Connection').deleteMany({ draft: draftId });
  const stationsDelete = await modelsService.getModel('Station').deleteMany({ draft: draftId });
  const linesDelete = await modelsService.getModel('Line').deleteMany({ draft: draftId });

  const result = {
    updated: {
      towns: 0,
      users: 0,
    },
    deleted: {
      lines: linesDelete.deletedCount,
      stations: stationsDelete.deletedCount,
      connections: connectionsDelete.deletedCount
    }
  };

  // Remove ref from user
  const users = await modelsService.getModel('User').find({ drafts: draftId });
  for (const u of users) {
    u.drafts = u.drafts.filter(d => !d.equals(draftId));
    await u.save();
    result.updated.users++;
  }

  // Remove ref from town
  const towns = await modelsService.getModel('Town').find({ drafts: draftId });
  for (const t of towns) {
    t.drafts = t.drafts.filter(d => !d.equals(draftId));
    await t.save();
    result.updated.towns++;
  }

  //Remove draft
  await modelsService.getModel('Draft').deleteOne({ _id: draftId });

  return { statusCode: 200, data: result };
}

service.duplicateDraft = async (modelsService, user, draftId) => {
  if (!verifyRoles(['M', 'A'], user, draftId)) {
    return { statusCode: 401, data: 'Unauthorized' };
  }

  const Draft = modelsService.getModel('Draft');
  const draft = await Draft.findOne({ _id: draftId });
  if (!draft) {
    return { statusCode: 404, data: 'Draft does not exist' };
  }

  // If draft is not published (not applying for admin) or user already has a non-published draft of town it return 403
  if (user.authLevel !== 'admin' && (!draft.isPublished || user.drafts.some(d => d.town.equals(draft.town) && !d.isPublished))) {
    return { statusCode: 403, data: 'User already has a draft non published for this town' };
  }

  const newDraft = new Draft(addCreatedAndModified(
    {
      name: `Copy of ${draft.name}`,
      description: draft.description,
      town: draft.town,
      managers: [user._id],
      linesAmount: draft.linesAmount,
      stationsAmount: draft.stationsAmount,
      connectionsAmount: draft.connectionsAmount
    },
    user,
    true
  ));

  await newDraft.save();

  // Add draft ref to town and user
  const town = await modelsService.getModel('Town').findOne({ _id: draft.town });
  town.drafts.push(newDraft._id);
  await town.save();

  user.drafts.push(newDraft._id);
  await user.save();

  // Duplicate lines, stations and connections
  const Line = modelsService.getModel('Line');
  const Station = modelsService.getModel('Station');
  const Connection = modelsService.getModel('Connection');

  const lines = await Line.find({ draft: draft._id });
  const linesMap = new Map();
  const newLines = [];
  for (const l of lines) {
    const line = new Line(addCreatedAndModified({ ...duplicateLine(l), draft: newDraft._id }, user, true));
    await line.save();
    linesMap.set(l.id, line.id);
    newLines.push(line);
  }

  const stations = await Station.find({ draft: draft._id });
  const stationsMap = new Map();
  const newStations = [];
  for (const s of stations) {
    const station = new Station(addCreatedAndModified({ ...duplicateStation(s), draft: newDraft._id }, user, true));
    await station.save();
    stationsMap.set(s.id, station.id);
    newStations.push(station);
  }

  const connections = await Connection.find({ draft: draft._id });
  const connectionsMap = new Map();
  for (const c of connections) {
    const connection = new Connection(addCreatedAndModified(
      {
        ...duplicateConnection(c),
        line: linesMap.get(c.line.toString()),
        stations: c.stations.map(s => stationsMap.get(s.toString())),
        draft: newDraft._id
      },
      user, true));
    await connection.save();
    connectionsMap.set(c.id, connection.id);
  }

  for (const l of newLines) {
    l.connections = l.connections.map(c => connectionsMap.get(c.toString()));
    await l.save();
  }

  for (const s of newStations) {
    s.connections = s.connections.map(c => connectionsMap.get(c.toString()));
    await s.save();
  }

  return { statusCode: 200, data: newDraft };

}

service.requestPublication = async (modelsService, user, draftId) => {
  if (!verifyRoles(['M', 'A'], user, draftId)) {
    return { statusCode: 401, data: 'Unauthorized' };
  }

  const Draft = modelsService.getModel('Draft');
  const draft = await Draft.findOne({ _id: draftId });
  if (!draft) {
    return { statusCode: 404, data: 'Draft does not exist' };
  }

  if (draft.isPublished) {
    return { statusCode: 403, data: 'Draft is already published' };
  }

  draft.publicationRequest = true;
  await draft.save();

  return { statusCode: 200, data: `Request for draft ${draft._id} to be published has been sent` };
}

service.publishDraft = async (modelsService, user, draftId) => {
  if (!verifyRoles(['A'], user)) {
    return { statusCode: 401, data: 'Unauthorized' };
  }

  const Draft = modelsService.getModel('Draft');
  const draft = await Draft.findOne({ _id: draftId }).populate({ path: 'town', populate: { path: 'country' } });
  if (!draft) {
    return { statusCode: 404, data: 'Draft does not exist' };
  }

  if (draft.isPublished) {
    return { statusCode: 403, data: 'Draft is already published' };
  }

  draft.publicationRequest = false;
  draft.isPublished = true;
  await draft.save();

  return { statusCode: 200, data: `Draft ${draft._id} for ${draft.town.name} (${draft.town.country.name}) has been published` };
}

service.unpublishDraft = async (modelsService, user, draftId) => {
  if (!verifyRoles(['A'], user)) {
    return { statusCode: 401, data: 'Unauthorized' };
  }

  const Draft = modelsService.getModel('Draft');
  const draft = await Draft.findOne({ _id: draftId }).populate({ path: 'town', populate: { path: 'country' } });
  if (!draft) {
    return { statusCode: 404, data: 'Draft does not exist' };
  }

  if (!draft.isPublished) {
    return { statusCode: 403, data: 'Draft is not published' };
  }

  draft.publicationRequest = false;
  draft.isPublished = false;
  await draft.save();

  return { statusCode: 200, data: `Draft ${draft._id} for ${draft.town.name} (${draft.town.country.name}) has been unpublished` };
}

service.addManager = async (modelsService, user, draftId, userId) => {
  if (!verifyRoles(['M', 'A'], user, draftId)) {
    return { statusCode: 401, data: 'Unauthorized' };
  }

  const Draft = modelsService.getModel('Draft');
  const draft = await Draft.findOne({ _id: draftId });

  if (!draft) {
    return { statusCode: 404, data: 'Draft does not exist' };
  }

  if (draft.isPublished) {
    return { statusCode: 403, data: 'Draft needs to be unpublished to add manager' };
  }

  if (draft.managers.includes(userId)) {
    return { statusCode: 403, data: 'User is already manager in this draft' };
  }

  const newManager = await modelsService.getModel('User').findOne({ _id: userId }).populate({ path: 'drafts' })

  if (!newManager) {
    return { statusCode: 404, data: 'User does not exist' };
  }

  if (newManager.drafts.some(d => d.town === draft.town)) {
    return { statusCode: 403, data: 'User is already manager in another town draft' };
  }

  draft.managers.push(userId);
  await draft.save();

  newManager.drafts.push(draft._id);
  await newManager.save();

  await draft.save();

  return { statusCode: 200, data: `User ${newManager._id} has been added to manager to draft ${draft._id}` };
}

service.removeManager = async (modelsService, user, draftId, userId) => {
  if (!verifyRoles(['A'], user)) {
    return { statusCode: 401, data: 'Unauthorized' };
  }

  const Draft = modelsService.getModel('Draft');
  const draft = await Draft.findOne({ _id: draftId });
  if (!draft) {
    return { statusCode: 404, data: 'Draft does not exist' };
  }

  if (draft.isPublished) {
    return { statusCode: 403, data: 'Draft needs to be unpublished to remove manager' };
  }

  if (!draft.managers.includes(userId)) {
    return { statusCode: 403, data: 'User is not a manager in this draft' };
  }

  const newManager = await modelsService.getModel('User').findOne({ _id: userId }).populate({ path: 'drafts' })

  draft.managers = draft.managers.filter(m => !m._id.equals(newManager._id));
  await draft.save();

  newManager.drafts = newManager.drafts.filter(d => !d._id.equals(draft._id));
  await newManager.save();

  await draft.save();

  return { statusCode: 200, data: `User ${newManager._id} has been removed as manager of draft ${draft._id}` };
}

module.exports = service;