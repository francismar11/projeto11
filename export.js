const { csv, getCadastros, sortCadastros, requireAuth, json, toCsv } = require('./_lib');
exports.handler = async (event) => {
  const auth = requireAuth(event);
  if (!auth.ok) return auth.response;
  try {
    const cadastros = sortCadastros(await getCadastros(event));
    return csv(200, toCsv(cadastros), 'cadastros-teamo.csv');
  } catch (error) {
    return json(500, { ok: false, message: 'Não foi possível exportar os cadastros.' });
  }
};
