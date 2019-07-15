const verifyRoles = (roles, user, townId, doc) => {
  // Roles: ['user', 'manager', 'creator', 'admin']
  const verifyRole = (role) => {
    if (role === 'user' || role === 'U') {
      return user ? true : false;
    }
    if (role === 'manager' || role === 'M') {
      return user.towns.some(userTown => compareIds(userTown.town, townId));
    }
    if (role === 'creator' || role === 'C') {
      return doc && doc.created && compareIds(doc.created.user, user._id);
    }
    if (role === 'admin' || role === 'A') {
      return user.authLevel === 'admin';
    }
  }

  return roles.some(r => verifyRole(r));
}

const compareIds = (a, b) => {
  return new String(a).valueOf() == new String(b).valueOf();
}

module.exports = verifyRoles;