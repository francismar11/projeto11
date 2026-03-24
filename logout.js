const { json, clearSessionCookie } = require('./_lib');
exports.handler = async () => json(200, { ok: true, message: 'Sessão encerrada.' }, { 'Set-Cookie': clearSessionCookie() });
