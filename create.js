const { json, parseBody, sanitizeCadastro, getCadastros, saveCadastros, sortCadastros, nowIso } = require('./_lib');
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { ok: false, message: 'Método não permitido.' });
  try {
    const data = sanitizeCadastro(parseBody(event));
    const cadastros = await getCadastros(event);
    const timestamp = Date.now();
    const item = {
      id: String(timestamp),
      ...data,
      created_at: nowIso(),
      updated_at: nowIso(),
    };
    cadastros.push(item);
    await saveCadastros(sortCadastros(cadastros), event);
    return json(200, { ok: true, id: item.id, message: 'Cadastro salvo com sucesso.' });
  } catch (error) {
    return json(400, { ok: false, message: error.message || 'Não foi possível salvar o cadastro.', validation: error.validation || null });
  }
};
