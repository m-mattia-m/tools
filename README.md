# Tools

[![Docker image](https://github.com/m-mattia-m/tools/actions/workflows/docker.yml/badge.svg)](https://github.com/m-mattia-m/tools/actions/workflows/docker.yml)
[![Helm chart](https://github.com/m-mattia-m/tools/actions/workflows/helm-chart.yml/badge.svg)](https://github.com/m-mattia-m/tools/actions/workflows/helm-chart.yml)

A collection of small developer tools that run **entirely in your browser**. Nothing is uploaded and nothing is stored. Built with Nuxt 4 and Nuxt UI.

Hosted docs and Helm repository: <https://m-mattia-m.github.io/tools>

## Features

- **Searchable index:** tiles with title and tags, a search field, tag filters and sorting. The index is generated from the pages themselves, so there is no list to maintain.
- **Security & crypto:** JWT parser, JWT builder & verifier, AES encrypt/decrypt, RSA key pairs, password / API-key / UUID / OTP generators, Basic auth.
- **Encoding & data:** Base64, file ⇄ Base64, URL encode/decode, JSON and YAML formatters, JSON minifier, YAML ⇄ JSON, JSON and text diff.
- **Web & network:** QR codes (text, Wi-Fi, contact, email, SMS, phone), DNS checker, IP location, ping (HTTP latency), keycode info, Markdown preview (CommonMark, GitHub, GitLab).
- **Text, time & math:** case converter, text statistics, lorem ipsum, cron generator, time zone calculator, expiry / timestamp converter, math evaluator, Mitternachtsformel, 3-Satz-Rechner, color picker, image compressor.
- **Self-hostable:** a tiny non-root nginx image and a Helm chart.

## Quick start

### Docker

```bash
docker run --rm -p 8080:8080 ghcr.io/m-mattia-m/tools:latest
```

Open <http://localhost:8080>.

### Kubernetes (Helm)

```bash
helm install tools oci://ghcr.io/m-mattia-m/charts/tools
kubectl port-forward svc/tools 8080:80
```

Or add it as a classic Helm repository:

```bash
helm repo add tools https://m-mattia-m.github.io/tools
helm install tools tools/tools
```

See the [chart documentation](charts/tools/README.md) for all values, including an Ingress example.

### Local development

```bash
npm install
npm run dev        # http://localhost:3000
npm run generate   # static build in .output/public
```

## Adding a tool

Create `app/pages/tools/<name>.vue` and declare its metadata. A page with `tags` shows up on the index automatically:

```vue
<script setup lang="ts">
definePageMeta({
  title: 'My Tool',
  description: 'What it does',
  icon: 'i-lucide-wrench',
  tags: ['example']
})
</script>
```

## Docs

- [Helm chart](charts/tools/README.md) · [rendered version](https://m-mattia-m.github.io/tools)
- Container image: `ghcr.io/m-mattia-m/tools` (built by [`docker.yml`](.github/workflows/docker.yml))
- Helm chart: `oci://ghcr.io/m-mattia-m/charts/tools` (published by [`helm-chart.yml`](.github/workflows/helm-chart.yml))

## Releasing the chart

1. Bump `version` in `charts/tools/Chart.yaml`.
2. Push to `main`. The workflow lints, packages and pushes the chart to GHCR, then publishes the Helm repository and docs to GitHub Pages.

One-time setup: in the repository settings, set **Pages → Source** to *GitHub Actions*, and make the `tools` and `charts/tools` packages public if others should be able to pull them without logging in.
