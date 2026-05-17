function formatUser(user, role) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    isAdmin: Boolean(user.is_admin),
    role
  };
}

module.exports = { formatUser };
