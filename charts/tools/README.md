# Tools Helm chart

Deploys [Tools](https://github.com/m-mattia-m/tools), a collection of browser-only developer tools, as a static site served by nginx. The container runs as a non-root user on port 8080 and keeps no state, so there is nothing to back up.

Rendered docs: <https://m-mattia-m.github.io/tools>

## Install

From the OCI registry on GHCR:

```bash
helm install tools oci://ghcr.io/m-mattia-m/charts/tools --version 0.1.0
```

From the Helm repository on GitHub Pages:

```bash
helm repo add tools https://m-mattia-m.github.io/tools
helm repo update
helm install tools tools/tools
```

Only download the chart:

```bash
helm pull oci://ghcr.io/m-mattia-m/charts/tools --version 0.1.0
```

Try it without an Ingress:

```bash
kubectl port-forward svc/tools 8080:80
```

## Ingress example

```yaml
ingress:
  enabled: true
  className: nginx
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt
  hosts:
    - host: tools.example.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: tools-tls
      hosts:
        - tools.example.com
```

```bash
helm upgrade --install tools oci://ghcr.io/m-mattia-m/charts/tools -f values.yaml
```

## Values

| Key | Default | Description |
| --- | --- | --- |
| `replicaCount` | `1` | Number of pods (ignored when autoscaling is enabled) |
| `image.repository` | `ghcr.io/m-mattia-m/tools` | Container image |
| `image.tag` | `""` | Image tag; defaults to the chart `appVersion` (`latest`) |
| `image.pullPolicy` | `IfNotPresent` | Image pull policy |
| `imagePullSecrets` | `[]` | Secrets for pulling from a private registry |
| `nameOverride` / `fullnameOverride` | `""` | Override resource names |
| `serviceAccount.create` | `true` | Create a service account |
| `serviceAccount.automount` | `false` | Mount the API token into the pods |
| `serviceAccount.annotations` | `{}` | Service account annotations |
| `serviceAccount.name` | `""` | Custom service account name |
| `podAnnotations` / `podLabels` | `{}` | Extra pod metadata |
| `podSecurityContext` | non-root (uid/gid 101), seccomp `RuntimeDefault` | Pod security context |
| `securityContext` | no privilege escalation, drop `ALL` | Container security context |
| `service.type` | `ClusterIP` | Service type |
| `service.port` | `80` | Service port (forwards to container port 8080) |
| `ingress.enabled` | `false` | Create an Ingress |
| `ingress.className` | `""` | Ingress class |
| `ingress.annotations` | `{}` | Ingress annotations |
| `ingress.hosts` | `tools.example.com` | Hosts and paths |
| `ingress.tls` | `[]` | TLS configuration |
| `resources` | `{}` | CPU / memory requests and limits |
| `livenessProbe` / `readinessProbe` | HTTP GET `/` | Probes |
| `autoscaling.enabled` | `false` | Create a HorizontalPodAutoscaler |
| `autoscaling.minReplicas` / `maxReplicas` | `1` / `5` | Replica range |
| `autoscaling.targetCPUUtilizationPercentage` | `80` | CPU target |
| `nodeSelector` / `tolerations` / `affinity` | `{}` / `[]` / `{}` | Scheduling |

## Versioning

The chart is published on every push to `main` that touches `charts/`. Bump `version` in `Chart.yaml` for each release; the `latest` image tag is used until you pin `image.tag`.
