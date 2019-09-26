# Monocular

Monocular 是用于管理 Helm Charts 的 Web UI，通过 Monocular 你从多个存储库中查找可用的 charts，并一键部署到 Kubernetes 集群。

## 部署

### Requirement

要求：先部署 Nginx Ingress Controller

```bash
# 需要先安装 Helm 、Tiller 和 Nginx ingress controller
$ helm install stable/nginx-ingress --set controller.hostNetwork=true
```

### Monocular

```bash
$ helm repo add monocular https://kubernetes-helm.github.io/monocular

# 添加命名空间并创建 ceph secret
$ kubectl create namespace helm
$ cat <<EOF | kubectl -n helm apply -f -
apiVersion: v1
kind: Secret
metadata:
  name: ceph-secret-kube
type: kubernetes.io/rbd
data:
  key: QVFCRkNGOWErZExhSEJBQTR5S3FJaE1Zb1Q0RG1BV25HMDhYRkE9PQ==
EOF

# 部署 monocular 到 helm 命名空间，默认连接 kube-system 命名空间的 tiller
$ helm install monocular/monocular --name monocular --namespace helm

# 如果 tiller 不在 kube-system 命名空间
$ helm install monocular/monocular --name monocular --namespace helm --set api.config.tillerNamespace=YOUR_NAMESPACE

# 验证
$ kubectl -n helm get all,ing
```

* 配置 charts 仓库

```bash
$ cat > custom-repos.yaml <<<EOF
api:
  config:
    repos:
      - name: stable
        url: http://storage.googleapis.com/kubernetes-charts
        source: https://github.com/kubernetes/charts/tree/master/stable
      - name: incubator
        url: http://storage.googleapis.com/kubernetes-charts-incubator
        source: https://github.com/kubernetes/charts/tree/master/incubator
      - name: monocular
        url: https://kubernetes-helm.github.io/monocular
        source: https://github.com/kubernetes-helm/monocular/tree/master/charts
EOF

$ helm install monocular/monocular -f custom-repos.yaml
```

* 配置 Ingress 域名

```bash
$ cat > custom-domains.yaml <<<EOF
ingress:
  hosts:
  - monocular.local
EOF

$ helm install monocular/monocular -f custom-domains.yaml
```

## 卸载

```bash
$ helm delete monocular
```
