# Ceph rbd volume

## 角色划分

由于会涉及到多种用户角色，这里先简单描述一下各个角色的职责：

| 角色        | 职责                                                                                                              |
| ----------- | ----------------------------------------------------------------------------------------------------------------- |
| ceph 管理员 | 管理 ceph 资源（创建存储池、rbd 镜像等）；管理用户、keyring 及其权限                                              |
| ceph 用户   | map rbd： 将 rbd 镜像挂载到目标主机                                                                               |
| k8s 管理员  | 管理 ceph 管理员的 keyring（通过 Secret）；事先创建好 PV、StorageClass 等资源供 k8s 用户使用                      |
| k8s 用户    | 管理 ceph 用户的 kering（通过 Secret）；创建 Pod 并将 rbd volume 挂载到容器（k8s 用户必须先获得 ceph 用户的权限） |
| 管理员      | ceph 管理员兼 k8s 管理员                                                                                          |
| 用户        | ceph 用户兼 k8s 用户                                                                                              |

| 角色          | 职责                                                                                                                                                                                           |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CEPH-ADMIN    | Ceph 管理员；负责管理 ceph 资源（创建存储池、rbd 镜像等）；管理用户、keyring 及其权限                                                                                                          |
| CEPH-USER     | Ceph 使用者；主要是 map rbd，即将 rbd 镜像挂载到目标主机                                                                                                                                       |
| K8S-RBD-ADMIN | K8S 中负责管理 RBD Volume 的管理员，拥有 `CEPH-ADMIN` 级别的部分权限，至少能创建存储池和 rbd 镜像；利用 `Secret` 对象存储 keyring 信息；事先创建好 PV、StorageClass 等资源供 K8S-RBD-USER 使用 |
| K8S-RBD-USER  | K8S 中使用 RBD Volume 的用户，拥有 `CEPH-USER` 级别的权限，能够 Map RBD 镜像到宿主机，并最终将 rbd volume 挂载到容器； 利用 `Secret` 对象存储 keyring 信息                                     |
| ADMIN         | `CEPH-ADMIN` 兼 `K8S-RBD-ADMIN`                                                                                                                                                                |
| USER          | `CEPH-USER` 兼 `K8S-RBD-USER`                                                                                                                                                                  |

## 安装 ceph-common

### 二进制集群

如果 Kubernetes 集群是采用二进制方式来部署的，需要在所有 Kubernetes 节点上安装 `ceph-common` 软件包。为避免后续可能出现的错误，请确保 `ceph-common` 的版本与 Ceph 集群的版本一致。

```bash
# CentOS 7
$ ops/ceph/install-ceph-common.sh jewel 10.2.9

# 不推荐
$ yum install ceph-common
```

### 容器化集群

如果 Kubernetes 集群是采用容器化方式来部署的，需要在 `kube-controller-manager` 镜像中事先安装 `ceph-common`，否则 PVC 会创建失败：`failed to create rbd image: executable file not found in $PATH, command output`，原因是 `kube-controller-manager` Pod 无法调用 rbd 接口来创建 PV，[参考我封装的镜像](./dockerfiles/hyperkube-rbd-amd64/README)。

```bash
# Pod 会自动更新
$ sed -i "s|image:.*|image: dockerce/kube-controller-manager-rbd-amd64:v1.8.2|g" /etc/kubernetes/manifests/kube-controller-manager.yaml

# 查看是否修改成功
$ kubectl get pod kube-controller-manager-centos-compute-100 -n kube-system -o yaml | grep image
```

### RBD Volume Provisioner

如果使用了 [RBD Volume Provisioner](https://github.com/kubernetes-incubator/external-storage/tree/master/ceph/rbd)，则不需要在主机或镜像中安装 `ceph-common`。


## Ceph keyring

Ceph 客户端（即 k8s 节点）要访问 Ceph 集群，需要先获取各类用户的 `keyring` 信息。获取 `keyring` 有两种方法：一种是将 `keyring` 复制到所有 k8s 节点的 `/etc/ceph/keyring` 文件中（路径可以自定义）；另一种是创建 Secret 来保存 `keyring` 的 key。相对而言，第二种方法更加简单、方便。

### Ceph 管理员的 keyring

获取 `client.admin` 管理员的 `keyring` 中的 key，并将其转换为 base64 编码（使用文件创建 Secret 需要 base64 编码，通过命令行创建则不需要）：

```bash
# {TYPE.ID}
$ ceph auth get-key client.admin | base64
QVFBUGo3ZFpCMk5jTlJBQW5ZNVdNM1NLQzhldVA5d3JJajBvWFE9PQ==

# OR
$ grep key /etc/ceph/ceph.client.admin.keyring | awk '{printf "%s", $NF}' | base64
QVFBUGo3ZFpCMk5jTlJBQW5ZNVdNM1NLQzhldVA5d3JJajBvWFE9PQ==
```

### Ceph 用户的 keyring

添加 `client.kube` 用户并授权:

```bash
$ ceph auth get-or-create client.kube mon 'allow r' osd 'allow class-read object_prefix rbd_children, allow rwx pool=kube'
```

获取 `client.kube` 用户的 `keyring` 中的 key，并将其转换为 base64 编码：

```bash
$ ceph auth get-key client.kube
AQBFCF9a+dLaHBAA4yKqIhMYoT4DmAWnG08XFA==

$ ceph auth get-key client.kube | base64
QVFCRkNGOWErZExhSEJBQTR5S3FJaE1Zb1Q0RG1BV25HMDhYRkE9PQ==
```


## 直接访问

如果希望 `k8s 用户` 直接挂载 rbd volume，`管理员` 必须事先创建好 Ceph 存储池和 rbd 镜像。

### 创建 Ceph 资源

由 `管理员` 事先创建好 Ceph 存储池和 rbd 镜像，并将创建好的 Ceph 资源告知 `k8s 用户`。如果 `ceph 管理员` 和 `k8s 管理员` 不是同一人，则需要 `ceph 管理员` 创建好资源后通知 `k8s 管理员`，再由 `k8s 管理员` 告知 `k8s 用户`。

* 存储池

如果不指定存储池，系统默认会使用默认的 `rbd` pool。

```bash
$ ceph osd pool create kube 8 8
```

* rbd 镜像

```bash
# 创建镜像
$ rbd create kube/k8s-direct-demo --size=1G --image-format=2 --image-feature=layering

# 查看镜像信息
$ rbd info kube/k8s-direct-demo

# 查看镜像状态
$ rbd status kube/k8s-direct-demo

# 修改镜像大小
$ rbd resize kube/k8s-direct-demo --size=2G
```

相关说明：

* rbd 镜像有多种 feature（kernel 3.10 仅支持 `layering`）:
  - `layering`（id: 1）: 支持分层
  - `striping`: 支持条带化 v2
  - `exclusive-lock`（id: 4）: 支持独占锁
  - `object-map`（id: 8）: 支持对象映射（依赖 exclusive-lock）
  - `fast-diff`: 支持快速计算差异（依赖 object-map）
  - `deep-flatten`: 支持快照扁平化
  - `journaling`: 支持记录 IO 操作（依赖独占锁）
* rbd 镜像有两种格式：
  - `format 1`（启用）: 最初的格式，兼容所有版本的 librbd 和 kernel rbd 模块，但不支持新功能，如克隆；
  - `format 2`（默认）: 第二种 rbd 格式，从 3.11 版本开始，librbd 和 kernel 都支持（striping 除外），该格式支持克隆且易于扩展。

查看 Ceph 集群配置：

```bash
$ ceph --show-config | grep rbd | grep features
```

参考：

* [rbd 相关参数](http://docs.ceph.com/docs/jewel/man/8/rbd/#parameters)
* [Ceph enable the object map feature](https://www.sebastien-han.fr/blog/2015/07/06/ceph-enable-the-object-map-feature/)

### 创建用户 Secret

`k8s 用户` 在使用 rbd volume 之前，需要先获取 `ceph 用户` kering 等 key，并在其命名空间创建相应的 Secret。

```bash
# 用户命名空间
$ kubectl create namespace direct-ns

$ cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Secret
metadata:
  name: ceph-secret-kube
  namespace: direct-ns
type: kubernetes.io/rbd
data:
  key: QVFCRkNGOWErZExhSEJBQTR5S3FJaE1Zb1Q0RG1BV25HMDhYRkE9PQ==
EOF
```

### 创建示例 Pod

`k8s 用户` 除了要获取 `ceph 用户` 的用户名、keyring 等信息外，还要获取 Ceph 的 Monitor、文件系统类型等信息。另外，还需要确保 Secret 和 Pod 在同一命名空间。

```bash
$ cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Pod
metadata:
  name: direct-pod
  labels:
    app: direct-pod
  namespace: direct-ns
spec:
  containers:
  - name: nginx
    image: nginx:alpine
    imagePullPolicy: IfNotPresent
    ports:
    - name: web
      containerPort: 80
    volumeMounts:
    - name: html
      mountPath: /usr/share/nginx/html
  volumes:
  - name: html
    rbd:
      monitors:
      - '192.168.10.200:6789'
      - '192.168.10.201:6789'
      - '192.168.10.202:6789'
      pool: kube
      image: k8s-direct-demo
      user: kube
      secretRef:
        name: ceph-secret-kube
      fsType: xfs
      readOnly: false
EOF
```

* 相关说明

  * `rbd.monitors`: Ceph Monitor 服务的地址；
  * `rbd.fsType`: 根据创建 Ceph OSD 时所指定的文件系统来设置；
  * `rbd.readOnly`: 如果是 true 的话，支持多节点挂载，否则不支持；
  * `rbd.user`: `ceph 用户` 的用户名；
  * `rbd.secretRef`: `rbd.user` 用户的 key Secret；

* Pod 状态

```bash
$ kubectl -n direct-ns get pod direct-pod
$ kubectl -n direct-ns describe pod direct-pod
```

* RBD 状态

部署好 Pod 后，该 rbd 镜像会自动进入被监听（被锁）状态，不能再被其他 Pod 引用，否则会报错：`rbd: image kube/k8s-direct-demo is locked by other nodes`。

```bash
# Ceph Mon 节点
$ rbd status kube/k8s-direct-demo
Watchers:
  watcher=192.168.10.100:0/832451426 client.86282 cookie=1

# K8s 挂载 rbd 的节点（192.168.10.100）
$ rbd showmapped
id pool image           snap devic
0  kube k8s-direct-demo -    /dev/rbd0
```

* 挂载流程

  1. kubelet 首先在 Pod 所在的节点创建 rbd 块设备（/dev/rbdX）；

### 优缺点

  * 必须事先由 `管理员` 在 Ceph 中创建存储池和 rbd 镜像，否则会报错（`kubectl describe pod`）：`rbd: pool kube does not exist` 或 `rbd: image kube/k8s-direct-demo does not exist`；
  * `k8s 用户` 在每次创建 Pod 都需要设置 Ceph 配置信息，但不需要暴露 `ceph 管理员` 权限给 `k8s 用户`；
  * 实际测试发现，Pod 被删除后，rbd 镜像解锁，但数据并不会丢失，重新创建 Pod 后数据依然存在；rbd 镜像只能由 `ceph 管理员` 手动删除。


## 静态 provisioning

Pod --> PVC --> PV Pool

### 创建 Ceph 资源

这种方式同样需要 `ceph 管理员` 事先创建好 Ceph 存储池和 rbd 镜像。不同的是，如果没有事先创建，`k8s 用户` 依然可以正常创建 PV 和 PVC，但是 Pod 会创建失败（`rbd: failed to lock image k8s-static-pv1 (maybe locked by other nodes)`）。

* 存储池

```bash
$ ceph osd pool create kube 8 8
```

* rbd 镜像

```bash
$ rbd create kube/k8s-static-pv1 --size=5G --image-format=2 --image-feature=layering
```

### 创建用户 Secret

```bash
# 用户命名空间
$ kubectl create namespace static-ns

$ cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Secret
metadata:
  name: ceph-secret-kube
  namespace: static-ns
type: kubernetes.io/rbd
data:
  key: QVFCRkNGOWErZExhSEJBQTR5S3FJaE1Zb1Q0RG1BV25HMDhYRkE9PQ==
EOF
```

### 创建 PV

`PersistentVolume` 没有命名空间，被所有 `k8s 用户` 所共享。PV 由 `k8s 管理员` 或 `k8s 用户` 事先创建好，`k8s 用户` 根据自己的存储需求创建相应的 PVC，系统会自动从 PV 池中选择合适的 PV 进行绑定；`k8s` 用户创建 Pod 时再指定相应的 PVC 即可。

```bash
$ cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: PersistentVolume
metadata:
  name: static-pv1
  labels:
    type: static-pv1
  namespace: statis-ns
spec:
  capacity:
    storage: 5Gi
  accessModes:
  - ReadWriteOnce
  rbd:
    monitors:
    - '192.168.10.200:6789'
    - '192.168.10.201:6789'
    - '192.168.10.202:6789'
    pool: kube
    image: k8s-static-pv1
    user: kube
    secretRef:
      name: ceph-secret-kube
    fsType: xfs
    readOnly: false
  persistentVolumeReclaimPolicy: Retain
EOF
```

相关说明：

  * PV 的容量应该与 rbd 镜像的大小保持一致，如果 PV 的容量大于 rbd 镜像的大小，写入过程可能会大致 rbd 镜像溢出；
  * accessModes: rbd 仅支持 `ReadWriteOnce`，即一个 rbd volume 只能在一个节点上被一个 Pod 引用；如果希望动态地创建 PV 并且可以扩展有状态的 Pod，需要使用 StorageClass 和 StatefulSet；
  * persistentVolumeReclaimPolicy: 回收策略为 `Retain`（手动回收）；手动创建的 PV 仅支持 `Retain`，如果是 StorageClass 动态创建的 PV 还支持 `Delete`。如果此处设置为 `Delete`，删除 PVC 后 PV 会报错：`Failed to create deleter for volume "pv1": Volume has no storage class`。

### 创建 PVC

`PersistentVolumeClaim` 是存在命名空间的，它需要和前面创建的 Secret 处于同一命名空间。PVC 是由 `k8s 用户` 根据需求来创建。

```bash
# 创建成功会处于 Available 状态
$ cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: static-pvc1
  namespace: static-ns
spec:
  volumeName: static-pv1
  accessModes:
  - ReadWriteOnce
  resources:
    requests:
      storage: 5Gi
EOF
```

相关说明：

  * 如果没有指定 `spec.volumeName`，PVC 会自动从 PV 池中选择存储容量 >= `resources.requests.storage` 且访问模式为 `ReadWriteOnce` 的 PV 进行绑定，避免资源浪费；比如，系统事先创建了 4 个存储大小分别是 2Gi、4Gi、6Gi、8Gi 的 PV，如果 `k8s 用户` 请求创建了一个 5Gi 存储资源的 PVC 并且不指定 `spec.volumeName`，系统会自动绑定 6Gi 的 PV；
  * 除了通过 `spec.volumeName` 绑定 PV 外，还可以使用 label 来绑定，如：`PVC.spec.selector.matchLabels.type=static-pv1`。

### 创建示例 Pod

```bash
$ cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Pod
metadata:
  name: static-pod
  labels:
    app: static-pod
  namespace: static-ns
spec:
  containers:
  - name: nginx
    image: nginx:alpine
    imagePullPolicy: IfNotPresent
    ports:
    - name: web
      containerPort: 80
    volumeMounts:
    - name: html
      mountPath: /usr/share/nginx/html
  volumes:
  - name: html
    persistentVolumeClaim:
      claimName: static-pvc1
EOF
```

### 优缺点

  * 使用存储资源之前，需要提前手动创建好 PV；`k8s` 用户再根据自己的存储需求创建 PVC 并将 PVC 挂载到 Pod；
  * Kubernetes 1.9 版本以前存在 bug：即便 Pod 已经引用了 PVC，用户依然可以直接删除 PV 和 PVC，这将导致数据丢失；


## 动态 provisioning

Pod --> PVC --> StorageClass --> PV Pool

### 创建 Ceph 资源

这种方式只需要 `管理员` 事先创建好 Ceph 存储池，或者使用默认的 `rbd` 存储池，不需要手动创建 rbd 镜像（实际是由 StorageClass 定义的 admin 用户动态创建的）。

```bash
$ ceph osd pool create kube 8 8
```

### 创建 Secret

为了能动态地创建 PV 和 rbd 镜像，需要事先定义两类用户：一类负责调用 rbd 接口动态创建 rbd 镜像（`ceph 管理员`: `client.admin`）；一类负责映射（map/mount/attach） rbd 镜像到宿主机（`ceph 用户`： `client.kube`）。

* Ceph 管理员对应的 Secret（由 `k8s 管理员` 创建）

```bash
# Ceph 专属命名空间
$ kubectl create namespace ceph

# client.admin 用户
$ cat <<EOF | kubectl -n ceph apply -f -
apiVersion: v1
kind: Secret
metadata:
  name: ceph-secret-admin
type: kubernetes.io/rbd
data:
  key: QVFBUGo3ZFpCMk5jTlJBQW5ZNVdNM1NLQzhldVA5d3JJajBvWFE9PQ==
EOF
```

* Ceph 用户对应的 Secret（由 `k8s 用户` 创建）

```bash
# k8s 用户命名空间
$ kubectl create namespace dynamic-ns

# 每个用户命名空间必须创建同名的 Secret，否则创建 Pod 会失败，创建 PV 和 PVC 正常
$ cat <<EOF | kubectl -n dynamic-ns apply -f -
apiVersion: v1
kind: Secret
metadata:
  name: ceph-secret-kube
type: kubernetes.io/rbd
data:
  key: QVFCRkNGOWErZExhSEJBQTR5S3FJaE1Zb1Q0RG1BV25HMDhYRkE9PQ==
EOF

# 同上，不同的是不需要先转为 base64 编码
$ kubectl create secret generic ceph-secret-kube \
  --type="kubernetes.io/rbd" \
  --from-literal=key='AQBFCF9a+dLaHBAA4yKqIhMYoT4DmAWnG08XFA==' \
  --namespace=dynamic-ns
```

### 创建 StorageClass

`StorageClass` 没有命名空间，由 `管理员` 事先创建。`StorageClass` 可以根据 `k8s 用户` 的 PVC 请求动态地创建 PV。

```bash
$ cat <<EOF | kubectl apply -f -
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: rbd
provisioner: kubernetes.io/rbd
parameters:
  monitors: 192.168.10.200:6789,192.168.10.201:6789,192.168.10.202:6789
  pool: kube
  adminId: admin
  adminSecretName: ceph-secret-admin
  adminSecretNamespace: ceph
  userId: kube
  userSecretName: ceph-secret-kube
  fsType: "xfs"
  imageFormat: "2"
  imageFeatures: "layering"
reclaimPolicy: Delete
EOF
```

相关说明：

  * monitors: 逗号分隔的字符串，非数组。
  * pool: 前面创建的 rbd 存储池；默认是 `rbd`。
  * adminId: 负责动态创建 rbd 镜像的用户；默认是 `admin`。
  * adminSecret: adminId 的 keyring key 对应的 Secret；默认是 `default`。
  * adminSecretNamespace: adminSecret 所在的命名空间；默认是 `default`。
  * userId: 负责映射 rbd 镜像到宿主机的用户；默认和 adminId 相同。
  * userSecretName: userId 的 keyring key 对应的 Secret。
  * reclaimPolicy: `Delete` 或 `Retain`；默认是 `Delete`，即删除 PVC 会自动删除 PV 和 rbd 镜像，采用 `Retain` 会保留 PV 和 rbd 镜像。

* 默认 StorageClass

如果 PVC 没有指定 `spec.storageClassName`，系统会关联一个默认的 StorageClass。实际测试发现，如果设置了默认 StorageClass，将不能静态创建 PV/PVC，PV 提示：`Volume's size is smaller than requested or volume's class does not match with claim`。

```bash
$ kubectl patch storageclass rbd -p '{"metadata": {"annotations":{"storageclass.kubernetes.io/is-default-class":"true"}}}'
```

### 创建 PVC

```bash
$ cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: dynamic-pvc1
  namespace: dynamic-ns
spec:
  storageClassName: rbd
  accessModes:
  - ReadWriteOnce
  resources:
    requests:
      storage: 2Gi
EOF
```

相关说明：

  * 如果 PVC 没有指定 `spec.storageClassName`，会自动指定默认的 StorageClass。

检查状态：

```bash
$ kubectl -n dynamic-ns get pv,pvc
```

### 创建示例 Pod

```bash
$ cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Pod
metadata:
  name: dynamic-pod
  labels:
    app: dynamic-pod
  namespace: dynamic-ns
spec:
  containers:
  - name: nginx
    image: nginx:alpine
    imagePullPolicy: IfNotPresent
    ports:
    - name: web
      containerPort: 80
    volumeMounts:
    - name: html
      mountPath: /usr/share/nginx/html
  volumes:
  - name: html
    persistentVolumeClaim:
      claimName: dynamic-pvc1
EOF
```

### 创建 StatefulSet

虽然使用 StorageClass 可以动态地创建 PV 和 rbd 镜像，但 `k8s 用户` 每次申请存储资源依然需要手动创建 PVC。如果要扩展有状态的应用，不能直接扩展应用本身，因为其 PV/PVC 不会自动扩展（相当于使用的是同一个 PV/PVC，可以考虑支持 ReadWriteMany 访问模式的 PersistentVolume 插件）。

而 `StatefulSet` 可以帮助用户简化这个操作：仅需在 StatefulSet 中定义 PVC 模板，扩展应用会自动创建对应的 PV/PVC，不需要用户手动干预。

```bash
$ cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Service
metadata:
  name: ngx-headless
  labels:
    app: ngx
  namespace: dynamic-ns
spec:
  type: ClusterIP
  clusterIP: None
  selector:
    app: ngx
  ports:
  - name: web
    port: 80
    targetPort: web
---
apiVersion: apps/v1beta2
kind: StatefulSet
metadata:
  name: ngx
  namespace: dynamic-ns
spec:
  replicas: 1
  serviceName: ngx-headless
  selector:
    matchLabels:
      app: ngx
  template:
    metadata:
      labels:
        app: ngx
    spec:
      containers:
      - name: ngx
        image: nginx:alpine
        imagePullPolicy: IfNotPresent
        ports:
        - name: web
          containerPort: 80
        volumeMounts:
        - name: html
          mountPath: /usr/share/nginx/html
  volumeClaimTemplates:
  - metadata:
      name: html
    spec:
      storageClassName: rbd
      accessModes:
      - ReadWriteOnce
      resources:
        requests:
          storage: 1Gi
EOF
```

* 扩容

```bash
$ kubectl -n dynamic-ns scale statefulset/ngx --replicas=3
```

本示例仅供参考，因为扩展的应用之间完全是独立的，没有组成分布式集群；正确的用法是，使用 StatefulSet 部署去中心化的分布式应用，应用之间可以通过 `<pod-name>-<id>.<headless-server>.svc.cluster.local` 来发现彼此，从而组成分布式集群，达到扩容的目的。

* 查看状态

```bash
$ kubectl -n dynamic-ns get svc,statefulset,pv,pvc,pod -l app=ngx
NAME               TYPE        CLUSTER-IP   EXTERNAL-IP   PORT(S)   AGE
svc/ngx-headless   ClusterIP   None         <none>        80/TCP    9m

NAME               DESIRED   CURRENT   AGE
statefulsets/ngx   3         3         4m

NAME             STATUS    VOLUME                                     CAPACITY   ACCESS MODES   STORAGECLASS   AGE
pvc/html-ngx-0   Bound     pvc-015dd1eb-fb5b-11e7-bd1e-d4bed9ee30df   1Gi        RWO            rbd            4m
pvc/html-ngx-1   Bound     pvc-5096d35c-fb5b-11e7-bd1e-d4bed9ee30df   1Gi        RWO            rbd            2m
pvc/html-ngx-2   Bound     pvc-52fd29b4-fb5b-11e7-bd1e-d4bed9ee30df   1Gi        RWO            rbd            2m

NAME       READY     STATUS    RESTARTS   AGE
po/ngx-0   1/1       Running   0          9m
po/ngx-1   1/1       Running   0          11s
po/ngx-2   1/1       Running   0          7s
```

### 优缺点

* 通过 StorageClass 可以动态地创建 PV 和 rbd 镜像。
* 依然需要在每个 Kubernetes 节点上安装 ceph-common。
* 每个 `k8s 用户` 必须在其命名空间创建对应的 Secret。

## External Storage

需要确保 `kube-controller-manager` 启用了 `--enable-dynamic-provisioning=true`（1.8 版本默认是 true）。

### 部署 `rbd-provisioner` controller

* 创建 Ceph RBD 专属命名空间

```bash
$ kubectl create namespace rbd
```

* RBAC

```bash
# ClusterRole
$ cat <<EOF | kubectl -n rbd apply -f -
kind: ClusterRole
apiVersion: rbac.authorization.k8s.io/v1beta1
metadata:
  name: rbd-provisioner
rules:
  - apiGroups: [""]
    resources: ["persistentvolumes"]
    verbs: ["get", "list", "watch", "create", "delete"]
  - apiGroups: [""]
    resources: ["persistentvolumeclaims"]
    verbs: ["get", "list", "watch", "update"]
  - apiGroups: ["storage.k8s.io"]
    resources: ["storageclasses"]
    verbs: ["get", "list", "watch"]
  - apiGroups: [""]
    resources: ["events"]
    verbs: ["list", "watch", "create", "update", "patch"]
  - apiGroups: [""]
    resources: ["secrets"]
    verbs: ["get"]
EOF
```

```bash
# ServiceAccount
$ cat <<EOF | kubectl -n rbd apply -f -
apiVersion: v1
kind: ServiceAccount
metadata:
  name: rbd-provisioner
EOF
```

```bash
# ClusterRoleBinding
$ cat <<EOF | kubectl apply -f -
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: rbd-provisioner
subjects:
- kind: ServiceAccount
  name: rbd-provisioner
  namespace: rbd
roleRef:
  kind: ClusterRole
  name: rbd-provisioner
  apiGroup: rbac.authorization.k8s.io
EOF
```

* rbd provisioner

```bash
$ cat <<EOF | kubectl -n rbd apply -f -
apiVersion: extensions/v1beta1
kind: Deployment
metadata:
  name: rbd-provisioner
spec:
  replicas: 1
  strategy:
    type: Recreate
  template:
    metadata:
      labels:
        app: rbd-provisioner
    spec:
      containers:
      - name: rbd-provisioner
        image: "quay.io/external_storage/rbd-provisioner:latest"
        env:
        - name: PROVISIONER_NAME
          value: ceph.com/rbd
      serviceAccount: rbd-provisioner
EOF
```

设置 Provisioner 的名称为 `ceph.com/rbd`，之后创建的资源对象都需要作相应的改变。如果你的集群是使用容器来部署的，应该确保你的 `kube-controller-manager` 容器中没有 ceph-common，否则可能会因为冲突导致 rbd provisioner 创建失败。

### 创建 Secret

与之前不同的是，需要改变 Secret 的 type 为 `ceph.com/rbd`。

* Ceph 管理员对应的 Secret（由 `k8s 管理员` 创建）

```bash
# Ceph 专属命名空间
# client.admin 用户
$ cat <<EOF | kubectl -n rbd apply -f -
apiVersion: v1
kind: Secret
metadata:
  name: ceph-secret-admin
type: ceph.com/rbd
data:
  key: QVFBUGo3ZFpCMk5jTlJBQW5ZNVdNM1NLQzhldVA5d3JJajBvWFE9PQ==
EOF
```

* Ceph 用户对应的 Secret（由 `k8s 用户` 创建）

```bash
# k8s 用户命名空间
$ kubectl create namespace user-ns

# 每个用户命名空间必须创建同名的 Secret
$ cat <<EOF | kubectl -n user-ns apply -f -
apiVersion: v1
kind: Secret
metadata:
  name: ceph-secret-kube
type: ceph.com/rbd
data:
  key: QVFCRkNGOWErZExhSEJBQTR5S3FJaE1Zb1Q0RG1BV25HMDhYRkE9PQ==
EOF

# 同上，不同的是不需要先转为 base64 编码
$ kubectl create secret generic ceph-secret-kube \
  --type="kubernetes.io/rbd" \
  --from-literal=key='AQBFCF9a+dLaHBAA4yKqIhMYoT4DmAWnG08XFA==' \
  --namespace=user-ns
```

### 创建 StorageClass

```bash
$ cat <<EOF | kubectl apply -f -
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: ceph-rbd
provisioner: ceph.com/rbd
parameters:
  monitors: 192.168.10.200:6789,192.168.10.201:6789,192.168.10.202:6789
  pool: kube
  adminId: admin
  adminSecretName: ceph-secret-admin
  adminSecretNamespace: rbd
  userId: kube
  userSecretName: ceph-secret-kube
  imageFormat: "2"
  imageFeatures: "layering"
reclaimPolicy: Delete
EOF
```

相关说明：

  * provisioner: 设置为 `ceph.com/rbd` 而不是默认的 `kubernetes.io/rbd`。
  * fsType: rbd provisioner 目前不支持设置 `fsType` （v0.1.1 版本的 bug）。

### 创建示例

```bash
$ cat <<EOF | kubectl -n user-ns apply -f -
kind: PersistentVolumeClaim
apiVersion: v1
metadata:
  name: provisioner-pvc1
spec:
  storageClassName: ceph-rbd
  accessModes:
  - ReadWriteOnce
  resources:
    requests:
      storage: 1Gi
EOF
```

```bash
$ cat <<EOF | kubectl -n user-ns apply -f -
apiVersion: v1
kind: Pod
metadata:
  name: provisioner-pod
  labels:
    app: provisioner-pod
spec:
  containers:
  - name: nginx
    image: nginx:alpine
    imagePullPolicy: IfNotPresent
    ports:
    - name: web
      containerPort: 80
    volumeMounts:
    - name: html
      mountPath: /usr/share/nginx/html
  volumes:
  - name: html
    persistentVolumeClaim:
      claimName: provisioner-pvc1
EOF
```

检查状态：

```bash
$ kubectl -n user-ns get pod,pvc,pv,sc
```

### 优缺点

* 不需要事先在 kubernetes 节点上安装 ceph-common。
* 新增 rbd 新功能只需要升级 rbd provisioner 容器即可，不需要升级 kubernetes。


## RBD resize

1.8 Alpha 版本（支持 glusterfs），1.9 Alpha 版本（支持 gcePersistentDisk、awsElasticBlockStore、Cinder、glusterfs、rbd）。

为了开启扩展 PVC 功能，需要设置 `--feature-gates=ExpandPersistentVolumes=true`。另外，还需要开启 `PersistentVolumeClaimResize` 准入插件来执行可调整大小的卷的其他验证。

* 修改组件参数

```bash
$ kube-apiserver --feature-gates=ExpandPersistentVolumes=true --admission-control=...PersistentVolumeClaimResize...

$ systemctl daemon-reload
$ systemctl restart kube-apiserver
```

* 修改 StorageClass 参数

只允许对 `spec.allowVolumeExpansion` 字段为 `true` 的 StorageClass 进行大小调整：

```bash
$ cat <<EOF | kubectl apply -f -
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: rbd
provisioner: kubernetes.io/rbd
parameters:
  monitors: 192.168.10.200:6789,192.168.10.201:6789,192.168.10.202:6789
  pool: kube
  adminId: admin
  adminSecretName: ceph-secret-admin
  adminSecretNamespace: ceph
  userId: kube
  userSecretName: ceph-secret-kube
  fsType: "xfs"
  imageFormat: "2"
  imageFeatures: "layering"
reclaimPolicy: Delete
allowVolumeExpansion: true
EOF
```

* 调整 PVC 大小

```bash
# 方式一
$ kubectl -n dynamic-ns edit pvc/dynamic-pvc1

# 方式二
$ cat <<EOF | kubectl -n dynamic-ns apply -f -
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: dynamic-pvc1
spec:
  storageClassName: rbd
  accessModes:
  - ReadWriteOnce
  resources:
    requests:
      storage: 3Gi
EOF
```

## 建议

由于每个 Namespace 都要求创建一个 `userSecretName`（必须和 PVC 在一个 Namespace），这在很多时候增大了麻烦（比如使用 Helm 在新的 Namespace 创建应用时），建议实现一个 Kubernetes Exporter，当创建 Namespace 时自动创建一个默认的 Secret（可以取名叫 `namespace-exporter`，当创建一个 Namespace 时自动创建其他资源对象，就跟自动创建 `default` ServiceAccount 一样）。-- 参考 app-management 章节。

@jamiehannaford 为 StorageClass 建议了一个 `userSecretNamespace` 字段；Kubernetes v1.12 已经新增了该字段，见：<https://github.com/kubernetes/kubernetes/blob/master/pkg/volume/rbd/rbd.go#L628>

> Secret 必须和使用 rbd volume 的 Pod 在同一命名空间，见 <https://github.com/kubernetes/kubernetes/issues/47427>

## 参考

* [Persistent Storage Using Ceph Rados Block Device (RBD)](https://docs.openshift.com/container-platform/3.5/install_config/persistent_storage/persistent_storage_ceph_rbd.html)
* [Complete Example Using Ceph RBD for Dynamic Provisioning](https://docs.openshift.com/container-platform/3.5/install_config/storage_examples/ceph_rbd_dynamic_example.html)
* [Creating RBD Storage Class](https://github.com/ceph/ceph-docker/tree/master/examples/kubernetes#creating-rbd-storage-class)
* [RBD Volume Provisioner for Kubernetes 1.5+](https://github.com/kubernetes-incubator/external-storage/tree/master/ceph/rbd)
* [使用 Ceph RBD 为 Kubernetes 集群提供存储卷](http://tonybai.com/2016/11/07/integrate-kubernetes-with-ceph-rbd/)
* [Change the Reclaim Policy of a PersistentVolume](https://kubernetes.io/docs/tasks/administer-cluster/change-pv-reclaim-policy/)
* [Error creating rbd image: executable file not found in $PATH](https://github.com/kubernetes/kubernetes/issues/38923#issuecomment-315255075)
* [Storage for Containers Using Ceph RBD](https://keithtenzer.com/2017/04/07/storage-for-containers-using-ceph-rbd-part-iv/)
