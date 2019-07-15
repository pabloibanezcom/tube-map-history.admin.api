const getDraft = async (modelsService, draftId, customPopulate = []) => {
  return await modelsService.getModel('Draft').findOne({ _id: draftId }).populate([{ path: 'town', select: 'name' }].concat(customPopulate));;
}

module.exports = getTown;