# 部署 Calico 网络

Calico 是一款纯 Layer 3 的数据中心网络方案(不需要 Overlay 网络)，Calico 好处是他已与各种云原生平台有良好的整合，而 Calico 在每一个节点利用 Linux Kernel 实现高效的 vRouter 来负责数据的转发，而当数据中心复杂度增加时，可以用 BGP route reflector 来达成。

Calico 既可以在初始化集群的时候部署，也可以加入现有集群。下面安装 Calico 作为 Kubernetes 的插件。


## 检查节点配置

确保 kube-apiserver 配置指定了以下参数：

```
--allow-privileged=true
```

确保 kubelet 配置指定了以下参数：

```
--allow-privileged=true --network-plugin=cni --network-plugin-dir=/etc/cni/net.d --cni-bin-dir=/opt/cni/bin
```

确保 kube-proxy 配置指定了以下参数：

```
--proxy-mode=iptables
```

内核调优（所有节点）：

```bash
$ echo "net.netfilter.nf_conntrack_max=1000000" >> /etc/sysctl.conf

$ sysctl -p /etc/sysctl.conf
```

注意，所有节点必需布署kubelet 和docker 包括k8s master主节点，因为是用DaemonSet常驻节点 初始化cni插件


## 配置 calicoctl 以及 IP Pool

### 安装 calicoctl

```bash
# 安装 calicoctl
$ ops/calico/install-calicoctl.sh
```

### 配置 calicoctl

calicoctl 用于管理 calico 集群，不过需要先配置如何访问 etcd。另外，只有运行了 calico 进程的节点才能查询节点状态（`calicoctl node status`），这个命令不需要配置 calicoctl。

* 方法一

> https://docs.projectcalico.org/v2.6/reference/calicoctl/setup/etcdv2

```bash
$ etcd_endpoints=https://192.168.10.80:2379,https://192.168.10.81:2379,https://192.168.10.82:2379

# 通过创建 calicoApiConfig 资源对象来配置
$ mkdir -p /etc/calico
$ cat <<EOF > /etc/calico/calicoctl.cfg
apiVersion: v1
kind: calicoApiConfig
metadata:
spec:
  datastoreType: "etcdv2"
  etcdEndpoints: "${etcd_endpoints}"
  etcdCACertFile: "/etc/etcd/pki/etcd-ca.pem"
  etcdKeyFile: "/etc/etcd/pki/etcd-client-key.pem"
  etcdCertFile: "/etc/etcd/pki/etcd-client.pem"
EOF

# 检查是否报错
$ calicoctl get node
```

* 方法二

```bash
$ etcd_endpoints=https://192.168.10.80:2379,https://192.168.10.81:2379,https://192.168.10.82:2379

# 通过环境变量配置 calicoctl
$ cat <<EOF >> ~/.bashrc
export ETCD_ENDPOINTS="${etcd_endpoints}"
export ETCD_CA_CERT_FILE="/etc/etcd/pki/etcd-ca.pem"
export ETCD_KEY_FILE="/etc/etcd/pki/etcd-client-key.pem"
export ETCD_CERT_FILE="/etc/etcd/pki/etcd-client.pem"
EOF

# 使环境变量生效
$ source ~/.bashrc

# 检查是否报错
$ calicoctl get node
```


## RBAC

如果 Kubernetes 开启了 RBAC 授权模式，需要为 Calico 授予相应角色。参考 [rbac.yaml](https://docs.projectcalico.org/v2.6/getting-started/kubernetes/installation/rbac.yaml)，注：Kubernetes 1.8 中 RBAC apiVersion 为 `rbac.authorization.k8s.io/v1`。

```bash
$ kubectl apply -f calico-rbac.yaml
```


## 部署 Calico

参考 [calico.yaml](https://docs.projectcalico.org/v2.6/getting-started/kubernetes/installation/hosted/calico.yaml)。

```bash
ETCD_ENDPOINTS="https://192.168.10.80:2379,https://192.168.10.81:2379,https://192.168.10.82:2379"

# 修改镜像源
sed -i "s|quay.io/calico/node|calico/node|g" calico.yaml
sed -i "s|quay.io/calico/cni|calico/cni|g" calico.yaml
sed -i "s|quay.io/calico/kube-controllers|calico/kube-controllers|g" calico.yaml

# 在 “calico-config” ConfigMap 中设置 etcd 证书和私钥文件的位置
sed -i "s|http://127.0.0.1:2379|${ETCD_ENDPOINTS}|g" calico.yaml
sed -i 's|etcd_ca: ""|etcd_ca: "/calico-secrets/etcd-ca"|g' calico.yaml
sed -i 's|etcd_cert: ""|etcd_cert: "/calico-secrets/etcd-cert"|g' calico.yaml
sed -i 's|etcd_key: ""|etcd_key: "/calico-secrets/etcd-key"|g' calico.yaml

# 修改 "calico-etcd-secrets" Secret（这里客户端证书）
sed -i "s|# etcd-key: null|etcd-key: `cat /etc/etcd/pki/etcd-client-key.pem | base64 | tr -d '\n'`|g" calico.yaml
sed -i "s|# etcd-cert: null|etcd-cert: `cat /etc/etcd/pki/etcd-client.pem | base64 | tr -d '\n'`|g" calico.yaml
sed -i "s|# etcd-ca: null|etcd-ca: `cat /etc/etcd/pki/etcd-ca.pem | base64 | tr -d '\n'`|g" calico.yaml

# 修改 calico 网络配置（需要与 kube-controller-manager 配置的一致）
sed -i "s|192.168.0.0/16|172.1.0.0/16|g" calico.yaml

# 设置 taint/toleration 来允许 Calico Pod 调度到 Master 节点（这里需要根据在 Master 上启动 kubelet 指定的 taint 来设置）

# 移除所有的 "scheduler.alpha.kubernetes.io/tolerations"

# 对 DaemonSet 中的 PodSpec 设置：
tolerations:
- key: "node-role.kubernetes.io"
  value: "master"
  effect: "NoSchedule"
```

另外，需要注意以下几点：
  * 文件中配置的 `cni-net-dir` 目录必须和 kubelet 中指定的 `--cni-conf-dir` 一致。
  * 文件中配置的 `cni-bin-dir` 目录必须和 kubelet 中指定的 `--cni-bin-dir` 一致。

默认情况下，kube-scheduler 不会调度 calico-node Pod 到 Kubernetes Master 节点，所以 Master 节点是没有办法通过 Pod IP 访问容器的。

### 部署、排错

```yaml
$ kubectl apply -f calico.yaml

# 检查 calico-node
$ kubectl -n kube-system get pod -l k8s-app=calico-node -o wide
NAME                READY     STATUS    RESTARTS   AGE       IP            NODE
calico-node-7fngv   2/2       Running   0          40s       192.168.10.82   k8s-master-3
calico-node-9m5h6   2/2       Running   0          40s       172.72.4.14   kube-node-1
calico-node-dnvgt   2/2       Running   0          40s       172.72.4.15   kube-node-2
calico-node-dv8qn   2/2       Running   0          40s       192.168.10.81   k8s-master-2
calico-node-gttgn   2/2       Running   0          40s       192.168.10.80   k8s-master-1

# 检查 calico-kube-controllers
$ kubectl -n kube-system get pod -l k8s-app=calico-kube-controllers -o wide
NAME                                       READY     STATUS    RESTARTS   AGE       IP            NODE
calico-kube-controllers-6767db6bdc-ffk7w   1/1       Running   0          13h       172.72.4.14   kube-node-1

# 排错
$ kubectl -n kube-system logs -f calico-node-7fngv -c calico-node
$ kubectl -n kube-system logs -f calico-node-7fngv -c install-cni
$ kubectl -n kube-system logs -f calico-kube-controllers-6767db6bdc-ffk7w

# 如果新的 calico-kube-controllers 运行正常，可以移除旧的 calico-policy-controller
$ kubectl -n kube-system delete deploy/calico-policy-controller
```

### 排查 calico

```bash
# 检查所有节点的 IP 地址是否正确
$ calicoctl get node -o yaml

# 如果 IP 地址不正确，进行如下修改
$ cat <<EOF | calicoctl apply -f -
apiVersion: v1
kind: node
metadata:
  name: kube-node-121
spec:
  bgp:
    ipv4Address: 192.168.10.121/24
EOF
```

### 修改 ipPool

修改默认的 ipPool，并且需要避免与宿主机 IP CIDR 冲突。修改 [IP Pool Resource](https://docs.projectcalico.org/v2.6/reference/calicoctl/resources/ippool)：

```bash
# 查看默认生成的 ipPool
$ calicoctl get ippool 172.1.0.0/16 -o yaml
- apiVersion: v1
  kind: ipPool
  metadata:
    cidr: 172.1.0.0/16
  spec:
    ipip:
      enabled: true
      mode: always
    nat-outgoing: true
```

```bash
# 修改配置

$ mkdir -p /etc/calico
$ cat <<EOF > /etc/calico/calico-ip-pool.yaml
apiVersion: v1
kind: ipPool
metadata:
  cidr: 172.1.0.0/16
spec:
  ipip:
    enabled: true
    mode: cross-subnet
  nat-outgoing: true
  disabled: false
EOF
```

相关说明：

  * cidr：Pod 的 IP 范围；
  * ipip：如果不指定，则该 ipPool 禁用 ipip 隧道；
    * ipip.enabled：默认是 `true`；
    * ipip.mode：默认是 `alway`，如果需要集群外主机访问到 Pod IP，必须设置成跨子网模式，因为 Pod IP 和 Host IP 不在同一子网；
  * nat-outgoing：如果启用，从该 ipPool 中的容器将通过伪装的方式将包发往 ipPool 外；
  * disable：如果设置为 `true`，Calico IPAM 将不从该 ipPool 中分配 IP 地址。

```bash
$ calicoctl apply -f /etc/calico/calico-ip-pool.yaml

# 检查创建的 ipPool
$ calicoctl get ipPool 172.1.0.0/16 -o yaml
```

如果存在其他与宿主机 IP CIDR 冲突的 IP Pool，可以使用类似 `calicoctl delete ipPool 192.168.0.0/16` 的命令删除。


## calico 二进制安装

```bash
$ cat <<EOF >> /usr/lib/systemd/system/calico-node.service
[Unit]
Description=Docker Application Container Engine
Documentation=https://docs.docker.com
After=network-online.target
Wants=network-online.target

[Service]
Type=notify
ExecStart=/usr/bin/docker run --net=host --privileged --name=calico-node -d --restart=always \\
  -e ETCD_ENDPOINTS="https://192.168.10.80:2379,https://192.168.10.81:2379,https://192.168.10.82:2379" \\
  -e ETCD_KEY_FILE=/etc/etcd/pki/etcd-client-key.pem \\
  -e ETCD_CERT_FILE=/etc/etcd/pki/etcd-client.pem \\
  -e ETCD_CA_CERT_FILE=/etc/etcd/pki/etcd-ca.pem \\
  -e NODENAME=${HOSTNAME} \\
  -e IP= \\
  -e CALICO_IPV4POOL_CIDR=172.1.0.0/16 \\
  -e NO_DEFAULT_POOLS= \\
  -e AS= \\
  -e CALICO_LIBNETWORK_ENABLED=true \\
  -e IP6= \\
  -e CALICO_NETWORKING_BACKEND=bird \\
  -e FELIX_DEFAULTENDPOINTTOHOSTACTION=ACCEPT \\
  -v /var/run/calico:/var/run/calico \\
  -v /lib/modules:/lib/modules \\
  -v /run/docker/plugins:/run/docker/plugins \\
  -v /var/run/docker.sock:/var/run/docker.sock \\
  -v /var/log/calico:/var/log/calico \\
  -v /etc/etcd/pki:/etc/etcd/pki \\
  calico/node:v2.6.2
ExecReload=/bin/kill -s HUP $MAINPID
LimitNOFILE=infinity
LimitNPROC=infinity
LimitCORE=infinity
TimeoutStartSec=0
Delegate=yes
KillMode=process
Restart=on-failure
StartLimitBurst=3
StartLimitInterval=60s

[Install]
WantedBy=multi-user.target
EOF
```

* v3.1

```bash
$ vi /usr/lib/systemd/system/calico-node.service.d/calico-env
ETCD_ENDPOINTS="https://192.168.10.80:2379,https://192.168.10.81:2379,https://192.168.10.82:2379"
ETCD_CA_FILE=""
ETCD_CERT_FILE=""
ETCD_KEY_FILE=""
CALICO_NODENAME=""
CALICO_NO_DEFAULT_POOLS=""
CALICO_IP=""
CALICO_IP6=""
CALICO_AS=""
CALICO_NETWORKING_BACKEND=bird

$ vi /usr/lib/systemd/system/calico-node.service
[Unit]
Description=calico-node
After=docker.service
Requires=docker.service

[Service]
EnvironmentFile=/etc/calico/calico.env
ExecStartPre=-/usr/bin/docker rm -f calico-node
ExecStart=/usr/bin/docker run --net=host --privileged \
 --name=calico-node \
 -e NODENAME=${CALICO_NODENAME} \
 -e IP=${CALICO_IP} \
 -e IP6=${CALICO_IP6} \
 -e CALICO_NETWORKING_BACKEND=${CALICO_NETWORKING_BACKEND} \
 -e AS=${CALICO_AS} \
 -e NO_DEFAULT_POOLS=${CALICO_NO_DEFAULT_POOLS} \
 -e ETCD_ENDPOINTS=${ETCD_ENDPOINTS} \
 -e ETCD_CA_CERT_FILE=${ETCD_CA_CERT_FILE} \
 -e ETCD_CERT_FILE=${ETCD_CERT_FILE} \
 -e ETCD_KEY_FILE=${ETCD_KEY_FILE} \
 -v /var/log/calico:/var/log/calico \
 -v /run/docker/plugins:/run/docker/plugins \
 -v /lib/modules:/lib/modules \
 -v /var/run/calico:/var/run/calico \
 quay.io/calico/node:v3.1.1

ExecStop=-/usr/bin/docker stop calico-node

Restart=on-failure
StartLimitBurst=3
StartLimitInterval=60s

[Install]
WantedBy=multi-user.target
```


## 验证 Calico 网络是否可用

### 检查 Calico 节点状态是否正常

在任一部署有 calico 进程的节点上检查其他节点状态是否正常（不需要访问 etcd，所以不用配置 calicoctl）。

```bash
$ calicoctl node status
Calico process is running.

IPv4 BGP status
+--------------+-------------------+-------+----------+-------------+
| PEER ADDRESS |     PEER TYPE     | STATE |  SINCE   |    INFO     |
+--------------+-------------------+-------+----------+-------------+
| 172.72.4.15  | node-to-node mesh | up    | 05:55:24 | Established |
+--------------+-------------------+-------+----------+-------------+
```

### 检查相关服务是否已启动

```bash
$ kubectl -n kube-system get pods  -o wide | grep calico
calico-kube-controllers-6767db6bdc-f4x96  1/1  Running  0  17m  172.72.4.15  kube-node-2
calico-node-djhkb                         2/2  Running  0  17m  172.72.4.14  kube-node-1
calico-node-j6tqc                         2/2  Running  0  17m  172.72.4.15  kube-node-2
```

### 部署应用测试网络

创建 10 个副本的 nginx，以及相关联的 Service。

```bash
$ kubectl run nginx --image=nginx:alpine --port=80 --replicas=10
$ kubectl expose deploy/nginx --name=nginx --port=80 --target-port=80
```

确保所有 Pod 都在运行，且分配的 Pod IP 是正确的。

```bash
$ kubectl get pod -l run=nginx -o wide
NAME                   READY  STATUS   RESTARTS  AGE  IP            NODE
NAME                    READY     STATUS    RESTARTS   AGE       IP              NODE
nginx-85bf588b8-25wdw   1/1       Running   0          2m        172.1.170.9     kube-node-120
nginx-85bf588b8-4fbtb   1/1       Running   0          2m        172.1.74.151    kube-node-100
nginx-85bf588b8-fbdx9   1/1       Running   0          2m        172.1.112.242   kube-node-102
nginx-85bf588b8-m6kfm   1/1       Running   0          2m        172.1.199.27    kube-node-103
nginx-85bf588b8-mfz79   1/1       Running   0          2m        172.1.112.218   kube-node-102
nginx-85bf588b8-njdfr   1/1       Running   0          2m        172.1.199.36    kube-node-103
nginx-85bf588b8-r9rch   1/1       Running   0          2m        172.1.199.24    kube-node-103
nginx-85bf588b8-rvgfv   1/1       Running   0          2m        172.1.170.10    kube-node-120
nginx-85bf588b8-rwg7g   1/1       Running   0          2m        172.1.74.135    kube-node-100
nginx-85bf588b8-xzdlb   1/1       Running   0          2m        172.1.74.129    kube-node-100
```

确保所有部署了 kubelet 的节点可以访问这个 nginx Service。

```bash
$ kubectl describe svc nginx | egrep "IP:|Endpoints:"
IP:                172.254.202.52
Endpoints:         172.1.112.218:80,172.1.112.242:80,172.1.170.10:80 + 4 more...
```

* 测试 Service 是否可达

```bash
# 在任一部署了 kube-proxy 的节点上测试
$ for i in {1..100}; do curl http://172.254.202.52; done
```

* 测试 Pod 是否可达

```bash
$ podips=`kubectl get pod -o wide | awk '{print $6}'`

# 查询所有不可达的 Pod IP
$ for podip in $podips; do if [ "$podip" != "IP" ]; then ping -c 1 $podip | grep "100% packet loss" -B 1; fi done
```

* 测试 `kubectl logs` 和 `kubectl exec` 命令：

```bash
$ pods=`kubectl get pod -o wide | awk '{print $1}'`

# 测试 kubectl logs 命令
$ for pod in $pods; do kubectl logs $pod; done

# 测试 kubectl exec 命令
$ for pod in $pods; do kubectl exec -it $pod -- ls; done
```

* 测试外网是否可达

```bash
$ pods=`kubectl get pod -o wide | awk '{print $1}'`

$ for pod in $pods; do kubectl exec -it $pod -- if [ "$podip" != "NAME" ]; then ping -c 1 114.114.114.114; fi done
```

* 简单测试 Pod 网络性能

```bash
# 随机 ping 几个 Pod IP，如果延迟低于 0.5ms 才算比较理想
$ ping 172.1.170.9
64 bytes from 172.1.170.9: icmp_seq=1 ttl=63 time=0.281 ms
64 bytes from 172.1.170.9: icmp_seq=2 ttl=63 time=0.276 ms
64 bytes from 172.1.170.9: icmp_seq=3 ttl=63 time=0.255 ms
```

* 测试集群外是否可达

添加静态路由后，通过 ping 包测试，这里需要注意的是 ipPool 的 `ipip.mode` 必须是 `cross-subnet` 模式。

## 管理 Calico

### Calico node

如果发现自动检测的主机 IP 和 subnet 不正确，可以查看 [Configuring a Node IP Address and Subnet](https://docs.projectcalico.org/v2.6/usage/configuration/node)。

```bash
$ calicoctl get nodes -o wide
NAME         ASN      IPV4
kube-node-1  (64512)  172.72.4.14/24
kube-node-2  (64512)  172.72.4.15/24

$ calicoctl get node k8s-node-1 -o yaml
- apiVersion: v1
  kind: node
  metadata:
    name: k8s-node-1
  spec:
    bgp:
      ipv4Address: 172.72.4.14/24
```

### Calico profile

如果 Kubernetes 集群创建了 Namespace，Calico 会自动生成同名的 profile。

```bash
$ calicoctl get profile
NAME
k8s_ns.default
k8s_ns.kube-public
k8s_ns.kube-system

# 创建 Namespace
$ kubectl create ns myns
namespace "myns" created

# Calico 自动生成同名的 profile
$ calicoctl get profile
NAME
k8s_ns.default
k8s_ns.kube-public
k8s_ns.kube-system
k8s_ns.myns

$ calicoctl get profile k8s_ns.kube-system
- apiVersion: v1
  kind: profile
  metadata:
    name: k8s_ns.kube-system
  spec:
    egress:
    - action: allow
      destination: {}
      source: {}
    ingress:
    - action: allow
      destination: {}
      source: {}
```

### Calico ipPool

需要为 ipPool 开启 `net-outgoing`，集群内的容器才能访问集群外的其他主机。

```bash
$ calicoctl get ipPool -o wide
CIDR                      NAT    IPIP
10.1.0.0/16               true   true
fd80:24e2:f998:72d6::/64  false  false

$ calicoctl get ipPool 10.1.0.0/16 -o yaml
- apiVersion: v1
  kind: ipPool
  metadata:
    cidr: 10.1.0.0/16
  spec:
    ipip:
      enabled: true
      mode: cross-subnet
    nat-outgoing: true
```

### Calico bgpPeer

```bash
$ calicoctl get bgpPeer -o wide

$ # 创建
$ cat <<EOF | calicoctl create -f -
apiVersion: v1
kind: bgpPeer
metadata:
  peerIP: 172.72.4.15
  scope: global
spec:
  asNumber: 65412
EOF
```

### Calico config

```bash
$ calicoctl config get ipip
on

$ calicoctl config get asNumber
64512

$ calicoctl config get nodeToNodeMesh
on

$ calicoctl config get logLevel
info
```

[Configuring BGP Peers](https://docs.projectcalico.org/v2.6/usage/configuration/bgp)

## Systemd 运行 Calico

```bash
$ vi /usr/lib/systemd/system/calico.service
[Unit]
Description=calico node
After=docker.service
Requires=docker.service

[Service]
User=root
PermissionsStartOnly=true
ExecStart=/usr/bin/docker run -it --rm --net=host --privileged --name=calico-node \
  -e ETCD_ENDPOINTS=https://192.168.10.80:2379,https://192.168.10.81:2379,https://192.168.10.82:2379 \
  -e ETCD_CA_CERT_FILE=/etc/etcd/pki/etcd-ca.pem \
  -e ETCD_CERT_FILE=/etc/etcd/pki/etcd-client.pem \
  -e ETCD_KEY_FILE=/etc/etcd/pki/etcd-client-key.pem \
  -e NODENAME=${HOSTNAME} \
  -e IP= \
  -e NO_DEFAULT_POOLS= \
  -e AS= \
  -e CALICO_LIBNETWORK_ENABLED=true \
  -e IP6= \
  -e CALICO_NETWORKING_BACKEND=bird \
  -e FELIX_DEFAULTENDPOINTTOHOSTACTION=ACCEPT \
  -e FELIX_HEALTHENABLED=true \
  -e CALICO_IPV4POOL_CIDR=172.1.0.0/16 \
  -e CALICO_IPV4POOL_IPIP=always \
  -e IP_AUTODETECTION_METHOD=interface=eth1 \
  -e IP6_AUTODETECTION_METHOD=interface=eth1 \
  -v /etc/etcd/pki:/etc/etcd/pki \
  -v /var/run/calico:/var/run/calico \
  -v /lib/modules:/lib/modules \
  -v /run/docker/plugins:/run/docker/plugins \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /var/log/calico:/var/log/calico \
  calico/node:v2.6.2
ExecStop=/usr/bin/docker rm -f calico-node
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
$ systemctl daemon-reload
$ systemctl enable calico-node
$ systemctl restart calico-node
```

## 打通 Kubernetes 网络和物理网络

* 边界网关 + Peer node

边界网关用于物理网络连接到 Kubernetes 集群内部，需要开启 IP 转发功能。边界网关服务器必须运行 `kube-proxy` 和 `calico` 服务（不需要 `kubelet`，不受 Kubernetes 集群管控），用于转发 IP 报文到集群内部，从而访问到 Pod IP 和 Service IP。

```bash
$ sysctl -w net.ipv4.ip_forward=1
```

* Peer Node

该节点为物理节点，只运行 `calico` 或 `flannel` 等网络服务。

* 物理网络宿主机

所有外部物理网络中的主机需要添加一条静态路由来访问 Kubernetes 集群网络，且需要经过 `边界网关`。

```bash
# 方法一
$ route add -net 10.1.0.0 netmask 255.255.0.0 gw 172.72.4.15
$ route add -net 10.254.0.0 netmask 255.255.0.0 gw 172.72.4.15

# 方法二
$ vi /etc/network/interfaces
auto eth0
iface eth0 inet static
  address 192.168.1.2
  netmask 255.255.255.0
  up route add -net 10.1.0.0 netmask 255.255.0.0 gw 172.72.4.15
  up route add -net 10.254.0.0 netmask 255.255.0.0 gw 172.72.4.15

# 上接
$ sudo service network restart

# 检查
route -n | grep 10.*.0.0
10.1.0.0    172.72.4.15  255.255.0.0  UG  0  0  0  vboxnet5
10.254.0.0  172.72.4.15  255.255.0.0  UG  0  0  0  vboxnet5
```

## 参考

* [Calico - Standard Hosted Install]( http://docs.projectcalico.org/v2.6/getting-started/kubernetes/installation/hosted/hosted)
* [Calico-https-etcd-k8s-v2.1.5 最新版集群布署](http://blog.csdn.net/idea77/article/details/73090403)
* [Ucloud 云上环境使用 calico + libnetwork 连通容器网络实践](https://zhuanlan.zhihu.com/p/24094454)