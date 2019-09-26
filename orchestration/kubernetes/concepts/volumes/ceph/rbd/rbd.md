# Kubernetes 使用 Ceph RBD

## 安装 ceph-common

为了在 Kubernetes Node 上挂载 Ceph rbd 镜像，需要在所有节点上安装 `ceph-common` 包。为避免后续可能发生的错误，请确保 `ceph-common` 的版本与 Ceph 集群的版本一致。

```bash
$ yum install -y ceph-common

# CentOS 7
$ ops/ceph/centos-install-ceph-common.sh 10.2.9

# Ubuntu 16.04
$ ops/ceph/centos-install-ceph-common.sh 10.2.9
```


## 创建 Ceph Secret

Ceph 客户端（Kubernetes node）要访问 Ceph 集群，需要先获取 keyring。获取 keyring 有两种方法：一种是将 keyring 复制到所有 k8s node 的 `/etc/ceph/keyring`，另一种是创建 Secret 来保存 keyring。相对而言，第二种方法更加简单、方便。

* 在 Ceph 集群中获取 `client.admin` 用户的 key，并将其转换为 base64 编码：

```bash
$ ceph auth get-key client.admin | base64
QVFBUGo3ZFpCMk5jTlJBQW5ZNVdNM1NLQzhldVA5d3JJajBvWFE9PQ==
```

* 在 K8s 集群中创建 `ceph-secret-admin.yaml` 文件，并将 `data.key` 字段的值修改为上面的运行结果：

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: ceph-secret-admin
type: "kubernetes.io/rbd"
data:
  key: QVFBUGo3ZFpCMk5jTlJBQW5ZNVdNM1NLQzhldVA5d3JJajBvWFE9PQ==
```

* 将 Secret 部署在 K8s 集群的 `default` 命名空间：

```bash
$ kubectl create -f ceph-secret-admin.yaml
```


## Pod 中直接使用 rbd 卷

创建 `pod-with-pv.yaml` 文件，将 `rbd.monitors` 指定为你自己的，`rbd.fsType` 根据你创建 Ceph OSD 时指定的文件系统来设置，另外需要确保 `rbd.user` 和创建 Secret 是的用户一致，当前是在 `default` 命名空间。

* pod-with-pv.yaml

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: pod-with-pv
spec:
  containers:
    - image: nginx:alpine
      name: nginx
      volumeMounts:
      - name: nginx-storage
        mountPath: /usr/share/nginx/html
  volumes:
    - name: nginx-storage
      rbd:
        monitors:
        - '192.168.10.200:6789'
        - '192.168.10.201:6789'
        - '192.168.10.202:6789'
        pool: k8pool
        image: nginx-storage
        fsType: xfs
        readOnly: true
        user: admin
        secretRef:
          name: ceph-secret-admin
```

* 部署 Pod：

```bash
$ kubectl create -f pod-with-pv.yaml
```

* 查看运行结果

```bash
$ kubectl get pods pod-with-pv
NAME          READY     STATUS              RESTARTS   AGE       IP        NODE
pod-with-pv   0/1       ContainerCreating   0          59s       <none>    ceph-node-2
```

```bash
[test@k8s-node-2 ~]# 如果没有创建 Ceph 存储池
[test@k8s-node-2 ~]$ dmesg | tail
rbd: pool k8pool does not exist

[test@k8s-node-2 ~]# 如果没有创建 rbd 镜像
[test@k8s-node-2 ~]$ dmesg | tail
rbd: image k8pool/nginx-storage does not exist
```

事实上，直接在 Pod 中使用 rbd 持久化存储必须事先创建 Ceph 储存池以及 rbd 镜像。


## 为 Pod 创建 pool 和 rbd 镜像

* 简介

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

* 在 Ceph 集群中创建 pool 和 rbd 镜像

```bash
$ ceph osd pool create k8pool 8 8
pool 'k8pool' created

$ # 创建 rbd 镜像（命名与 Pod 中定义的名称相同）
$ rbd create k8pool/nginx-storage --size 1G --image-format 2 --image-feature layering

$ # 查看镜像的状态
$ rbd status k8pool/nginx-storage
Watchers: none
```

* 重新创建 Pod

即便已经创建好了 rbd 镜像依然不能直接使用，还需要将原来的 Pod 删除在重新创建。

```bash
$ # 删除
$ kubectl delete pod pod-with-pv

$ # 重新创建
$ kubectl create -f pod-with-pv.yaml

$ # 现在 pod 已创建成功
$ kubectl get pod
NAME          READY     STATUS    RESTARTS   AGE
pod-with-pv   1/1       Running   0          3s
```

部署好 pod 后，k8pool/nginx-storage 镜像会自动进入被监听（被锁）状态。因为一个 rbd 镜像只能被一个 pod 引用（给个链接），因此其他 pod 不能再引用它，否则会提示 “rbd: image nginx-storage is locked by other nodes”。

```bash
$ rbd status k8pool/nginx-storage
Watchers:
  watcher=192.168.1.100:0/2261797945 client.5407 cookie=1
```


## PV 和 PVC

直接使用 Volume 方式挂载的 Ceph rbd，会随着 Pod 的释放而被删除（如果使用的是 kubeadm 需要确保 kube-controller-manager 中可以执行 rbd 命令，否则不会被直接删除），并且每次指定挂载卷都需要设置一堆的 ceph 配置参数，所以通常选用 PV 或者 StorageClass 方式来挂载 rbd。

可以把 PV 理解成一块云盘，在需要使用持久化存储时，需要先创建好云盘。

依然事先创建好 ceph 镜像，以及 Ceph 存储池（k8s），否则创建 Pod 的时候会失败（不过创建 PV、PVC 并不会失败）:

```bash
$ ceph osd pool create k8s 8 8

$ rbd create k8s/nginx-pv --size 5G --image-format 2 --image-feature layering
```

* 创建 PV

nginx-pv.yaml：

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
    pool: k8s
    image: nginx-pv
    user: admin
    secretRef:
      name: ceph-secret-admin
    fsType: xfs
    readOnly: false
  persistentVolumeReclaimPolicy: Delete
```

PV 的容量应该跟 rbd 镜像的大小保持一致，尽管不一致也可以，但如果 PV 的容量大于 rbd 镜像的大小，而写入的数据量超过 rbd 镜像的大小一定会存在问题。

回收策略为 Delete，即删除 PVC 时 PV 会被自动删除，但前提是使用了 Storage Class 来自动创建 PV，否则会提示 “Failed to create deleter for volume "nginx-pv": Volume has no storage class”。

创建 PV：

```bash
$ kubectl create -f nginx-pv.yaml

$ # 此时 pv 处于 Available 状态
$ kubectl get pv nginx-pv
NAME       CAPACITY   ACCESSMODES   RECLAIMPOLICY   STATUS      CLAIM     STORAGECLASS   REASON    AGE
nginx-pv   5Gi        RWO           Delete          Available                                      3s
```

* 创建 PVC

nginx-pvc.yaml

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

创建 PVC：

```bash
$ kubectl create -f nginx-pvc.yaml

$ # 绑定了 nginx-pv 这个 volume
$ kubectl get pvc
NAME        STATUS    VOLUME     CAPACITY   ACCESSMODES   STORAGECLASS   AGE
nginx-pvc   Bound     nginx-pv   5Gi        RWO                          6s

$ # pv 进入 Bound 状态
$ kubectl get pv
NAME       CAPACITY   ACCESSMODES   RECLAIMPOLICY   STATUS    CLAIM               STORAGECLASS   REASON    AGE
nginx-pv   5Gi        RWO           Delete          Bound     default/nginx-pvc                            2m
```

PVC 在绑定 PV 的时候，如果没有指定 `spec.volumeName`，并且先前已经创建好了多个 PV 时，系统会从大于或等于 PVC 请求资源的 PV 中选择最小的 PV 进行绑定，从而避免资源浪费。例如，如果系统存在 2Gi、4Gi、6Gi、8Gi 的 PV，如果创建一个请求资源为 5Gi 的 PVC 并且不指定 `spec.volumeName`，系统会自动绑定 6Gi 的 PV。


* 测试 PVC

nginx-rbd-dm.yaml

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

创建 deployment：

```bash
$ kubectl create -f nginx-rbd-dm.yaml

$ kubectl get deployments
NAME           DESIRED   CURRENT   UP-TO-DATE   AVAILABLE   AGE
nginx-rbd-dm   1         1         1            1           1m
```

如果我们将 deployment 中 pod 的数量扩展为 3 个，会发现另外两个 Pod 不可用，原因是 Ceph rbd 只能被一个 Pod 引用。如果希望动态地创建 PV 并且可以扩展有状态的 Pod，需要使用 StorageClass 和 StatefulSet。

```bash
$ kubectl scale deployment nginx-rbd-dm --replicas=3
deployment "nginx-rbd-dm" scaled

$ # 存在两个 Pod 不可用
$ kubectl get pods
NAME                            READY     STATUS              RESTARTS   AGE
nginx-rbd-dm-2943218398-8cth9   1/1       Running             0          9m
nginx-rbd-dm-2943218398-gm5tn   0/1       ContainerCreating   0          54s
nginx-rbd-dm-2943218398-tqhg7   0/1       ContainerCreating   0          1s

$ # 提示 nginx-pv 被锁
$ kubectl describe pods nginx-rbd-dm-2943218398-tqhg7
rbd: image nginx-pv is locked by other nodes
```


## StorageClass 和 PVC

StorageClass 可以根据 PVC 的请求动态地创建 PV。

首先需要有动态的卷创建一个新的 pool：

```bash
$ ceph osd pool create kube 8 8
```

* StorageClass

创建 `rbd-storage-class.yaml` 文件，

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
  adminSecretName: ceph-secret-admin
  adminSecretNamespace: default
  userId: admin
  userSecretName: ceph-secret-admin
```

创建 StorageClass：

```bash
$ kubectl create -f rbd-storage-class.yaml

$ kubectl get storageclass rbd-class
NAME        TYPE
rbd-class   kubernetes.io/rbd
```

如果 PVC 没有指定 `spec.storageClassName`，可以设置一个默认的 StorageClass：

```bash
$ kubectl patch storageclass rbd-class -p '{"metadata": {"annotations":{"storageclass.kubernetes.io/is-default-class":"true"}}}'
```

* PVC

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

创建 PVC：

```bash
$ kubectl create -f rbd-pvc.yaml

$ kubectl get pvc rbd-pvc
NAME      STATUS    VOLUME    CAPACITY   ACCESSMODES   STORAGECLASS   AGE
rbd-pvc   Pending                                      rbd-class      8m

$ # 提示报错
$ kubectl describe pvc rbd-pvc
Failed to provision volume with StorageClass "rbd-class": failed to create rbd image: executable file not found in $PATH, command output:
```

创建 PVC 报错，因为集群是采用 kubeadm 来部署的，而 `gcr.io/google_containers/kube-controller-manager-amd64` 镜像中并没有 ceph-common 包，因此在 kube-controller-manager 中无法调用 rbd 接口来创建 PV。解决办法如下：

如果是 kubeadm 1.5.x：

```bash
$ kubectl exec -it kube-controller-manager-ceph-node-1 -n kube-system -- sh
/ # apt-get update && apt-get install ceph-common
```

如果是 kubeadm 1.6.x（基础镜像是 busybox，没包管理器）：

使用 [hyperkube](https://github.com/kubernetes/kubernetes/tree/master/cluster/images/hyperkube) 来代替 kube-controller-manager，甚至所有 kubeadm 相关的镜像，因为 hyperkube 不仅集成了所有 kubeadm 相关的[工具](https://github.com/kubernetes/kubernetes/blob/master/cluster/images/hyperkube/Dockerfile)，还集成了 ceph-common。

具体镜像有两个：
  * [gcr.io/google-containers/hyperkube-amd64](https://gcr.io/google-containers/hyperkube-amd64) - 该镜像不包含 ceph-common，但提供了 apt 包管理器
  * [quay.io/coreos/hyperkube](https://quay.io/coreos/hyperkube) - 包含 ceph-common 包，但实测出现很多问题

在 master 节点上根据自己的需求将 kube-controller-manager 镜像为对应的版本：

```bash
$ # 修改镜像后 kubeadm 会自动重启该 pod
$ sed -i "s|image:.*|image: gcr.io/google-containers/hyperkube-amd64:v1.6.3|g" /etc/kubernetes/manifests/kube-controller-manager.yaml

$ # 查看是否修改成功
$ kubectl get pod kube-controller-manager-centos-compute-100 -n kube-system -o yaml | grep image

$ # 进入容器安装 ceph-common（Pod 一旦重启必须重新安装）
$ kubectl exec -it kube-controller-manager-centos-compute-100 -n kube-system -- bash
apt-get update && apt-get install -y ceph-common
```

* 测试 Pod（rbd-pod.yaml）

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

```bash
$ kubectl desribe pod rbd-pod
NAME      READY     STATUS    RESTARTS   AGE
rbd-pod   1/1       Running   0          3s
```

> http://www.jianshu.com/p/7b90e981dc57


## StatefulSet

创建 rbd-statefulset.yaml

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

```bash
$ kubectl create -f rbd-statefulset.yaml
```


## External Storage

需要确保 `kube-controller-manager` 启用了 `--enable-dynamic-provisioning=true`。

* rbd-provisioner

部署 [rbd-provisioner.yaml](https://raw.githubusercontent.com/kubernetes-incubator/external-storage/master/ceph/rbd/deployment.yaml) controller（实测发现：不应该加环境变量 “-e PROVISIONER_NAME=ceph.com/rbd”）：

```yaml
# Success
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
        env:
        - name: PROVISIONER_NAME
          value: ceph.com/rbd
      serviceAccountName: persistent-volume-binder
```

```yaml
# Fail
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
        image: "quay.io/external_storage/rbd-provisioner:v0.1.0"
        env:
        - name: PROVISIONER_NAME
          value: ceph.com/rbd
```

【注】：使用 rbd provisioner 时，PVC 应该和 rbd provisioner 在同一个命名空间；需要确保你的 kube-controller-manager 容器中没有 ceph-common，否则会因为冲突导致 rbd provisioner 创建失败；如果 kubeadm 启用了 RBAC，需要添加 Service Account。

* 创建 Secret (`rbd-secret-admin.yaml`)

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: rbd-secret-admin
type: "ceph.com/rbd"
data:
  key: QVFBUGo3ZFpCMk5jTlJBQW5ZNVdNM1NLQzhldVA5d3JJajBvWFE9PQ==
```

【注】：类型为 “ceph.com/rbd”，不再是 “kubernets.io/rbd”。

* 创建 `ceph-rbd-class.yaml` 文件并部署

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: rbd
provisioner: ceph.com/rbd
parameters:
  monitors: 192.168.10.200:6789,192.168.10.201:6789,192.168.10.202:6789
  pool: kube
  adminId: admin
  adminSecretNamespace: default
  adminSecretName: rbd-secret-admin
  userId: kube
  userSecretName: rbd-secret-admin
  imageFormat: "2"
  imageFeatures: layering
```

【注】：与之前的 StorageClass 不同的地方在于 `spec.provisioner` 是 `ceph.com/rbd` 而不是 `kubernetes.io/rbd`。

* 创建 [rbd-pvc.yaml](kubectl create -f https://raw.githubusercontent.com/kubernetes/examples/master/staging/persistent-volume-provisioning/claim1.json) 来测试

```yaml
kind: PersistentVolumeClaim
apiVersion: v1
metadata:
  name: rbd-pvc
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: rbd
  resources:
    requests:
      storage: 1Gi
```

创建并检查：

```bash
$ # 创建
$ kubectl create -f rbd-pvc.yaml
$
$ # 查看是否创建成功
$ kubectl get pvc
NAME      STATUS    VOLUME                                     CAPACITY   ACCESSMODES   STORAGECLASS     AGE
rbd-pvc   Bound     pvc-d7706b49-9cde-11e7-838b-408d5cfaed4a   1Gi        RWO           ceph-rbd-class   1m

$ # 自动创建了 pv
$ kubectl get pv
NAME                                       CAPACITY   ACCESSMODES   RECLAIMPOLICY   STATUS    CLAIM             STORAGECLASS     REASON    AGE
pvc-d7706b49-9cde-11e7-838b-408d5cfaed4a   1Gi        RWO           Delete          Bound     default/rbd-pvc   ceph-rbd-class             1m

$ # 删除 pvc
$ kubectl delete pvc rbd-pvc
persistentvolumeclaim "rbd-pvc" deleted

$ # 删除 pvc 后 pv 会自动被删除
$ kubectl get pv
No resources found.
```

* 创建 `ceph-rbd-statefulset.yaml` 来测试

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
      storageClassName: rbd
      resources:
        requests:
          storage: 1Gi
```

```bash
$ kubectl get statefulset
NAME      DESIRED   CURRENT   AGE
web       3         0         5s

$ kubectl get pods
NAME      READY     STATUS    RESTARTS   AGE
web-0     0/1       Pending   0          13s

$ kubectl get pvc
NAME        STATUS    VOLUME    CAPACITY   ACCESSMODES   STORAGECLASS   AGE
www-web-0   Pending                                      rbd-class      38s

$ kubectl describe pvc www-web-0
```

## 参考资料

* [Persistent Storage Using Ceph Rados Block Device (RBD)](https://docs.openshift.com/container-platform/3.5/install_config/persistent_storage/persistent_storage_ceph_rbd.html)
* [Complete Example Using Ceph RBD for Dynamic Provisioning](https://docs.openshift.com/container-platform/3.5/install_config/storage_examples/ceph_rbd_dynamic_example.html)
* [kubernetes statefulset 测试(ceph rbd)](http://www.jianshu.com/p/98337fc2e8d3)
* [临时解决 kube-controller-manager 无法创建 rbd image 问题](http://www.jianshu.com/p/7b90e981dc57)
* [kubernetes helm 试用](http://www.jianshu.com/p/1953b86649df)
* [Creating RBD Storage Class](https://github.com/ceph/ceph-docker/tree/master/examples/kubernetes#creating-rbd-storage-class)
* [RBD Volume Provisioner for Kubernetes 1.5+](https://github.com/kubernetes-incubator/external-storage/tree/master/ceph/rbd)
* [使用 Ceph RBD 为 Kubernetes 集群提供存储卷](http://tonybai.com/2016/11/07/integrate-kubernetes-with-ceph-rbd/)
* [Change the Reclaim Policy of a PersistentVolume](https://kubernetes.io/docs/tasks/administer-cluster/change-pv-reclaim-policy/)
* [Error creating rbd image: executable file not found in $PATH](https://github.com/kubernetes/kubernetes/issues/38923#issuecomment-315255075)
* [Storage for Containers Using Ceph RBD](https://keithtenzer.com/2017/04/07/storage-for-containers-using-ceph-rbd-part-iv/)
