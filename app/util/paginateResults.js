const paginateResults = (results, pagination) => {
  const firstElementIndex = pagination.size * (pagination.page - 1);
  return {
    pagination: {
      total: results.length,
      size: pagination.size,
      page: pagination.page,
      pages: Math.ceil(results.length / pagination.size)
    },
    elements: results.slice(firstElementIndex, firstElementIndex + pagination.size),
  }
}

module.exports = paginateResults;
