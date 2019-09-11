const paginateResults = require('../util/paginateResults');
const verifyRoles = require('../auth/role-verification');
const transformMongooseErrors = require('../util/transformMongooseErrors');
const addCreatedAndModified = require('../util/addCreatedAndModified');
const validatePagination = require('../util/validatePagination');
const service = {};

service.searchLines = async (modelsService, user, draftId, body) => {
  if (!verifyRoles(['U', 'A'], user)) {
    return { statusCode: 401, data: 'Unauthorized' };
  }
  if (!validatePagination(body.pagination)) {
    return { statusCode: 400, data: 'Bad request: Pagination is wrong format' };
  }

  const searchParams = {
    filter: {
      draft: draftId
    },
    sort: body.sort || '',
    select: body.select || '',
    populate: body.populate || ''
  };

  if (body.filter && body.filter._id) {
    searchParams.filter._id = body.filter._id;
  }

  if (body.filter && body.filter.name) {
    searchParams.filter.name = { $regex: body.filter.name, $options: 'i' };
  }

  let lines = await modelsService.getModel('Line')
    .find(searchParams.filter)
    .sort(searchParams.sort)
    .select(searchParams.select)
    .populate(searchParams.populate);

  return { statusCode: 200, data: paginateResults(lines, body.pagination) };
}

service.getLineFullInfo = async (modelsService, user, lineId) => {
  if (!verifyRoles(['U', 'A'], user)) {
    return { statusCode: 401, data: 'Unauthorized' };
  }
  const line = await modelsService.getModel('Line')
    .findById(lineId)
    .select('name key shortName colour fontColour startStations year distance lastModifiedDate lastModifiedUser')
    .populate(
      [
        { path: 'connections', select: 'stations year yearEnd distance', populate: { path: 'stations', select: 'name markerColor' } },
        { path: 'lastModifiedUser', select: 'firstName lastName country' },
        { path: 'created.user', select: 'firstName lastName country' }
      ]
    )
  if (!line) {
    return { statusCode: 404, data: 'Line not found' };
  }
  return { statusCode: 200, data: { ...line._doc, connections: sortConnections(line._doc.connections, line._doc.startStations) } };
}

service.calculateLineDistance = async (modelsService, lineId) => {
  const line = await smodelsService.getModel('Line')
    .findById(lineId)
    .populate({ path: 'connections', select: 'distance' })
  if (!line) {
    return { statusCode: 404, data: 'Line not found' };
  }
  line.distance = line.connections.map(c => c.distance).reduce((prev, next) => { return prev + next });
  await line.save();
  return { statusCode: 202, data: `${line.name} total distance: ${line.distance}` };
}

service.addLine = async (modelsService, user, draftId, lineObj) => {
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

  const Line = modelsService.getModel('Line');
  const line = new Line(addCreatedAndModified({ ...lineObj, draft: draftId }, user, true));

  try {
    await line.save();
  }
  catch (err) {
    return { statusCode: 400, data: transformMongooseErrors(err) };
  }

  // Add line ref to draft
  draft.lines.push(line._id);
  await draft.save();

  return { statusCode: 200, data: line };
}

service.updateLine = async (modelsService, user, lineId, lineObj) => {
  const line = await modelsService.getModel('Line').findOne({ _id: lineId }).populate({ path: 'draft', select: 'isPublished' });
  if (!line) {
    return { statusCode: 404, data: 'Line does not exist' };
  }

  if (!verifyRoles(['M', 'A'], user, line.draft._id)) {
    return { statusCode: 401, data: 'Unauthorized' };
  }

  if (line.draft.isPublished) {
    return { statusCode: 403, data: 'Draft can not be updated as it is published' };
  }

  Object.assign(line, addCreatedAndModified(lineObj, user, false));

  try {
    await line.save();
    return { statusCode: 200, data: line };
  }
  catch (err) {
    return { statusCode: 400, data: transformMongooseErrors(err) };
  }

}

service.deleteLine = async (modelsService, user, lineId) => {
  const line = await modelsService.getModel('Line').findOne({ _id: lineId });
  if (!line) {
    return { statusCode: 404, data: 'Line does not exist' };
  }

  const draft = await modelsService.getModel('Draft').findOne({ _id: line.draft });

  if (!verifyRoles(['M', 'A'], user, draft._id)) {
    return { statusCode: 401, data: 'Unauthorized' };
  }

  if (draft.isPublished) {
    return { statusCode: 403, data: 'Draft can not be updated as it is published' };
  }

  try {
    await line.remove();
  }
  catch (err) {
    return { statusCode: 400, data: transformMongooseErrors(err) };
  }

  // Remove line ref from draft
  draft.lines = draft.lines.filter(l => !l.equals(line._id));
  await draft.save();

  return { statusCode: 200, data: `${line.name} (${line.key}) was removed` };
}

const sortConnections = (connections, startStations) => {
  return connections;
}

module.exports = service;