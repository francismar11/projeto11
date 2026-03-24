const { json, parseBody, sanitizeCadastro, getCadastros, saveCadastros, sortCadastros, nowIso, requireAuth } = require('./_lib');
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { ok: false, message: 'Método não permitido.' });
  const auth = requireAuth(event);
  if (!auth.ok) return auth.response;
  try {
    const body = parseBody(event);
    const id = String(body.id || '').trim();
    if (!id) return json(400, { ok: false, message: 'ID do cadastro não informado.' });
    const data = sanitizeCadastro(body);
    const cadastros = await getCadastros(event);
    const index = cadastros.findIndex((item) => String(item.id) === id);
    if (index === -1) return json(404, { ok: false, message: 'Cadastro não encontrado.' });
    cadastros[index] = { ...cadastros[index], ...data, updated_at: nowIso() };
    await saveCadastros(sortCadastros(cadastros), event);
    return json(200, { ok: true, message: 'Cadastro atualizado com sucesso.' });
  } catch (error) {
    return json(400, { ok: false, message: error.message || 'Não foi possível atualizar o cadastro.', validation: error.validation || null });
  }
};
