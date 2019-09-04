# Kubernetes 使用 Ceph RBD

## 安装 ceph-common

目前我还不完全确定客户端（k8s node）的 Ceph 版本过低是否会导致挂载错误等问题（虽然我目前实践过还没有问题），但为了减少错误的发生还是建议安装与 Ceph 服务端相同的版本。

添加 ceph 库（阿里云）：

```bash
$ vi /etc/yum.repos.d/ceph.repo
[ceph]
name=Ceph packages for $basearch
baseurl=http://mirrors.aliyun.com/ceph/rpm-jewel/el7/$basearch
enabled=1
priority=2
gpgcheck=1
type=rpm-md
gpgkey=https://mirrors.aliyun.com/ceph/keys/release.asc

[ceph-noarch]
name=Ceph noarch packages
baseurl=http://mirrors.aliyun.com/ceph/rpm-jewel/el7/noarch
enabled=1
priority=2
gpgcheck=1
type=rpm-md
gpgkey=https://mirrors.aliyun.com/ceph/keys/release.asc

[ceph-source]
name=Ceph source packages
baseurl=http://mirrors.aliyun.com/ceph/rpm-jewel/el7/SRPMS
enabled=0
priority=2
gpgcheck=1
type=rpm-md
gpgkey=https://mirrors.aliyun.com/ceph/keys/release.asc
```

在所有 kubernetes node 节点上安装 ceph-common。

```bash
$ yum install -y ceph-common
```


## 创建 Ceph Secret

获取 `client.admin` 用户的 key，并将其转换为 base64 编码：

```bash
$ ceph auth get-key client.admin | base64
QVFBUGo3ZFpCMk5jTlJBQW5ZNVdNM1NLQzhldVA5d3JJajBvWFE9PQ==
```

创建 `ceph-secret.yaml` 文件，并根据上面的命令得到的结果修改 `data.key` 字段的值。

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: ceph-secret
type: "kubernetes.io/rbd"
data:
  key: QVFBUGo3ZFpCMk5jTlJBQW5ZNVdNM1NLQzhldVA5d3JJajBvWFE9PQ==
```

```bash
$ kubectl create -f ceph-secret.yaml
```

## 创建 Ceph 镜像

 2.1 禁用rbd features

rbd image有4个 features，layering, exclusive-lock, object-map, fast-diff, deep-flatten
因为目前内核仅支持layering，修改默认配置
每个ceph node的/etc/ceph/ceph.conf 添加一行
rbd_default_features = 1
这样之后创建的image 只有这一个feature

验证方式：

```bash
$ ceph --show-config | grep rbd | grep features
rbd_default_features = 1
```

rbd 块ceph 支持两种格式：
format 1 - 新建 rbd 映像时使用最初的格式。此格式兼容所有版本的 librbd 和内核模块，但是不支持较新的功能，像克隆。（默认）

format 2 - 使用第二版 rbd 格式， librbd 和 3.11 版以上内核模块才支持（除非是分拆的模块）。此格式增加了克隆支持，使得扩展更容易，还允许以后增加新功能。

为使用rbd 块新特性，使用格式2

> http://www.damonyi.cc/%E4%BD%BF%E7%94%A8ceph-rbd%E4%BD%9C%E4%B8%BAkubernetes-%E5%8D%B7/


2.2

先在 ceph 集群中创建一个 pool，命令行中的两个数字分别表示 pg 和 pgp：

```bash
$ ceph osd pool create kube 8 8
pool 'kube' created

$ rbd create kube/foo --size 1G

$ # OK
$ rbd create kube/foo --size 1G --image-format 2 --image-feature layering
```

```bash
$ rbd ls -p kube
```

如果不指定 `--image-feature layering`，会提示以下错误：

```bash
$ kubectl describe pod <pod-name>
rbd: sysfs write failed
2017-09-13 17:23:36.775150 7f0c3a0e9d80 -1 auth: unable to find a keyring on /etc/ceph/ceph.client.admin.keyring,/etc/ceph/ceph.keyring,/etc/ceph/keyring,/etc/ceph/keyring.bin: (2) No such file or directory
RBD image feature set mismatch. You can disable features unsupported by the kernel with "rbd feature disable".
In some cases useful info is found in syslog - try "dmesg | tail" or so.
rbd: map failed: (6) No such device or address
```

如果不指定 `--image-format 2`，会提示以下错误：

```bash
$ kubectl describe pod <pod-name>
1m  1m  1 kubelet, centos-compute-101   Warning FailedMount Unable to mount volumes for pod "rbd2_default(10e26753-9865-11e7-838b-408d5cfaed4a)": timeout expired waiting for volumes to attach/mount for pod "default"/"rbd2". list of unattached/unmounted volumes=[rbdpd]
1m  1m  1 kubelet, centos-compute-101   Warning FailedSync  Error syncing pod, skipping: timeout expired waiting for volumes to attach/mount for pod "default"/"rbd2". list of unattached/unmounted volumes=[rbdpd]
1m  1m  1 kubelet, centos-compute-101   Warning FailedMount (events with common reason combined)
```


## 部署一个 Pod 来测试一下

创建 `pod-with-secret.yaml` 文件，将 `rbd.monitors` 指定为你自己的，`rbd.fsType` 根据你创建 Ceph OSD 时指定的文件系统来设置。

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: pod-using-pv
spec:
  containers:
    - image: nginx:alpine
      name: rbd-nginx
      volumeMounts:
      - name: nginx-rbd
        mountPath: /usr/share/nginx/html
  volumes:
    - name: nginx-rbd
      rbd:
        monitors: 
        - '192.168.10.200:6789'
        - '192.168.10.201:6789'
        - '192.168.10.202:6789'
        pool: kube
        image: pod-storage
        fsType: xfs
        readOnly: true
        user: admin
        secretRef:
          name: ceph-secret
```

```bash
$ kubectl create -f pod-with-secret.yaml
```

实测发现，删除 pod 后 ceph 中的数据并没有被删除（rbd ls kube）。

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: rbd
spec:
  containers:
    - image: kubernetes/pause
      name: rbd-rw
      volumeMounts:
      - name: rbdpd
        mountPath: /mnt/rbd
  volumes:
    - name: rbdpd
      rbd:
        monitors:
        - '192.168.10.200:6789'
        - '192.168.10.201:6789'
        - '192.168.10.202:6789'
        pool: kube
        image: foo
        fsType: xfs
        readOnly: true
        user: admin
        keyring: /etc/ceph/keyring
        # 下面两个参数可选
        imageformat: "2"
        imagefeatures: "layering"
```

如果部署失败，可以先查看该 Pod 调度到了哪个 Node 上，然后在该节点上查看日志： `dmesg | tail`。

```bash
$ kubectl get pods -o wide
rbd2   0/1   ContainerCreating   0   3m   <none>   centos-compute-101

[root@centos-compute-101 ~]# dmesg | tail
```

如果部署成功，可以在调度节点上查看：

```bash
$ mount | grep rbd
/dev/rbd0 on /var/lib/kubelet/plugins/kubernetes.io/rbd/rbd/kube-image-foo type xfs (ro,relatime,attr2,inode64,sunit=8192,swidth=8192,noquota)
/dev/rbd0 on /var/lib/kubelet/pods/7fb92122-9861-11e7-838b-408d5cfaed4a/volumes/kubernetes.io~rbd/rbdpd type xfs (ro,relatime,attr2,inode64,sunit=8192,swidth=8192,noquota)
```

## Ceph PV

直接使用 Volume 方式挂载的 Ceph rbd，会随着 Pod 的释放而被删除，并且每次指定挂载卷都需要设置一堆的 ceph 配置参数，所以通常选用 PV 或者 StorageClass 方式来挂载 rbd。

依然事先创建好 ceph 镜像（下图中的 nginx-img），以及 Ceph 存储池（kube），否则创建 Pod 的时候会失败（不过创建 PV、PVC 并不会失败）:

```bash
$ ceph osd pool create kube 8 8

$ rbd create kube/nginx-storage --size 5G --image-format 2 --image-feature layering
```

先创建一个 PV （nginx-pv.yaml）：

```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: nginx-pv
spec:
  capacity:
    storage: 5Gi
  accessModes:
    - ReadWriteOnce
  rbd:
    monitors:
      - 192.168.10.200:6789
      - 192.168.10.201:6789
      - 192.168.10.202:6789
    pool: kube
    image: nginx-storage
    user: admin
    secretRef:
      name: ceph-secret
    fsType: xfs
    readOnly: false
  persistentVolumeReclaimPolicy: Retain
```

回收策略（persistentVolumeReclaimPolicy）如果选用 `Recycle` 会提示以下错误：

```
$ kubectl describe pv nginx-pv
35s   35s  1 persistentvolume-controller  Warning  VolumeFailedRecycle No recycler plugin found for the volume!
```

再创建一个 PVC（nginx-pvc.yaml）：

```yaml
kind: PersistentVolumeClaim
apiVersion: v1
metadata:
  name: nginx-pvc
spec:
  accessModes:
  - ReadWriteOnce
  volumeName: nginx-pv
  resources:
    requests:
      storage: 5Gi
```

PVC 在绑定 PV 的时候，如果不指定 `spec.volumeName`，系统会自动绑定最小的的 PV，从而避免资源浪费。

创建一个 deployment（nginx-dm.yaml） 来测试（只能是一个副本）：

```yaml
apiVersion: extensions/v1beta1
kind: Deployment
metadata:
  name: nginx-rbd-dm
spec:
  replicas: 1
  template:
    metadata:
      labels:
        app: nginx-rbd
    spec:
      containers:
      - name: nginx-rbd
        image: nginx:alpine
        ports:
        - containerPort: 80
        volumeMounts:
        - name: nginx-storage
          mountPath: /usr/share/nginx/html
      volumes:
      - name: nginx-storage
        persistentVolumeClaim:
          claimName: nginx-pvc
```

如果设置多个副本，只有一个可以挂载成功，其余 Pod 会提示以下错误：

```
 41s    3s    7 kubelet, centos-compute-103     Warning   FailedMount MountVolume.SetUp failed for volume "kubernetes.io/rbd/a1d0abba-9874-11e7-838b-408d5cfaed4a-nginx-pv" (spec.Name: "nginx-pv") pod "a1d0abba-9874-11e7-838b-408d5cfaed4a" (UID: "a1d0abba-9874-11e7-838b-408d5cfaed4a") with: rbd: image nginx-img is locked by other nodes
```

## Ceph StorageClass

StorageClass 可以动态的创建 PV。

`rbd-sc.yaml`:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: rbd-class
provisioner: kubernetes.io/rbd
parameters:
  monitors: 192.168.10.200:6789,192.168.10.201:6789,192.168.10.202:6789
  pool: kube
  adminId: admin
  adminSecretName: ceph-secret
  adminSecretNamespace: default
  userId: admin
  userSecretName: ceph-secret
```

设置默认 StorageClass：

```bash
$ kubectl patch storageclass <your-class-name> -p '{"metadata": {"annotations":{"storageclass.kubernetes.io/is-default-class":"true"}}}'
```

## Ceph PVC

创建 rbd-pvc.yaml

```yaml
kind: PersistentVolumeClaim
apiVersion: v1
metadata:
  name: rbd-pvc
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: rbd-class
  resources:
    requests:
      storage: 1Gi
```


## 挂载 Pod

rbd-pod.yaml

```yaml
kind: Pod
apiVersion: v1
metadata:
  name: rbd-pod
spec:
  containers:
    - name: nginx-web
      image: nginx:alpine
      volumeMounts:
      - mountPath: /usr/share/nginx/html
        name: nginx-storage
  volumes:
    - name: nginx-storage
      persistentVolumeClaim:
        claimName: rbd-pvc
```

提示错误：

```
 26s    11s   6 default-scheduler     Warning   FailedScheduling  [SchedulerPredicates failed due to PersistentVolumeClaim is not bound: "rbd-pvc", which is unexpected., SchedulerPredicates failed due to PersistentVolumeClaim is not bound: "rbd-pvc", which is unexpected., SchedulerPredicates failed due to PersistentVolumeClaim is not bound: "rbd-pvc", which is unexpected., SchedulerPredicates failed due to PersistentVolumeClaim is not bound: "rbd-pvc", which is unexpected., SchedulerPredicates failed due to PersistentVolumeClaim is not bound: "rbd-pvc", which is unexpected.]
```


## StatefulSet

```yaml
apiVersion: apps/v1beta1
kind: StatefulSet
metadata:
  name: web
spec:
  serviceName: "nginx"
  replicas: 3
  volumeClaimTemplates:
  - metadata:
      name: test 
      annotations:
        volume.beta.kubernetes.io/storage-class: ceph-class
    spec:
      accessModes: ReadWriteOnce
      resources:
        requests:
          storage: 5Gi 
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - name: nginx
        image: nginx:alpine
        volumeMounts:
        - mountPath: /usr/share/nginx/html
          name: test
      nodeSelector:
        ceph: up
```

## 使用 external-storage

1. 部署 `rbd-provisioner` controller：

```yaml
apiVersion: extensions/v1beta1
kind: Deployment
metadata:
  name: rbd-provisioner
  namespace: kube-system
spec:
  replicas: 1
  template:
    metadata:
      labels:
        app: rbd-provisioner
    spec:
      containers:
      - name: rbd-provisioner
        image: "quay.io/external_storage/rbd-provisioner:v0.1.1"
      serviceAccountName: persistent-volume-binder
```

```bash
$  kubectl create -f https://raw.githubusercontent.com/kubernetes-incubator/external-storage/master/ceph/rbd/deployment.yaml --namespace=ceph
```

2. 配置 storage class

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: rbd 
provisioner: ceph.com/rbd
parameters:
  monitors: <ceph monitors addresses>
  pool: <pool to use>
  adminId: <admin id>
  adminSecretNamespace: <admin id secret namespace>
  adminSecretName: <admin id secret name>
  userId: <user id>
  userSecretName: <user id secret name>
```

3. 创建 PVC

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: ceph-pvc
spec:
  accessModes: 
    - ReadWriteOnce
  resources:
    requests:
      storage: 1Gi 
  storageClassName: rbd
```

## external class (ok)

创建 rbd provisioner：

```bash
$ kubectl create -f https://raw.githubusercontent.com/kubernetes-incubator/external-storage/master/ceph/rbd/deployment.yaml --namespace=default
```

namespace 必须是 kube-system（估计必须跟 kube-controller-manager 在同一个命名空间）：

`rbd-provisioner-dp.yaml` 

实测发现：不应该加环境变量（-e PROVISIONER_NAME=ceph.com/rbd）

```yaml
apiVersion: extensions/v1beta1
kind: Deployment
metadata:
  name: rbd-provisioner
  namespace: kube-system
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
        image: "quay.io/external_storage/rbd-provisioner:v0.1.1"
      serviceAccountName: persistent-volume-binder
```

```bash
$ kubectl get deploy rbd-provisioner -n kube-system

$ # 如果加了环境变量 "-e PROVISIONER_NAME=ceph.com/rbd"
$ kubectl get pod -n kube-system | grep rbd-provisioner
rbd-provisioner-4052169630-2p2ps             0/1       CrashLoopBackOff   4          5m

$ kubectl describe pod rbd-provisioner-4052169630-2p2ps -n kube-system
Error syncing pod, skipping: failed to "StartContainer" for "rbd-provisioner" with CrashLoopBackOff: "Back-off 2m40s restarting failed container=rbd-provisioner pod=rbd-provisioner-4052169630-2p2ps_kube-system(b9e23f29-9a02-11e7-838b-408d5cfaed4a)"
```

`rbd-class.yaml`

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
   name: rbd-class
provisioner: ceph.com/rbd
parameters:
    monitors: 192.168.10.200:6789,192.168.10.201:6789,192.168.10.202:6789
    pool: kube
    adminId: admin
    adminSecretName: ceph-secret
    adminSecretNamespace: default
```

```bash
$ kubectl get storageclass
```

`rbd-pvc.yaml`

```bash
$ # 参考
$ kubectl create -f https://raw.githubusercontent.com/kubernetes/examples/master/staging/persistent-volume-provisioning/claim1.json
```

创建 PVC 来测试一下：

```yaml
kind: PersistentVolumeClaim
apiVersion: v1
metadata:
  name: rbd-pvc
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: rbd-class
  resources:
    requests:
      storage: 1Gi
```

查看是否创建成功：

```bash
$ kubectl get pvc
$ kubectl describe pvc rbd-pvc
```

`rbd-pvc-deployment.yaml`

```yaml
apiVersion: extensions/v1beta1
kind: Deployment
metadata:
  name: nginx-rbd-dm
spec:
  replicas: 1
  template:
    metadata:
      labels:
        app: nginx-rbd
    spec:
      containers:
      - name: nginx-rbd
        image: nginx:alpine
        ports:
        - containerPort: 80
        volumeMounts:
        - name: nginx-storage
          mountPath: /usr/share/nginx/html
      volumes:
      - name: nginx-storage
        persistentVolumeClaim:
          claimName: rbd-pvc
```

```bash
$ kubectl get deploy
```

`rbd-statefulset.yaml`

```yaml
apiVersion: v1
kind: Service
metadata:
  name: nginx
  labels:
    app: nginx
spec:
  ports:
  - port: 80
    name: web
  clusterIP: None
  selector:
    app: nginx
---
apiVersion: apps/v1beta1
kind: StatefulSet
metadata:
  name: web
spec:
  serviceName: "nginx"
  replicas: 3
  template:
    metadata:
      labels:
        app: nginx
    spec:
      terminationGracePeriodSeconds: 10
      containers:
      - name: nginx
        image: nginx:alpine
        ports:
        - containerPort: 80
          name: web
        volumeMounts:
        - name: www
          mountPath: /usr/share/nginx/html
  volumeClaimTemplates:
  - metadata:
      name: www
    spec:
      accessModes: [ "ReadWriteOnce" ]
      storageClassName: rbd-class
      resources:
        requests:
          storage: 1Gi
```

报了个错：

```bash
$ kubectl describe pod web-0
FailedSync    Error syncing pod, skipping: timeout expired waiting for volumes to attach/mount for pod "default"/"web-0". list of unattached/unmounted volumes=[www]
```


## 使用外部存储

> https://github.com/kubernetes-incubator/external-storage/tree/master/ceph/rbd
> http://tonybai.com/2016/11/07/integrate-kubernetes-with-ceph-rbd/
> https://kubernetes.io/docs/tasks/administer-cluster/change-pv-reclaim-policy/
> https://github.com/kubernetes/kubernetes/issues/38923#issuecomment-315255075
> https://docs.openshift.org/latest/install_config/persistent_storage/dynamically_provisioning_pvs.html#ceph-persistentdisk-cephRBD
> https://github.com/ceph/ceph-docker/tree/master/examples/kubernetes
> https://github.com/ceph/ceph-docker/tree/master/examples/kubernetes#creating-rbd-storage-class
> http://www.jianshu.com/p/98337fc2e8d3