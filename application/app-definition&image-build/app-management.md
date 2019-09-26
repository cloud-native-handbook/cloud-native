# 应用管理

Helm - 管理无状态、非 HA 应用
Exporter - 管理有状态、HA 应用

> 在 Helm chart 的 stable 仓库里面，很多数据库的 chart 其实是单节点的，因为分布式的数据库做起来会较为麻烦。

## Idea

* 实现一个 namespace-exporter；当创建一个 Namespace 时自动创建其他资源对象
* 实现一个 helm-exporter 来管理 Helm APP

```yaml
apiVersion: v1
kind: crd
metadata:
  name: namespace-exporter
  namespace: kube-system
spec:
  templates:
  - namespaces: ["*"]
    object:
      apiVersion: v1
      kind: Secret
      metadata:
        name: ceph-secret-kube
      type: ceph.com/rbd
      data:
        key: QVFCRkNGOWErZExhSEJBQTR5S3FJaE1Zb1Q0RG1BV25HMDhYRkE9PQ==
  - namespaces: ["dev-.*"] # 作用于哪些命名空间，支持正则表达式
    object:
      ...
```

```yaml
# 参考 Kind: List
apiVersion: v1
kind: NamespaceExporter # nse
metadata:
  name: ns-exporter
  namespace: kube-system
items:
# v1.12 以下的版本可能需要
- apiVersion: v1
  kind: Secret
  metadata:
    name: ceph-secret-kube
    annotations:
      namespaces.ns-exporter.io: ["*"]
      allow-delete.ns-exporter.io: [true|false]
  type: ceph.com/rbd
  data:
    key: QVFCRkNGOWErZExhSEJBQTR5S3FJaE1Zb1Q0RG1BV25HMDhYRkE9PQ==
- apiVersion: v1
  kind: Secret
  metadata:
    name: registry-account
    annotations:
      namespaces.ns-exporter.io: ["dev-.*"]
      allow-delete.ns-exporter.io: [true|false] # 如果修改的话会立即更新，如果删除的话可以选择是否删除
  type: ceph.com/rbd
  data: # 待检查
    docker-server: cmVnaXN0cnkua3ViZS1yZWdpc3RyeS5zdmMuY2x1c3Rlci5sb2NhbAo=
    docker-username: Z3Vlc3QK
    docker-password: Z3Vlc3QK
    docker-email: jinsyin@gmail.com
- apiVersion:
  kind: ServiceAccount
  metadata:
    name: spark
    annotations:
      namespaces.ns-exporter.io: ["bigdata-.*", alice", "bob"]
# 资源配额
- apiVersion: v1
  kind: ResourceQuota
  metadata:
    name: quota
    annotations:
      namespaces.ns-exporter.io: ["*"]
  spec:
    hard:
      requests.cpu: "4"
      requests.memory: "8Gi"
      limits.cpu: "5"
      limits.memory: "10Gi"
      pods: "50"
      resourcequotas: "0"
      services.loadbalancers: "0"
      services.nodeports: "0"
      requests.storage: "50Gi"
      persistentvolumeclaims: "20"
- apiVersion: v1
  kind: LimitRange
  metadata:
    name: limit
    annotations:
      namespaces.ns-exporter.io: ["*"]
  spec:
    limits:
    - type: Container
      defaultRequest:
        cpu: 50m
        memory: 64Mi
      default:
        cpu: 100m
        memory: 100Mi
      min:
        cpu: 10m
        memory: 32Mi
      max:
        cpu: 1000m
        memory: 1Gi
```

还有一种方法是获取其他命名空间的资源对象，然后 COPY 一份，看看能不能实现。

```yaml
# 参考 kustomize
apiVersion: v1
kind: crd
metadata:
  name: namespace-exporter
  namespace: kube-system
spec:
  templates:
  - ceph-secret-kube.yaml
  - registry-account.yaml
```

## 参考

* [基于 Helm 和 Operator 的 K8S 应用管理的分享](http://blog.51cto.com/12462495/2084517)
* [Draft vs Gitkube vs Helm vs Ksonnet vs Metaparticle vs Skaffold](https://blog.fleeto.us/post/draft-vs-gitkube-vs-helm-vs-ksonnet-vs-metaparticle-vs-skaffold/)JJJ
