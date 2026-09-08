# hypertag — API reference

Every function takes an HTML (or, for `hypertag/ld`, a JSON-LD-bearing HTML) **string you already have**. Nothing fetches. For the guided tour, examples, and benchmarks, see the [README](../README.md). TypeScript types ship in the package for all of these.

## `hypertag`

**`parse(source, tags, options?, cache?)` → `Tag[]`**
The core. Scans `source` once and returns every matching tag as a plain object.
- `source` *(string)* — the HTML to scan.
- `tags` *(string | string[])* — tag name(s) to match; `'*'` matches every tag.
- `options` *(object, optional)* — `tagKey` (key for the tag name, default `'$tag'`), `content` (also capture element content, default `false`), `contentKey` (key for that content, default `'$content'`).
- `cache` *(Map, optional)* — a caller-owned memo; identical parses of the same `source` are returned from it. Create one per operation and thread it through; it holds no shared state, so concurrent async operations never mix.
- **Returns** an array of tags. Each attribute is its string value, or `true` when valueless; the tag name is under `tagKey`; with `content`, the element's content is under `contentKey`.

**`parseAttrs(tagText, tagKey?)` → `Tag | undefined`** — parse a single tag's text (e.g. `'<meta name=x>'`) into an attribute object; `undefined` if it isn't a tag.
**`stripComments(html)` → `string`** — remove `<!-- … -->` comments.
**`extend(tags, options?)` → `(source) => Tag[]`** — a parser pre-bound to `tags`/`options`.

## `hypertag/select`

**`select(source, selector, options?)` → `Tag[]`** — compile `selector` and run it against `source`.
- `selector` *(string)* — a tag plus attribute clauses (`link[rel=alternate]`), or a comma-separated list. Matching is case-insensitive; append `s` to a clause to force case-sensitive.
- `options` — same as `parse`.

**`select.compile(selector, options?)` → `(source) => Tag[]`** — compile once, reuse across pages.

**Operators.** A selector is a tag name (`link`, `*`, or omitted = `*`) plus any number of AND-combined attribute clauses:

| clause | matches |
| --- | --- |
| `[a]` | attribute present (valueless or empty counts) |
| `[a=v]` | value equals `v` |
| `[a!=v]` | value differs from `v`, or the attribute is absent |
| `[a^=v]` | value starts with `v` |
| `[a$=v]` | value ends with `v` |
| `[a*=v]` | value contains `v` |
| `[a~=v]` | `v` is one of the whitespace-separated words in the value |
| `[a\|=v]` | value equals `v` or starts with `v-` (`en` matches `en-GB`) |

Values may be unquoted, `'single'`, or `"double"` (the three are equivalent; unquoted is matched a little more loosely than a strict CSS tokenizer, so `[property=og:image]` is accepted without quotes). A comma-separated **selector list** unions its groups and returns matches in document order (`a[x], b[y]`). Matching is **case-insensitive by default** (name and value); append the CSS Level 4 **`s` flag** to a clause to force case-sensitive (`link[href=Logo.PNG s]`). Combinators (` `, `>`, `+`) and `.class`/`#id` shorthands are unsupported – hypertag builds no tree – and throw a `TypeError`.

**`pick(source, sources, options?)` → `string | Tag | undefined`** — the first usable value across `sources`, in preference order.
- `sources` *(Array)* — each entry is a selector string, or a `[selector, attr]` pair. A bare selector reads `options.attr`; reading `'$content'` gets element text.
- `options.attr` *(string)* — default attribute for bare-selector entries.
- **Returns** the first present, non-empty value (or the matched `Tag` when no attribute is named); `undefined` if nothing matches. `pick.compile(sources, options?)` bakes it.

**Presets** — `og`, `twitter`, `icons`, `canonical`, `stylesheets`, `alternates`, `title`, `jsonld`, each `(source) => Tag[]`.

## `hypertag/sanitize`

**`sanitize(value, options?)` → same shape as `value`** — decode entities, collapse horizontal whitespace (line breaks kept), trim.
- `value` *(string | Tag | Tag[])* — booleans and other non-strings pass through unchanged; nullish returns nullish.
- `options.decode` *(function, optional)* — a full decoder to swap in for the built-in (e.g. `entities.decodeHTML`).

**`decode(text)` → `string`** — decode HTML character references (numeric + Windows-1252 remap + common named set).
**`cleanUrl(url, base?)` → `string`** — resolve `url` against `base` and strip credentials, `utm_*` params, and `#:~:text=` fragments. Returns the input unchanged if it isn't a parseable URL; nullish passes through.

## `hypertag/ld`

**`ld(source)` → `object[]`** — parse every JSON-LD `<script>` block (and each `@graph`) into a flat list of objects; invalid blocks are skipped.
**`pick(graph, ...keys)` → `unknown`** — first present value in `graph` for any of `keys`.
**`asName(value)` / `asUrl(value)` → `unknown`** — coerce JSON-LD's `{name}` / `{url}`-or-array shapes to a string.

## `hypertag/meta`

**`metadata(source, url?, rules?)` → `{ title, description, image, url, icon, author, date, publisher }`** — the batteries-included extractor. With no `rules` it uses the default set and adds a best-effort `icon`; pass `rules` to run the pure engine (your fields, no `icon`).
- `url` *(string, optional)* — the page URL, used as the base for resolving relative URL fields and the `/favicon.ico` fallback.

**`extract(source, url, rules)` → `object`** — the domain-agnostic engine. `rules` maps each field to `{ <normalizer>: [ ...sources ] }`, where `<normalizer>` is `text` / `url` / `raw` and each source is a helper below. `extract.compile(rules)` bakes it for reuse.

**Source helpers** (all variadic; arguments are preference order):
- `meta(...keys)` — a meta value under `property` **or** `name`, read from `content`.
- `link(...rels)` — a link's `href` by `rel` word.
- `content(...tags)` — an element's text content.
- `ld(...keys)` / `ldName(...keys)` / `ldUrl(...keys)` — a JSON-LD value, optionally coerced to a name or a URL.

**`favicons(source, url?)` → `Icon[]`** — every `<link rel*=icon>` resolved against `url` and ranked best-first (SVG / `sizes="any"`, then largest raster, then apple-touch-icon; `mask-icon` and hrefless links dropped). `Icon` is `{ url, rel, sizes, type }`.
**`favicon(source, url?)` → `string | null`** — the single best icon URL, or `/favicon.ico` at the origin when none is declared, or `null` when there is nothing and no `url`.
**`rules`** — the default (overridable) rules object.

## `hypertag/fetch`

The one entry point that touches the network — a thin convenience wrapper so "URL in, card out" is a single call. Everything else takes HTML you already have.

**`fromUrl(url, options?)` → `Promise<Metadata>`** — fetch `url` with the runtime's native `fetch` (Node 18+, Deno, Bun, edge) and run `metadata()` on the response body.
- `options.fetch` *(function, optional)* — a `fetch` implementation to use instead of the global one.
- `options.rules` *(Rules, optional)* — a custom metadata rules table, forwarded to `metadata()`.
- any other `options` key passes through to `fetch` as request init (`headers`, `signal`, `method`, …); `redirect` defaults to `'follow'`.
- **Returns** the metadata card, resolved against the response's final (post-redirect) URL. Throws `TypeError` if no `fetch` is available.

Deliberately thin, and honest about its limits: the body is read as **UTF-8** (`res.text()`), and it applies **no SSRF policy**. For non-UTF-8 pages or untrusted URLs, pass an `options.fetch` that handles decoding or validates the target — the network's hard parts stay yours, by design.
