const isTownUser = (user, townId) => {
  return user.towns.some(userTown => userTown.equals(townId));
}

module.exports = {
  isTownUser
}