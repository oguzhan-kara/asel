'use strict';

function renderPlaceholders(text, ctx) {
  return text.replace(/\{\{([a-zA-Z0-9_.,-]+)\}\}/g, (_, key) => {
    const parts = key.split('.');
    if (parts[0] === 'agents' && parts.length === 3) {
      const a = ctx.config.agents[parts[1]];
      if (a && a[parts[2]] !== undefined) return String(a[parts[2]]);
    } else if (parts[0] === 'rules' && parts.length === 2) {
      const out = [];
      for (const k of parts[1].split(',')) {
        const list = ctx.config.rules[k];
        if (!list) throw new Error(`unknown placeholder {{${key}}}: rules.${k}`);
        out.push(...list);
      }
      return JSON.stringify(out);
    } else if (parts[0] === 'paths' && parts.length === 2) {
      // Prose wants the bare path; frontmatter that expects a list uses {{pathsList.<k>}}.
      const v = ctx.config.paths[parts[1]];
      if (v !== undefined) return String(v);
    } else if (parts[0] === 'pathsList' && parts.length === 2) {
      const v = ctx.config.paths[parts[1]];
      if (v !== undefined) return JSON.stringify([v]);
    } else if (parts[0] === 'workflow' && parts.length === 2) {
      const v = ctx.config.workflow[parts[1]];
      if (v !== undefined) return String(v);
    } else if (parts.length === 1 && ['hookRoot', 'aselRoot', 'playwrightPrefix'].includes(key) && ctx[key] !== undefined) {
      return String(ctx[key]);
    }
    throw new Error(`unknown placeholder {{${key}}}`);
  });
}

module.exports = { renderPlaceholders };
