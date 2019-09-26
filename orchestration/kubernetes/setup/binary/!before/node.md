# 部署 Kubernetes Node 节点


## TLS Bootstrapping Token

使用 TLS Bootstrapping Token 后，kube-apiserver 可以自动为客户端生成 TLS 证书，目前仅支持 kubelet 客户端。kubelet 启动时向 kube-apiserver 发送 TLS bootstrapping 请求，kube-apiserver 收到请求后验证用户名和 token 是否合法（token 正确且该用户具有创建 `certificatesigningrequests` 资源对象的权限）。如果合法， kube-apiserver 自动生成证书信息返回给 kubelet，kubelet 收到证书信息后将其写入 kubelet.kubeconfig 文件中。

其中，kube-apiserver 进程需要启用 `--bootstrap-token-auth=true`，在 Kubernetes 1.8 之前使用 `--experimental-bootstrap-token-auth=true` 参数来启用该功能。

* 为 kube-apiserver 创建 token auth file

```bash
$ # "kubelet-bootstrap" 用户属于 "system:kubelet-bootstrap" 组
export BOOTSTRAP_TOKEN=$(head -c 16 /dev/urandom | od -An -t x | tr -d ' ')
cat > token.csv <<EOF
${BOOTSTRAP_TOKEN},kubelet-bootstrap,10001,"system:bootstrappers"
EOF
```

* 为 kube-bootstrap 用户授予创建、查看 CSR 资源对象的权限

```bash
$ kubectl get clusterrolebinding kubeadm:kubelet-bootstrap -o yaml
apiVersion: rbac.authorization.k8s.io/v1beta1
kind: ClusterRoleBinding
metadata:
  ...
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: system:node-bootstrapper
subjects:
- apiGroup: rbac.authorization.k8s.io
  kind: Group
  name: system:bootstrappers

$ kubectl get clusterrole system:node-bootstrapper -o yaml
apiVersion: rbac.authorization.k8s.io/v1beta1
kind: ClusterRole
metadata:
  ...
rules:
- apiGroups:
  - certificates.k8s.io
  resources:
  - certificatesigningrequests
  verbs:
  - create
  - get
  - list
  - watch
```

* kubelet

```
cat /etc/kubernetes/token.csv
export BOOTSTRAP_TOKEN="上面第一个信息"

cd /etc/kubernetes
export KUBE_APISERVER="https://192.168.100.17:6443"
# 设置集群参数
kubectl config set-cluster kubernetes \
  --certificate-authority=/etc/kubernetes/ssl/ca.pem \
  --embed-certs=true \
  --server=${KUBE_APISERVER} \
  --kubeconfig=bootstrap.kubeconfig
 # 设置客户端认证参数
kubectl config set-credentials kubelet-bootstrap \
  --token=${BOOTSTRAP_TOKEN} \
  --kubeconfig=bootstrap.kubeconfig

 # 设置上下文参数
 kubectl config set-context default \
  --cluster=kubernetes \
  --user=kubelet-bootstrap \
  --kubeconfig=bootstrap.kubeconfig
 # 设置默认上下文
kubectl config use-context default --kubeconfig=bootstrap.kubeconfig
```

由于通过手动创建 CA 方式太过繁杂，只适合少量机器，因为每次签证时都需要绑定 Node IP，随机器增加会带来很多困扰，因此这边使用 TLS Bootstrapping 方式进行授权，由 apiserver 自动给符合条件的 Node 发送证书来授权加入集群。

主要做法是 kubelet 启动时，向 kube-apiserver 传送 TLS Bootstrapping 请求，而 kube-apiserver 验证 kubelet 请求的 token 是否与设定的一样，若一样就自动产生 kubelet 证书与密钥。具体作法可以参考 TLS bootstrapping。https://gist.github.com/kairen/60ad8545b79e8e7aa9bdc8a2893df7a0



## 安装配置 Docker

部署 kubelet 之前需要先启动一个 container runtime，Kubernetes 1.8 支持 `Docker`、`Rkt` 以及 `CRI-O`。

### 安装 Docker

```bash
$ # 默认安装（会添加一个默认配置到 /usr/lib/systemd/system/docker.service）
$ ops/docker/install-docker-engine.sh

$ # 修改部分配置
$ mkdir -p /usr/lib/systemd/system/docker.service.d
$ cat > /usr/lib/systemd/system/docker.service.d/docker.conf <<EOF
[Service]
Environment="DOCKER_OPTIONS=--storage-driver=overlay --log-level=error --insecure-registry=10.254.0.0/16 --exec-opt=native.cgroupdriver=cgroupfs"
EOF

$ # 重启
$ systemctl daemon-reload
$ systemctl enable docker
$ systemctl restart docker

$ # 检查
$ docker info | grep "Cgroup Driver"
Cgroup Driver: cgroupfs
```


## 部署 kubelet

### 配置 kubelet 【任意一个 Master 节点】

kubelet 首次启动是会向 kube-apiserver 发送 TLS Bootstrapping 请求，kube-apiserver 会验证请求的 token 是否一致，以及请求用户是否有权限创建 `certificatesigningrequests`。如果 token 一致且请求用户有权限创建 `certificatesigningrequests`，则 kube-apiserver 会自动为 kubelet 下发客户端证书和私钥。另外，可以通过 `kubectl get csr` 命令查看为 kubelet 下发的证书。

由于 kube-apiserver 在启动的时候会自动创建一个 `system:node-bootstrapper` ClusterRole（该 ClusterRole 有权限查看、创建 `certificatesigningrequests`），所以只需要为 token.csv 文件中配置的用户绑定该 ClusterRole 即可。

```bash
$ # kube-apiserver 自动创建了一个 “system:node-bootstrapper” ClusterRole
$ kubectl get clusterrole system:node-bootstrapper -o yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  ...
rules:
- apiGroups:
  - certificates.k8s.io
  resources:
  - certificatesigningrequests
  verbs:
  - create
  - get
  - list
  - watch

$ # --user 为部署 kube-apiserver 时 token.csv 文件中指定的用户名（也可以为 kubelet-bootstrap 所属的组授予权限）
$ kubectl create clusterrolebinding kubelet-bootstrap --clusterrole=system:node-bootstrapper --user=kubelet-bootstrap

$ # 将 CA 证书分发到所有 Node
$ ssh -t root@k8s-node-1 "mkdir -p /etc/kubernetes/pki"
$ ssh -t root@k8s-node-2 "mkdir -p /etc/kubernetes/pki"
$ scp /etc/kubernetes/pki/ca.pem root@k8s-node-1:/etc/kubernetes/pki
$ scp /etc/kubernetes/pki/ca.pem root@k8s-node-2:/etc/kubernetes/pki
```

### 安装组件

Node 节点需要的组件：kubelet、kube-proxy、kubectl、docker。

```bash
$ ops/kubernetes/install-k8s-server.sh
```

### 创建 kubelet kubeconfig 文件【所有 Node 节点】

```bash
$ # 任意一个 Master IP
$ MASTER_IP=172.72.4.11

$ # 配置集群
$ kubectl config set-cluster kubernetes \
  --certificate-authority=/etc/kubernetes/pki/ca.pem \
  --embed-certs=true \
  --server=https://${MASTER_IP}:6443 \
  --kubeconfig=/etc/kubernetes/bootstrap.kubeconfig

$ # 为 kubelet-bootstrap 用户配置客户端认证（token 是在 token.csv 文件中指定的）
kubectl config set-credentials kubelet-bootstrap \
  --token=f827af2de72147ada13fc2b32cc06e30 \
  --kubeconfig=/etc/kubernetes/bootstrap.kubeconfig

$ # 配置上下文（哪个用户使用哪个集群）
$ kubectl config set-context kubelet-bootstrap@kubernetes \
  --cluster=kubernetes \
  --user=kubelet-bootstrap \
  --kubeconfig=/etc/kubernetes/bootstrap.kubeconfig

$ # 关联上下文
$ kubectl config use-context kubelet-bootstrap@kubernetes --kubeconfig=/etc/kubernetes/bootstrap.kubeconfig

$ # 检查是否可以操作 csr 资源对象（当前只有该权限）
$ kubectl get csr --kubeconfig=/etc/kubernetes/bootstrap.kubeconfig
```

相关说明：
  * --embed-certs：设为 `true` 表示将 CA 证书写入到 kubelet.kubeconfig 文件中；

### 创建 kubelet.service【所有 Node 节点】

```bash
$ # 自定义
$ NODE_IP=172.72.4.14

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
  --node-ip=${MASTER_IP} \
  --root-dir=/var/lib/kubelet \
  --pod-infra-container-image=dockerce/pause-amd64:3.0 \
  --pod-manifest-path=/etc/kubernetes/manifests \
  --bootstrap-kubeconfig=/etc/kubernetes/bootstrap.kubeconfig \
  --kubeconfig=/etc/kubernetes/kubelet.kubeconfig \
  --authorization-mode=Webhook \
  --client-ca-file=/etc/kubernetes/pki/ca.pem \
  --cert-dir=/etc/kubernetes/pki \
  --cgroup-driver=cgroupfs \
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
  --node-labels=node-role.kubernetes.io/node=true \
  --max-pods=512 \
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
  * --address：本机 IP，不能设置为 `127.0.0.1`，否则后续 Pod 无法访问 kubelet 的 API 接口，因为 Pod 访问的 `127.0.0.1` 是指向自己的；
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
  * --node-labelsL: 标记该节点为 Node 节点；
  * --max-pods: 设置节点可以运行的最大 Pod 数，默认是 110 个，实际值取决于节点的 Pod 子网网段长度，比如如果节点子网网段是 10.1.0.0/24，则一个节点最多可以运行 `2^8 - 2 = 254` 个 Pod。

### 启动 kubelet

```bash
$ # 创建相关目录
$ mkdir -p /var/lib/kubelet
$ mkdir -p /etc/kubernetes/manifests

$ # 启动
$ systemctl daemon-reload
$ systemctl enable kubelet
$ systemctl restart kubelet

$ # 检查
$ systemctl status kubelet

$ # 排错
$ journalctl -f -u kubelet
```

### 通过 kubelet 的 TLS 证书请求 【任意 Master 节点】

kubelet 首次启动时向 kube-apiserver 发送证书签名请求，必须由管理员批准后才会自动将 Node 加入到集群。

```bash
$ # 查看 kubelet 创建 csr
$ kubectl get csr
NAME                                                  AGE  REQUESTOR          CONDITION
node-csr-A0yf1p_W63-Mzm6CTJG-4byXsvUHN8inxxxDjJDPi9E  6m   kubelet-bootstrap  Pending

$ # 批准 Node 加入集群
$ kubectl certificate approve node-csr-A0yf1p_W63-Mzm6CTJG-4byXsvUHN8inxxxDjJDPi9E

$ # 检查
$ kubectl get nodes
NAME          STATUS    ROLES     AGE       VERSION
k8s-node-1    Ready     <none>    8s        v1.8.2
```

### 验证 Node 配置【Node 节点】

```bash
$ cd /etc/kubernetes && ls *.kubeconfig
bootstrap.kubeconfig  kubelet.kubeconfig

$ cd /etc/kubernetes/pki && ls kubelet*
kubelet-client.crt  kubelet-client.key  kubelet.crt  kubelet.key
```


## 部署 kube-proxy 【所有 Node 节点】

### 创建 kube-proxy CSR 配置文件【任一 Master 节点】

```bash
$ cat >/etc/kubernetes/pki/kube-proxy-csr.json <<EOF
{
  "CN": "system:kube-proxy",
  "hosts": [],
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
      "OU": "PaaS"
    }
  ]
}
EOF
```

相关说明：
  * CN：将用户名设置为 `system:kube-proxy` 是因为系统自动为该用户绑定了 `system:node-proxier` ClusterRole（`kubectl get clusterrolebinding system:node-proxier`）；
  * hosts：这里不指定 hosts，目的是希望下发的证书可以在所有 Node 中使用；

```bash
$ kubectl get clusterrolebinding system:node-proxier -o yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  ...
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: system:node-proxier
subjects:
- apiGroup: rbac.authorization.k8s.io
  kind: User
  name: system:kube-proxy
```

### 生成 kube-proxy 客户端证书和私钥【任一 Master 节点】

```bash
$ cd /etc/kubernetes/pki

$ # 生成证书和私钥
$ cfssl gencert -ca=ca.pem -ca-key=ca-key.pem -config=ca-config.json \
--profile=kubernetes kube-proxy-csr.json | cfssljson -bare kube-proxy

$ # 下发证书和私钥到所有 Node 节点
$ scp /etc/kubernetes/pki/kube-proxy*.pem 172.72.4.14:/etc/kubernetes/pki/
$ scp /etc/kubernetes/pki/kube-proxy*.pem 172.72.4.15:/etc/kubernetes/pki/
```

### 创建 kube-proxy kubeconfig 【所有 Node】

```bash
$ MASTER_IP=172.72.4.11

$ # 配置集群
$ kubectl config set-cluster kubernetes \
  --certificate-authority=/etc/kubernetes/pki/ca.pem \
  --embed-certs=true \
  --server=https://${MASTER_IP}:6443 \
  --kubeconfig=/etc/kubernetes/kube-proxy.kubeconfig

$ # 配置客户端认证
$ kubectl config set-credentials kube-proxy \
  --client-certificate=/etc/kubernetes/pki/kube-proxy.pem \
  --client-key=/etc/kubernetes/pki/kube-proxy-key.pem \
  --embed-certs=true \
  --kubeconfig=/etc/kubernetes/kube-proxy.kubeconfig

$ # 配置关联
$ kubectl config set-context kube-proxy@kubernetes \
  --cluster=kubernetes \
  --user=kube-proxy \
  --kubeconfig=/etc/kubernetes/kube-proxy.kubeconfig

$ # 配置默认关联
$ kubectl config use-context kube-proxy@kubernetes --kubeconfig=/etc/kubernetes/kube-proxy.kubeconfig
```

### 创建 kube-proxy.service 文件【所有 Node】

如果希望 Master 节点也能通过 Service 访问集群服务，需要在 Master 上部署 kube-proxy。

```bash
$ mkdir -p /var/lib/kube-proxy

$ # 其他：172.72.4.15
$ NODE_IP=172.72.4.14

$ vi /usr/lib/systemd/system/kube-proxy.service
[Unit]
Description=Kubernetes Kube-Proxy Server
Documentation=https://github.com/kubernetes/kubernetes
After=network.target

[Service]
WorkingDirectory=/var/lib/kube-proxy
ExecStart=/usr/bin/kube-proxy \
  --bind-address=${NODE_IP} \
  --cluster-cidr=10.1.0.0/16 \
  --kubeconfig=/etc/kubernetes/kubeconfig/kube-proxy.kubeconfig \
  --proxy-mode=iptables \
  --logtostderr=true \
  --v=2
Restart=on-failure
RestartSec=5
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
```

相关说明：
  * --cluster-cidr：集群中 Pod IP 范围，需要与 kube-controller-manager 配置的一致；
  * --proxy-mode：支持的代理模式：userspace（旧）、iptables（最快）、ipvs（实验）；

### 启动 kube-proxy

```bash
$ mkdir -p /var/lib/kube-proxy

$ systemctl daemon-reload
$ systemctl enable kube-proxy
$ systemctl restart kube-proxy

$ # 检查
$ systemctl status kube-proxy

$ # 排错
$ journalctl -f -u kube-proxy
```

`Failed to execute iptables-restore for nat: exit status 1 (iptables-restore: line 7 failed`


> https://github.com/kubernetes/kubernetes/issues/52711
> https://kairen.github.io/files/manual-v1.8/addon/kube-proxy.yml.conf

## 参考

> http://www.jianshu.com/p/4c6ed2d0c66c

* [TLS bootstrapping](https://kubernetes.io/docs/admin/kubelet-tls-bootstrapping/)
