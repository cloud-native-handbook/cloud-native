# 部署 Kubernetes Master 节点

kube-controller、kube-scheduler 当前需要和 kube-apiserver 部署在同一台机器上且使用非安全端口通信，故不需要证书。

## 安装组件

kube-apiserver kube-controller-manager kube-scheduler kubelet kube-proxy kubectl

```bash
$ ops/kubernetes/install-k8s-master.sh
```

## 为 kube-apiserver 签发证书

### 创建 kube-apiserver CSR 配置文件 【k8s-master-1】

```bash
$ cat > /etc/kubernetes/pki/kube-apiserver-csr.json <<EOF
{
  "CN": "kube-apiserver",
  "hosts": [
    "127.0.0.1",
    "172.72.4.11",
    "172.72.4.12",
    "172.72.4.13",
    "10.254.0.1",
    "kubernetes",
    "kubernetes.default",
    "kubernetes.default.svc",
    "kubernetes.default.svc.cluster",
    "kubernetes.default.svc.cluster.local"
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
      "O": "k8s",
      "OU": "paas"
    }
  ]
}
EOF
```

相关说明：
  * hosts 指定被认证一方（这里是 kube-apiserver）的 IP 及域名；
  * 10.254.0.1 为 "kubernetes" SVC 的 ClusterIP，通常选择 kube-apiserver 的 --service-cluster-ip-range 参数中的第一个 IP。

### 生成 kube-apiserver 证书和私钥 【k8s-master-1】

```bash
$ cd /etc/kubernetes/pki

$ cfssl gencert -ca=ca.pem -ca-key=ca-key.pem -config=ca-config.json \
--profile=kubernetes kube-apiserver-csr.json | cfssljson -bare kube-apiserver

$ ls kube-apiserver*
kube-apiserver.csr  kube-apiserver-csr.json  kube-apiserver-key.pem  kube-apiserver.pem
```

分发证书和私钥到其它 Master 节点上：

```bash
$ scp /etc/kubernetes/pki/kube-apiserver*.pem root@k8s-master-2:/etc/kubernetes/pki
$ scp /etc/kubernetes/pki/kube-apiserver*.pem root@k8s-master-3:/etc/kubernetes/pki
```


## 部署 kube-apiserver

### 开启 TLS Bootstrapping 【k8s-master-1】

kubelet 首次启动是会向 kube-apiserver 发送 TLS Bootstrapping 请求，kube-apiserver 会验证请求的 token 是否一致，以及请求用户是否有权限创建 `certificatesigningrequests`。如果 token 一致且请求用户有权限创建 `certificatesigningrequests`，则 kube-apiserver 会自动为 kubelet 下发客户端证书和私钥。

```bash
$ # 生成 token
$ head -c 16 /dev/urandom | od -An -t x | tr -d ' '
f827af2de72147ada13fc2b32cc06e30

$ cat > /etc/kubernetes/token.csv <<EOF
f827af2de72147ada13fc2b32cc06e30,kubelet-bootstrap,10001,"system:kubelet-bootstrap"
EOF

$ # 分发到其它 Master 节点上
$ scp /etc/kubernetes/token.csv root@k8s-master-2:/etc/kubernetes
$ scp /etc/kubernetes/token.csv root@k8s-master-3:/etc/kubernetes
```

相关说明：
  * token.csv：从左到右依次表示 token、用户名、用户编号、用户组。

### 为 kubelet 签发客户端证书【k8s-master-1】

如果 kubelet 启用了 `Webhook` 授权模式，kube-apiserver 必须指定 `--kubelet-client-certificate` 和 `--kubelet-client-key` 来通过 kubelet 的认证，否则执行 `kubectl exec`、`kubectl logs` 等命令出错。

#### CSR 配置：

```bash
$ mkdir -p /etc/kubernetes/csrconfig

$ cat > /etc/kubernetes/csrconfig/apiserver-kubelet-client-csr.json <<EOF
{
  "CN": "kube-apiserver-kubelet-client",
  "hosts": [
    "127.0.0.1",
    "172.72.4.11",
    "172.72.4.12",
    "172.72.4.13"
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
      "O": "system:masters"
    }
  ]
}
EOF
```

相关说明：
  * O: Organization，用户组，这里必须是 `system:masters`

#### 生成证书和私钥：

```bash
$ cd /etc/kubernetes/pki

$ cfssl gencert -ca=ca.pem -ca-key=ca-key.pem -config=ca-config.json \
--profile=kubernetes ../csrconfig/apiserver-kubelet-client-csr.json | cfssljson -bare apiserver-kubelet-client

$ # 分发到其它 Master 节点上
$ scp /etc/kubernetes/pki/apiserver-kubelet-client*.pem root@k8s-master-2:/etc/kubernetes/pki
$ scp /etc/kubernetes/pki/apiserver-kubelet-client*.pem root@k8s-master-3:/etc/kubernetes/pki
```

### 创建 kube-apiserver.service 文件 【所有 Master 节点】

Kubernetes 1.7 新增审计（Audit）功能。

Kubernetes 1.8 新增 `Node` 授权模式（--authorization-mode=Node,RBAC）。

```bash
$ # 其它 Master 分别是 172.72.4.12、172.72.4.13
$ MASTER_IP=172.72.4.11

$ vi /usr/lib/systemd/system/kube-apiserver.service
[Unit]
Description=Kubernetes API Server
Documentation=https://github.com/kubernetes/kubernetes
After=network.target

[Service]
Type=notify
User=root
ExecStart=/usr/bin/kube-apiserver \



  --requestheader-username-headers=X-Remote-User \
  --requestheader-group-headers=X-Remote-Group \
  --requestheader-extra-headers-prefix=X-Remote-Extra- \
  --requestheader-allowed-names=front-proxy-client \
  --requestheader-client-ca-file=/etc/kubernetes/pki/front-proxy-ca.crt \

  --proxy-client-key-file=/etc/kubernetes/pki/front-proxy-client.key \
  --proxy-client-cert-file=/etc/kubernetes/pki/front-proxy-client.crt \

  --admission-control=Initializers,NamespaceLifecycle,LimitRanger,ServiceAccount,PersistentVolumeLabel,DefaultStorageClass,DefaultTolerationSeconds,NodeRestriction,ResourceQuota \
  --allow-privileged=true \
  --apiserver-count=3 \
  --audit-log-maxage=30 \
  --audit-log-maxbackup=3 \
  --audit-log-maxsize=100 \
  --audit-log-path=/var/log/kubernetes/audit.log \
  --authorization-mode=Node,RBAC \
  --enable-swagger-ui=true \
  --etcd-cafile=/etc/etcd/pki/ca.pem \
  --etcd-certfile=/etc/etcd/pki/etcd.pem \
  --etcd-keyfile=/etc/etcd/pki/etcd-key.pem \
  --etcd-servers=https://172.72.4.11:2379,https://172.72.4.12:2379,https://172.72.4.13:2379 \
  --storage-backend=etcd3 \
  --advertise-address=${MASTER_IP} \
  --bind-address=${MASTER_IP} \
  --secure-port=6443 \
  --insecure-bind-address=127.0.0.1 \
  --insecure-port=8080 \
  --runtime-config=rbac.authorization.k8s.io/v1 \
  --service-account-key-file=/etc/kubernetes/pki/ca-key.pem \
  --service-cluster-ip-range=10.254.0.0/16 \
  --service-node-port-range=30000-32000 \
  --tls-cert-file=/etc/kubernetes/pki/kube-apiserver.pem \
  --tls-private-key-file=/etc/kubernetes/pki/kube-apiserver-key.pem \
  --client-ca-file=/etc/kubernetes/pki/ca.pem \
  --kubelet-preferred-address-types=InternalIP,ExternalIP,Hostname \
  --kubelet-https=true \
  --kubelet-client-key=/etc/kubernetes/pki/apiserver-kubelet-client-key.pem \
  --kubelet-client-certificate=/etc/kubernetes/pki/apiserver-kubelet-client.pem \
  --enable-bootstrap-token-auth=true \
  --token-auth-file=/etc/kubernetes/token.csv \
  --event-ttl=1h \
  --v=2
Restart=on-failure
RestartSec=5
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
```

简化版：

```bash
$ MASTER_IP=172.72.4.11

$ vi /usr/lib/systemd/system/kube-apiserver.service
[Unit]
Description=Kubernetes API Server
Documentation=https://github.com/kubernetes/kubernetes
After=network.target

[Service]
Type=notify
User=root
ExecStart=/usr/bin/kube-apiserver \
  --admission-control=Initializers,NamespaceLifecycle,LimitRanger,ServiceAccount,PersistentVolumeLabel,DefaultStorageClass,DefaultTolerationSeconds,NodeRestriction,ResourceQuota \
  --allow-privileged=true \
  --apiserver-count=3 \
  --audit-log-maxage=30 \
  --audit-log-maxbackup=3 \
  --audit-log-maxsize=100 \
  --audit-log-path=/var/log/kubernetes/audit.log \
  --authorization-mode=Node,RBAC \
  --enable-swagger-ui=true \
  --etcd-cafile=/etc/etcd/pki/ca.pem \
  --etcd-certfile=/etc/etcd/pki/etcd.pem \
  --etcd-keyfile=/etc/etcd/pki/etcd-key.pem \
  --etcd-servers=https://172.72.4.11:2379,https://172.72.4.12:2379,https://172.72.4.13:2379 \
  --storage-backend=etcd3 \
  --advertise-address=${MASTER_IP} \
  --bind-address=${MASTER_IP} \
  --secure-port=6443 \
  --insecure-bind-address=127.0.0.1 \
  --insecure-port=8080 \
  --runtime-config=rbac.authorization.k8s.io/v1 \
  --service-account-key-file=/etc/kubernetes/pki/ca-key.pem \
  --service-cluster-ip-range=10.254.0.0/16 \
  --service-node-port-range=30000-32000 \
  --tls-cert-file=/etc/kubernetes/pki/kube-apiserver.pem \
  --tls-private-key-file=/etc/kubernetes/pki/kube-apiserver-key.pem \
  --client-ca-file=/etc/kubernetes/pki/ca.pem \
  --kubelet-preferred-address-types=InternalIP,ExternalIP,Hostname \
  --kubelet-https=true \
  --kubelet-certificate-authority=/etc/kubernetes/pki/ca.pem \
  --kubelet-client-key=/etc/kubernetes/pki/apiserver-kubelet-client-key.pem \
  --kubelet-client-certificate=/etc/kubernetes/pki/apiserver-kubelet-client.pem \
  --enable-bootstrap-token-auth=true \
  --token-auth-file=/etc/kubernetes/token.csv \
  --event-ttl=1h \
  --v=2
Restart=on-failure
RestartSec=5
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
```

相关说明：
  * --allow-privileged: 允许运行在特权模式下的容器能够访问 apiserver；
  * --apiserver-count：集群中在运行的 apiserver 的数量，默认为 1；
  * --enable-swagger-ui：启用 UI 浏览 Swagger 的 API 文档（路径：`/swagger-ui/`，结尾多一个 `/`），
  * --authorization-mode：kubernetes 1.8 新增 `Node` 授权模式，因为默认的 `system:node` ClusterRole 不会自动授予给 `system:nodes` 组（通过 `kubectl get clusterrolebinding system:node -o yaml` 命令查看，[#52711](https://github.com/kubernetes/kubernetes/issues/52711)）；
  * --admission-control：kubernetes 1.8 新增 `NodeRestriction`；
  * --insecure-bind-address：设置为 127.0.0.1，既能在本地访问 kube-apiserver，又能防止其它主机通过非安全端口访问 kube-apiserver；
  * --runtime-config：运行时的 apiVersion，Kubernetes 1.8 已经是 rbac.authorization.k8s.io/v1 版本；
  * --service-cluster-ip-range：Service 的 ClusterIP 范围；需要确保之前 kube-apiserver 签发的证书中指定的 "kubernetes" SVC 的 ClusterIP 在这个范围内；
  * --storage-backend：存储后端，可选值：etcd3（默认）、etcd2，根据你使用的 etcd 版本来选择；
  * --kubelet-certificate-authority,--kubelet-client-certificate,--kubelet-client-certificate: kube-apiserver 访问 kubelet 所需的 CA、证书和私钥（比如 `kubectl logs`、`kubectl exec` 等命令）；

### 启动 kube-apiserver 【所有 Master 节点】

```bash
$ systemctl daemon-reload
$ systemctl start kube-apiserver
$ systemctl enable kube-apiserver

$ # 检查
$ netstat -tpln | grep kube-apiserver
tcp   0   0   172.72.4.11:6443  0.0.0.0:*   LISTEN    2559/kube-apiserver
tcp   0   0   127.0.0.1:8080    0.0.0.0:*   LISTEN    2559/kube-apiserver

$ # 排错
$ systemctl status kube-apiserver
$ journalctl -f -u kube-apiserver
```

### 其他

```bash
$ # 自动创建了三个命名空间
$ kubectl get namespace
NAME          STATUS    AGE
default       Active    1d
kube-public   Active    1d
kube-system   Active    1d

$ # 自动创建了一个 “kubernetes” Service
$ kubectl get service
NAME         TYPE        CLUSTER-IP   EXTERNAL-IP   PORT(S)   AGE
kubernetes   ClusterIP   10.254.0.1   <none>        443/TCP   1d
```

## 部署 kube-controller-manager

需不需要为 kube-scheduler、kube-controller-manager 单独签发证书？

不需要。因为部署 kube-apiserver 的时候提供了本地访问地址（`http://127.0.0.1:8080`），所以可以直接使用该地址访问本地的 kube-apiserver。另外，Master 节点上的 kubectl 也可以完全访问 kube-apiserver（相当于集群管理员），因此不需要为 Master 节点单独下发管理员证书。

### 配置 kube-controller-manager 【所有 Master 节点】

```bash
$ vi /usr/lib/systemd/system/kube-controller-manager.service
[Unit]
Description=Kubernetes Controller Manager
Documentation=https://github.com/kubernetes/kubernetes

[Service]
ExecStart=/usr/bin/kube-controller-manager \
  --address=127.0.0.1 \
  --master=http://127.0.0.1:8080 \
  --allocate-node-cidrs=true \
  --service-cluster-ip-range=10.254.0.0/16 \
  --cluster-cidr=10.1.0.0/16 \
  --cluster-name=kubernetes \
  --cluster-signing-cert-file=/etc/kubernetes/pki/ca.pem \
  --cluster-signing-key-file=/etc/kubernetes/pki/ca-key.pem \
  --service-account-private-key-file=/etc/kubernetes/pki/ca-key.pem \
  --root-ca-file=/etc/kubernetes/pki/ca.pem \
  --controllers=*,bootstrapsigner,tokencleaner \
  --horizontal-pod-autoscaler-sync-period=10s \
  --leader-elect=true \
  --v=2
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

相关说明：
  * --address：提供 kube-controller-manager 服务的地址，默认是 0.0.0.0；
  * --master：直接本地访问 kube-apiserver；
  * --service-cluster-ip-range：Service 的 ClusterIP 范围，“kubernetes” SVC 的 ClusterIP 是在签发证书时指定的；
  * --cluster-signing-cert-file：签发集群证书的 CA，默认值：`/etc/kubernetes/ca/ca.pem`；
  * --cluster-cidr：Pod IP 的 CIDR 范围；
  * --root-ca-file：用于认证 kube-apiserver 的 CA 证书；该 CA 证书将自动包含到 ServiceAccount 关联的 secret 中，最终挂载到每个容器里；
  * --controllers：`*` 启用所有默认的控制器，另外再启动 `bootstrapsigner` 和 `tokencleaner` 控制器；

### 启动 kube-controller-manager 【所有 Master 节点】

```bash
$ # 启动、自启动
$ systemctl daemon-reload
$ systemctl start kube-controller-manager
$ systemctl enable kube-controller-manager

$ # 检查
$ netstat -tpln | grep kube-controlle
tcp   0   0   127.0.0.1:10252   0.0.0.0:*   LISTEN    6328/kube-controlle

$ # 检查
$ kubectl get componentstatus
NAME                 STATUS     MESSAGE
scheduler            Unhealthy  Get http://127.0.0.1:10251/healthz: ...
controller-manager   Healthy    ok
etcd-0               Healthy    {"health": "true"}
etcd-1               Healthy    {"health": "true"}
etcd-2               Healthy    {"health": "true"}

$ # 排错
$ systemctl status kube-controller-manager
$ journalctl -f -u kube-controller-manager
```


## 部署 kube-scheduler

### 配置 kube-scheduler 【所有 Master 节点】

```bash
$ vi /usr/lib/systemd/system/kube-scheduler.service
[Unit]
Description=Kubernetes Scheduler
Documentation=https://github.com/kubernetes/kubernetes

[Service]
ExecStart=/usr/bin/kube-scheduler \
  --address=127.0.0.1 \
  --master=http://127.0.0.1:8080 \
  --leader-elect=true \
  --v=2
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

相关说明：
  * --master： 直接本地访问 kube-scheduler；

### 启动 kube-scheduler 【所有 Master 节点】

```bash
$ # 启动、自启动
$ systemctl daemon-reload
$ systemctl start kube-scheduler
$ systemctl enable kube-scheduler

$ # 检查
$ netstat -tpln | grep kube-scheduler
tcp   0   0   127.0.0.1:10251   0.0.0.0:*   LISTEN    6488/kube-scheduler

$ # 检查
$ kubectl get componentstatus
NAME                 STATUS     MESSAGE
scheduler            Healthy    ok
controller-manager   Healthy    ok
etcd-0               Healthy    {"health": "true"}
etcd-1               Healthy    {"health": "true"}
etcd-2               Healthy    {"health": "true"}

$ # 排错
$ systemctl status kube-controller-manager
$ journalctl -f -u kube-controller-manager
```



## 部署 kubelet

Master 节点其实可以不用部署 kubelet，但为了能在 Master 节点访问 Pod IP（方便测试网络是否可达），需要在 Master 节点部署 kubelet，并通过 DaemonSet 部署 calico/flannel 等网络插件（需要为 Pod 指定 tolerations 来运行网络插件部署到 Master 节点）。另外，如果不部署 kubelet，也可以直接在 Master 节点使用 docker 或 systemd 运行一个网络插件。

### CSR 配置

```bash
# 设置 Master 节点名称
$ MASTER_NAME=k8s-master-1

$ mkdir -p /etc/kubernetes/csr

$ cat > /etc/kubernetes/csr/kubelet-csr.json <<EOF
{
  "CN": "system:node:${MASTER_NAME}",
  "key": {
    "algo": "rsa",
    "size": 2048
  },
  "names": [
    {
      "C": "CN",
      "ST": "ShangHai",
      "L": "ShangHai",
      "O": "system:nodes",
      "OU": "paas"
    }
  ]
}
EOF
```

### 生成 kubelet 证书

```bash
$ cd /etc/kubernetes/pki

# 自定义
$ MASTER_NAME=k8s-master-1
$ MASTER_IP=172.74.4.11

# 设置 -hostname 后，使用该证书的节点必须满足该要求（满足其中一个即可）
$ cfssl gencert \
  -ca=kubernetes-ca.pem \
  -ca-key=kubernetes-ca-key.pem \
  -config=kubernetes-ca-config.json \
  -hostname=${MASTER_NAME},${MASTER_IP} \
  -profile=peer \
  /etc/kubernetes/csr/kubelet-csr.json | cfssljson -bare kubelet

$ ls kubelet*.pem
kubelet-key.pem  kubelet.pem
```

### 生成 kubeconfig

```bash
# 自定义
$ MASTER_NAME=k8s-master-1
$ KUBE_APISERVER=https://172.72.4.11:6443

$ cd /etc/kubernetes/pki
$ mkdir -p /etc/kubernetes/kubeconfig

$ kubectl config set-cluster kubernetes \
  --certificate-authority=kubernetes-ca.pem \
  --embed-certs=true \
  --server=${KUBE_APISERVER} \
  --kubeconfig=../kubeconfig/kubelet.kubeconfig

$ kubectl config set-credentials system:node:${MASTER_NAME} \
  --client-certificate=kubelet.pem \
  --client-key=kubelet-key.pem \
  --embed-certs=true \
  --kubeconfig=../kubeconfig/kubelet.kubeconfig

$ kubectl config set-context system:node:${MASTER_NAME}@kubernetes \
  --cluster=kubernetes \
  --user=system:node:${MASTER_NAME} \
  --kubeconfig=../kubeconfig/kubelet.kubeconfig

$ kubectl config use-context system:node:${MASTER_NAME}@kubernetes \
  --kubeconfig=../kubeconfig/kubelet.kubeconfig

# 检查一下
$ kubectl get node --kubeconfig=/etc/kubernetes/kubeconfig/kubelet.kubeconfig
```

### 配置 kubelet.service

```bash
# 自定义节点 IP
$ NODE_IP=172.72.4.11

$ vi /usr/lib/systemd/system/kubelet.service
[Unit]
Description=Kubernetes Kubelet
Documentation=https://github.com/kubernetes/kubernetes
After=docker.service
Requires=docker.service

[Service]
WorkingDirectory=/var/lib/kubelet
ExecStart=/usr/bin/kubelet \
  --address=${NODE_IP} \
  --node-ip=${NODE_IP} \
  --root-dir=/var/lib/kubelet \
  --pod-infra-container-image=dockerce/pause-amd64:3.0 \
  --pod-manifest-path=/etc/kubernetes/manifests \
  --kubeconfig=/etc/kubernetes/kubeconfig/kubelet.kubeconfig \
  --authorization-mode=Webhook \
  --client-ca-file=/etc/kubernetes/pki/ca.pem \
  --cert-dir=/etc/kubernetes/pki \
  --cgroup-driver=cgroupfs \
  --pod-cidr=10.1.0.0/16 \
  --cluster_dns=10.254.0.2 \
  --cluster_domain=cluster.local \
  --hairpin-mode promiscuous-bridge \
  --allow-privileged=true \
  --fail-swap-on=false \
  --anonymous-auth=false \
  --serialize-image-pulls=false \
  --runtime-cgroups=/systemd/system.slice \
  --kubelet-cgroups=/systemd/system.slice \
  --network-plugin=cni \
  --cni-conf-dir=/etc/cni/net.d \
  --cni-bin-dir=/opt/cni/bin \
  --node-labels=node-role.kubernetes.io/master=true \
  --register-with-taints node-role.kubernetes.io=master:NoSchedule \
  --logtostderr=true \
  --v=2
ExecStopPost=/sbin/iptables -A INPUT -s 10.0.0.0/8 -p tcp --dport 4194 -j ACCEPT
ExecStopPost=/sbin/iptables -A INPUT -s 172.16.0.0/12 -p tcp --dport 4194 -j ACCEPT
ExecStopPost=/sbin/iptables -A INPUT -s 192.168.0.0/16 -p tcp --dport 4194 -j ACCEPT
ExecStopPost=/sbin/iptables -A INPUT -p tcp --dport 4194 -j DROP
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

相关说明：
  * --bootstrap-kubeconfig: 由于 Master 节点没有使用 TLS Bootstrapping 请求，所以不用指定；
  * --node-labels: 标记该节点为 Master 节点；
  * --register-with-taints: 由于是 Master 节点，所以在启动的时候就添加一个 taint，Pod 默认就不会被调度到该节点；也可以等 Master 节点加入集群后使用 `kubectl taint` 命令来添加 taint；如果需要在 Master 节点部署一些必要的服务（比如 calico、kube-proxy），可以使用 toleration 绕过该策略。

### 启动 kubelet

```bash
$ mkdir -p /var/lib/kubelet
$ mkdir -p /etc/kubernetes/manifests

$ # 启动、自启动
$ systemctl daemon-reload
$ systemctl start kubelet
$ systemctl enable kubelet

$ # 检查
$ netstat -tpln | grep kubelet
tcp  0  0  127.0.0.1:10248    0.0.0.0:*  LISTEN  15102/kubelet
tcp  0  0  172.72.4.11:10250  0.0.0.0:*  LISTEN  15102/kubelet
tcp  0  0  172.72.4.11:10255  0.0.0.0:*  LISTEN  15102/kubelet
tcp  0  0  172.72.4.11:4194   0.0.0.0:*  LISTEN  15102/kubelet

$ # 排错（在没有安装 cni 网络插件前提示错误，属正常情况）
$ journalctl -f -u kubelet
```

### 为什么不为 kubelet 签发统一的证书

实际上，在创建 `kubelet-csr.json` 的时候可以指定 hosts Key（填写所有客户端的主机名、IP），然后将签发的证书分发到所有客户端，也就是使用一个统一的 `CN` 访问 kube-apiserver。这种方式是可行的，但存在以下问题：
  * 不安全：如果一个客户端被黑，其他节点也会遭殃；
  * 没法排错：没有办法排查哪台机器被黑。

## 最后

```bash
$ # 检查 kube-apiserver（确保所有 kube-apiserver 的地址添加到了 Endpoints 中）
$ kubectl describe service kubernetes
Name:              kubernetes
Namespace:         default
Labels:            component=apiserver
                   provider=kubernetes
Annotations:       <none>
Selector:          <none>
Type:              ClusterIP
IP:                10.254.0.1
Port:              https  443/TCP
TargetPort:        6443/TCP
Endpoints:         172.72.4.11:6443,172.72.4.12:6443,172.72.4.13:6443
Session Affinity:  ClientIP
Events:            <none>
```

如果启动 kubelet 的时候没有指定 `--register-with-taints` 相关参数，可以手动禁止 Pod 调度到 Master 节点：

```bash
$ masters=(k8s-master-1 k8s-master-2 k8s-master-3)
$ for master in ${masters}; do \
  kubectl taint nodes ${master} node-role.kubernetes.io=master:NoSchedule
done
```
