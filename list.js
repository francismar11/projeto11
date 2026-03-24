const { json, getCadastros, sortCadastros, requireAuth } = require('./_lib');
exports.handler = async (event) => {
  const auth = requireAuth(event);
  if (!auth.ok) return auth.response;
  try {
    const cadastros = await getCadastros(event);
    return json(200, { ok: true, data: sortCadastros(cadastros) });
  } catch (error) {
    return json(503, { ok: false, message: error.message || 'Não foi possível carregar os cadastros.' });
  }
};
