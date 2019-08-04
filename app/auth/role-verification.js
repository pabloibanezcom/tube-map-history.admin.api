const verifyRoles = (roles, user, draftId) => {
  // Roles: ['user', 'draft manager', 'admin']
  const verifyRole = (role) => {
    if (role === 'user' || role === 'U') {
      return user ? true : false;
    }
    if (role === 'draft_manager' || role === 'M') {
      return user.drafts.some(d => compareIds(d.id, draftId));
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