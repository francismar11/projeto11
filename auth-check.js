const { json, requireAuth } = require('./_lib');
exports.handler = async (event) => {
  try {
    const auth = requireAuth(event);
    if (!auth.ok) return json(200, { ok: true, authenticated: false });
    return json(200, { ok: true, authenticated: true, username: auth.session.u });
  } catch (error) {
    return json(200, { ok: true, authenticated: false });
  }
};
