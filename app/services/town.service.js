const fs = require("fs");
const getTown = require("../util/getTown");
const verifyRoles = require("../auth/role-verification");
const addCreatedAndModified = require("../util/addCreatedAndModified");
const transformMongooseErrors = require("../util/transformMongooseErrors");
const validatePagination = require("../util/validatePagination");
const paginateResults = require("../util/paginateResults");
const storage = require("../util/storage");

const service = {};

const draftPopulate = [
  {
    path: "country",
    select: "name code continent"
  }
];

service.getTownInfo = async (modelsService, user, townIdOrName) => {
  if (!verifyRoles(["U", "A"], user)) {
    return { statusCode: 401, data: "Unauthorized" };
  }

  const town = await getTown(modelsService, townIdOrName, false, [
    { path: "drafts", select: "name status autogenerated" },
    {
      path: "users",
      select: "user role",
      populate: { path: "user", select: "firstName lastName" }
    }
  ]);
  if (!town) {
    return { statusCode: 404, data: "Town not found" };
  }
  return { statusCode: 200, data: town };
};

service.getTowns = async (modelsService, user) => {
  if (!verifyRoles(["U", "A"], user)) {
    return { statusCode: 401, data: "Unauthorized" };
  }

  const towns = await modelsService
    .getModel("Town")
    .find({})
    .sort("order")
    .populate({ path: "country", select: "name code continent" })
    .select("order center name country url alias year imgCard logo");
  return { statusCode: 200, data: towns };
};

service.searchTowns = async (modelsService, user, body) => {
  if (!verifyRoles(["U", "A"], user)) {
    return { statusCode: 401, data: "Unauthorized" };
  }
  if (!validatePagination(body.pagination)) {
    return { statusCode: 400, data: "Bad request: Pagination is wrong format" };
  }

  const searchParams = {
    filter: {},
    sort: body.sort || "",
    select: body.select || "",
    populate: body.populate || ""
  };

  if (body.filter && body.filter.name) {
    searchParams.filter.name = { $regex: body.filter.name, $options: "i" };
  }

  let towns = await modelsService
    .getModel("Town")
    .find(searchParams.filter)
    .sort(searchParams.sort)
    .populate(draftPopulate);

  return {
    statusCode: 200,
    data: paginateResults(towns, body.pagination)
  };
};

service.addTown = async (modelsService, user, townObj) => {
  if (!verifyRoles(["U", "A"], user)) {
    return { statusCode: 401, data: "Unauthorized" };
  }

  const Town = modelsService.getModel("Town");

  const existingTownWithUrl = await Town.findOne({ url: townObj.url });
  if (existingTownWithUrl) {
    return { statusCode: 400, data: "URL already defined in other town" };
  }

  const town = new Town(addCreatedAndModified({ ...townObj }, user, true));

  try {
    const doc = await town.save();
    return { statusCode: 200, data: doc };
  } catch (err) {
    return { statusCode: 400, data: transformMongooseErrors(err) };
  }
};

service.updateTown = async (modelsService, user, townId, townObj) => {
  if (!verifyRoles(["A"], user)) {
    return { statusCode: 401, data: "Unauthorized" };
  }
  const town = await modelsService.getModel("Town").findOne({ _id: townId });

  Object.assign(town, addCreatedAndModified(townObj, user, false));

  try {
    await town.save();
    return { statusCode: 200, data: town };
  } catch (err) {
    return { statusCode: 400, data: transformMongooseErrors(err) };
  }
};

service.deleteTown = async (modelsService, user, townId) => {
  if (!verifyRoles(["A"], user, null, town)) {
    return { statusCode: 401, data: "Unauthorized" };
  }
  const town = await modelsService.getModel("Town").findOne({ _id: townId });

  try {
    await town.remove();
    return { statusCode: 200, data: `${town.name} was removed` };
  } catch (err) {
    return { statusCode: 400, data: transformMongooseErrors(err) };
  }
};

service.uploadTownImage = async (modelsService, user, townId, files) => {
  if (!verifyRoles(["A"], user)) {
    return { statusCode: 401, data: "Unauthorized" };
  }
  if (!files) {
    return { statusCode: 400, data: "You must post at least an image" };
  }
  const town = await modelsService.getModel("Town").findOne({ _id: townId });

  const uplodadAndSaveUrl = async files => {
    if (!fs.existsSync(`temp/${town.url}`)) {
      fs.mkdirSync(`temp/${town.url}`);
    }

    Object.keys(files).map(fileName => {
      const tempFilePath = `temp/${town.url}/${fileName}`;
      files[fileName].mv(tempFilePath, async err => {
        if (err) {
          return { statusCode: 500, data: err };
        }

        town[fileName] = await storage.uploadAndGetUrl(
          tempFilePath,
          `/${fileName}/${town.url}`
        );

        fs.unlinkSync(tempFilePath);
      });
    });
  };

  try {
    await uplodadAndSaveUrl(files);
    town.lastModified = { date: Date.now(), user: user._id };
    await town.save();
    return {
      statusCode: 200,
      data: `All images for ${town.name} were uploaded`
    };
  } catch (err) {
    return { statusCode: 400, data: transformMongooseErrors(err) };
  }
};

module.exports = service;
