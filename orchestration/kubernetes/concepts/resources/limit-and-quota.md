# LimitRange & ResourceQuota

LimitRange 和 ResourceQuota 的设置都是基于命名空间的。

## LimitRange

Kubernetes 提供了 `LimitRange` 对象来对 `Container` 和 `Pod` 设置资源限制。

<!--
Use the LimitRanger admission controller to force defaults for pods that make no compute resource requirements
-->

使用 `LimitRange` 准入控制器可以强制为那些不要求计算资源的 Pod 设置默认值（实际上是针对所有 Pod）。

```bash
# 创建命名空间
$ kubectl create namespace xiaoming

$ cat <<EOF | kubectl -n xiaoming apply -f -
apiVersion: v1
kind: LimitRange
metadata:
  name: limit
spec:
  limits:
  - type: Pod
    min:
      cpu: 100m
      memory: 100Mi
    max:
      cpu: 2000m
      memory: 2Gi
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
    maxLimitRequestRatio:
      cpu: 100
EOF
```

LimitRange 限制的属性：

| 属性                 | 描述                                                                       |
| -------------------- | -------------------------------------------------------------------------- |
| min                  | 对手动设置资源限制的 Container/Pod，定义 CPU、内存的最小值                 |
| max                  | 对手动设置资源限制的 Container/Pod，定义 CPU、内存的最大值                 |
| default              | 对没有设置资源限制的容器，定义 CPU、内存的默认上限值（resources.limits）   |
| defaultRequest       | 对没有设置资源限制的容器，定义 CPU、内存的默认请求值（resources.requests） |
| maxLimitRequestRatio | 对容器定义 CPU、内存的 limit/request 比值的上限值                          |

```bash
# 查看 xiaoming 命名空间的 limitrange
$ kubectl -n xiaoming describe limitrange
Name:       limit
Namespace:  xiaoming
Type        Resource  Min    Max  Default Request  Default Limit  Max Limit/Request Ratio
----        --------  ---    ---  ---------------  -------------  -----------------------
Pod         cpu       100m   2    -                -              -
Pod         memory    100Mi  2Gi  -                -              -
Container   cpu       10m    1    50m              100m           100
Container   memory    32Mi   1Gi  64Mi             100Mi          -
```


## ResourceQuota

当多个用户或团队共享同一个集群时，可能出现资源使用超额的情况（通常一个用户或一个团队对应一个命名空间）。Kubernetes 提供了 `ResourceQuota` 对象来限制每个命名空间允许使用的总资源，例如对象的数量、总的计算资源（cpu、memory）等。

<!--
If quota is enabled in a namespace for compute resources like cpu and memory, users must specify requests or limits for those values; otherwise, the quota system may reject pod creation. Hint: Use the LimitRanger admission controller to force defaults for pods that make no compute resource requirements. See the walkthrough for an example of how to avoid this problem.
-->

### 如何工作

* 如果在某个命名空间针对计算资源（如 CPU 和 内存）启用了资源配额，则在该命名空间下创建的所有容器都必须指定对应的 requests 或 limits，否则配额系统会拒绝 Pod 创建。比如，如果在 `ResourceQuota` 中设置了 `requests.memory`，则创建 Pod 时必须为所有容器设置 `requests.memory`。注： 如果设置了 `LimitRange` 它会所有 Pod 设置默认值。

> 如果管理员为某个命名空间设置了 `ResourceQuota`，隶属于该命名空间的用户或团队创建 Pod 是必须为容器指定 `resources.requests` 和 `resources.limits`，否则 quota 系统会 Pod 拒绝 Pod 创建（如），除非管理员还同时使用 `LimitRange` 为该命名空间设定了 `default` 和/或 `defaultRequest`。

启用 ResourceQuota：

很多 Kubernetes 发行版本默认都支持资源配额，当为 apiserver 的 `--admission-control=` 字段添加 `ResourceQuota` 参数即可开启。

注意：

* 更新 ResourceQuota 不会影响已经创建好的资源；
* 由于 Nvidia GPU 资源还处于 alpha 版本，因此目前不支持对其进行限额（实测发现支持创建 `limits.alpha.kubernetes.io/nvidia-gpu` 和 `requests.alpha.kubernetes.io/nvidia-gpu` ResourceQutoa，但之后依然无法正常创建 Pod）。


## ResourceQuota 限制的资源

* 计算资源

| 资源名称        | 描述               |
| --------------- | ------------------ |
| cpu             | cpu requests 总量  |
| memory          | 内存 requests 总量 |
| limits.cpu      | cpu limits 总量    |
| limits.memory   | 内存 limits 总量   |
| requests.cpu    | cpu requests 总量  |
| requests.memory | 内存 requests 总量 |

如果管理员设置计算资源配额，

* 存储资源

| 资源名称                                                        | 描述                                              |
| --------------------------------------------------------------- | ------------------------------------------------- |
| requests.storage                                                | 所有 PVC 的 re quests 存储总量                    |
| persistentvolumeclaims                                          | 命名空间中的 PVC 总数                             |
| <class-name>.storageclass.storage.k8s.io/requests.storage       | 与该存储类关联的所有 PVC 的 requests 存储总量     |
| <class-name>.storageclass.storage.k8s.io/persistentvolumeclaims | 和该存储类关联的所有 PVC 的 命名空间中的 PVC 总数 |

* 对象数量

| 资源名称               | 描述                                                                                            |
| ---------------------- | ----------------------------------------------------------------------------------------------- |
| congfigmaps            | 命名空间可以添加的 ConfigMap 总数                                                               |
| persistentvolumeclaims | 命名空间可以添加的 PVC 总数                                                                     |
| pods                   | 命名空间可以添加的 Pod 总数。如果一个pod的 status.phase 是 Failed, Succeeded, 则该pod处于终止态 |
| replicationcontrollers | 命名空间中可以存在的 RC 总数                                                                    |
| resourcequotas         | 命名空间可以添加的 ResourceQuotas 总数。一个命名空间最多只能有一个 ResourceQuota 对象           |
| services               | 命名空间可以添加的 Service 总数                                                                 |
| services.loadbalancers | 命名空间可以添加 LoadBalancer 类型的 Service 总数                                               |
| services.nodeports     | 命名空间可以添加的 NodePort 类型的 Service 总数                                                 |
| secrets                | 命名空间可以添加的 Secret 总数                                                                  |

实例：

```yaml
# 创建命名空间
$ kubectl create namespace xiaoming

$ cat <<EOF | kubectl -n xiaoming apply -f -
apiVersion: v1
kind: ResourceQuota
metadata:
  name: quota-base
spec:
  hard:
    # compute resource quota
    requests.cpu: "1"
    requests.cpu: "2" # 覆盖前面的值
    requests.memory: "1Gi"
    limits.cpu: "2"
    limits.memory: "2Gi"
    # object count quota
    pods: "20"
    resourcequotas: "0"         # 不允许再添加 ResourceQuota（设置为 0 或 1 都可以），但先前创建的 ResourceResource 不算也不会删除，前提是用户没有修改 ResourceQuota 的权限，比如给用户授予的是 "edit" ClusterRole 而不是 "admin" ClusterRole
    services.loadbalancers: "0" # 不允许使用 type=LoadBalancer Service
    services.nodeports: "0"     # 不允许使用 type=NodePort Service
    # storage resource quota
    requests.storage: "20Gi"
    persistentvolumeclaims: "20" # 允许创建的 PVC 数量
EOF
```

```bash
# 也可以按需求对 ResourceQuota 进行分类管理
$ cat <<EOF | kubectl -n xiaoming apply -f -
apiVersion: v1
kind: ResourceQuota
metadata:
  name: compute-resource
spec:
  hard:
    requests.cpu: "1"
    requests.memory: "1Gi"
    limits.cpu: "2"
    limits.memory: "2Gi"
---
apiVersion: v1
kind: ResourceQuota
metadata:
  name: storage-resource
spec:
  hard:
    requests.storage: "20Gi"
    persistentvolumeclaims: "20"
---
apiVersion: v1
kind: ResourceQuota
metadata:
  name: object-count
spec:
  hard:
    pods: "20"
    services.loadbalancers: "0"
    services.nodeports: "0"
EOF
```

如果新的 ResourceQuota 与原先的冲突怎么办？冲突后按最小值进行限额，但已经创建的对象或已使用的资源不受影响。我觉得这应该按 bug 处理，不应该允许这么做。

```bash
$ cat <<EOF | kubectl -n xiaoming apply -f -
apiVersion: v1
kind: ResourceQuota
metadata:
  name: pod-count
spec:
  hard:
    pods: "1"
EOF
```

以上操作都是针对处于非 `Terminating` 状态的 Pod，如果要对处于 `Terminating` 状态的 Pod 设置资源限额，可以使用 scope 属性：

```bash
$ cat <<EOF | kubectl -n xiaoming apply -f -
apiVersion: v1
kind: ResourceQuota
metadata:
  name: quota-base
spec:
  hard:
    # compute resource quota
    requests.cpu: "1"
    requests.memory: "1Gi"
    limits.cpu: "2"
    limits.memory: "2Gi"
    # object count quota
    pods: "100"
    resourcequotas: "0"
    services.loadbalancers: "0"
    services.nodeports: "0"
    # storage resource quota
    requests.storage: "50Gi"
    persistentvolumeclaims: "50"
  scopes:
  - Terminating
EOF
```


```bash
# 查看 xiaoming 命名空间的 ResourceQuota
$ kubectl describe quota -n xiaoming
Name:     quota-base
Namespace:    xiaoming
Resource    Used  Hard
--------    ----  ----
limits.cpu    0 2
limits.memory   0 2Gi
persistentvolumeclaims  0 50
pods      0 100
requests.cpu    0 1
requests.memory   0 1Gi
requests.storage  0 50Gi
resourcequotas    1 0
services.loadbalancers  0 0
services.nodeports  0 0
```

## 参考

* [Resource Quotas](https://kubernetes.io/docs/concepts/policy/resource-quotas/)
* [Configure Memory and CPU Quotas for a Namespace](https://kubernetes.io/docs/tasks/administer-cluster/quota-memory-cpu-namespace/)

* [Kubernetes ResourceQuota Controller 内部实现原理及源码分析](http://blog.csdn.net/waltonwang/article/details/54670584)
