const isTownUser = (user, townId) => {
  return user.towns.some(userTown => userTown.town.equals(townId));
}

module.exports = {
  isTownUser
}