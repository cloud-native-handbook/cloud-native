# 准备工作

## 集群环境

Master 节点需要运行 3 个服务，分别是 `kube-apiserver`、`kube-controller-manager`、`kube-scheduler`。
Node 节点需要运行 2 个服务，分别是 `kubelet`、`kube-proxy`；另外，为了实现 Kubernetes HA，需要在每个 Node 上部署一个 `Nginx` 代理（也可以是 HAProxy），用于代理所有 Master 的 kube-apiserver。

ip                 | hostname      | role   | component |
------------------ | ------------- | ------ | --------- |
192.168.10.{80,99} | kube-master-1 | master | etcd apiserver controller-manager scheduler kubelet kube-proxy kubectl docker|
192.168.10.{81,99} | kube-master-2 | master | etcd apiserver controller-manager scheduler kubelet kube-proxy kubectl docker|
192.168.10.{82,99} | kube-master-3 | master | etcd apiserver controller-manager scheduler kubelet kube-proxy kubectl docker|
192.168.10.100     | kube-node-100 | node   | kubelet kubectl kube-proxy docker |
192.168.10.102     | kube-node-102 | node   | kubelet kubectl kube-proxy docker |
192.168.10.120     | kube-node-120 | LB     | haproxy+keepalived(VIP:172.72.4.2) calico |
192.168.10.121     | kube-node-121 | LB     | haproxy+keepalived(VIP:172.72.4.2) calico |


## 组件版本

* CentOS: 7.3.1611
* Kernel: 3.10.0-514.26.2
* Kubernetes 1.8.2
* Docker 1.12.6
* ETCD 3.2.1
* Flannel 0.8.0 (host-gw)
* Calico 2.6.2
* CFSSL 1.2
* Kubelet TLS BootStrapping
* kubedns dashboard heapster
* Registry
* Harbor
* RBAC Node

启用 TLS 双向认证、RBAC 授权模式、Node 授权模式。


## 网络分配

Pod IP CIDR  | Service IP CIDR | kubernetes Service IP | kube-dns Service IP  |
------------ | --------------- | --------------------- | -------------------- |
172.1.0.0/16 | 172.254.0.0/16  | 172.254.0.1           | 172.254.0.2          |


## 安装组件

### 安装 CFSSL 【ALL MASTERS】

```bash
$ ops/cfssl/install-cfssl.sh
```

### 安装 Master 组件【ALL MASTERS】

安装 Kubernetes Master 组件：

```bash
$ ops/kubernetes/install-k8s-master.sh
```

安装 etcd：

```bash
$ ops/etcd/install-etcd.sh 3.2.9

$ ETCDCTL_API=3 etcdctl version
etcdctl version: 3.2.9
API version: 3.2
```

### 安装 Worker 组件 【ALL WORKERS】

Worker 节点需要的组件：kubelet、kube-proxy、kubectl、docker。

```bash
$ ops/kubernetes/install-k8s-node.sh
```

### 安装配置 Docker 【ALL NODES】

部署 kubelet 之前需要先启动一个 container runtime，Kubernetes 1.8 支持 `Docker`、`Rkt` 以及 `CRI-O`。

```bash
# 默认安装（会添加一个默认配置到 /usr/lib/systemd/system/docker.service）
$ ops/docker/install-docker-engine.sh

# 修改部分配置
$ mkdir -p /usr/lib/systemd/system/docker.service.d
$ POD_IP_POOL=172.1.0.0/16
$ SERVER_IP_POOL=172.254.0.0/16
$ cat <<EOF > /usr/lib/systemd/system/docker.service.d/docker.conf
[Service]
Environment="DOCKER_OPTIONS=--storage-driver=overlay --log-level=error --log-opt max-size=50m --log-opt max-file=5 --exec-opt=native.cgroupdriver=cgroupfs --insecure-registry=${POD_IP_POOL} --insecure-registry=${SERVER_IP_POOL}"
EOF

# 重启 docker
$ systemctl daemon-reload
$ systemctl enable docker
$ systemctl restart docker
```

其他工具：

```bash
$ yum install -y net-tools
```


## 其他

### 安全设置

为了避免部署过程中出错，建议先关闭 SELinux 和防火墙，待集群运行正常后再试图开启。

```bash
# CentOS 7

# 关闭 SELinux
$ setenforce 0
$ sed -i "s|SELINUX=enforcing|SELINUX=disabled|g" /etc/selinux/config

# 关闭防火墙
$ systemctl stop firewalld
$ systemctl disable firewalld
```

### 主机名设置

```bash
# 以此类推
$ hostnamectl --static set-hostname <hostname>
```

### hosts 和 ssh 设置

我们选择 kube-master-1 为控制节点，所以需要 kube-master-1 可以无密钥访问其他所以节点。

```bash
# kube-master-1
$ cat /etc/hosts
172.72.4.12 kube-master-2
172.72.4.11 kube-master-1
172.72.4.13 kube-master-3
172.72.4.14 kube-node-1
172.72.4.15 kube-node-2
172.72.4.100 kube-lb-1
172.72.4.101 kube-lb-2
```

```bash
# kube-master-1
$ ssh-copy-id <nodename>
```

### 同步时钟

为了节点之间能够正常通信，需要所有节点的时钟，这在 etcd 集群间通信时非常重要。

```bash
$ yum install -y ntp
$ ntpdate cn.pool.ntp.org
$ hwclock -w
$ systemctl enable ntpd
$ systemctl restart ntpd
```

### 命名规范

* 主机名

设置主机名一定要规范，不要带 `.`（比如：ip-192-168-1-10.kube-node-1.sh.cn），否则在 kubelet 使用 Bootstrap TLS 请求加入集群时会错误，可以使用如：kube-node-1。
