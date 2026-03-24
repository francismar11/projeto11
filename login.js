const { json, parseBody, getAdminCredentials, createSessionToken, sessionCookie } = require('./_lib');
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { ok: false, message: 'Método não permitido.' });
  try {
    const body = parseBody(event);
    const { username, password } = getAdminCredentials();
    if (String(body.username || '').trim() !== username || String(body.password || '').trim() !== password) {
      return json(401, { ok: false, message: 'Login ou senha inválidos.' });
    }
    const token = createSessionToken(username);
    return json(200, { ok: true, message: 'Login realizado com sucesso.' }, { 'Set-Cookie': sessionCookie(token) });
  } catch (error) {
    return json(400, { ok: false, message: error.message || 'Não foi possível fazer login.' });
  }
};
