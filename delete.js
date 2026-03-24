const { json, parseBody, getCadastros, saveCadastros, sortCadastros, requireAuth } = require('./_lib');
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { ok: false, message: 'Método não permitido.' });
  const auth = requireAuth(event);
  if (!auth.ok) return auth.response;
  try {
    const body = parseBody(event);
    const id = String(body.id || '').trim();
    if (!id) return json(400, { ok: false, message: 'ID do cadastro não informado.' });
    const cadastros = await getCadastros(event);
    const filtrados = cadastros.filter((item) => String(item.id) !== id);
    if (filtrados.length === cadastros.length) return json(404, { ok: false, message: 'Cadastro não encontrado.' });
    await saveCadastros(sortCadastros(filtrados), event);
    return json(200, { ok: true, message: 'Cadastro excluído com sucesso.' });
  } catch (error) {
    return json(400, { ok: false, message: error.message || 'Não foi possível excluir o cadastro.' });
  }
};
