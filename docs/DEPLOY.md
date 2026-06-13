# Deploying STARWEFT

STARWEFT is live at **[star.subsurfaces.net](https://star.subsurfaces.net)**.

## Hosting shape

- **Host:** Cloudflare (a **Worker** with static assets — service name
  `starweft`, *not* a classic Pages project). Account: **Sub-Surface**.
- **DNS:** Cloudflare manages the `subsurfaces.net` zone. Registrar is Porkbun;
  nameservers point at Cloudflare. `star.subsurfaces.net` is a proxied custom
  domain bound to the `starweft` Worker (auto-created CNAME).
- **Source of truth:** GitHub `sub-surface/starweft`, branch `main`. The Worker
  is **Git-connected** — there is no separate build, because the site is already
  static (flat `index.html` + `style.css` + `js/`).
- **The digital garden** (`subsurfaces.net`) is a *separate* Worker
  (`digital-garden-v2`, Quartz 4). It shares the account and DNS zone but
  nothing else. Never touch it when deploying STARWEFT.

## Push-to-prod flow

Every push to `main` redeploys automatically. The discipline:

1. **Test green, both suites** (Node is not on PATH — use the full path):

   ```
   "C:\Program Files\nodejs\node.exe" test\smoke.js
   "C:\Program Files\nodejs\node.exe" test\browser_boot.js
   ```

2. **Branch if needed, commit, push:**

   ```
   git add -A
   git commit -m "…"          # end with the Co-Authored-By trailer
   git push origin main
   ```

3. **Verify the live deploy** (takes ~30–60s after push). Confirm the edge is
   serving the new commit, not a cached old one:

   ```
   # any changed file works; check one you just edited
   curl -sI https://star.subsurfaces.net            # 200, Server: cloudflare
   curl -s  https://star.subsurfaces.net/js/<file>  # grep for the new code
   ```

   Branches other than `main` get their own preview URLs from Cloudflare — use
   those to eyeball a change before merging to `main`.

## Managing the deploy from the CLI

`wrangler` is installed locally
(`C:\Users\Leon\AppData\Roaming\npm\wrangler.cmd`). Auth via a scoped
`CLOUDFLARE_API_TOKEN` (Workers + Pages + DNS edit on the `subsurfaces.net`
zone); `wrangler login`'s browser flow can't run headlessly. With the token set:

```
wrangler whoami                       # confirm account Sub-Surface
wrangler deployments list             # recent deploys of the starweft Worker
wrangler tail starweft                # live logs
```

## Rollback

In the Cloudflare dashboard → Workers & Pages → `starweft` → Deployments, any
prior deployment can be promoted back to production. Or `git revert` the bad
commit and push — the auto-deploy ships the revert.

## First-time setup (already done, for reference)

Created via the dashboard: Workers & Pages → Create → Connect to Git →
`sub-surface/starweft` @ `main`, framework **None**, no build command, output
`/`. Then Custom Domains → `star.subsurfaces.net` → auto-add the CNAME.
