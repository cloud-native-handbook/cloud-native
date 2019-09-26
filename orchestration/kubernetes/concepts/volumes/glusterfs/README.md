# GlusterFS 持久化

## 安装客户端

* 安装

在挂载 GlusterFS 文件系统前，需要先在所有 Kubernetes Node 上安装 GlusterFS 客户端组件。为了避免出错，最好安装与 GlusterFS server 相同的版本。安装完成后，最好验证一下 Kubernetes Node 能否正常挂载。

```bash
# 添加 EPEL 源
$ yum install -y epel-release

# 添加 GlusterFS 源（312 是大版本，因为安装的 GlusterFS 的版本为 3.12.6）
$ yum install -y centos-release-gluster312

# 安装指定版本
$ gversion=3.12.6
$ yum install -y glusterfs-${gversion}* glusterfs-fuse-${gversion}* glusterfs-rdma-${gversion}*

# 验证
$ glusterfs --version
glusterfs 3.12.6
```

或

```bash
$ git clone https://github.com/JinsYin/ops.git
$ ops/glusterfs/install-glusterfs-client.sh
```

* 配置 DNS 或 hosts

如果创建 GlsuterFS 存储池使用的是 hostname 加入的集群，必须确保 Kubernetes Node 也能解析这些 hostname，否则即便使用 IP 地址也会挂载失败。

```bash
$ vi /etc/hosts
192.168.1.221 gluster1
192.168.1.222 gluster2
192.168.1.223 gluster3
```


## 定义 Endpoints & Service

```bash
# https://github.com/kubernetes/examples/blob/master/staging/volumes/glusterfs/glusterfs-endpoints.json
# https://github.com/kubernetes/examples/blob/master/staging/volumes/glusterfs/glusterfs-service.json

# Endpoints
$ cat <<EOF > gluster-endpoints.yaml
apiVersion: v1
kind: Endpoints
metadata:
  name: glusterfs
  namespace: default
subsets:
- addresses:
  - ip: 192.168.1.221
  - ip: 192.168.1.222
  - ip: 192.168.1.223
  ports:
  - name: glusterd
    port: 24007
    protocol: TCP
EOF

# Service（与 Endpoints 同名，且不需要指定 selector）
$ cat <<EOF > gluster-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: glusterfs
spec:
  type: ClusterIP
  ports:
  - name: glusterd
    port: 24007
    targetPort: 24007
EOF
```


## Pod 直接访问

如果希望 Pod 直接挂载 GlusterFS volume，必须事先创建好该 volume。

### 创建 GlusterFS volume

```bash
# 创建一个分布式卷
$ gluster volume create k8s-direct-volume gluster1:/data/gluster/k8s-direct-volume gluster2:/data/gluster/k8s-direct-volume gluster3:/data/gluster/k8s-direct-volume force

# 启动 volume
$ gluster volume start k8s-direct-volume
```

### 创建 Endpoints 和 Service

```bash
# 创建用户命名空间
$ kubectl create namespace gdirect

# 创建 Endpoints
$ kubectl -n gdirect apply -f gluster-endpoints.yaml

# 创建 Service
$ kubectl -n gdirect apply -f gluster-service.yaml

# 验证
$ kubectl -n gdirect get service,endpoints glusterfs
```

### 创建示例 Pod

```bash
# https://github.com/kubernetes/examples/blob/master/staging/volumes/glusterfs/glusterfs-pod.json

$ cat <<EOF | kubectl -n gdirect create -f -
apiVersion: v1
kind: Pod
metadata:
  name: glusterfs
spec:
  containers:
  - name: nginx
    image: nginx:alpine
    volumeMounts:
    - name: gvolume
      mountPath: /mnt/glusterfs
  volumes:
  - name: gvolume
    glusterfs:
      endpoints: glusterfs
      path: k8s-direct-volume
      readOnly: false
EOF
```

相关介绍：

  * **endpoints**: 设置了 GlusterFS 集群配置的 Endpoints 对象名。kubelet 会从 Endpoints 中随机选择一个 Gluster 节点进行挂载。如果该节点没有响应，会自动选择下一个 Gluster 节点。
  * **path**: GlusterFS volume 名。
  * **readOnly**: 设置挂载点是 readOnly（true） 还是 readWrite（false） 。

验证：

```bash
[root@kube-master-1 ~]# kubectl get pod glusterfs -o wide
NAME        READY     STATUS    RESTARTS   AGE       IP             NODE
glusterfs   1/1       Running   0          19s       172.1.199.14   kube-node-103

[root@kube-master-1 ~]# kubectl exec glusterfs -- mount | grep gluster
192.168.1.221:k8s-direct-volume on /mnt/glusterfs type fuse.glusterfs (rw,relatime,user_id=0,group_id=0,default_permissions,allow_other,max_read=131072)

[root@kube-node-103 ~]# df -h | grep k8s-direct-volume
192.168.1.221:k8s-direct-volume  126G   50G   77G  40% /var/lib/kubelet/pods/ed16570f-1c6a-11e8-a9a5-d4bed9ee2059/volumes/kubernetes.io~glusterfs/gvolume
```

小结：

GlusterFS 可以同时被多个节点/Pod 挂载用于读写。


## 静态 provisioning

Pod --> PVC --> PV Pool

### 创建 GlusterFS volume

这种方式同样需要事先在 GlusterFS 集群中创建好 GlusterFS volume 。

```bash
# 创建一个分布式卷
$ gluster volume create k8s-static-volume gluster1:/data/gluster/k8s-static-volume gluster2:/data/gluster/k8s-static-volume gluster3:/data/gluster/k8s-static-volume force

# 启动 volume
$ gluster volume start k8s-static-volume
```

### 创建 Endpoints 和 Service

```bash
# 创建用户命名空间
$ kubectl create namespace gstatic

# 创建 Endpoints
$ kubectl -n gstatic apply -f gluster-endpoints.yaml

# 创建 Service
$ kubectl -n gstatic apply -f gluster-service.yaml

# 验证
$ kubectl -n gstatic get service,endpoints glusterfs
```

### 创建 PV

```bash
$ cat <<EOF | kubectl create -f -
apiVersion: v1
kind: PersistentVolume
metadata:
  name: gluster-static-pv1
spec:
  capacity:
    storage: 1Gi
  accessModes:
  - ReadWriteMany
  glusterfs:
    endpoints: glusterfs
    path: k8s-static-volume
    readOnly: false
EOF
```

### 创建 PVC

```bash
# 如果之前有设置过其它类型的默认 StorageClass，需要先取消，否则无法正常创建 PVC
$ kubectl patch storageclass rbd -p '{"metadata": {"annotations": {"storageclass.kubernetes.io/is-default-class": "false"}}}'
```

```bash
$ kubectl create namespace gstatic

$ cat <<EOF | kubectl -n gstatic create -f -
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: gluster-static-pvc1
spec:
  volumeName: gluster-static-pv1
  accessModes:
  - ReadWriteMany
  resources:
    requests:
      storage: 1Gi
EOF
```

检查状态：

```bash
$ kubectl -n gstatic get pvc gluster-static-pvc1
NAME                  STATUS    VOLUME               CAPACITY   ACCESS MODES   STORAGECLASS   AGE
gluster-static-pvc1   Bound     gluster-static-pv1   1Gi        RWX                           5m
```

### 创建示例 Pod

```bash
```




## 动态 provisioning

### 部署 heketi

```bash
$ cat <<EOF | kubectl create -f -
apiVersion: extensions/v1beta1
kind: Deployment
metadata:
 name: heketi
 labels:
   app: heketi
spec:
 replicas: 1
 template:
   metadata:
     labels:
       app: heketi
   spec:
     containers:
     - name: heketi
       image: heketi/heketi
       ports:
       - containerPort: 8080
       volumeMounts:
       - mountPath: /etc/heketi
         name: heketi-volume
       - mountPath: /root/.ssh
         name: ssh-volume
     volumes:
     - name: ssh-volume
       hostPath:
         path: /root/.ssh # This node must be able to ssh to other nodes.
     - name: heketi-volume
       hostPath:
         path: /root/heketi
     nodeName: {{heketi_node}} # Pinned to node
EOF
```

heketi 需要使用能够免密 ssh 到 glusterfs 集群所有节点的私钥，并且 heketi 会在 glusterfs 集群将指定的分区格式化,  并调用 pvcreate 和 lvcreate 将分区组装成 volume group。

### 部署 StorageClass

```bash
$ cat <<EOF | kubectl create -f -
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: glusterfs-rep3
provisioner: kubernetes.io/glusterfs
parameters:
  resturl: "http://192.168.111.8081" # heketi 地址，也可以填域名
  clusterid: "" # 可选，要使用的集群 id
  restuser: "admin" # 可选，authentication 的用户名
  secretNamespace: "default" # 可选，authentication 的密码所在的 secret 所在的 namespace
  secretName: "heketi-secret" # 可选，authentication 的密码所在的 secret
  gidMin: "40000" # 能够使用的最小 gid，可选，每个 gluster volume 都有唯一的 gid
  gidMax: "50000" # 能够使用的最大 gid，可选
  volumeType: "replicate:3" # 可选，glusterfs 的 volume 类型，数字为副本数量
EOF
```

相关说明：

  * **volumeType**: 这里的设置的副本为 3。同理，我们 也可以定义其他不同 volumeType 的 StorageClass，比如 `disperse:4:2`，表示使用纠错卷（disperse），即每 4 份 brick 做 2 份冗余。`volumeType:none` 或者不设置该字段将会默认使用分布式卷。


```yaml
kind: StorageClass
apiVersion: storage.k8s.io/v1
metadata:
  name: gluster-vol-default
provisioner: kubernetes.io/glusterfs
parameters:
  resturl: "http://192.168.10.100:8080"
  restuser: ""
  secretNamespace: ""
  secretName: ""
allowVolumeExpansion: true
```

### 创建 PVC

创建 pvc 后，Kubernetes 会调用 heketi 的 create volume API。之后 heketi 将会去检查 glusterfs 集群的可用空间。本文指定了 rep3 的 storageclass, 所以需要 3 个节点有至少 10G 的可用磁盘空间。如果满足条件，Kubernetes 则会创建相应大小的 PV （Persistent Volume），并绑定该 PVC。否则，该 PVC 将一直停留在 pending 状态。

```bash
$ cat <<EOF | kubectl -n gdynamic create -f -
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: gluster-dynamic-pvc1
spec:
  storageClassName: glusterfs-rep3
  accessModes:
  - ReadWriteMany
  resources:
    requests:
      storage: 2Gi
EOF
```

检查：

```bash
$ kubectl -n gdynamic get pvc
```

### 创建示例 Deployment

```bash
$ cat <<EOF | kubectl -n gdynamic create -f -
apiVersion: apps/v1beta1
kind: Deployment
metadata:
  name: glusterfs
spec:
  replicas: 1
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      name: nginx
      labels:
        app: nginx
    spec:
      containers:
      - name: nginx
        image: nginx:alpine
        volumeMounts:
        - name: gvolume
          mountPath: /mnt/gluster
      volumes:
      - name: gvolume
        persistentVolumeClaim:
          claimName: gluster-static-pvc1
EOF
```

检查：

```bash
# 检查状态
$ kubectl -n gdynamic get pod
NAME                         READY     STATUS    RESTARTS   AGE
glusterfs-69d947bcbf-gnmqm   1/1       Running   0          1m

# 增加 deployment 的数量并查看变化
$ kubectl -n gdynamic scale deployment glusterfs --replicas=3

# 结果显示 3 个 Pod 都可以正常挂载，说明 GlusterFS 是支持多节点读写的（ReadWriteMany）
$ kubectl -n gdynamic get pod
NAME                         READY     STATUS    RESTARTS   AGE
glusterfs-69d947bcbf-465vs   1/1       Running   0          5s
glusterfs-69d947bcbf-gnmqm   1/1       Running   0          2m
glusterfs-69d947bcbf-jrxwh   1/1       Running   0          5s
```

### 创建示例 StatefulSet

```bash
```



## StorageClass

```yaml
# storage_class.yaml
apiVersion: storage.k8s.io/v1beta1
kind: StorageClass
metadata:
  name: glusterfs-storage
  namespace: gfs
provisioner: kubernetes.io/glusterfs
parameters:
  resturl: "https://heketi.example.com"
```

```yaml
# ingress.yaml
apiVersion: extensions/v1beta1
kind: Ingress
metadata:
  name: heketi
  namespace: gfs
spec:
  rules:
  - host: heketi.example.com
    http:
      paths:
      - path: /
        backend:
          serviceName: heketi
          servicePort: heketi
```

```yaml
# topology.json
{
  "clusters": [
    {
      "nodes": [
        {
          "node": {
            "hostnames": {
              "manage": [
                "192.168.254.110"
              ],
              "storage": [
                "192.168.254.110"
              ]
            },
            "zone": 1
          },
          "devices": [
            "/dev/sdb",
            "/dev/sdc",
            "/dev/sdd",
            "/dev/sde",
            "/dev/sdf"
          ]
        },
        {
          "node": {
            "hostnames": {
              "manage": [
                "192.168.254.120"
              ],
              "storage": [
                "192.168.254.120"
              ]
            },
            "zone": 1
          },
          "devices": [
            "/dev/sdb",
            "/dev/sdc",
            "/dev/sdd",
            "/dev/sde",
            "/dev/sdf"
          ]
        },
        {
          "node": {
            "hostnames": {
              "manage": [
                "192.168.254.130"
              ],
              "storage": [
                "192.168.254.130"
              ]
            },
            "zone": 1
          },
          "devices": [
            "/dev/sdb",
            "/dev/sdc",
            "/dev/sdd",
            "/dev/sde",
            "/dev/sdf"
          ]
        }
      ]
    }
  ]
}
```


## 参考

* [Kubernetes Examples - GlusterFS](https://github.com/kubernetes/examples/blob/master/staging/volumes/glusterfs/README.md)
* [才云工程师原创 | Kubernetes dynamic provisioning 及 glusterfs 对](http://blog.sina.com.cn/s/blog_1571f44ad0102wxzo.html)

* [Hello World application using GlusterFS Dynamic Provisioning](https://github.com/gluster/gluster-kubernetes/blob/master/docs/examples/hello_world/README.md)


* [](https://kubernetes.feisky.xyz/plugins/glusterfs.html)

> https://github.com/kubernetes/examples/blob/master/staging/volumes/glusterfs/README.md

> http://www.cnblogs.com/jicki/p/5801712.html

> https://github.com/gluster/gluster-kubernetes
