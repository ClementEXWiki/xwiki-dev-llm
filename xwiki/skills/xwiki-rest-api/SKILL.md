---
name: xwiki-rest-api
description: Read from and write to a running XWiki instance over its REST API — get a page's content and its xobjects, update page content or object properties, create a new page (optionally with xobjects), and search pages with a Solr query. Use when the user wants to fetch/modify/create wiki pages or objects on a live XWiki (not the XAR source files on disk — for those use xwiki-xar-pages), or to run a Solr search via REST. For deploying a built XAR/JAR extension via the job REST API use xwiki-deploy-extension instead.
---

Interact with a running XWiki over its REST API using `curl`.

## Fundamentals

- **Base URL:** `http://<host>:<port>/xwiki/rest` — for local dev this is
  `http://localhost:8080/xwiki/rest`. If XWiki is deployed as the root webapp (e.g. the official
  Docker image), the `/xwiki` context is dropped: `http://<host>:<port>/rest`.
- **Auth:** HTTP Basic — `curl -u Admin:admin ...`. With no credentials you act as `XWiki.Guest`
  (read-only on public pages; writes get `401`). Always authenticate for write operations.
- **Format:** responses are XML by default. Ask for JSON with `?media=json` on the URL **or** an
  `Accept: application/json` header. Send bodies with `-H "Content-Type: application/xml"` (or
  `application/x-www-form-urlencoded`).
- **Reference identifiers, not URLs, for reasoning:** a page reference like `Sandbox.WebHome` maps
  to path segments — see nested spaces below.
- **Nested spaces (important):** each space is its own `/spaces/{name}` segment. The page reference
  `A.B.C` is `spaces/A/spaces/B/pages/C`. In XWiki's nested model a "page" `A.B` is usually stored as
  `A.B.WebHome`, i.e. `spaces/A/spaces/B/pages/WebHome`. When unsure whether a page is terminal or
  nested, GET the space's pages list or try `.../pages/WebHome`.
- Response headers include `xwiki-version` (WAR version) and `xwiki-user` (the resolved user, absent
  for guest) — handy to confirm you authenticated as expected. Add `-i` to `curl` to see them.

Path template used throughout (with `{S}` standing for the possibly-repeated `/spaces/{name}`
segments):

```
http://localhost:8080/xwiki/rest/wikis/{wiki}{S}/pages/{page}
```

`{wiki}` is normally `xwiki` on a default install.

## 1. Get page content (including xobjects)

Page (title, content, syntax, version, author…):

```
curl -s -u Admin:admin \
  "http://localhost:8080/xwiki/rest/wikis/xwiki/spaces/Sandbox/pages/WebHome?media=json"
```

All objects attached to the page:

```
curl -s -u Admin:admin \
  "http://localhost:8080/xwiki/rest/wikis/xwiki/spaces/Sandbox/pages/WebHome/objects?media=json"
```

One specific object (by class + number, usually `0` for the first) and its properties:

```
curl -s -u Admin:admin \
  ".../pages/WebHome/objects/XWiki.TestClass/0?media=json"
curl -s -u Admin:admin \
  ".../pages/WebHome/objects/XWiki.TestClass/0/properties?media=json"
```

A single property value: append `/properties/{propertyName}`.

## 2. Write page changes (content, title) — update an existing page

PUT to the page URL. Three body formats are accepted; pick the simplest that fits.

Only the content (quickest), `text/plain`:

```
curl -s -u Admin:admin -X PUT \
  -H "Content-Type: text/plain" \
  --data-binary "New page content in {{/}} wiki syntax" \
  "http://localhost:8080/xwiki/rest/wikis/xwiki/spaces/Sandbox/pages/WebHome"
```

Title + content together, `application/x-www-form-urlencoded` (allowed fields: `title`, `parent`,
`content`):

```
curl -s -u Admin:admin -X PUT \
  --data-urlencode "title=Hello world" \
  --data-urlencode "content=This is **bold**." \
  "http://localhost:8080/xwiki/rest/wikis/xwiki/spaces/Sandbox/pages/WebHome"
```

Full control, `application/xml` — send a `<page>` element (only include the fields you want to set):

```xml
<page xmlns="http://www.xwiki.org">
  <title>Hello world</title>
  <syntax>xwiki/2.1</syntax>
  <content>This is a new page</content>
</page>
```

```
curl -s -u Admin:admin -X PUT -H "Content-Type: application/xml" \
  --data-binary "@page.xml" \
  "http://localhost:8080/xwiki/rest/wikis/xwiki/spaces/Sandbox/pages/WebHome"
```

Returns `201` if the page was created, `202` if updated, `304` if unchanged. Add
`?minorRevision=true` to record a minor version instead of a major one.

### Change xobject properties

Update all given properties of an existing object (PUT the object URL, form-encoded):

```
curl -s -u Admin:admin -X PUT \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "property#text=Updated value" \
  ".../pages/WebHome/objects/XWiki.TestClass/0"
```

Update a single property (PUT its property URL):

```
curl -s -u Admin:admin -X PUT \
  --data-urlencode "property#text=Updated value" \
  ".../pages/WebHome/objects/XWiki.TestClass/0/properties/text"
```

Delete an object with `-X DELETE` on the object URL (`204` on success).

## 3. Create a new page (optionally with xobjects)

Creating a page is the same PUT as updating one — PUT to a URL that does not yet exist. Any missing
parent spaces are created automatically.

```
curl -s -u Admin:admin -X PUT -H "Content-Type: application/xml" \
  --data-binary "@page.xml" \
  "http://localhost:8080/xwiki/rest/wikis/xwiki/spaces/Sandbox/spaces/New/pages/WebHome"
```

Then add one or more objects by POSTing to the page's `objects` collection.

Form-encoded (concise) — `className` plus `property#name=value` pairs:

```
curl -s -u Admin:admin -X POST \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "className=XWiki.TestClass" \
  --data-urlencode "property#text=Whatever you want" \
  ".../spaces/New/pages/WebHome/objects"
```

Or XML — POST an `<object>` element:

```xml
<object xmlns="http://www.xwiki.org">
  <className>XWiki.TestClass</className>
  <property name="text">
    <value>Whatever you want to put here</value>
  </property>
</object>
```

```
curl -s -u Admin:admin -X POST -H "Content-Type: application/xml" \
  --data-binary "@object.xml" \
  ".../spaces/New/pages/WebHome/objects"
```

`201` on creation; the `Location` response header holds the new object's URI (including its assigned
object number). Only the class's own properties are settable — the class must already exist.

## 4. Search pages with a Solr query

Query a single wiki (Solr is the default and only-by-default type since 17.10.5+ / 18.2.0+):

```
curl -s -u Admin:admin \
  "http://localhost:8080/xwiki/rest/wikis/xwiki/query?q=Sandbox&type=solr&number=10&media=json"
```

Useful parameters: `type={solr,hql,xwql,lucene}` (non-Solr types must be enabled via
`rest.allowedQueryTypes` in `xwiki.properties`), `number=n` (page size), `start=n` (offset),
`order={asc,desc}`, `prettyNames={true,false}`.

The `q` value is a Solr query. Filter by field, e.g. restrict to the Sandbox space and title text:

```
q=title:hello AND space:Sandbox
```

Search across several wikis at once with the root query resource and a `wikis` list:

```
curl -s -u Admin:admin \
  "http://localhost:8080/xwiki/rest/wikis/query?q=hello&wikis=xwiki,subwiki&number=10&media=json"
```

Results come back as `searchResults`/`searchResult` entries, each with the page's reference, title
and a link to its REST resource — feed that link back into use case 1 to fetch full content.

## Notes

- URL-encode reserved characters in page/space names (a space name with a dot, `/`, space, etc.).
  `curl --data-urlencode` handles bodies; encode path segments yourself.
- On a write failure, add `-i` and read the status line and `xwiki-user` header — a `401` almost
  always means you posted as guest (wrong/missing `-u`), a `403` means the authenticated user lacks
  edit rights on that page.
- The XML representations conform to the [REST model XSD](https://github.com/xwiki/xwiki-platform/blob/master/xwiki-platform-core/xwiki-platform-rest/xwiki-platform-rest-model/src/main/resources/xwiki.rest.model.xsd);
  full endpoint reference: https://www.xwiki.org/xwiki/bin/view/Documentation/UserGuide/Features/XWikiRESTfulAPI
