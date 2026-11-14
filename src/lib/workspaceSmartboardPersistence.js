const SMARTBOARD_RECOVERY_VERSION = 1;

export function getSmartboardRecoveryKey(userId) {
  if (typeof userId !== 'string' || !userId.trim()) {
    throw new TypeError('A signed-in user id is required for Smartboard recovery storage.');
  }
  return `facemex_smartboard_recovery_${userId}`;
}

export function serializeSmartboardRecovery(recovery) {
  if (!recovery || typeof recovery !== 'object' || Array.isArray(recovery)) {
    throw new TypeError('Smartboard recovery data must be an object.');
  }
  if (typeof recovery.title !== 'string' || recovery.title.length > 120) {
    throw new TypeError('Smartboard recovery data requires a title of at most 120 characters.');
  }
  if (!recovery.scene || typeof recovery.scene !== 'object' || Array.isArray(recovery.scene)) {
    throw new TypeError('Smartboard recovery data requires a scene object.');
  }
  if (recovery.image !== null && typeof recovery.image !== 'string') {
    throw new TypeError('Smartboard recovery image must be a data URL or null.');
  }

  return JSON.stringify({
    version: SMARTBOARD_RECOVERY_VERSION,
    savedAt: typeof recovery.savedAt === 'string' ? recovery.savedAt : new Date().toISOString(),
    title: recovery.title,
    scene: recovery.scene,
    image: recovery.image,
    view: recovery.view,
    savedBoard: recovery.savedBoard || null,
  });
}

export function parseSmartboardRecovery(serialized) {
  if (serialized === null || serialized === undefined || serialized === '') {
    return { status: 'empty' };
  }

  let value;
  try {
    value = JSON.parse(serialized);
  } catch {
    return { status: 'invalid' };
  }

  if (!value || typeof value !== 'object' || Array.isArray(value) ||
    value.version !== SMARTBOARD_RECOVERY_VERSION ||
    typeof value.title !== 'string' || value.title.length > 120 ||
    !value.scene || typeof value.scene !== 'object' || Array.isArray(value.scene) ||
    (value.image !== null && typeof value.image !== 'string') ||
    !value.view || typeof value.view !== 'object' || Array.isArray(value.view) ||
    typeof value.savedAt !== 'string') {
    return { status: 'invalid' };
  }

  const savedBoard = value.savedBoard;
  if (savedBoard !== null && savedBoard !== undefined &&
    (!savedBoard || typeof savedBoard !== 'object' || Array.isArray(savedBoard) ||
      typeof savedBoard.id !== 'string' ||
      typeof savedBoard.conversationId !== 'string' ||
      typeof savedBoard.createdAt !== 'string')) {
    return { status: 'invalid' };
  }

  return {
    status: 'valid',
    recovery: {
      savedAt: value.savedAt,
      title: value.title,
      scene: value.scene,
      image: value.image,
      view: value.view,
      savedBoard: savedBoard || null,
    },
  };
}
