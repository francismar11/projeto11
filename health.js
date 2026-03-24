const { json, getStorageStatus } = require('./_lib');

exports.handler = async (event) => {
  try {
    const storage = await getStorageStatus(event);
    return json(200, {
      ok: true,
      status: 'online',
      storage,
    });
  } catch (error) {
    return json(200, {
      ok: true,
      status: 'online',
      storage: 'missing',
      message: error.message || 'Storage indisponível.',
    });
  }
};
