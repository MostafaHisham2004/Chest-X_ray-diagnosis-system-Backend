function formatUser(user, role) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    isAdmin: role === "admin" || Boolean(user.is_admin),
    role
  };
}

module.exports = { formatUser };
