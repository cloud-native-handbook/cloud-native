# Docker Registry

## 创建 rgw 用户

* S3 接口

由 `Ceph 管理员` 创建一个提供 s3 接口的 Ceph radosgw 用户。Radosgw 用户不同于 RBD 用户，即使用户名相同也没关系。

```bash
# 创建新用户
$ radosgw-admin user create --uid="kube" --display-name="kubernetes user"

# 查看用户信息
$ radosgw-admin user info --uid="kube"
```

* Swift 接口

当前 registry 只支持使用 swift 协议访问 ceph rgw 对象存储，暂时不支持 s3 协议。

```bash
# 创建子账户并授权
$ radosgw-admin subuser create --uid="kube" --subuser=kube:registry --access=full --secret=secretkey --key-type=swift

# 创建/更新 secret key
$ radosgw-admin key create --subuser=kube:registry --key-type=swift --gen-secret
```


## Docker 直接部署

Registry 的配置可以使用环境变量来设置，具体的配置可以查看 [Docker 文档](https://docs.docker.com/registry/configuration/#list-of-configuration-options)。

### 无认证

每个 Swift Container 只能被一个用户使用，否则会创建失败：`panic: Failed to retrieve info about container registry (HTTP Error: 401: 401 Unauthorized)`。

```bash
$ docker run -it --rm --name registry -p 8000:8000 \
  -e REGISTRY_HTTP_ADDR="0.0.0.0:8000" \
  -e REGISTRY_STORAGE="swift" \
  -e REGISTRY_STORAGE_SWIFT_AUTHURL="http://192.168.10.201:7480/auth/v1" \
  -e REGISTRY_STORAGE_SWIFT_USERNAME="kube:registry" \
  -e REGISTRY_STORAGE_SWIFT_PASSWORD="PHt3hIcjGQsCTkIwaBR9GLsxAjHt1RJoDcArWtc9" \
  -e REGISTRY_STORAGE_SWIFT_CONTAINER="kube-registry" \
  registry:2.6
```

测试一下：

```bash
# 上传镜像
$ docker tag nginx:alpine 192.168.10.50:8000/nginx:alpine
$ docker push 192.168.10.50:8000/nginx:alpine

# 查询镜像
$ curl http://localhost:8000/v2/_catalog
```

### HTTP Basic 认证

```bash
# 创建 htpasswd 认证文件（如果采用挂载到容器的方式，则支持动态追加）
$ docker run --rm --entrypoint htpasswd registry:2.6 -Bbn admin adm123 >> /tmp/htpasswd

# 设置 HTTP Basic 认证信息
$ docker run -it --rm --name registry -p 8000:8000 \
  -e REGISTRY_HTTP_ADDR="0.0.0.0:8000" \
  -e REGISTRY_STORAGE="swift" \
  -e REGISTRY_STORAGE_SWIFT_AUTHURL="http://192.168.10.201:7480/auth/v1" \
  -e REGISTRY_STORAGE_SWIFT_USERNAME="kube:registry" \
  -e REGISTRY_STORAGE_SWIFT_PASSWORD="PHt3hIcjGQsCTkIwaBR9GLsxAjHt1RJoDcArWtc9" \
  -e REGISTRY_STORAGE_SWIFT_CONTAINER="kube-registry" \
  -e REGISTRY_AUTH_HTPASSWD_REALM="basic-realm" \
  -e REGISTRY_AUTH_HTPASSWD_PATH="/auth/htpasswd" \
  -v /tmp/htpasswd:/auth/htpasswd \
  registry:2.6
```

客户端测试一下：

```bash
# 由于 registry 没有添加 tls 认证，所以客户端的 docker daemon 需要添加 --insecure-registry 参数并重启
# dockerd --insecure-registry=192.168.10.0/24 ...

# 登录
$ docker login 192.168.10.50:8000
Username: admin
Password: adm123

# 上传镜像
$ docker tag nginx:alpine 192.168.10.50:8000/nginx:alpine
$ docker push 192.168.10.50:8000/nginx:alpine
```

对于 k8s 而言，创建 htpasswd 可以使用 initContainer 事先创建好。



## 创建 Secret

```bash
$ kubectl create secret docker-registry myregistrykey --docker-server=DOCKER_REGISTRY_SERVER --docker-username=DOCKER_USER --docker-password=DOCKER_PASSWORD --docker-email=DOCKER_EMAIL
```


## Kubernetes 部署 - 使用 Ceph RBD

假设你已经按要求创建好了 [Ceph RBD StorageClass](../../volumes/ceph/rbd/README.md)，另外不要忘记在下面的命名空间创建 RBD Secret。

### 创建 PVC

```bash
# 专属命名空间
$ kubectl create namespace kube-registry

# 在当前命名空间创建 RBD Secret
$ cat <<EOF | kubectl -n kube-registry apply -f -
apiVersion: v1
kind: Secret
metadata:
  name: ceph-secret-kube
type: kubernetes.io/rbd
data:
  key: QVFCRkNGOWErZExhSEJBQTR5S3FJaE1Zb1Q0RG1BV25HMDhYRkE9PQ==
EOF

# 使用了 "rbd" StorageClass
$ cat <<EOF | kubectl -n kube-registry apply -f -
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: registry
spec:
  storageClassName: rbd
  accessModes:
  - ReadWriteOnce
  resources:
    requests:
      storage: 10G
EOF
```

### 部署 Registry 配置

* ConfigMap

```bash
$ cat <<EOF | kubectl -n kube-registry apply -f -
apiVersion: v1
kind: ConfigMap
metadata:
  name: registry-config
data:
  config.yml: |
    version: 0.1
    log:
      fields:
        service: registry
    storage:
      cache:
        blobdescriptor: inmemory
      filesystem:
        rootdirectory: /var/lib/registry
    http:
      addr: :5000
      headers:
        X-Content-Type-Options: [nosniff]
      tls:
        key: /tls/registry-key.pem
        certificate: /tls/registry.pem
    auth:
      htpasswd:
        realm: basic-realm
        path: /auth/htpasswd
    health:
      storagedriver:
        enabled: true
        interval: 10s
        threshold: 3
EOF
```

* Secret

```bash
$ mkdir -p /auth

# 生成 htpasswd
$ docker run --rm --entrypoint=htpasswd registry:2.6 -Bbn kube kube123 >> /auth/htpasswd

# 生成 Secret
$ kubectl -n kube-registry create secret generic registry-auth --from-file=htpasswd=/auth/htpasswd
```

如果希望增加新用户，追加用户和密码到 `/auth/htpasswd` 并更新 Secret 即可。

### Registry TLS 证书

```bash
$ mkdir -p /etc/kubernetes/csr

$ cat <<EOF > /etc/kubernetes/csr/registry-csr.json
{
  "CN": "registry",
  "hosts": [
    "127.0.0.1",
    "registry.kube-registry.svc"
    "registry.kube-registry.svc.cluster.local"
  ],
  "key": {
    "algo": "rsa",
    "size": 2048
  },
  "names": [
    {
      "C": "CN",
      "ST": "ShangHai",
      "L": "ShangHai",
      "O": "kube"
    }
  ]
}
EOF
```

```bash
$ cd /etc/kubernetes/pki

# 生成证书
$ cfssl gencert -ca=kubernetes-ca.pem \
  -ca-key=kubernetes-ca-key.pem \
  -config=kubernetes-ca-config.json \
  -profile=server /etc/kubernetes/csr/registry-csr.json | cfssljson -bare registry

$ mv /etc/kubernetes/pki/registry.csr /etc/kubernetes/csr
$ ls registry*.pem
registry-key.pem  registry.pem
```

* 创建 tls Secret

```bash
$ kubectl -n kube-registry create secret tls registry-tls \
  --cert=/etc/kubernetes/pki/registry.pem --key=/etc/kubernetes/pki/registry-key.pem
```

### 部署 Registry

```bash
$ cat <<EOF | kubectl -n kube-registry apply -f -
apiVersion: v1
kind: Service
metadata:
  name: registry
spec:
  type: ClusterIP
  selector:
    app: registry
  ports:
  - name: api
    port: 80
    targetPort: api
    protocol: TCP
---
apiVersion: apps/v1beta2
kind: Deployment
metadata:
  name: registry
spec:
  replicas: 1
  selector:
    matchLabels:
      app: registry
  template:
    metadata:
      labels:
        app: registry
    spec:
      containers:
      - name: registry
        image: registry:2.6
        imagePullPolicy: IfNotPresent
        ports:
        - name: api
          containerPort: 5000
        volumeMounts:
        - name: config
          mountPath: /etc/docker/registry
        - name: htpasswd
          mountPath: /auth
        - name: tls
          mountPath: /tls
        - name: data
          mountPath: /var/lib/registry
      volumes:
      - name: config
        configMap:
          name: registry-config
          items:
          - key: config.yml
            path: config.yml
      - name: htpasswd
        secret:
          secretName: registry-auth
          items:
          - key: htpasswd
            path: htpasswd
      - name: tls
        secret:
          secretName: registry-tls
          items:
          - key: tls.key
            path: registry-key.pem
          - key: tls.crt
            path: registry.pem
      - name: data
        persistentVolumeClaim:
          claimName: registry
EOF
```

### 上传镜像

```bash
# 登录
$ docker login registry.kube-registry.svc.cluster.local
Username: kube
Password: kube123

# 上传镜像
$ docker tag nginx:alpine registry.kube-registry.svc.cluster.local/nginx:alpine
$ docker push registry.kube-registry.svc.cluster.local/nginx:alpine
```


### 创建示例 Pod

* 创建登录 registry 的认证信息

```bash
$ kubectl -n kube-registry create secret docker-registry registry-login \
  --docker-server=registry.kube-registry.svc.cluster.local \
  --docker-username=kube \
  --docker-password=kube123 \
  --docker-email=jinsyin@gmail.com
```

* 示例 Pod

```yaml
$ cat <<EOF | kubectl -n kube-registry apply -f -
apiVersion: v1
kind: Pod
metadata:
  name: private-pod
spec:
  containers:
  - name: nginx
    image: registry.kube-registry.svc.cluster.local/nginx:alpine
    imagePullPolicy: Always
    ports:
    - name: nginx
      containerPort: 80
  imagePullSecrets:
  - name: registry-login
EOF
```

```bash
$ kubectl -n kube-registry get svc,pod -o wide
```


## 使用 Ceph Radosgw 对象存储部署

### HA Radosgw

默认的 Ceph Radosgw 并未提供高可用机制，如果你所在的公司没有 L4/L7 层负载均衡，可以利用 Kubernetes 的 Service/Endpoints 为 Radosgw 提供高可用支持。

```bash
$ cat <<EOF | kubectl -n registry apply -f -
apiVersion: v1
kind: Service
metadata:
  name: radosgw
spec:
  type: ClusterIP
  sessionAffinity: ClientIP
  ports:
  - name: api
    port: 7480
    targetPort: api
---
apiVersion: v1
kind: Endpoints
metadata:
  name: radosgw
subsets:
- addresses:
  - ip: 192.168.10.200
  - ip: 192.168.10.201
  - ip: 192.168.10.202
  ports:
  - name: api
    port: 7480
    protocol: TCP
EOF
```

### Secret 存储用户名和密码

```bash
$ echo "kube:registry" | base64
a3ViZTpyZWdpc3RyeQo=

$ echo "PHt3hIcjGQsCTkIwaBR9GLsxAjHt1RJoDcArWtc9" | base64
UEh0M2hJY2pHUXNDVGtJd2FCUjlHTHN4QWpIdDFSSm9EY0FyV3RjOQo=

$ cat <<EOF | kubectl -n registry apply -f -
apiVersion: v1
kind: Secret
metadata:
  name: registry-cm
spec:
  swift.username: a3ViZTpyZWdpc3RyeQo=
  swift.password: UEh0M2hJY2pHUXNDVGtJd2FCUjlHTHN4QWpIdDFSSm9EY0FyV3RjOQo=
EOF
```





* run the registry

使用块存储或者文件系统：

```yaml
apiVersion: v1
kind: ReplicationController
metadata:
  name: kube-registry-v0
  namespace: kube-system
  labels:
    k8s-app: kube-registry-upstream
    version: v0
    kubernetes.io/cluster-service: "true"
spec:
  replicas: 1
  selector:
    k8s-app: kube-registry-upstream
    version: v0
  template:
    metadata:
      labels:
        k8s-app: kube-registry-upstream
        version: v0
        kubernetes.io/cluster-service: "true"
    spec:
      containers:
      - name: registry
        image: registry:2
        resources:
          limits:
            cpu: 100m
            memory: 100Mi
        env:
        - name: REGISTRY_HTTP_ADDR
          value: :5000
        - name: REGISTRY_STORAGE_FILESYSTEM_ROOTDIRECTORY
          value: /var/lib/registry
        volumeMounts:
        - name: image-store
          mountPath: /var/lib/registry
        ports:
        - containerPort: 5000
          name: registry
          protocol: TCP
      volumes:
      - name: image-store
        persistentVolumeClaim:
          claimName: kube-registry-pvc
```

* Expose the registry in the cluster

```yaml
apiVersion: v1
kind: Service
metadata:
  name: kube-registry
  namespace: kube-system
  labels:
    k8s-app: kube-registry-upstream
    kubernetes.io/cluster-service: "true"
    kubernetes.io/name: "KubeRegistry"
spec:
  selector:
    k8s-app: kube-registry-upstream
  ports:
  - name: registry
    port: 5000
    protocol: TCP
```


## Kubernetes swift 部署

```bash
$ kubectl apply -f docker-registry.namespace.yaml
$ kubectl apply -f rbd-secret-admin.secret.docker-registry.yaml

$ # 创建 htpasswd，用于 docker login
$ docker run -it --entrypoint htpasswd registry:2.6 -Bbn root root123456 > htpasswd
$ kubectl -n=docker-registry create secret generic registry-auth-secret --from-file=htpasswd=htpasswd

$ kubectl apply -f registry-swift.deploy.docker-registry.yaml

$ # 暴露 registry 到集群内并且增加了一个 ingress
$ kubectl apply -f registry-swift.svc+ing.docker-registry.yaml

$ # 暴露 registry 到集群外，在集群内直接使用 “localhost:5000/user/image”
$ # 实测发现不能使用 NodePort 来暴露 registry 到集群外，不过可以使用这个来代理 https://github.com/kubernetes/kubernetes/tree/release-1.6/cluster/addons/registry#expose-the-registry-on-each-node
$ kubectl apply -f registry-proxy.ds.docker-registry.yaml

$ # 创建 docker login 所需的认证信息
$ kubectl -n test-ns create secret docker-registry docker-login --docker-server=localhost:5000 --docker-username=root --docker-password=root123456 --docker-email=jinsyin@gmail.com

# OR

$ kubectl -n test-ns create secret docker-registry docker-login --docker-server=registry-swift.docker-registry.svc.cluster.local:5000 --docker-username=root --docker-password=root123456 --docker-email=jinsyin@gmail.com
```

```bash
$ curl http://registry.docker-registry.svc.cluster.local/v2/_catalog
```

```bash
$ docker run -it --entrypoint htpasswd registry:2.6.1 -Bbn yiwei yiweibigdata > /etc/docker/auth/htpasswd
```


## 参考

* [Configuring a registry](https://docs.docker.com/registry/configuration)
* [Private Docker Registry in Kubernetes](https://github.com/kubernetes/kubernetes/tree/master/cluster/addons/registry)

* images

> https://kubernetes.io/docs/concepts/containers/images/

## 参考

* [Kubernetes 从 Private Registry 中拉取容器镜像的方法](http://tonybai.com/2016/11/16/how-to-pull-images-from-private-registry-on-kubernetes-cluster/)

* [Private Docker Registry in Kubernetes](https://github.com/kubernetes/kubernetes/tree/master/cluster/addons/registry)
* [Enable TLS for Kube-Registry](https://github.com/kubernetes/kubernetes/tree/master/cluster/addons/registry/tls)


> https://www.jianshu.com/p/d3277b09d657