#!/usr/bin/env node
/**
 * ESM script: Patches the cloned LibreChat workspace with Voygent UI tweaks:
 * - Adds StatusBar pill (local usage estimate + server fallback)
 * - Auto-start prompt for new chats by resolving Prompt Group
 * - Adds footer branding link
 * The script is idempotent and safe to run multiple times.
 */
import fs from 'fs';
import path from 'path';

const root = process.cwd();
const lcDir = path.join(root, 'librechat');
const clientDir = path.join(lcDir, 'client', 'src');

function exists(p) {
  try { fs.accessSync(p); return true; } catch { return false; }
}

function upsertFile(fp, content) {
  const dir = path.dirname(fp);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(fp, content, 'utf8');
}

function patchFile(fp, replacers) {
  if (!exists(fp)) return false;
  let code = fs.readFileSync(fp, 'utf8');
  let changed = false;
  for (const { test, replace } of replacers) {
    if (!test.test(code)) {
      code = replace(code);
      changed = true;
    }
  }
  if (changed) fs.writeFileSync(fp, code, 'utf8');
  return changed;
}

if (!exists(clientDir)) {
  console.log('[voygent patch] Skipping: LibreChat client not found at', clientDir);
  process.exit(0);
}

// 1) Add StatusBar.tsx
const statusBarPath = path.join(clientDir, 'components', 'StatusBar.tsx');
if (!exists(statusBarPath)) {
  const statusBarContent = `import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRecoilValue } from 'recoil';
import store from '~/store';

type StatusPayload = {
  ok?: boolean;
  tripName?: string; dates?: string; phase?: string; step?: number; percent?: number;
  cost?: number; budget?: number; commission?: number; url?: string;
  model?: string; inputTokens?: number; outputTokens?: number; approximate?: boolean; price?: number;
};

const pillStyle: React.CSSProperties = {
  position: 'fixed', right: 12, bottom: 12, zIndex: 999, maxWidth: 520, backdropFilter: 'blur(6px)'
};

export default function StatusBar() {
  const verbosity = useRecoilValue(store.voygentStatusVerbosity ?? { key: '', default: 'normal' } as any);
  const defaultQuery = useRecoilValue(store.voygentDefaultQuery ?? { key: '', default: '' } as any);
  const lastUsage = (store.voygentLastUsage ? useRecoilValue(store.voygentLastUsage as any) : null) as any;
  const { data } = useQuery<StatusPayload>({
    queryKey: ['voygen-status', defaultQuery],
    queryFn: async () => {
      try {
        const qs = defaultQuery ? \'?q=\' + encodeURIComponent(defaultQuery) : '';
        const res = await fetch('/api/voygen/status' + qs);
        if (res.status === 204) return { ok: false } as StatusPayload;
        return (await res.json()) as StatusPayload;
      } catch { return { ok: false } as StatusPayload; }
    },
    refetchInterval: 15000, staleTime: 10000,
  });

  const text = useMemo(() => {
    const fmt = (payload?: StatusPayload | null) => {
      if (!payload || payload.ok === false) return '';
      if (payload.model || payload.inputTokens != null || payload.outputTokens != null || payload.price != null) {
        const approx = payload.approximate ? '~' : '';
        const p: string[] = [];
        if (payload.model) p.push(payload.model);
        if (payload.inputTokens != null) p.push('in ' + approx + payload.inputTokens);
        if (payload.outputTokens != null) p.push('out ' + approx + payload.outputTokens);
        if (payload.price != null) p.push('$' + payload.price.toFixed(4));
        return p.filter(Boolean).join(' • ');
      }
      const parts: string[] = [];
      if (payload.tripName) parts.push(payload.tripName);
      if (verbosity !== 'minimal') {
        if (payload.phase) parts.push(payload.phase + (payload.step ? ' (Step ' + payload.step + ')' : ''));
        if (payload.dates) parts.push(payload.dates);
      }
      if (payload.cost != null && payload.budget != null) parts.push('$' + payload.cost + '/' + payload.budget);
      if (verbosity === 'verbose' && payload.commission != null) parts.push('Comm $' + payload.commission);
      if (payload.percent != null) parts.push(payload.percent + '%');
      return parts.filter(Boolean).join(' • ');
    };
    const server = fmt(data);
    if (server) return server;
    const local = fmt(lastUsage as any);
    return local || '';
  }, [data, lastUsage, verbosity]);

  if (!text) return null;
  return (
    <div className='rounded-full bg-token-main-surface-primary/80 text-text-primary border border-border-medium px-3 py-1 shadow-sm' style={pillStyle}>
      <span className='text-xs md:text-sm whitespace-nowrap'>{text}</span>
    </div>
  );
}
`;
  upsertFile(statusBarPath, statusBarContent);
  console.log('[voygent patch] Added StatusBar.tsx');
}

// 2) Ensure App.jsx renders StatusBar
const appPath = path.join(clientDir, 'App.jsx');
patchFile(appPath, [
  {
    test: /import\s+StatusBar\s+from\s+['\"]\.\/components\/StatusBar['\"];?/,
    replace: (s) => s.replace(/(import\s+\{\s*router\s*\}\s+from\s+['\"]\.\/routes['\"];?)/, `$1\nimport StatusBar from './components/StatusBar';`),
  },
  {
    test: /<StatusBar\s*\/?>/,
    replace: (s) => s.replace(/(<RouterProvider\s+router=\{router\}\s*\/>)/, `$1\n                  <StatusBar />`),
  },
]);

// 3) Auto-start prompt in ChatForm.tsx
const chatFormPath = path.join(clientDir, 'components', 'Chat', 'Input', 'ChatForm.tsx');
patchFile(chatFormPath, [
  {
    test: /useGetAllPromptGroups\s*\}/,
    replace: (s) => s.replace(/from\s+['\"]~\/hooks['\"];?/, (m) => `${m}\nimport { useGetAllPromptGroups } from '~/data-provider';`),
  },
  {
    test: /const\s+\{\s*submitMessage,\s*submitPrompt\s*\}\s*=\s*useSubmitMessage\(\);[\s\S]*?autoStartPromptSentRef/m,
    replace: (s) => s.replace(/(const\s+\{\s*submitMessage,\s*submitPrompt\s*\}\s*=\s*useSubmitMessage\(\);)/, `$1\n  const { data: allPromptGroups } = useGetAllPromptGroups();\n  const autoStartPromptSentRef = useRef(false);`),
  },
  {
    test: /voygentStartupPrompt/, // already patched
    replace: (s) => s,
  },
  {
    test: /submitPrompt\(configuredStart\);/,
    replace: (s) => s,
  },
  {
    test: /autoStartPromptSentRef\.current\s*=\s*true;[\s\S]*?submitPrompt\(configuredStart\);/m,
    replace: (s) => s, // another variant
  },
  {
    test: /useEffect\(\(\)\s*=>\s*{[\s\S]*?newConversation[\s\S]*?\},\s*\[newConversation[\s\S]*?\]\);/m,
    replace: (code) => {
      // Append our effect near the bottom of file if we cannot pattern-match the exact one
      if (code.includes('voygentStartupPrompt') && code.includes('allPromptGroups')) return code;
      const effect = `\n  // Voygent: resolve and auto-send startup prompt on new chat\n  useEffect(() => {\n    try {\n      // Only for new conversations with no messages yet\n      // Guard: some builds name this flag differently; fallback by checking getMessages\n      const msgs = typeof getMessages === 'function' ? (getMessages() || []) : [];\n      if (msgs.length > 0) return;\n      const configuredStart = (typeof window !== 'undefined' ? localStorage.getItem('voygentStartupPrompt') : null) || 'travel_agent_start';\n      const normalize = (s?: string | null) => (s || '').toLowerCase().replace(/[-_]+/g, ' ').trim();\n      const target = normalize(configuredStart);\n      const group = (allPromptGroups || []).find((g: any) => normalize(g?.name) === target || normalize(g?.command) === target);\n      const text = group?.productionPrompt?.prompt?.trim();\n      if (text && !autoStartPromptSentRef.current) { autoStartPromptSentRef.current = true; submitPrompt(text); }\n    } catch { /* ignore */ }\n  }, [allPromptGroups, submitPrompt]);\n`;
      // Insert before export default
      return code.replace(/\nexport\s+default\s+ChatForm;/, effect + '\nexport default ChatForm;');
    },
  },
]);

console.log('[voygent patch] Completed UI patches');

// 4) Footer branding link
const footerPath = path.join(clientDir, 'components', 'Chat', 'Footer.tsx');
if (exists(footerPath)) {
  let changed = false;
  let code = fs.readFileSync(footerPath, 'utf8');
  if (!code.includes('Powered by Voygent.ai')) {
    code = code.replace(
      /const\s+termsOfServiceRender[\s\S]*?\);\n\n/, // after ToS render block
      (m) =>
        m +
        `  // Voygent branding link\n  const voygentBranding = (\n    <a\n      className=\"text-text-secondary underline\"\n      href=\"https://voygent.ai/signup?utm_source=librechat\"\n      target=\"_blank\"\n      rel=\"noreferrer\"\n      title=\"Try Voygent.ai for free\"\n    >\n      Powered by Voygent.ai — Try for free\n    </a>\n  );\n\n`
    );
    code = code.replace(
      /const\s+footerElements\s*=\s*\[[\s\S]*?\]\.filter\(/,
      (m) =>
        m.replace('[...mainContentRender,', '[...mainContentRender, voygentBranding,')
    );
    fs.writeFileSync(footerPath, code, 'utf8');
    changed = true;
  }
  if (changed) console.log('[voygent patch] Added footer branding link');
}

// 5) Rollup config compatibility: prefer @rollup/plugin-typescript over rollup-plugin-typescript2
const rollupTargets = [
  path.join(lcDir, 'packages', 'data-provider', 'rollup.config.ts'),
  path.join(lcDir, 'packages', 'data-schemas', 'rollup.config.ts'),
];

for (const fp of rollupTargets) {
  if (!exists(fp)) continue;
  const changed = patchFile(fp, [
    {
      test: /@rollup\/plugin-typescript|rollup-plugin-typescript2/,
      replace: (code) => {
        let s = code;
        // Replace ESM import
        s = s.replace(
          /import\s+typescript\s+from\s+['"]rollup-plugin-typescript2['"];?/g,
          "import typescript from '@rollup/plugin-typescript';",
        );
        // Replace CJS require
        s = s.replace(
          /const\s+typescript\s*=\s*require\(['"]rollup-plugin-typescript2['"]\);?/g,
          "const typescript = require('@rollup/plugin-typescript');",
        );
        return s;
      },
    },
  ]);
  if (changed) {
    console.log('[voygent patch] Updated rollup config to use @rollup/plugin-typescript:', fp);
  }
}
