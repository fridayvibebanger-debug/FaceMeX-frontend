export type SmartboardRecovery = {
  savedAt: string;
  title: string;
  scene: Record<string, unknown>;
  image: string | null;
  view: { zoom: number; x: number; y: number };
  savedBoard: {
    id: string;
    conversationId: string;
    createdAt: string;
  } | null;
};

export function getSmartboardRecoveryKey(userId: string): string;
export function serializeSmartboardRecovery(recovery: SmartboardRecovery): string;
export function parseSmartboardRecovery(serialized: string | null | undefined):
  | { status: 'empty' | 'invalid' }
  | { status: 'valid'; recovery: SmartboardRecovery };
