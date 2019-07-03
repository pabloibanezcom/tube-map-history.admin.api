const validatePagination = (pagination) => {
  return pagination && Number.isInteger(pagination.page) && Number.isInteger(pagination.size);
}

module.exports = validatePagination