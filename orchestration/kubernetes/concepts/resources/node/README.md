# Node

Node 是 Pod 真正运行的主机，可以物理机，也可以是虚拟机。为了管理 Pod，每个 Node 节点上至少要运行 `container runtime`（比如docker或者rkt）、`kubelet` 和 `kube-proxy` 服务。


## Node 管理

禁止新的 Pod 调度到某个节点上，顾名思义，警戒线外的 Pod 不允许再进入到警戒线内：

```bash
$ kubectl cordon <node-name>
```

驱逐某个节点上的所有 Pod：

```bash
$ # 该命令会自动调用 kubectl cordon 命令
$ kubectl drain <node-name> --force=true

# 保留 daemonset 服务
$ kubectl drain <node-name> --ignore-daemonsets=true

# 设置 1 分钟的宽限期（默认为 -1）
$ kubectl drain <node-name> --grace-period=60
```

解除封印：

```bash
$ kubectl uncordon <node-name>
```


## 节点状态

* Ready
* NotReady


## Node Controller

Node Controller 负责：

  * 维护 Node 状态
  * 与 Cloud Provider 同步 Node
  * 给 Node 分配容器 CIDR
  * 删除带有 NoExecute taint 的 Node 上的 Pods
  * 默认情况下，kubelet 在启动时会向 master 注册自己，并创建 Node 资源。


## Node 的状态

```bash
$ kubectl get nodes -o wide
```

每个 Node 都包括以下状态信息：

  * 地址：包括 hostname、外网 IP 和内网 IP
  * 条件（Condition）：包括OutOfDisk、Ready、MemoryPressure和DiskPressure
  * 容量（Capacity）：Node 上的可用资源，包括CPU、内存和Pod总数
  * 基本信息（Info）：包括内核版本、容器引擎版本、OS类型等


## Node 资源使用率

```bash
$ kubectl top node kube-node-1
NAME                 CPU(cores)   CPU%      MEMORY(bytes)   MEMORY%
kube-node-1          31831m       9%        43163Mi         16%
```


## Taint 和 Toleration

`Taint` 和 `toleration` 协同工作以防止 Pod 被调度到不合适的 Node 上。Taint 应用于 Node 上，而 toleration 则应用于 Pod 上（Toleration 是可选的）。

比如，可以使用 taint 命令给 node1 添加 taint：

```bash
$ kubectl taint nodes node1 key1=value1:NoSchedule
$ kubectl taint nodes node2 key2=value2:NoExecute
$ kubectl taint nodes node3 key3:NoSchedule
```

比如，运行调度 Pod 到 master 节点上：

```bash
$ # kube-scheduler 默认不允许调度 Pod 到 master 节点
$ kubectl describe node <master-node> | grep NoSchedule
Taints:     node-role.kubernetes.io/master:NoSchedule

$ # 移除 taint
$ kubectl taint nodes <master-node> node-role.kubernetes.io/master:NoSchedule-

$ # 所有节点移除 taint
$ kubectl taint nodes --all node-role.kubernetes.io/master:NoSchedule-

$ # 还原
$ kubectl taint nodes <master-node> node-role.kubernetes.io/master:NoSchedule

$ # 还原所有
$ kubectl taint nodes --all node-role.kubernetes.io/master:NoSchedule
```

```bash
$ kubectl taint node nodeA key=value:NoSchedule

> tolerations:
> - key: "key"
>   operator: "Equal"
>   value: "value"
>   effect: "NoSchedule"
```

```bash
$ kubectl taint node nodeB key:NoSchedule

> tolerations:
> - key: "key"
>   operator: "Exists"
>   effect: "NoSchedule"
```

### Pod 默认 taint

```yaml
tolerations:
- effect: NoExecute
  key: node.alpha.kubernetes.io/notReady
  operator: Exists
  tolerationSeconds: 300
- effect: NoExecute
  key: node.alpha.kubernetes.io/unreachable
  operator: Exists
  tolerationSeconds: 300
```

注意：不同与 `label`，`toleration` 只需要满足任意一个 `taint` 即可。

### 查看节点 taint

```bash
$ kubectl get node k8s-master-1 -o yaml | grep effect -C 3 -B 4
spec:
  externalID: k8s-master-1
  podCIDR: 10.1.16.0/24
  taints:
  - effect: NoSchedule
    key: node-role.kubernetes.io
    timeAdded: null
    value: master
```

### 利用 taint 和 toleration 部署服务到 Master 节点

根据上面的信息，我们使用 DaemonSet 部署应用到所有节点，包括 Master。

```yaml
apiVersion: extensions/v1beta1
kind: DaemonSet
metadata:
  name: nginx
spec:
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - image: nginx:alpine
        name: nginx
        ports:
        - containerPort: 80
      tolerations:
      - key: "node-role.kubernetes.io"
        value: "master"
        effect: "NoSchedule"
```


## Taint/Toleration vs Node-Label

无论是否为 Node 添加 Label，Pod 都有可能调度到该节点。

打上 `taint` 后，Pod 默认都不会调度到该节点，必须使用 `toleration` 进行匹配才行。

`PodSpec.nodeSelector` 指定多个时要求 Node 同时满足这条件，而 `PodSpec.tolerations` 只需要 Node 满足其中一个即可。

建议同时使用两者并使键值尽量同名，原因是 Label 方便通过命令查看，而 Taint 虽然设置方式跟 Label 相似，但不便于查看和管理。

```bash
# 自定义的 Label 建议大写，方便查看
$ kubectl taint node node1 LB=NIC:NoExecute
$ kubectl label node node1 TAINT.LB=NIC
```

## Label 命名

```bash
$ kubectl label node nodeA LOGGING=FLUENTD
$ kubectl label node nodeA LOGGING=FILEBEAT
$ kubectl label node nodeA NETWORK=CALICO

# 矿机
$ kubectl label node nodeA TAINT.MINING=RIG
$ kubectl taint node nodeA MINING=RIG:NoExecute

# 矿池代理
$ kubectl label node nodeB TAINT.MINING=PROXY
$ kubectl taint node nodeB MINING=PROXY:NoExecute

# GPU 服务器
$ kubectl label node nodeB NODE-TYPE=GPU
$ kubectl label node nodeB GPU-TYPE=NVIDIA
$ kubectl label node nodeB GPU-NAME=P106-100

# 网关
$ kubectl label node nodeD TAINT.K8S=GATEWAY
$ kubectl taint node nodeD K8S=GATEWAY:NoExecute

# Nginx Ingress Controller
$ kubectl label node nodeE TAINT.LB=NIC
$ kubectl taint node nodeE LB=NIC:NoExecute
```


## 参考

* [Taints and Tolerations](https://kubernetes.io/docs/concepts/configuration/taint-and-toleration/)

* [Kubernetes Node Controller 源码分析之配置篇](http://blog.csdn.net/waltonwang/article/details/75269847)
* [Kubernetes Node Controller 源码分析之执行篇](http://blog.csdn.net/waltonwang/article/details/75949698)
* [Kubernetes Node Controller 源码分析之创建篇](http://blog.csdn.net/waltonwang/article/details/76359220)
* [Kubernetes Node Controller 源码分析之 Taint Controller](http://blog.csdn.net/waltonwang/article/details/76474386)
