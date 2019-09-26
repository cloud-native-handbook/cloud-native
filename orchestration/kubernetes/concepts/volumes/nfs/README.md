# NFS

NFS 是 Network File System 的缩写，即网络文件系统，主要用于跨平台的文件共享。

## 部署 NFS

### RBAC

```yaml
kind: ClusterRole
apiVersion: rbac.authorization.k8s.io/v1alpha1
metadata:
  name: nfs-client-provisioner-runner
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

---

kind: ClusterRoleBinding
apiVersion: rbac.authorization.k8s.io/v1alpha1
metadata:
  name: run-nfs-client-provisioner
subjects:
  - kind: ServiceAccount
    name: nfs-client-provisioner
    namespace: default
roleRef:
  kind: ClusterRole
  name: nfs-client-provisioner-runner
  apiGroup: rbac.authorization.k8s.io

---

apiVersion: storage.k8s.io/v1beta1
kind: StorageClass
metadata:
  name: managed-nfs-storage
provisioner: fuseim.pri/ifs

---

apiVersion: v1
kind: ServiceAccount
metadata:
  name: nfs-client-provisioner
```

### 部署

```yaml
kind: Deployment
apiVersion: extensions/v1beta1
metadata:
  name: nfs-client-provisioner
spec:
  replicas: 1
  strategy:
    type: Recreate
  template:
    metadata:
      labels:
        app: nfs-client-provisioner
    spec:
      serviceAccount: nfs-client-provisioner
      containers:
        - name: nfs-client-provisioner
          image: registry-k8s.novalocal/k8s_system/nfs-client-provisioner:v1
          volumeMounts:
            - name: nfs-client-root
              mountPath: /persistentvolumes
            - name: host-time
              mountPath: /etc/localtime
              readOnly: true
          env:
            - name: PROVISIONER_NAME
              value: fuseim.pri/ifs
            - name: NFS_SERVER
              value: 192.168.0.29
            - name: NFS_PATH
              value: /data
      volumes:
        - name: nfs-client-root
          nfs:
            server: 192.168.0.29
            path: /data
        - name: host-time
          hostPath:
            path: /etc/localtime
```





## 部署 NFS server

在使用 nfs 之前，假设你已经部署好了高可用的 nfs server。如果你希望有一个测试环境，可以进行如下操作：

* nfs deployment

```bash
$ cat <<EOF | kubectl apply -f -
apiVersion: apps/v1beta1
kind: Deployment
metadata:
  name: nfs-server
spec:
  replicas: 1
  selector:
    matchLabels:
      role: nfs-server
  template:
    metadata:
      labels:
        role: nfs-server
    spec:
      containers:
      - name: nfs-server
        image: mirrorgooglecontainers/volume-nfs:0.8
        imagePullPolicy: IfNotPresent
        ports:
        - name: nfs
          containerPort: 2049
        - name: mountd
          containerPort: 20048
        - name: rpcbind
          containerPort: 111
        securityContext:
          privileged: true
        volumeMounts:
        - name: data
          mountPath: /exports
      volumes:
      - name: data
        emptyDir: {}
EOF
```

默认服务端挂载了两个目录:

  - `/exports *(rw,fsid=0,insecure,no_root_squash)`
  - `/ *(rw,fsid=0,insecure,no_root_squash)`

* nfs service

```bash
$ cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Service
metadata:
  name: nfs-server
spec:
  selector:
    role: nfs-server
  ports:
  - name: nfs
    port: 2049
    targetPort: 2049
  - name: mountd
    port: 20048
    targetPort: 20048
  - name: rpcbind
    port: 111
    targetPort: 111
EOF
```

* 获取 Service IP

```bash
$ kubectl get svc nfs-server
NAME         TYPE        CLUSTER-IP        EXTERNAL-IP   PORT(S)                      AGE
nfs-server   ClusterIP   172.254.247.253   <none>        2049/TCP,20048/TCP,111/TCP   12m
```


## 安装 nfs 客户端

在所有 k8s 节点安装 nfs 客户端组件，以便可以挂载 nfs 目录到 k8s 节点：

```bash
# centos
$ yum install -y nfs-utils

# ubuntu
$ apt-get install -y nfs-common
```


## 直接访问

```bash
# 创建用户命名空间
$ kubectl create namespace nfs-direct

$ cat <<EOF | kubectl -n direct-nfs apply -f -
apiVersion: v1
kind: Pod
metadata:
  name: direct-nfs
spec:
  containers:
  - name: nginx
    image: nginx:alpine
    imagePullPolicy: IfNotPresent
    volumeMounts:
    - name: html
      mountPath: /usr/share/nginx/html
  volumes:
  - name: html
    nfs:
      server: 192.168.1.224 # test env: 172.254.247.253
      path: "/data"         # test env: "/exports"
      readOnly: false
EOF
```

检查 Pod 是否正常运行：

```bash
$ kubectl get pod direct-nfs
NAME         READY     STATUS    RESTARTS   AGE
direct-nfs   1/1       Running   0          1m
```


## 静态 provisioning（未测试通过）

### 创建 PV

```bash
$ cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: PersistentVolume
metadata:
  name: nfs-pv
spec:
  capacity:
    storage: 1Gi
  accessModes:
  - ReadWriteMany
  nfs:
    server: 192.168.1.224 # test env: 172.254.247.253
    path: /data           # test env: "/exports"
    readOnly: false
EOF
```

检查 PV 是否处于 `Available` 状态：

```bash
$ kubectl get pv nfs-pv
NAME        CAPACITY   ACCESS MODES   RECLAIM POLICY   STATUS      CLAIM     STORAGECLASS   REASON    AGE
pv/nfs-pv   1Gi        RWX            Retain           Available                                      5s
```

### 创建 PVC

```bash
$ cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: nfs-pvc
spec:
  volumeName: nfs-pv
  storageClassName: ""
  resources:
    requests:
      storage: 1Gi
  accessModes:
  - ReadWriteMany
EOF
```

注：如果系统创建过 StorageClass，这里一定要为 `spec.storageClassName: ""`。

检查 PVC 是否成功绑定了 PV：

```bash
$ kubectl get pv nfs-pv
NAME      CAPACITY   ACCESS MODES   RECLAIM POLICY   STATUS    CLAIM             STORAGECLASS   REASON    AGE
nfs-pv    1Gi        RWX            Retain           Bound     default/nfs-pvc                            4m

$ kubectl get pvc nfs-pvc
NAME          STATUS    VOLUME    CAPACITY   ACCESS MODES   STORAGECLASS   AGE
pvc/nfs-pvc   Bound     nfs-pv    1Gi        RWX                           6s
```


### 创建示例

```bash
$ cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Pod
metadata:
  name: static-nfs
spec:
  containers:
  - name: nginx
    image: nginx:alpine
    imagePullPolicy: IfNotPresent
    volumeMounts:
    - name: html
      mountPath: /usr/share/nginx/html
  volumes:
  - name: html
    persistentVolumeClaim:
      claimName: nfs-pvc
EOF
```

检查 Pod 是否正常启动：

```bash
$ kubectl get pod static-nfs -o wide
NAME         READY     STATUS    RESTARTS   AGE       IP          NODE
static-nfs   1/1       Running   0          5m        10.32.0.4   node01
```

检查挂载情况：

```bash
node01 $ df -h | grep nfs
192.168.1.224:/data   45G   27G   16G  64% /var/lib/kubelet/pods/a03615dc-268e-11e8-afab-0242ac110041/volumes/kubernetes.io~nfs/nfs-pv
```


## 动态 provisioning

### 创建 nfs 客户端：nfs-client-provisioner

实测发现，在 kubernetes 1.8 集群环境必须将 `ClusterRole` 和 `ClusterRoleBinding` 的 apiVersion 值设置为 `rbac.authorization.k8s.io/v1beta1`，而不是 `rbac.authorization.k8s.io/v1`，否则会可能会遇到[权限问题](https://github.com/kubernetes-incubator/external-storage/issues/576)

* RBAC

```bash
$ cat <<EOF | kubectl apply -f -
kind: ClusterRole
apiVersion: rbac.authorization.k8s.io/v1beta1
metadata:
  name: nfs-client-provisioner-runner
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

---

apiVersion: v1
kind: ServiceAccount
metadata:
  name: nfs-client-provisioner

---

kind: ClusterRoleBinding
apiVersion: rbac.authorization.k8s.io/v1beta1
metadata:
  name: run-nfs-client-provisioner
subjects:
  - kind: ServiceAccount
    name: nfs-client-provisioner
    namespace: default
roleRef:
  kind: ClusterRole
  name: nfs-client-provisioner-runner
  apiGroup: rbac.authorization.k8s.io

EOF
```

* nfs-client-provisioner

```bash
$ cat <<EOF | kubectl apply -f -
apiVersion: apps/v1beta2
kind: Deployment
metadata:
  name: nfs-client-provisioner
spec:
  replicas: 1
  selector:
    matchLabels:
      app: nfs-client-provisioner
  template:
    metadata:
      labels:
        app: nfs-client-provisioner
    spec:
      serviceAccount: nfs-client-provisioner
      containers:
      - name: nfs-client-provisioner
        image: quay.io/external_storage/nfs-client-provisioner:v2.0.1
        imagePullPolicy: IfNotPresent
        env:
        - name: PROVISIONER_NAME
          value: fuseim.pri/ifs
        - name: NFS_SERVER
          value: 192.168.1.224
        - name: NFS_PATH
          value: /data
        volumeMounts:
        - name: nfs-client-root
          mountPath: /persistentvolumes
      volumes:
      - name: nfs-client-root
        nfs:
          server: 192.168.1.224
          path: "/data"
          readOnly: false
EOF
```

检查：

```bash
$ kubectl get deployment,pod | grep nfs-client-provisioner

# 一定要记得排查日志
$ kubectl logs -f po/nfs-client-provisioner-55d99c7548-gsj77
```

### 创建 StorageClass

```bash
$ cat <<EOF | kubectl apply -f -
apiVersion: storage.k8s.io/v1
kind: StorageClass
provisioner:
  fuseim.pri/ifs
metadata:
  name: nfs
EOF
```

### 创建 PVC

```bash
$ cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: dynamic-pvc
spec:
  storageClassName: nfs
  accessModes:
  - ReadWriteMany
  resources:
    requests:
      storage: 1Gi
EOF
```

查看是否创建成功：

```bash
$ kubectl get pv,pvc

# 一定要记得排查日志
$ kubectl logs -f po/nfs-client-provisioner-55d99c7548-gsj77
```

### 创建示例

```bash
$ cat <<EOF | kubectl apply -f -
apiVersion: apps/v1beta2
kind: Deployment
metadata:
  name: dynamic-nfs
spec:
  replicas: 2
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - name: nginx
        image: nginx:alpine
        imagePullPolicy: IfNotPresent
        volumeMounts:
        - name: html
          mountPath: /usr/share/nginx/html
      volumes:
      - name: html
        persistentVolumeClaim:
          claimName: dynamic-pvc
EOF
```

查看 Pod 是否启动成功：

```bash
$ kubectl get deployment dynamic-nfs
NAME          DESIRED   CURRENT   UP-TO-DATE   AVAILABLE   AGE
dynamic-nfs   2         2         2            2           14s
```

实验也证明了 NFS 是支持多节点读写的（ReadWriteOnly）。



## nfs-provisioner

## nfs-client-provisioner


## 参考

* [centos 7 下 NFS 使用与配置](https://www.cnblogs.com/jkko123/p/6361476.html?utm_source=itdadao&utm_medium=referral)
* [](https://cloud.tencent.com/document/product/457/9818/?lang=en)

> https://github.com/kubernetes/kubernetes/blob/master/examples/volumes/flexvolume/nginx-nfs.yaml


> https://github.com/kubernetes/examples/tree/master/staging/volumes/nfs


## 参考

* [Sharing an NFS Persistent Volume (PV) Across Two Pods](https://docs.openshift.org/latest/install_config/storage_examples/shared_storage.html)
