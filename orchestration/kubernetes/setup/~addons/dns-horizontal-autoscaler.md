# DNS Horizontal Autoscaler

`DNS Horizontal Autoscaler` 可以为 Kubernetes 集群中的 DNS 服务启用水平自动扩容、缩容功能。其中，`kube-dns-autoscaler` Deployment 会从 apiserver 中收集集群状态，并根据需求水平扩展 DNS 服务的数量。另外，可以通过修改 `kube-system` Namespace 中的 `kube-dns-autoscaler` ConfigMap 来调整 autoscaling 参数。该插件是基于社区的 [kubernetes-incubator/cluster-proportional-autoscaler](https://github.com/kubernetes-incubator/cluster-proportional-autoscaler/) 来实现的。


## RBAC

* kube-dns

```bash
$ wget -O kube-dns-horizontal-autoscaler-rbac.yaml https://raw.githubusercontent.com/kubernetes/kubernetes/release-1.8/cluster/addons/dns-horizontal-autoscaler/dns-horizontal-autoscaler-rbac.yaml

# 部署 rbac
$ kubectl apply -f kube-dns-horizontal-autoscaler-rbac.yaml
```

* coredns

```bash
$ wget -O coredns-horizontal-autoscaler-rbac.yaml https://raw.githubusercontent.com/kubernetes/kubernetes/release-1.8/cluster/addons/dns-horizontal-autoscaler/dns-horizontal-autoscaler-rbac.yaml

# 修改名称
$ sed -i "s|kube-dns-autoscaler|coredns-autoscaler|" coredns-horizontal-autoscaler-rbac.yaml

# 部署 rbac
$ kubectl apply -f dns-horizontal-autoscaler-rbac.yaml
```

### dns-horizontal-autoscaler-rbac.yaml 原文件

```yaml
kind: ServiceAccount
apiVersion: v1
metadata:
  name: kube-dns-autoscaler
  namespace: kube-system
  labels:
    addonmanager.kubernetes.io/mode: Reconcile
---
kind: ClusterRole
apiVersion: rbac.authorization.k8s.io/v1
metadata:
  name: system:kube-dns-autoscaler
  labels:
    addonmanager.kubernetes.io/mode: Reconcile
rules:
  - apiGroups: [""]
    resources: ["nodes"]
    verbs: ["list"]
  - apiGroups: [""]
    resources: ["replicationcontrollers/scale"]
    verbs: ["get", "update"]
  - apiGroups: ["extensions"]
    resources: ["deployments/scale", "replicasets/scale"]
    verbs: ["get", "update"]
# Remove the configmaps rule once below issue is fixed:
# kubernetes-incubator/cluster-proportional-autoscaler#16
  - apiGroups: [""]
    resources: ["configmaps"]
    verbs: ["get", "create"]
---
kind: ClusterRoleBinding
apiVersion: rbac.authorization.k8s.io/v1
metadata:
  name: system:kube-dns-autoscaler
  labels:
    addonmanager.kubernetes.io/mode: Reconcile
subjects:
  - kind: ServiceAccount
    name: kube-dns-autoscaler
    namespace: kube-system
roleRef:
  kind: ClusterRole
  name: system:kube-dns-autoscaler
  apiGroup: rbac.authorization.k8s.io
```


## 部署 dns-horizontal-autoscaler

### 修改配置并部署

为了避免频繁修改，可以针对 kube-dns 和 coredns 部署两个 dns-horizontal-autoscaler。

* kube-dns

```bash
$ wget -O kube-dns-horizontal-autoscaler.yaml https://raw.githubusercontent.com/kubernetes/kubernetes/release-1.8/cluster/addons/dns-horizontal-autoscaler/dns-horizontal-autoscaler.yaml

# 修改镜像源
$ sed -i "s|gcr.io/google_containers|dockerce|g" kube-dns-horizontal-autoscaler.yaml

# 修改 target
$ sed -i "s|--target=.*|--target=Deployment/kube-dns|g" kube-dns-horizontal-autoscaler.yaml

# 部署
$ kubectl apply -f kube-dns-horizontal-autoscaler.yaml

# 检查部署的服务（如果使用的是 kube-dns）
$ kubectl -n kube-system get deploy -l k8s-app=kube-dns-autoscaler
NAME                         DESIRED   CURRENT   UP-TO-DATE   AVAILABLE   AGE
deploy/kube-dns-autoscaler   1         1         1            1           1m

# 会自动创建一个 configmap
$ kubectl -n kube-system get configmap kube-dns-autoscaler
NAME                  DATA      AGE
kube-dns-autoscaler   1         11m

# 排查日志
$ kubectl -n kube-system logs -f po/kube-dns-autoscaler-7b9d5bb6d4-89h87
```

* coredns

```bash
$ wget -O dns-horizontal-autoscaler.yaml https://raw.githubusercontent.com/kubernetes/kubernetes/release-1.8/cluster/addons/dns-horizontal-autoscaler/dns-horizontal-autoscaler.yaml

# 修改镜像源
$ sed -i "s|gcr.io/google_containers|dockerce|g" dns-horizontal-autoscaler.yaml

# 修改 target
$ sed -i "s|--target=.*|--target=Deployment/coredns|g" dns-horizontal-autoscaler.yaml

# 修改名称
$ sed -i "s|kube-dns-autoscaler|coredns-autoscaler|g" dns-horizontal-autoscaler.yaml

# 部署
$ kubectl apply -f dns-horizontal-autoscaler.yaml
```

### dns-horizontal-autoscaler.yaml 原文件

```yaml
apiVersion: extensions/v1beta1
kind: Deployment
metadata:
  name: kube-dns-autoscaler
  namespace: kube-system
  labels:
    k8s-app: kube-dns-autoscaler
    kubernetes.io/cluster-service: "true"
    addonmanager.kubernetes.io/mode: Reconcile
spec:
  template:
    metadata:
      labels:
        k8s-app: kube-dns-autoscaler
      annotations:
        scheduler.alpha.kubernetes.io/critical-pod: ''
    spec:
      containers:
      - name: autoscaler
        image: gcr.io/google_containers/cluster-proportional-autoscaler-amd64:1.1.2-r2
        resources:
            requests:
                cpu: "20m"
                memory: "10Mi"
        command:
          - /cluster-proportional-autoscaler
          - --namespace=kube-system
          - --configmap=kube-dns-autoscaler
          # Should keep target in sync with cluster/addons/dns/kubedns-controller.yaml.base
          - --target=Deployment/kube-dns
          # When cluster is using large nodes(with more cores), "coresPerReplica" should dominate.
          # If using small nodes, "nodesPerReplica" should dominate.
          - --default-params={"linear":{"coresPerReplica":256,"nodesPerReplica":16,"preventSinglePointFailure":true}}
          - --logtostderr=true
          - --v=2
      tolerations:
      - key: "CriticalAddonsOnly"
        operator: "Exists"
      serviceAccountName: kube-dns-autoscaler
```

更多运行参数详见：https://github.com/kubernetes-incubator/cluster-proportional-autoscaler/#overview 。

### 测试 autoscaling

* kube-dns

```bash
# 手动将 kube-dns 扩容为一个较大的数
$ kubectl -n kube-system scale deploy/kube-dns --replicas=5

# 检查 kube-dns 是否会自动缩放
$ kubectl -n kube-system get deploy -l k8s-app=kube-dns
NAME       DESIRED   CURRENT   UP-TO-DATE   AVAILABLE   AGE
kube-dns   2         2         2            2           3h
```

* coredns

```bash
# 手动将 coredns 扩容为一个较大的数
$ kubectl -n kube-system scale deploy/coredns --replicas=5

# 检查 coredns 是否会自动缩放
$ kubectl -n kube-system get deploy -l k8s-app=coredns
NAME       DESIRED   CURRENT   UP-TO-DATE   AVAILABLE   AGE
kube-dns   2         2         2            2           3h
```

### 调整 autoscaling 参数

```bash
# 查看 configmap 配置
$ kubectl -n kube-system get cm/kube-dns-autoscaler -o yaml
apiVersion: v1
data:
  linear: '{"coresPerReplica":256,"nodesPerReplica":16,"preventSinglePointFailure":true}'
kind: ConfigMap
metadata:
  name: kube-dns-autoscaler
  namespace: kube-system
  ...

# 修改
$ kubectl -n kube-system edit cm/kube-dns-autoscaler
```

### 关闭自动缩放

```bash
$ kubectl -n kube-system scale deploy/kube-dns-autoscaler --replicas=0

# OR

$ kubectl -n kube-system delete deploy/kube-dns-autoscaler
```


## AutoScaling 原理

autoscaling 的 DNS 服务数量是通过以下公式计算得到的：

```
replicas = max( ceil( cores * 1/coresPerReplica ) , ceil( nodes * 1/nodesPerReplica ) )
```

从公式可以看出，如果集群节点的 CPU 核心较多，则 `coresPerReplica` 参数起决定作用；如果集群节点的 CPU 核心较少，则 `nodesPerReplica` 参数起决定作用。其中，`cores` 表示集群 CPU 的总核数，`nodes` 表示集群节点总数，`ceil()` 函数表示向上取整。另外，`coresPerReplica`、`nodesPerReplica` 的值为整数。


## 最后

除了上面的 `kube-dns-autoscaler`，Kubernetes 还支持其他缩放模式，如 [cluster-proportional-autoscaler](https://github.com/kubernetes-incubator/cluster-proportional-autoscaler)


## 参考

* [DNS Horizontal Autoscaler](https://github.com/kubernetes/kubernetes/tree/release-1.8/cluster/addons/dns-horizontal-autoscaler)
* [Autoscale the DNS Service in a Cluster](https://kubernetes.io/docs/tasks/administer-cluster/dns-horizontal-autoscaling/)
* [Horizontal cluster-proportional-autoscaler container](https://github.com/kubernetes-incubator/cluster-proportional-autoscaler)
* [cluster-proportional-autoscaler 源码分析及如何解决 KubeDNS 性能瓶颈](https://my.oschina.net/jxcdwangtao/blog/1581879?from=groupmessage&isappinstalled=0)
