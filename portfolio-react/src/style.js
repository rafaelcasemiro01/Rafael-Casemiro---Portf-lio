// Converte uma string CSS ("padding:10px;color:red") em um objeto de estilo React.
// Permite reaproveitar os estilos inline do design original sem reescrever em camelCase.
const cache = new Map();

export function s(css) {
  if (!css) return {};
  if (typeof css === 'object') return css;
  if (cache.has(css)) return cache.get(css);
  const obj = {};
  css.split(';').forEach((decl) => {
    const i = decl.indexOf(':');
    if (i === -1) return;
    const prop = decl.slice(0, i).trim();
    const val = decl.slice(i + 1).trim();
    if (!prop) return;
    const key = prop.startsWith('--')
      ? prop
      : prop.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    obj[key] = val;
  });
  cache.set(css, obj);
  return obj;
}

// Junta múltiplas strings/objetos de estilo.
export function sx(...parts) {
  return Object.assign({}, ...parts.map((p) => s(p)));
}
