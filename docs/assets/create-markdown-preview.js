/**
 * @create-markdown/preview v0.1.0
 * Framework-agnostic HTML rendering for @create-markdown
 *
 * Author: Val Alexander <val@openknot.ai>
 * License: MIT
 * npm: https://www.npmjs.com/package/@create-markdown/preview
 * GitHub: https://github.com/BunsDev/create-markdown/tree/main/packages/preview
 *
 * Vendored from esm.sh to avoid third-party CDN supply-chain risk.
 */
var I = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
  H = 8;
function R(e = H) {
  let n = "",
    t = I.length;
  for (let r = 0; r < e; r++) n += I.charAt(Math.floor(Math.random() * t));
  return n;
}
function z(e) {
  return { text: e, styles: {} };
}
function F(e) {
  return [z(e)];
}
var d = {
  heading: /^(#{1,6})\s+(.*)$/,
  setextH1: /^=+\s*$/,
  setextH2: /^-+\s*$/,
  bulletList: /^(\s*)([-*+])\s+(.*)$/,
  numberedList: /^(\s*)(\d+)\.\s+(.*)$/,
  checkList: /^(\s*)[-*+]\s+\[([ xX])\]\s+(.*)$/,
  codeFence: /^(\s*)(`{3,}|~{3,})(\w*)?\s*$/,
  blockquote: /^>\s?(.*)$/,
  callout: /^>\s*\[!(\w+)\]\s*$/,
  divider: /^(\s*)(-{3,}|\*{3,}|_{3,})\s*$/,
  tableRow: /^\|(.+)\|$/,
  tableSeparator: /^\|[\s\-:|]+\|$/,
  image: /^!\[([^\]]*)\]\(([^)]+)\)$/,
  blank: /^\s*$/,
};
function U(e) {
  let n = e.split(/\r?\n/),
    t = [],
    r = { inCodeBlock: !1, codeBlockFence: "", lineNumber: 0 };
  for (let i = 0; i < n.length; i++) {
    r.lineNumber = i + 1;
    let o = n[i],
      s = V(o, r, n, i);
    s && t.push(s);
  }
  return t;
}
function V(e, n, t, r) {
  let i = n.lineNumber;
  if (n.inCodeBlock)
    return e.match(d.codeFence) &&
      e.trim().startsWith(n.codeBlockFence.charAt(0))
      ? ((n.inCodeBlock = !1),
        (n.codeBlockFence = ""),
        { type: "code_fence_end", raw: e, content: "", indent: 0, line: i })
      : { type: "code_content", raw: e, content: e, indent: 0, line: i };
  let o = e.match(d.codeFence);
  if (o) {
    (n.inCodeBlock = !0), (n.codeBlockFence = o[2]);
    let f = o[3] || "";
    return {
      type: "code_fence_start",
      raw: e,
      content: "",
      indent: (o[1] || "").length,
      line: i,
      meta: { language: f },
    };
  }
  if (d.blank.test(e))
    return { type: "blank", raw: e, content: "", indent: 0, line: i };
  let s = e.match(d.divider);
  if (s) {
    let f = r > 0 ? t[r - 1] : "";
    if (f.trim() && !d.blank.test(f)) d.setextH2.test(e);
    else
      return {
        type: "divider",
        raw: e,
        content: "",
        indent: (s[1] || "").length,
        line: i,
      };
  }
  let c = e.match(d.heading);
  if (c)
    return {
      type: "heading",
      raw: e,
      content: c[2].trim(),
      indent: 0,
      line: i,
      meta: { level: c[1].length },
    };
  let l = e.match(d.callout);
  if (l)
    return {
      type: "callout",
      raw: e,
      content: "",
      indent: 0,
      line: i,
      meta: { calloutType: l[1].toLowerCase() },
    };
  let a = e.match(d.blockquote);
  if (a)
    return { type: "blockquote", raw: e, content: a[1], indent: 0, line: i };
  let u = e.match(d.checkList);
  if (u) {
    let f = u[2].toLowerCase() === "x";
    return {
      type: "check_list_item",
      raw: e,
      content: u[3],
      indent: u[1].length,
      line: i,
      meta: { checked: f },
    };
  }
  let h = e.match(d.bulletList);
  if (h)
    return {
      type: "bullet_list_item",
      raw: e,
      content: h[3],
      indent: h[1].length,
      line: i,
      meta: { listMarker: h[2] },
    };
  let p = e.match(d.numberedList);
  if (p)
    return {
      type: "numbered_list_item",
      raw: e,
      content: p[3],
      indent: p[1].length,
      line: i,
      meta: { listIndex: parseInt(p[2], 10) },
    };
  if (d.tableSeparator.test(e))
    return { type: "table_separator", raw: e, content: e, indent: 0, line: i };
  let k = e.match(d.tableRow);
  if (k)
    return { type: "table_row", raw: e, content: k[1], indent: 0, line: i };
  let w = e.match(d.image);
  if (w)
    return {
      type: "image",
      raw: e,
      content: w[2],
      indent: 0,
      line: i,
      meta: { language: w[1] },
    };
  if (d.setextH1.test(e) || d.setextH2.test(e)) {
    let f = r > 0 ? t[r - 1] : "";
    return f.trim() && !d.blank.test(f)
      ? {
          type: "heading",
          raw: e,
          content: f.trim(),
          indent: 0,
          line: i,
          meta: { level: d.setextH1.test(e) ? 1 : 2 },
        }
      : { type: "divider", raw: e, content: "", indent: 0, line: i };
  }
  return {
    type: "paragraph",
    raw: e,
    content: e.trim(),
    indent: e.length - e.trimStart().length,
    line: i,
  };
}
function $(e) {
  if (!e) return [];
  let n = W(e);
  return G(n);
}
function W(e) {
  let n = [],
    t = e,
    r = 0;
  for (; r < t.length; ) {
    let i = Y(t, r);
    i
      ? (i.startIndex > r &&
          n.push({ type: "text", content: t.slice(r, i.startIndex) }),
        n.push(i.token),
        (r = i.endIndex))
      : r++;
  }
  return b(e);
}
function b(e) {
  let n = [],
    t = 0,
    r = "",
    i = () => {
      r && (n.push({ type: "text", content: r }), (r = ""));
    };
  for (; t < e.length; ) {
    if (e[t] === "\\" && t + 1 < e.length) {
      (r += e[t + 1]), (t += 2);
      continue;
    }
    if (e[t] === "`") {
      let o = T(e, t);
      if (o) {
        i(), n.push(o.token), (t = o.end);
        continue;
      }
    }
    if (e[t] === "[" || (e[t] === "!" && e[t + 1] === "[")) {
      let o = e[t] === "!",
        s = J(e, o ? t + 1 : t, o);
      if (s) {
        i(), n.push(s.token), (t = s.end);
        continue;
      }
    }
    if (e[t] === "*" || e[t] === "_") {
      let o = L(e, t);
      if (o) {
        i(), n.push(o.token), (t = o.end);
        continue;
      }
    }
    if (e[t] === "~" && e[t + 1] === "~") {
      let o = E(e, t);
      if (o) {
        i(), n.push(o.token), (t = o.end);
        continue;
      }
    }
    if (e[t] === "=" && e[t + 1] === "=") {
      let o = A(e, t);
      if (o) {
        i(), n.push(o.token), (t = o.end);
        continue;
      }
    }
    (r += e[t]), t++;
  }
  return i(), n;
}
function T(e, n) {
  let t = 0,
    r = n;
  for (; r < e.length && e[r] === "`"; ) t++, r++;
  if (t === 0) return null;
  let i = "`".repeat(t),
    o = e.indexOf(i, r);
  return o === -1 || e[o + t] === "`"
    ? null
    : { token: { type: "code", content: e.slice(r, o).trim() }, end: o + t };
}
function J(e, n, t = !1) {
  if (e[n] !== "[") return null;
  let r = 1,
    i = n + 1;
  for (; i < e.length && r > 0; )
    e[i] === "[" ? r++ : e[i] === "]" ? r-- : e[i] === "\\" && i++, i++;
  if (r !== 0) return null;
  let o = e.slice(n + 1, i - 1);
  if (e[i] !== "(") return null;
  let s = i + 1,
    c = s,
    l = 1;
  for (; c < e.length && l > 0; )
    e[c] === "(" ? l++ : e[c] === ")" ? l-- : e[c] === "\\" && c++, c++;
  if (l !== 0) return null;
  let a = e.slice(s, c - 1).trim(),
    u = a,
    h,
    p = a.match(/^(.+?)\s+["'](.+?)["']$/);
  p && ((u = p[1]), (h = p[2]));
  let k = b(o);
  return {
    token: t
      ? { type: "image", content: o, url: u, title: h, children: k }
      : { type: "link", content: o, url: u, title: h, children: k },
    end: t ? c + 1 : c,
  };
}
function L(e, n) {
  let t = e[n];
  if (t !== "*" && t !== "_") return null;
  let r = 0,
    i = n;
  for (; i < e.length && e[i] === t && r < 3; ) r++, i++;
  if (r === 0) return null;
  let o = t.repeat(r),
    s = i;
  for (; s < e.length; ) {
    let c = e.indexOf(o, s);
    if (c === -1) return null;
    if (e[c + r] === t) {
      s = c + 1;
      continue;
    }
    if (e[c - 1] === " ") {
      s = c + 1;
      continue;
    }
    let l = e.slice(i, c);
    if (!l.trim()) {
      s = c + 1;
      continue;
    }
    let a = b(l);
    return r === 3
      ? {
          token: {
            type: "bold",
            content: l,
            children: [{ type: "italic", content: l, children: a }],
          },
          end: c + r,
        }
      : r === 2
      ? { token: { type: "bold", content: l, children: a }, end: c + r }
      : { token: { type: "italic", content: l, children: a }, end: c + r };
  }
  return null;
}
function E(e, n) {
  if (e[n] !== "~" || e[n + 1] !== "~") return null;
  let t = e.indexOf("~~", n + 2);
  if (t === -1) return null;
  let r = e.slice(n + 2, t);
  if (!r.trim()) return null;
  let i = b(r);
  return {
    token: { type: "strikethrough", content: r, children: i },
    end: t + 2,
  };
}
function A(e, n) {
  if (e[n] !== "=" || e[n + 1] !== "=") return null;
  let t = e.indexOf("==", n + 2);
  if (t === -1) return null;
  let r = e.slice(n + 2, t);
  if (!r.trim()) return null;
  let i = b(r);
  return { token: { type: "highlight", content: r, children: i }, end: t + 2 };
}
function G(e) {
  let n = [];
  for (let t of e) {
    let r = P(t, {});
    n.push(...r);
  }
  return K(n);
}
function P(e, n) {
  switch (e.type) {
    case "text":
      return [{ text: e.content, styles: { ...n } }];
    case "bold":
      return y(e, { ...n, bold: !0 });
    case "italic":
      return y(e, { ...n, italic: !0 });
    case "code":
      return [{ text: e.content, styles: { ...n, code: !0 } }];
    case "strikethrough":
      return y(e, { ...n, strikethrough: !0 });
    case "highlight":
      return y(e, { ...n, highlight: !0 });
    case "link":
      return y(e, { ...n, link: { url: e.url || "", title: e.title } });
    case "image":
      return [{ text: `[image: ${e.content}]`, styles: n }];
    default:
      return [{ text: e.content, styles: n }];
  }
}
function y(e, n) {
  if (e.children && e.children.length > 0) {
    let t = [];
    for (let r of e.children) t.push(...P(r, n));
    return t;
  }
  return [{ text: e.content, styles: n }];
}
function K(e) {
  if (e.length === 0) return [];
  let n = [e[0]];
  for (let t = 1; t < e.length; t++) {
    let r = e[t],
      i = n[n.length - 1];
    X(r.styles, i.styles) ? (i.text += r.text) : n.push(r);
  }
  return n;
}
function X(e, n) {
  return (
    e.bold === n.bold &&
    e.italic === n.italic &&
    e.underline === n.underline &&
    e.strikethrough === n.strikethrough &&
    e.code === n.code &&
    e.highlight === n.highlight &&
    Q(e.link, n.link)
  );
}
function Q(e, n) {
  return !e && !n ? !0 : !e || !n ? !1 : e.url === n.url && e.title === n.title;
}
function Y(e, n) {
  let t = [() => T(e, n), () => L(e, n), () => E(e, n), () => A(e, n)];
  for (let r of t) {
    let i = r();
    if (i) return { token: i.token, startIndex: n, endIndex: i.end };
  }
  return null;
}
var Z = { generateId: R, strict: !1 };
function ee(e, n = {}) {
  let t = { ...Z, ...n },
    r = U(e);
  return ne(r, t);
}
function x(e, n) {
  return ee(e, n);
}
function ne(e, n) {
  let t = [],
    r = { options: n, tokens: e, index: 0 };
  for (; r.index < e.length; ) {
    if (e[r.index].type === "blank") {
      r.index++;
      continue;
    }
    let o = te(r);
    o && t.push(o);
  }
  return t;
}
function te(e) {
  switch (e.tokens[e.index].type) {
    case "heading":
      return re(e);
    case "paragraph":
      return ie(e);
    case "bullet_list_item":
      return oe(e);
    case "numbered_list_item":
      return ce(e);
    case "check_list_item":
      return se(e);
    case "code_fence_start":
      return le(e);
    case "blockquote":
      return ae(e);
    case "callout":
      return ue(e);
    case "divider":
      return de(e);
    case "table_row":
      return he(e);
    case "image":
      return fe(e);
    default:
      return e.index++, null;
  }
}
function re(e) {
  let n = e.tokens[e.index],
    t = n.meta?.level ?? 1,
    r = $(n.content);
  return (
    e.index++,
    {
      id: e.options.generateId(),
      type: "heading",
      content: r,
      children: [],
      props: { level: t },
    }
  );
}
function ie(e) {
  let n = [];
  for (; e.index < e.tokens.length && e.tokens[e.index].type === "paragraph"; )
    n.push(e.tokens[e.index].content), e.index++;
  let t = $(n.join(" "));
  return {
    id: e.options.generateId(),
    type: "paragraph",
    content: t,
    children: [],
    props: {},
  };
}
function oe(e) {
  let n = [],
    t = e.tokens[e.index].indent;
  for (
    ;
    e.index < e.tokens.length &&
    e.tokens[e.index].type === "bullet_list_item" &&
    e.tokens[e.index].indent >= t;

  ) {
    let r = e.tokens[e.index];
    if (r.indent > t) {
      e.index++;
      continue;
    }
    let i = $(r.content);
    n.push({
      id: e.options.generateId(),
      type: "paragraph",
      content: i,
      children: [],
      props: {},
    }),
      e.index++;
  }
  return {
    id: e.options.generateId(),
    type: "bulletList",
    content: [],
    children: n,
    props: {},
  };
}
function ce(e) {
  let n = [],
    t = e.tokens[e.index].indent;
  for (
    ;
    e.index < e.tokens.length &&
    e.tokens[e.index].type === "numbered_list_item" &&
    e.tokens[e.index].indent >= t;

  ) {
    let r = e.tokens[e.index];
    if (r.indent > t) {
      e.index++;
      continue;
    }
    let i = $(r.content);
    n.push({
      id: e.options.generateId(),
      type: "paragraph",
      content: i,
      children: [],
      props: {},
    }),
      e.index++;
  }
  return {
    id: e.options.generateId(),
    type: "numberedList",
    content: [],
    children: n,
    props: {},
  };
}
function se(e) {
  let n = e.tokens[e.index],
    t = n.meta?.checked ?? !1,
    r = $(n.content);
  return (
    e.index++,
    {
      id: e.options.generateId(),
      type: "checkList",
      content: r,
      children: [],
      props: { checked: t },
    }
  );
}
function le(e) {
  let t = e.tokens[e.index].meta?.language ?? "",
    r = [];
  for (
    e.index++;
    e.index < e.tokens.length && e.tokens[e.index].type === "code_content";

  )
    r.push(e.tokens[e.index].content), e.index++;
  return (
    e.index < e.tokens.length &&
      e.tokens[e.index].type === "code_fence_end" &&
      e.index++,
    {
      id: e.options.generateId(),
      type: "codeBlock",
      content: F(
        r.join(`
`)
      ),
      children: [],
      props: { language: t || void 0 },
    }
  );
}
function ae(e) {
  let n = [];
  for (; e.index < e.tokens.length && e.tokens[e.index].type === "blockquote"; )
    n.push(e.tokens[e.index].content), e.index++;
  let t = $(
    n.join(`
`)
  );
  return {
    id: e.options.generateId(),
    type: "blockquote",
    content: t,
    children: [],
    props: {},
  };
}
function ue(e) {
  let t = e.tokens[e.index].meta?.calloutType ?? "note";
  e.index++;
  let r = [];
  for (; e.index < e.tokens.length && e.tokens[e.index].type === "blockquote"; )
    r.push(e.tokens[e.index].content), e.index++;
  let i = $(
    r.join(`
`)
  );
  return {
    id: e.options.generateId(),
    type: "callout",
    content: i,
    children: [],
    props: { type: t },
  };
}
function de(e) {
  return (
    e.index++,
    {
      id: e.options.generateId(),
      type: "divider",
      content: [],
      children: [],
      props: {},
    }
  );
}
function he(e) {
  let n = [],
    t = [],
    r = [],
    i = !0,
    o = !1;
  for (
    ;
    e.index < e.tokens.length &&
    (e.tokens[e.index].type === "table_row" ||
      e.tokens[e.index].type === "table_separator");

  ) {
    let s = e.tokens[e.index];
    if (s.type === "table_separator") {
      (r = pe(s.content)), (o = !0), e.index++;
      continue;
    }
    let c = s.content
      .split("|")
      .map((l) => l.trim())
      .filter((l) => l !== "");
    i && !o ? ((t = c), (i = !1)) : o && n.push(c), e.index++;
  }
  return (
    !o && t.length > 0 && (n.unshift(t), (t = [])),
    {
      id: e.options.generateId(),
      type: "table",
      content: [],
      children: [],
      props: { headers: t, rows: n, alignments: r.length > 0 ? r : void 0 },
    }
  );
}
function pe(e) {
  return e
    .split("|")
    .map((n) => n.trim())
    .filter((n) => n !== "")
    .map((n) => {
      let t = n.startsWith(":"),
        r = n.endsWith(":");
      return t && r ? "center" : t ? "left" : r ? "right" : null;
    });
}
function fe(e) {
  let n = e.tokens[e.index],
    t = n.content,
    r = n.meta?.language ?? "";
  return (
    e.index++,
    {
      id: e.options.generateId(),
      type: "image",
      content: [],
      children: [],
      props: { url: t, alt: r || void 0 },
    }
  );
}
var ge = {
  classPrefix: "cm-",
  theme: "github",
  linkTarget: "_blank",
  sanitize: !1,
  plugins: [],
  customRenderers: {},
};
function N(e) {
  return {
    ...ge,
    ...e,
    plugins: e?.plugins ?? [],
    customRenderers: e?.customRenderers ?? {},
  };
}
function C(e, n) {
  let t = N(n),
    r = t.classPrefix,
    i = e;
  for (let c of t.plugins) c.transformBlock && (i = i.map(c.transformBlock));
  let o = i.map((c) => {
    for (let a of t.plugins)
      if (a.renderBlock) {
        let u = a.renderBlock(c, () => S(c, t));
        if (u !== null) return u;
      }
    let l = t.customRenderers[c.type];
    return l ? l(c) : S(c, t);
  });
  return `<div class="${r}preview">${o.join(`
`)}</div>`;
}
function qe(e, n) {
  let t = x(e);
  return C(t, n);
}
async function me(e, n) {
  let t = N(n);
  for (let i of t.plugins) i.init && (await i.init());
  let r = C(e, n);
  for (let i of t.plugins) i.postProcess && (r = await i.postProcess(r));
  return r;
}
function S(e, n) {
  let t = n.classPrefix;
  switch (e.type) {
    case "paragraph":
      return `<p class="${t}paragraph">${m(e.content, n)}</p>`;
    case "heading":
      return ke(e, n);
    case "bulletList":
      return $e(e, n);
    case "numberedList":
      return ye(e, n);
    case "checkList":
      return be(e, n);
    case "codeBlock":
      return we(e, n);
    case "blockquote":
      return `<blockquote class="${t}blockquote">${m(
        e.content,
        n
      )}</blockquote>`;
    case "table":
      return xe(e, n);
    case "image":
      return ve(e, n);
    case "divider":
      return `<hr class="${t}divider" />`;
    case "callout":
      return Be(e, n);
    default:
      return `<div class="${t}unknown">${m(e.content, n)}</div>`;
  }
}
function ke(e, n) {
  let t = n.classPrefix,
    r = e.props.level,
    i = `h${r}`,
    o = m(e.content, n);
  return `<${i} class="${t}heading ${t}h${r}">${o}</${i}>`;
}
function $e(e, n) {
  let t = n.classPrefix,
    r = e.children.map((i) => `<li>${m(i.content, n)}</li>`).join(`
`);
  return `<ul class="${t}bullet-list">
${r}
</ul>`;
}
function ye(e, n) {
  let t = n.classPrefix,
    r = e.children.map((i) => `<li>${m(i.content, n)}</li>`).join(`
`);
  return `<ol class="${t}numbered-list">
${r}
</ol>`;
}
function be(e, n) {
  let t = n.classPrefix,
    r = e.props.checked,
    i = r ? "checked disabled" : "disabled",
    o = r ? `${t}checked` : "";
  return `
<div class="${t}checklist-item">
  <input type="checkbox" ${i} />
  <span class="${o}">${m(e.content, n)}</span>
</div>`.trim();
}
function we(e, n) {
  let t = n.classPrefix,
    r = e.content.map((l) => l.text).join(""),
    i = e.props.language || "",
    o = g(r),
    s = i ? ` language-${i}` : "",
    c = i ? ` data-language="${i}"` : "";
  return `<pre class="${t}code-block"${c}><code class="${t}code${s}">${o}</code></pre>`;
}
function xe(e, n) {
  let t = n.classPrefix,
    { headers: r, rows: i, alignments: o } = e.props,
    s = (a) => {
      let u = o?.[a];
      return u ? ` style="text-align: ${u}"` : "";
    },
    c =
      r.length > 0
        ? `<thead><tr>${r
            .map((a, u) => `<th${s(u)}>${g(a)}</th>`)
            .join("")}</tr></thead>`
        : "",
    l = i.map(
      (a) => `<tr>${a.map((u, h) => `<td${s(h)}>${g(u)}</td>`).join("")}</tr>`
    ).join(`
`);
  return `<table class="${t}table">
${c}
<tbody>
${l}
</tbody>
</table>`;
}
function ve(e, n) {
  let t = n.classPrefix,
    { url: r, alt: i, title: o, width: s, height: c } = e.props,
    l = i ? ` alt="${g(i)}"` : ' alt=""',
    a = o ? ` title="${g(o)}"` : "",
    u = s ? ` width="${s}"` : "",
    h = c ? ` height="${c}"` : "",
    p = `<img src="${g(r)}"${l}${a}${u}${h} />`,
    k = i ? `<figcaption>${g(i)}</figcaption>` : "";
  return `<figure class="${t}image">${p}${k}</figure>`;
}
function Be(e, n) {
  let t = n.classPrefix,
    r = e.props.type,
    i = m(e.content, n);
  return `
<div class="${t}callout ${t}callout-${r}" role="alert">
  <strong class="${t}callout-title">${r}</strong>
  <div class="${t}callout-content">${i}</div>
</div>`.trim();
}
function m(e, n) {
  return e.map((t) => _e(t, n)).join("");
}
function _e(e, n) {
  let t = g(e.text),
    r = e.styles;
  if (
    (r.code && (t = `<code>${t}</code>`),
    r.highlight && (t = `<mark>${t}</mark>`),
    r.strikethrough && (t = `<del>${t}</del>`),
    r.underline && (t = `<u>${t}</u>`),
    r.italic && (t = `<em>${t}</em>`),
    r.bold && (t = `<strong>${t}</strong>`),
    r.link)
  ) {
    let i =
        n.linkTarget === "_blank"
          ? ' target="_blank" rel="noopener noreferrer"'
          : "",
      o = r.link.title ? ` title="${g(r.link.title)}"` : "";
    t = `<a href="${g(r.link.url)}"${o}${i}>${t}</a>`;
  }
  return t;
}
function g(e) {
  return e
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
var Ce = { github: "github", githubDark: "github-dark", minimal: "minimal" };
function Ne(e) {
  return `@create-markdown/preview/themes/${Ce[e]}.css`;
}
var Ie = {
    theme: "github-light",
    darkTheme: "github-dark",
    langs: [],
    lineNumbers: !1,
    classPrefix: "cm-",
  },
  M = null,
  v = null;
function Te(e) {
  let n = { ...Ie, ...e };
  return {
    name: "shiki",
    async init() {
      if (!v)
        try {
          let r = (await import("/shiki@>=1.0.0?target=es2022"))
            .createHighlighter;
          if (!r) {
            console.warn(
              "@create-markdown/preview: Shiki module loaded but createHighlighter not found"
            );
            return;
          }
          (M = r({
            themes: [n.theme, n.darkTheme].filter(Boolean),
            langs: [
              "javascript",
              "typescript",
              "jsx",
              "tsx",
              "json",
              "html",
              "css",
              "markdown",
              "python",
              "rust",
              "go",
              "bash",
              "shell",
              ...n.langs,
            ],
          })),
            (v = await M);
        } catch {
          console.warn(
            "@create-markdown/preview: Shiki not available. Install with: npm install shiki"
          );
        }
    },
    renderBlock(t, r) {
      if (t.type !== "codeBlock") return null;
      let i = t,
        o = i.content.map((c) => c.text).join(""),
        s = i.props.language || "text";
      if (!v) return null;
      try {
        let l = v.codeToHtml(o, { lang: s, theme: n.theme }),
          a = n.classPrefix;
        return `<div class="${a}code-block ${a}shiki" data-language="${s}">${l}</div>`;
      } catch {
        return null;
      }
    },
    getCSS() {
      let t = n.classPrefix;
      return `
.${t}shiki pre {
  padding: 16px;
  border-radius: 6px;
  overflow-x: auto;
  margin: 0;
}

.${t}shiki code {
  font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace;
  font-size: 0.875em;
  background: transparent;
  padding: 0;
}

.${t}shiki .line {
  display: inline-block;
  width: 100%;
}

${
  n.lineNumbers
    ? `
.${t}shiki pre {
  counter-reset: line;
}

.${t}shiki .line::before {
  counter-increment: line;
  content: counter(line);
  display: inline-block;
  width: 2em;
  margin-right: 1em;
  text-align: right;
  color: #6e7781;
  user-select: none;
}
`
    : ""
}
`.trim();
    },
  };
}
var He = Te,
  Le = { theme: "default", config: {}, classPrefix: "cm-", useUniqueIds: !0 },
  B = null,
  j = !1,
  D = 0;
function Ee(e) {
  let n = { ...Le, ...e };
  return {
    name: "mermaid",
    async init() {
      if (!j)
        try {
          let t = await import("/mermaid@>=10.0.0?target=es2022");
          (B = t.default || t),
            B.initialize({
              startOnLoad: !1,
              theme: n.theme,
              securityLevel: "loose",
              ...n.config,
            }),
            (j = !0);
        } catch {
          console.warn(
            "@create-markdown/preview: Mermaid not available. Install with: npm install mermaid"
          );
        }
    },
    renderBlock(t, r) {
      if (t.type !== "codeBlock") return null;
      let i = t;
      if (i.props.language?.toLowerCase() !== "mermaid") return null;
      let s = i.content.map((a) => a.text).join(""),
        c = n.classPrefix,
        l = n.useUniqueIds ? `mermaid-${Date.now()}-${++D}` : `mermaid-${++D}`;
      return `
<div class="${c}mermaid-container">
  <pre class="${c}mermaid" id="${l}">${Ae(s)}</pre>
</div>`.trim();
    },
    async postProcess(t) {
      if (!B) return t;
      try {
        let r = B,
          i = n.classPrefix,
          o = new RegExp(
            `<pre class="${i}mermaid" id="([^"]+)">([\\s\\S]*?)</pre>`,
            "g"
          ),
          s = [...t.matchAll(o)];
        for (let c of s) {
          let [l, a, u] = c,
            h = Pe(u);
          try {
            let { svg: p } = await r.render(a, h);
            t = t.replace(l, `<div class="${i}mermaid-diagram">${p}</div>`);
          } catch (p) {
            console.warn(`Failed to render Mermaid diagram: ${p}`);
          }
        }
      } catch (r) {
        console.warn("Mermaid post-processing failed:", r);
      }
      return t;
    },
    getCSS() {
      let t = n.classPrefix;
      return `
.${t}mermaid-container {
  margin-bottom: 16px;
  overflow-x: auto;
}

.${t}mermaid {
  background-color: transparent;
  text-align: center;
}

.${t}mermaid-diagram {
  display: flex;
  justify-content: center;
  padding: 16px;
  background-color: #f6f8fa;
  border-radius: 6px;
}

.${t}mermaid-diagram svg {
  max-width: 100%;
  height: auto;
}

/* Dark theme adjustments */
@media (prefers-color-scheme: dark) {
  .${t}mermaid-diagram {
    background-color: #161b22;
  }
}
`.trim();
    },
  };
}
var Re = Ee;
function Ae(e) {
  return e
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
function Pe(e) {
  return e
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'");
}
var _ = class extends HTMLElement {
    shadow;
    plugins;
    defaultTheme;
    styleElement;
    contentElement;
    static get observedAttributes() {
      return ["theme", "link-target", "async"];
    }
    constructor() {
      super(),
        (this.shadow = this.attachShadow({ mode: "open" })),
        (this.plugins = []),
        (this.defaultTheme = "github"),
        (this.styleElement = document.createElement("style")),
        this.shadow.appendChild(this.styleElement),
        (this.contentElement = document.createElement("div")),
        (this.contentElement.className = "markdown-preview-content"),
        this.shadow.appendChild(this.contentElement),
        this.updateStyles();
    }
    connectedCallback() {
      this.render();
    }
    attributeChangedCallback(n, t, r) {
      this.render();
    }
    setPlugins(n) {
      (this.plugins = n), this.render();
    }
    setDefaultTheme(n) {
      (this.defaultTheme = n), this.render();
    }
    getMarkdown() {
      let n = this.getAttribute("blocks");
      if (n)
        try {
          return JSON.parse(n).map((r) => r.content.map((i) => i.text).join(""))
            .join(`

`);
        } catch {
          return "";
        }
      return this.textContent || "";
    }
    setMarkdown(n) {
      (this.textContent = n), this.render();
    }
    setBlocks(n) {
      this.setAttribute("blocks", JSON.stringify(n)), this.render();
    }
    getOptions() {
      let n = this.getAttribute("theme") || this.defaultTheme,
        t = this.getAttribute("link-target") || "_blank";
      return { theme: n, linkTarget: t, plugins: this.plugins };
    }
    getBlocks() {
      let n = this.getAttribute("blocks");
      if (n)
        try {
          return JSON.parse(n);
        } catch {
          return (
            console.warn("Invalid blocks JSON in markdown-preview element"), []
          );
        }
      let t = this.textContent || "";
      return x(t);
    }
    async render() {
      let n = this.getBlocks(),
        t = this.getOptions(),
        r = this.hasAttribute("async") || this.plugins.length > 0;
      try {
        let i;
        r ? (i = await me(n, t)) : (i = C(n, t)),
          (this.contentElement.innerHTML = i);
      } catch (i) {
        console.error("Error rendering markdown preview:", i),
          (this.contentElement.innerHTML =
            '<div class="error">Error rendering content</div>');
      }
    }
    updateStyles() {
      let n = this.plugins.filter((t) => t.getCSS).map((t) => t.getCSS()).join(`

`);
      this.styleElement.textContent = `
:host {
  display: block;
}

.markdown-preview-content {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif;
  font-size: 16px;
  line-height: 1.6;
}

.error {
  color: #cf222e;
  padding: 1rem;
  background: #ffebe9;
  border-radius: 6px;
}

${n}
    `.trim();
    }
  },
  O = [],
  q = "github";
function Se(e) {
  let n = e?.tagName || "markdown-preview",
    t = e?.plugins || [],
    r = e?.defaultTheme || "github";
  if (((O = t), (q = r), !customElements.get(n))) {
    class i extends _ {
      constructor() {
        super(), this.setPlugins(O), this.setDefaultTheme(q);
      }
    }
    customElements.define(n, i);
  }
}
function Fe() {
  typeof window < "u" && typeof customElements < "u" && Se();
}
var Ue = "0.1.0";
export {
  _ as MarkdownPreviewElement,
  Ue as VERSION,
  Fe as autoRegister,
  C as blocksToHTML,
  Re as createMermaidPlugin,
  He as createShikiPlugin,
  Ne as getThemePath,
  qe as markdownToHTML,
  Ee as mermaidPlugin,
  Se as registerPreviewElement,
  me as renderAsync,
  Te as shikiPlugin,
  Ce as themes,
};
//# sourceMappingURL=preview.bundle.mjs.map
