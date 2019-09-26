# Kubernetes 资源对象之 Pod

* Pod 是 Kubernetes 调度的基本单位
* Pod 中的容器共享 cgroup、ipc、mnt、net、pid、user 和 uts 这 6 个 Linux namespace

## API 版本

| K8s 版本      | API 版本 |
| ------------- | -------- |
| v1.6 ~ latest | v1       |

<!--
## Todo

* 讲解过程中穿插着 kubectl 命令的讲解
* kubectl
  * kubectl create
  * kubectl apply
  * kubectl replace
-->

<!--

## Todo

* labels & annotations
* command & args
* 生命周期
* 健康检查
* 资源限制
* 环境变量
* Volume 插件
* Pod 策略
  * 重启策略
  * DNS 策略
* Pod status
* taint & toleration
* Pod 调度策略
* 容器镜像
* 初始化容器

-->

## 目录

* 什么是 Pod
* 结构
  * 基本结构
  * 完整结构
* metadata
  * labels
  * annotations
* 初始化容器
* 容器规范
  * 镜像
  * 环境变量
  * 资源限制
  * Runtime Class
  * 容器端口与 Pod 主机网络
  * 健康检查
    * livenessProbe
    * readinessProbe
  * `command` 与 `args`
  * 安全上下文
  *
* hostAliases
* volume
* affinity
* podAntiAffinity
* 静态 Pod


---

* 容器环境变量
* 状态（PodStatus）
* 容器资源限制
* 网络类型及端口
* 初始化容器
* 镜像

* volume
* DNS 策略（dnsPolicy）
* 重启策略（restartPolicy）
* `labels` 与 `annotations`
* `command` 与 `args`
* 健康检查（livenessProbe、readinessProbe）
* hosts

## 基本 Manifest/基本模板

```yaml
apiVersion: v1
kind: Pod
metadata:
    name: nginx
    namespace: default
spec:
    containers:
      - image: nginx:alpine
```

## Pod 状态






## 日常操作






## Pod 生命周期

> https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/



# Kubernetes Pod


## 共享网络和存储

Pod 中的应用可以共享网络空间（IP 地址和端口），因此可以通过 `localhost` 互相发现，但必须协调好应用之间的端口。

Pod 中的应用容器可以共享 volume。


## Pod 与 Controller

在 Kubernetes 中虽然可以直接创建和使用 Pod，但它可能会因为 Node 故障或者调度器故障而被删除。因此，通常是使用 Controller 来管理 Pod 的。

Controller 可以创建和管理多个 Pod，提供副本管理、滚动更新以及集群级别的自愈能力。

管理 Pod 的 Controller 包括：

  * Deployment
  * StatefulSet
  * DaemonSet


## Pod Templates

Pod 模板指的是在其他对象（非 Pod 对象）中定义 Pod，比如 Replication Controllers、Jobs 和 DaemonSets。Controller 会根据 Pod 模板来创建实际的 Pod。

Volume 跟 Pod 有相同的生命周期



## Pod 定义

定义一个 nginx pod：

* 使用 YAML 来定义（推荐）

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: nginx
  labels:
    app: nginx
spec:
  containers:
  - name: nginx
    image: nginx:1.11.9-alpine
    ports:
    - containerPort: 80
```

* 使用 JSON 来定义

```json
{
  "apiVersion": "v1",
  "kind": "Pod",
  "metadata": {
    "name": "nginx",
    "labels": [
      {"app": "nginx"}
    ]
  },
  "spec": {
    "containers": [
      {
        "name": "nginx",
        "image": "nginx:1.11.9-alpine",
        "ports": [
          {"containerPort": 80}
        ]
      }
    ]
  }
}
```


## 使用 Volume

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: redis
spec:
  containers:
  - name: redis
    image: redis
    port:
    - containerPort: 80
    volumeMounts:
    - name: redis-storage
      mountPath: /data/redis
  volumes:
  - name: redis-storage
    emptyDir: {}
```







## 环境变量

环境变量为容器提供了一些重要的资源，包括容器和 Pod 的基本信息以及集群中服务的信息等：

(1) hostname
HOSTNAME 环境变量保存了该 Pod 的 hostname。

（2）容器和 Pod 的基本信息
Pod 的名字、命名空间、IP 以及容器的计算资源限制等可以以 [Downward API](https://kubernetes.io/docs/tasks/inject-data-application/downward-api-volume-expose-pod-information/) 的方式获取并存储到环境变量中。

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: test
spec:
  containers:
    - name: test-container
      image: gcr.io/google_containers/busybox
      command: [ "sh", "-c"]
      args:
      - env
      resources:
        requests:
          memory: "32Mi"
          cpu: "125m"
        limits:
          memory: "64Mi"
          cpu: "250m"
      env:
      - name: MY_NODE_NAME
        valueFrom:
          fieldRef:
            fieldPath: spec.nodeName
      - name: MY_POD_NAME
        valueFrom:
          fieldRef:
            fieldPath: metadata.name
      - name: MY_POD_NAMESPACE
        valueFrom:
          fieldRef:
            fieldPath: metadata.namespace
      - name: MY_POD_IP
        valueFrom:
          fieldRef:
            fieldPath: status.podIP
      - name: MY_POD_SERVICE_ACCOUNT
        valueFrom:
          fieldRef:
            fieldPath: spec.serviceAccountName
      - name: MY_CPU_REQUEST
        valueFrom:
          resourceFieldRef:
            containerName: test-container
            resource: requests.cpu
      - name: MY_CPU_LIMIT
        valueFrom:
          resourceFieldRef:
            containerName: test-container
            resource: limits.cpu
      - name: MY_MEM_REQUEST
        valueFrom:
          resourceFieldRef:
            containerName: test-container
            resource: requests.memory
      - name: MY_MEM_LIMIT
        valueFrom:
          resourceFieldRef:
            containerName: test-container
            resource: limits.memory
  restartPolicy: Never
```

(3) 集群中服务的信息

容器的环境变量中还包括了容器运行前创建的所有服务的信息，比如默认的 kubernetes 服务对应了环境变量

```ini
KUBERNETES_PORT_443_TCP_ADDR=10.0.0.1
KUBERNETES_SERVICE_HOST=10.0.0.1
KUBERNETES_SERVICE_PORT=443
KUBERNETES_SERVICE_PORT_HTTPS=443
KUBERNETES_PORT=tcp://10.0.0.1:443
KUBERNETES_PORT_443_TCP=tcp://10.0.0.1:443
KUBERNETES_PORT_443_TCP_PROTO=tcp
KUBERNETES_PORT_443_TCP_PORT=443
```

由于环境变量存在创建顺序的局限性（环境变量中不包含后来创建的服务），推荐使用 [DNS](../components/k8s-kube-dns.md) 来解析服务。





## 使用主机的 IPC 命名空间

通过设置 hostIPC 参数 True，使用主机的 IPC 命名空间，默认为 False。


## 使用主机的网络命名空间

通过设置 hostNetwork 参数 True，使用主机的网络命名空间，默认为 False。


## 使用主机的 PID 空间

通过设置 hostPID 参数 True，使用主机的 PID 命名空间，默认为 False。

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: busybox1
  labels:
    name: busybox
spec:
  hostIPC: true
  hostPID: true
  hostNetwork: true
  containers:
  - name: busybox
    image: busybox
    command:
    - sleep
    - "3600"
```

## 设置 Pod 中的 hostname

通过 hostname 参数实现，如果未设置默认使用 metadata.name 参数的值作为 Pod 的 hostname。


## 设置 Pod 的子域名

通过 spec.subdomain 参数设置 Pod 的子域名，默认为空

  * 指定 hostname 为 busybox-2 和 subdomain 为 default-subdomain，完整域名为 busybox-2.default-subdomain.default.svc.cluster.local：

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: busybox2
labels:
  name: busybox
spec:
  hostname: busybox-2
  subdomain: default-subdomain
containers:
- name: busybox
  image: busybox
  command:
    - sleep
    - "3600"
```

## 限制网络带宽

可以通过给 Pod 增加 `kubernetes.io/ingress-bandwidth` 和 `kubernetes.io/egress-bandwidth` 这两个 annotation 来限制 Pod 的网络带宽。

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: qos
  annotation:
    kubernetes.io/ingress-bandwidth: 3M
    kubernetes.io/egress-bandwidth: 4M
spec:
  containers:
  - name: iperf3
    image: networkstatic/iperf3
    command:
      - iperf3
      - -s
```

> 目前只有 kubenet 网络插件支持限制网络带宽，其他 CNI 网络插件暂不支持这个功能。

kubenet 的网络带宽限制其实是通过 tc 来实现的：

```bash
$ # setup qdisc (only once)
$ tc qdisc add dev cbr0 root handle 1: htb default 30
$ # download rate
$ tc class add dev cbr0 parent 1: classid 1:2 htb rate 3Mbit
$ tc filter add dev cbr0 protocol ip parent 1:0 prio 1 u32 match ip dst 10.1.0.3/32 flowid 1:2
$ # upload rate
$ tc class add dev cbr0 parent 1: classid 1:3 htb rate 4Mbit
$ tc filter add dev cbr0 protocol ip parent 1:0 prio 1 u32 match ip src 10.1.0.3/32 flowid 1:3
```





## Pod status 分析

## terminationGracePeriodSeconds

terminationGracePeriodSeconds 默认是 `30`

## 服务质量（QoS）

* BestEffort

## 参考

  * [Pod Overview](https://kubernetes.io/docs/concepts/workloads/pods/pod-overview/)
  * [Pod 概念](https://kubernetes.feisky.xyz/concepts/pod.html#)
