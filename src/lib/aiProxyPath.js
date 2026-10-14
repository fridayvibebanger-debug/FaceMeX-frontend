export function toSameOriginAIProxyPath(path, isProduction) {
  if (!isProduction || !path.startsWith('/api/ai/')) {
    return path;
  }

  return `/.netlify/functions/ai-proxy${path.slice('/api/ai'.length)}`;
}
