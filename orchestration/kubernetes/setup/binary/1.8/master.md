# 部署 Kubernetes Master

由于 `kube-controller`、`kube-scheduler` 会和 `kube-apiserver` 部署在同一台机器上，因此可以为 `kube-apiserver` 新增一个非安全地址：`http://127.0.0.1:8080`，这个地址既能确保 `kube-controller` 和 `kube-controller` 直接连接 `kube-apiserver`（不需要证书），又能避免其他节点通过非安全地址访问。但如果 Master 节点存在多用户的情况，考虑到绝对的安全应该关闭非安全地址，同时使用证书访问 `kube-apiserver`。

设置为 127.0.0.1，既能在本地访问 kube-apiserver，又能防止其它主机通过非安全端口访问 kube-apiserver；


## 安装 Master 组件 【ALL MASTER】

```bash
# kube-apiserver kube-controller-manager kube-scheduler kubelet kube-proxy kubectl
$ ops/kubernetes/install-k8s-master.sh
```


## 部署 kube-apiserver

### 开启 TLS Bootstrapping 【k8s-master-1】

kubelet 首次启动是会向 kube-apiserver 发送 TLS Bootstrapping 请求，kube-apiserver 会验证请求的 token 是否一致，以及请求用户是否有权限创建 `certificatesigningrequests`。如果 token 一致且请求用户有权限创建 `certificatesigningrequests`，则 kube-apiserver 会自动为 kubelet 下发客户端证书和私钥。

```bash
# 生成 token
$ head -c 16 /dev/urandom | od -An -t x | tr -d ' '
b675e56a592fefe0186164536d756301

$ cat > /etc/kubernetes/token.csv <<EOF
b675e56a592fefe0186164536d756301,kubelet-bootstrap,10001,"system:kubelet-bootstrap"
EOF

# 分发到其它 Master 节点上
$ OTHER_MASTERS=(kube-master-2 kube-master-3)
$ for master in ${OTHER_MASTERS[@]}; do
  scp /etc/kubernetes/token.csv root@${master}:/etc/kubernetes;
done
```

相关说明：
  * token.csv：从左到右依次表示 token、用户名、用户编号、用户组

### 创建 kube-apiserver.service 【ALL MASTER】

```bash
$ MY_MASTER_IP=192.168.10.80
$ ETCD_ENDPOINTS=https://192.168.10.80:2379,https://192.168.10.81:2379,https://192.168.10.82:2379

$ cat <<EOF > /usr/lib/systemd/system/kube-apiserver.service
[Unit]
Description=Kubernetes API Server
Documentation=https://github.com/kubernetes/kubernetes
After=network.target

[Service]
Type=notify
User=root
ExecStart=/usr/bin/kube-apiserver \\
  --admission-control=Initializers,NamespaceLifecycle,LimitRanger,ServiceAccount,PersistentVolumeLabel,DefaultStorageClass,DefaultTolerationSeconds,NodeRestriction,ResourceQuota \\
  --allow-privileged=true \\
  --apiserver-count=3 \\
  --audit-log-maxage=30 \\
  --audit-log-maxbackup=3 \\
  --audit-log-maxsize=100 \\
  --audit-log-path=/var/log/kubernetes/audit.log \\
  --authorization-mode=Node,RBAC \\
  --enable-swagger-ui=true \\
  --etcd-cafile=/etc/etcd/pki/etcd-ca.pem \\
  --etcd-certfile=/etc/etcd/pki/etcd-client.pem \\
  --etcd-keyfile=/etc/etcd/pki/etcd-client-key.pem \\
  --etcd-servers=${ETCD_ENDPOINTS} \\
  --storage-backend=etcd3 \\
  --advertise-address=${MY_MASTER_IP} \\
  --bind-address=${MY_MASTER_IP} \\
  --secure-port=6443 \\
  --insecure-bind-address=127.0.0.1 \\
  --insecure-port=8080 \\
  --runtime-config=api/all \\
  --service-account-key-file=/etc/kubernetes/pki/kubernetes-ca-key.pem \\
  --service-cluster-ip-range=172.254.0.0/16 \\
  --service-node-port-range=30000-32000 \\
  --tls-cert-file=/etc/kubernetes/pki/kube-apiserver.pem \\
  --tls-private-key-file=/etc/kubernetes/pki/kube-apiserver-key.pem \\
  --client-ca-file=/etc/kubernetes/pki/kubernetes-ca.pem \\
  --kubelet-preferred-address-types=InternalIP,Hostname,ExternalIP \\
  --kubelet-https=true \\
  --kubelet-client-key=/etc/kubernetes/pki/apiserver-kubelet-client-key.pem \\
  --kubelet-client-certificate=/etc/kubernetes/pki/apiserver-kubelet-client.pem \\
  --enable-bootstrap-token-auth=true \\
  --token-auth-file=/etc/kubernetes/token.csv \\
  --event-ttl=1h \\
  --v=2
Restart=on-failure
RestartSec=5
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
EOF
```

相关说明：

  * --allow-privileged: 允许运行在特权模式下的容器能够访问 apiserver；
  * --apiserver-count：集群中在运行的 apiserver 的数量，默认为 1；
  * --enable-swagger-ui：启用 UI 浏览 Swagger 的 API 文档（路径：`/swagger-ui/`，结尾多一个 `/`），
  * --authorization-mode：kubernetes 1.8 新增 `Node` 授权模式，因为默认的 `system:node` ClusterRole 不会自动授予给 `system:nodes` 组（通过 `kubectl get clusterrolebinding system:node -o yaml` 命令查看，[#52711](https://github.com/kubernetes/kubernetes/issues/52711)）；
  * --admission-control：kubernetes 1.8 新增 `NodeRestriction`；
  * --insecure-bind-address、--insecure-port：如果 kube-controller-manager 和 kube-scheduler 使用证书来访问 kube-apiserver，应该关闭非安全访问方式：将 `--insecure-port` 设置为 0；
  * --runtime-config：运行时的 apiVersion，Kubernetes 1.8 已经是 rbac.authorization.k8s.io/v1 版本；
  * --service-cluster-ip-range：Service 的 ClusterIP 范围；需要确保之前 kube-apiserver 签发的证书中指定的 "kubernetes" SVC 的 ClusterIP 在这个范围内；
  * --storage-backend：存储后端，可选值：etcd3（默认）、etcd2，根据你使用的 etcd 版本来选择；
  * --kubelet-client-certificate,--kubelet-client-certificate: kube-apiserver 访问 kubelet 所需的证书和私钥（比如 `kubectl logs`、`kubectl exec` 等命令）；
  * --kubelet-certificate-authority：这里有个坑：kube-apiserver 访问 kubelet 指定上面两个字段即可，不能再指定这个字段，否则依然不能通过 `kubectl exec` 以及 `kubectl logs` 访问 kubelet，错误提示："Error from server: error dialing backend: x509: cannot validate certificate for x.x.x.x because it doesn't contain any IP SANs"；
  * --kubelet-preferred-address-types：顺序非常重要，否则执行 `kubectl logs` 和 `kubectl exec` 可能会提示不能解析主机名；

详细版：

```bash
$ cat <<EOF > /usr/lib/systemd/system/kube-apiserver.service
[Unit]
Description=Kubernetes API Server
Documentation=https://github.com/kubernetes/kubernetes
After=network.target

[Service]
Type=notify
User=root
ExecStart=/usr/bin/kube-apiserver \\

  --requestheader-username-headers=X-Remote-User \\
  --requestheader-group-headers=X-Remote-Group \\
  --requestheader-extra-headers-prefix=X-Remote-Extra- \\
  --requestheader-allowed-names=front-proxy-client \\
  --requestheader-client-ca-file=/etc/kubernetes/pki/front-proxy-ca.crt \\

  --proxy-client-key-file=/etc/kubernetes/pki/front-proxy-client.key \\
  --proxy-client-cert-file=/etc/kubernetes/pki/front-proxy-client.crt \\

  --admission-control=Initializers,NamespaceLifecycle,LimitRanger,ServiceAccount,PersistentVolumeLabel,DefaultStorageClass,DefaultTolerationSeconds,NodeRestriction,ResourceQuota \\
  --allow-privileged=true \\
  --apiserver-count=3 \\
  --audit-log-maxage=30 \\
  --audit-log-maxbackup=3 \\
  --audit-log-maxsize=100 \\
  --audit-log-path=/var/log/kubernetes/audit.log \\
  --authorization-mode=Node,RBAC \\
  --enable-swagger-ui=true \\
  --etcd-cafile=/etc/etcd/pki/ca.pem \\
  --etcd-certfile=/etc/etcd/pki/etcd.pem \\
  --etcd-keyfile=/etc/etcd/pki/etcd-key.pem \\
  --etcd-servers=https://172.72.4.11:2379,https://172.72.4.12:2379,https://172.72.4.13:2379 \\
  --storage-backend=etcd3 \\
  --advertise-address=${MASTER_IP} \\
  --bind-address=${MASTER_IP} \\
  --secure-port=6443 \\
  --insecure-bind-address=127.0.0.1 \\
  --insecure-port=8080 \\
  --runtime-config=rbac.authorization.k8s.io/v1 \\
  --service-account-key-file=/etc/kubernetes/pki/ca-key.pem \\
  --service-cluster-ip-range=10.254.0.0/16 \\
  --service-node-port-range=30000-32000 \\
  --tls-cert-file=/etc/kubernetes/pki/kube-apiserver.pem \\
  --tls-private-key-file=/etc/kubernetes/pki/kube-apiserver-key.pem \\
  --client-ca-file=/etc/kubernetes/pki/ca.pem \\
  --kubelet-preferred-address-types=InternalIP,Hostname,ExternalIP \\
  --kubelet-https=true \\
  --kubelet-client-key=/etc/kubernetes/pki/apiserver-kubelet-client-key.pem \\
  --kubelet-client-certificate=/etc/kubernetes/pki/apiserver-kubelet-client.pem \\
  --enable-bootstrap-token-auth=true \\
  --token-auth-file=/etc/kubernetes/token.csv \\
  --event-ttl=1h \\
  --v=2
Restart=on-failure
RestartSec=5
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
EOF
```

### 运行 kube-apiserver 【ALL MASTER】

```bash
# 运行
$ systemctl daemon-reload
$ systemctl enable kube-apiserver
$ systemctl start kube-apiserver

# 查看状态
$ systemctl status kube-apiserver -l

# 检查
$ netstat -tpln | grep kube-apiserver
tcp   0   0   192.168.10.80:6443  0.0.0.0:*   LISTEN    2559/kube-apiserver
tcp   0   0   127.0.0.1:8080      0.0.0.0:*   LISTEN    2559/kube-apiserver

# 排查日志
$ journalctl -f -u kube-apiserver
```

### 其他操作

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
kubernetes   ClusterIP   172.1.0.1    <none>        443/TCP   8m
```


## 部署 kube-controller-manager

需不需要为 kube-scheduler、kube-controller-manager 单独签发证书？

不需要。因为部署 kube-apiserver 的时候提供了本地访问地址（`http://127.0.0.1:8080`），所以可以直接使用该地址访问本地的 kube-apiserver。另外，Master 节点上的 kubectl 也可以完全访问 kube-apiserver（相当于集群管理员），因此不需要为 Master 节点单独下发管理员证书。

### 配置 kube-controller-manager 【ALL Master】

```bash
$ cat <<EOF > /usr/lib/systemd/system/kube-controller-manager.service
[Unit]
Description=Kubernetes Controller Manager
Documentation=https://github.com/kubernetes/kubernetes

[Service]
ExecStart=/usr/bin/kube-controller-manager \\
  --address=127.0.0.1 \\
  --allocate-node-cidrs=true \\
  --service-cluster-ip-range=172.254.0.0/16 \\
  --cluster-cidr=172.1.0.0/16 \\
  --cluster-name=kubernetes \\
  --kubeconfig=/etc/kubernetes/kubeconfig/kube-controller-manager.kubeconfig \\
  --cluster-signing-cert-file=/etc/kubernetes/pki/kubernetes-ca.pem \\
  --cluster-signing-key-file=/etc/kubernetes/pki/kubernetes-ca-key.pem \\
  --service-account-private-key-file=/etc/kubernetes/pki/kubernetes-ca-key.pem \\
  --root-ca-file=/etc/kubernetes/pki/kubernetes-ca.pem \\
  --controllers=*,bootstrapsigner,tokencleaner \\
  --horizontal-pod-autoscaler-sync-period=10s \\
  --leader-elect=true \\
  --v=2
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
```

相关说明：
  * --address：提供 kube-controller-manager 服务的地址，默认是 0.0.0.0；
  * --master：直接本地访问 kube-apiserver；
  * --service-cluster-ip-range：Service 的 ClusterIP 范围，“kubernetes” SVC 的 ClusterIP 是在签发证书时指定的；
  * --cluster-signing-cert-file：签发集群证书的 CA，默认值：`/etc/kubernetes/ca/ca.pem`；
  * --cluster-cidr：Pod IP 的 CIDR 范围；
  * --root-ca-file：用于认证 kube-apiserver 的 CA 证书；该 CA 证书将自动包含到 ServiceAccount 关联的 secret 中，最终挂载到每个容器里；
  * --controllers：`*` 启用所有默认的控制器，另外再启动 `bootstrapsigner` 和 `tokencleaner` 控制器；

如果使用本地地址 `http://127.0.0.1:8080` 访问 kube-apiserver，可以进行如下配置：

```bash
$ cat <<EOF > /usr/lib/systemd/system/kube-controller-manager.service
[Unit]
Description=Kubernetes Controller Manager
Documentation=https://github.com/kubernetes/kubernetes

[Service]
ExecStart=/usr/bin/kube-controller-manager \\
  --address=127.0.0.1 \\
  --master=http://127.0.0.1:8080 \\
  --allocate-node-cidrs=true \\
  --service-cluster-ip-range=172.254.0.0/16 \\
  --cluster-cidr=172.1.0.0/16 \\
  --cluster-name=kubernetes \\
  --cluster-signing-cert-file=/etc/kubernetes/pki/kubernetes-ca.pem \\
  --cluster-signing-key-file=/etc/kubernetes/pki/kubernetes-ca-key.pem \\
  --service-account-private-key-file=/etc/kubernetes/pki/kubernetes-ca-key.pem \\
  --root-ca-file=/etc/kubernetes/pki/kubernetes-ca.pem \\
  --controllers=*,bootstrapsigner,tokencleaner \\
  --horizontal-pod-autoscaler-sync-period=10s \\
  --leader-elect=true \\
  --v=2
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
```

### 启动 kube-controller-manager 【ALL MASTER】

```bash
# 启动
$ systemctl daemon-reload
$ systemctl enable kube-controller-manager
$ systemctl start kube-controller-manager

# 查看状态
$ systemctl status kube-controller-manager -l

# 查看服务
$ netstat -tpln | grep kube-controlle
tcp   0   0   127.0.0.1:10252   0.0.0.0:*   LISTEN    6328/kube-controlle

# 检查组件
$ kubectl get componentstatus
NAME                 STATUS     MESSAGE
scheduler            Unhealthy  Get http://127.0.0.1:10251/healthz: ...
controller-manager   Healthy    ok
etcd-0               Healthy    {"health": "true"}
etcd-1               Healthy    {"health": "true"}
etcd-2               Healthy    {"health": "true"}

# 排错日志
$ journalctl -f -u kube-controller-manager
```


## 部署 kube-scheduler

### 配置 kube-scheduler 【ALL MASTER】

```bash
$ cat <<EOF > /usr/lib/systemd/system/kube-scheduler.service
[Unit]
Description=Kubernetes Scheduler
Documentation=https://github.com/kubernetes/kubernetes

[Service]
ExecStart=/usr/bin/kube-scheduler \\
  --address=127.0.0.1 \\
  --kubeconfig=/etc/kubernetes/kubeconfig/kube-scheduler.kubeconfig \\
  --leader-elect=true \\
  --v=2
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
```

如果使用本地地址 `http://127.0.0.1:8080` 访问 kube-apiserver，可以进行如下配置：

```bash
$ cat <<EOF > /usr/lib/systemd/system/kube-scheduler.service
[Unit]
Description=Kubernetes Scheduler
Documentation=https://github.com/kubernetes/kubernetes

[Service]
ExecStart=/usr/bin/kube-scheduler \\
  --address=127.0.0.1 \\
  --master=http://127.0.0.1:8080 \\
  --leader-elect=true \\
  --v=2
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
```

相关说明：

  * `--master`： 直接本地访问 kube-scheduler；

### 启动 kube-scheduler 【所有 Master 节点】

```bash
# 启动
$ systemctl daemon-reload
$ systemctl enable kube-scheduler
$ systemctl start kube-scheduler

# 查看状态
$ systemctl status kube-controller-manager -l

# 检查服务
$ netstat -tpln | grep kube-scheduler
tcp   0   0   127.0.0.1:10251   0.0.0.0:*   LISTEN    6488/kube-scheduler

# 检查组件
$ kubectl get componentstatus
NAME                 STATUS     MESSAGE
scheduler            Healthy    ok
controller-manager   Healthy    ok
etcd-0               Healthy    {"health": "true"}
etcd-1               Healthy    {"health": "true"}
etcd-2               Healthy    {"health": "true"}

# 排查日志
$ journalctl -f -u kube-controller-manager
```


## 部署 kubelet

### 为 Bootstrap TLS 请求用户授权

```bash
$ kubectl create clusterrolebinding kubelet-bootstrap --clusterrole=system:node-bootstrapper --user=kubelet-bootstrap
```

### 创建 kubelet.service【ALL MASTER】

```bash
# 自定义
$ NODE_IP=192.168.10.80
$ CLUSTER_DNS=172.254.0.2

$ cat <<EOF > /usr/lib/systemd/system/kubelet.service
[Unit]
Description=Kubernetes Kubelet
Documentation=https://github.com/kubernetes/kubernetes
After=docker.service
Requires=docker.service

[Service]
WorkingDirectory=/var/lib/kubelet
ExecStart=/usr/bin/kubelet \\
  --address=${NODE_IP} \\
  --node-ip=${NODE_IP} \\
  --root-dir=/var/lib/kubelet \\
  --pod-infra-container-image=dockerce/pause-amd64:3.0 \\
  --pod-manifest-path=/etc/kubernetes/manifests \\
  --bootstrap-kubeconfig=/etc/kubernetes/kubeconfig/bootstrap.kubeconfig \\
  --kubeconfig=/etc/kubernetes/kubeconfig/kubelet.kubeconfig \\
  --authorization-mode=Webhook \\
  --client-ca-file=/etc/kubernetes/pki/kubernetes-ca.pem \\
  --cert-dir=/etc/kubernetes/pki \\
  --cgroup-driver=cgroupfs \\
  --cluster_dns=${CLUSTER_DNS} \\
  --cluster_domain=cluster.local \\
  --hairpin-mode promiscuous-bridge \\
  --allow-privileged=true \\
  --fail-swap-on=false \\
  --anonymous-auth=false \\
  --serialize-image-pulls=false \\
  --runtime-cgroups=/systemd/system.slice \\
  --kubelet-cgroups=/systemd/system.slice \\
  --network-plugin=cni \\
  --cni-conf-dir=/etc/cni/net.d \\
  --cni-bin-dir=/opt/cni/bin \\
  --node-labels=node-role.kubernetes.io/master=true \\
  --register-with-taints node-role.kubernetes.io=master:NoSchedule \\
  --max-pods=512 \\
  --logtostderr=true \\
  --v=2 \\
  --feature-gates=Accelerators=true \\
  --feature-gates=DevicePlugins=true
ExecStopPost=/sbin/iptables -A INPUT -s 10.0.0.0/8 -p tcp --dport 4194 -j ACCEPT
ExecStopPost=/sbin/iptables -A INPUT -s 172.16.0.0/12 -p tcp --dport 4194 -j ACCEPT
ExecStopPost=/sbin/iptables -A INPUT -s 192.168.0.0/16 -p tcp --dport 4194 -j ACCEPT
ExecStopPost=/sbin/iptables -A INPUT -p tcp --dport 4194 -j DROP
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
```

相关说明：
  * --address：本机 IP，不能设置为 `127.0.0.1`，否则后续 Pod 无法访问 kubelet 的 API 接口，因为 Pod 访问的 `127.0.0.1` 是指向自己的；
  * --node-ip：设置 kubelet 使用的 node ip，否则执行 `kubectl exec` 和 `kubectl logs` 可能出错；另外，如果节点上有使用 vip 可能导致 kube-apiserver 以及上层应用访问不到 kubelet；
  * --pod-manifest-path：Static Pod 文件的路径；
  * --bootstrap-kubeconfig：指向 TLS Bootstrap kubeconfig 文件，kubelet 使用文件中的用户名和 token 向 kube-apiserver 发送 TLS Bootstrapping 请求；
  * --kubeconfig：apiserver 下发证书和私钥后，除了会写入到 --cert-dir 指定的目录外，还配置到该文件中；注意：--bootstrap-kubeconfig 和 --kubeconfig 指定的文件必须不一样；
  * --authorization-mode：Kubelet server 的授权模式，Webhook 模式使用 `SubjectAccessReview` API 来确定授权，默认是 `AlwaysAllow`；
  * --cgroup-driver：需要和 container runtime（比如 docker）中设置的 Cgroup Driver 一致，否则启动失败；
  * --cert-dir：管理员通常 CSR 请求后，kubelet 自动在该目录下创建客户端证书（`kubelet-client.crt`）和私钥（`kubelet-client.key`），并写入到 `--kubeconfig` 指定的文件中；
  * --client-ca-file：需要为之后将自动创建的客户端证书指定 CA 根证书，否则下发的客户端证书（`kubelet.crt`）会是一个自签名的证书，导致无法将 Node 加入集群（可以通过 `cfssl-certinfo -cert kubelet.crt` 命令验证下发的客户端证书信息）；
  * --cluster_dns：指定 `kubedns` 的 ClusterIP；
  * --cluster-domain：指定 `kubedns` 的域名后缀，容器启动时会自动添加到 `/etc/resolv.conf` 的 `search` 字段中；
  * --fail-swap-on=false：kubernetes 1.8 开始，如果机器开启了 swap，kubulet 会无法启动；
  * ExecStopPost：由于 kubelet `cAdvisor` 默认在所有接口监听 4194 端口上的请求，可能会导致不安全访问，因此需要指定 iptables 规则只允许内网机器访问 4194 端口；
  * --allow-privileged: 允许容器向 kubelet 请求以特权模式运行；
  * --anonymous-auth：关闭对 Kubelet server 的匿名请求，匿名请求自带 `system:anonymous` 用户名，以及 `system:unauthenticated` Group；
  * --runtime-cgroups、--kubelet-cgroups：解决 docker cgroup 与 kubelet cgroup 的[不兼容](https://stackoverflow.com/questions/46726216/kubelet-fails-to-get-cgroup-stats-for-docker-and-kubelet-services)问题；
  * --node-labels: 标记该节点为 Master 节点；
  * --register-with-taints: 由于是 Master 节点，所以在启动的时候就添加一个 taint，Pod 默认就不会被调度到该节点；也可以等 Master 节点加入集群后使用 `kubectl taint` 命令来添加 taint；如果需要在 Master 节点部署一些必要的服务（比如 calico、kube-proxy），可以使用 toleration 绕过该策略；
  * --max-pods: 设置节点可以运行的最大 Pod 数，默认是 110 个，实际值取决于节点的 Pod 子网网段长度，比如如果节点子网网段是 172.1.0.0/24，则一个节点最多可以运行 `2^8 - 2 = 254` 个 Pod。

### 启动 kubelet

```bash
# 创建相关目录
$ mkdir -p /var/lib/kubelet && mkdir -p /etc/kubernetes/manifests

# 启动
$ systemctl daemon-reload
$ systemctl enable kubelet
$ systemctl restart kubelet

# 查看状态
$ systemctl status kubelet -l

# 检查服务（没有部署网络插件时没有任何输出）
$ netstat -tpln | grep kubelet
tcp  0  0  127.0.0.1:10248    0.0.0.0:*  LISTEN  15102/kubelet
tcp  0  0  172.72.4.11:10250  0.0.0.0:*  LISTEN  15102/kubelet
tcp  0  0  172.72.4.11:10255  0.0.0.0:*  LISTEN  15102/kubelet
tcp  0  0  172.72.4.11:4194   0.0.0.0:*  LISTEN  15102/kubelet

# 排查日志（在没有安装 cni 网络插件前提示错误，属正常情况）
$ journalctl -f -u kubelet
```

如果 kubelet 启动失败或者 kube-controller-manager 下发证书失败，检查原因，并删除自动生成的文件再重启：

```bash
systemctl stop kubelet
rm -f /etc/kubernetes/pki/kubelet*
rm -f /etc/kubernetes/kubeconfig/kubelet.kubeconfig
```

### 批准节点加入集群

```bash
# kubelet 加入集群后创建相应的 csr
$ kubectl get csr
NAME                                                   AGE       REQUESTOR           CONDITION
node-csr-bTF4qT0kbN4V8KmgjRdk0gHHTQyt6v_573a6z9IFTC0   4m        kubelet-bootstrap   Pending

# 自动为 kubelet 下发证书和私钥
$ cd /etc/kubernetes/pki && ls kubelet*
kubelet-client.key  kubelet.crt  kubelet.key

# 批准节点加入集群
$ kubectl certificate approve node-csr-bTF4qT0kbN4V8KmgjRdk0gHHTQyt6v_573a6z9IFTC0
```
