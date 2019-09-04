# Kind

Kind 即 **K**ubernetes **IN** **D**ocker，顾名思义，就是使用 Docker 容器 （`nodes`）在本地部署和管理一个或多个 Kubernetes 测试集群。

## 安装要求

* Docker
* Kubectl

## 安装 Kind

* macOS

```sh
$ curl -Lo ./kind https://github.com/kubernetes-sigs/kind/releases/download/v0.4.0/kind-darwin-amd64
$ chmod +x ./kind
$ sudo mv ./kind /usr/local/bin/kind

# 验证
$ kind version
v0.4.0
```

* Linux

```sh
$ curl -Lo ./kind https://github.com/kubernetes-sigs/kind/releases/download/v0.4.0/kind-linux-amd64
$ chmod +x ./kind
$ sudo mv ./kind /usr/local/bin/kind

# 验证
$ kind version
v0.4.0
```

* 编译安装

官方镜像：[kindest/node](https://hub.docker.com/r/kindest/node/)

```sh
```

## 构建镜像

## 集群管理

* 创建集群

```sh
# 默认的集群名称为 “kind”
$ kind create cluster
...
$ kind create cluster --name v1.15.0 --image kindest/node:v1.15.0
$ kind create cluster --name v1.14.3 --image kindest/node:v1.14.3
$ kind create cluster --name v1.13.0 --image kindest/node:v1.13.6
```

* 删除集群

```sh
# 如果不指定 --name，默认删除名为 “kind” 的集群
$ kind delete cluster --name v1.14.0
```

* 集群列表

```sh
$ kind get clusters
```

* 集群交互

创建集群后，可以使用 kubectl 通过 kind 生成的 kubeconfig 配置文件与其交互。

```sh
# 永久：echo "$(kind get kubeconfig --name kind)" > ~/.kube/config
$ export KUBECONFIG="$(kind get kubeconfig-path --name v1.14.0)"

$ kubectl cluster-info
Kubernetes master is running at https://127.0.0.1:34901
KubeDNS is running at https://127.0.0.1:34901/api/v1/namespaces/kube-system/services/kube-dns:dns/proxy

# 返回生成的 kubeconfig 配置文件的路径
$ kind get kubeconfig-path
/home/yin/.kube/kind-config-kind

$ kind get kubeconfig-path --name v1.14.0
/home/yin/.kube/kind-config-v1.14.0
```

```sh
$ docker ps | grep kind
7d4038d5f38c    kindest/node:v1.15.0    "/usr/local/bin/entr…"    7 hours ago    Up 7 hours    34901/tcp, 127.0.0.1:34901->6443/tcp    kind-control-plane
```

## 镜像管理

### 加载镜像到集群

```sh
# 加载 Docker 镜像到集群
$ kind load docker-image <my_custom_image>

# 从镜像归档文件加载到集群
$ kind load image-archive </path/to/my_image_archive.tar>
```

> manifest 中 `image` 不要使用 `:latest` tag，和/或 `imagePullPolicy` 为 `Always`

### 构建镜像

## 原理

```sh
$ docker exec -it kind-control-plane ps aux | grep kube
root         219  1.4  0.2 1624844 93460 ?       Ssl  00:37   6:54 /usr/bin/kubelet --bootstrap-kubeconfig=/etc/kubernetes/bootstrap-kubelet.conf --kubeconfig=/etc/kubernetes/kubelet.conf --config=/var/lib/kubelet/config.yaml --container-runtime=remote --container-runtime-endpoint=/run/containerd/containerd.sock --fail-swap-on=false --node-ip=172.17.0.2 --fail-swap-on=false
root         516  0.1  0.1 141492 39004 ?        Ssl  00:37   0:30 kube-scheduler --bind-address=127.0.0.1 --kubeconfig=/etc/kubernetes/scheduler.conf --leader-elect=true
root         578  1.2  0.1 10553856 51708 ?      Ssl  00:37   5:43 etcd --advertise-client-urls=https://172.17.0.2:2379 --cert-file=/etc/kubernetes/pki/etcd/server.crt --client-cert-auth=true --data-dir=/var/lib/etcd --initial-advertise-peer-urls=https://172.17.0.2:2380 --initial-cluster=kind-control-plane=https://172.17.0.2:2380 --key-file=/etc/kubernetes/pki/etcd/server.key --listen-client-urls=https://127.0.0.1:2379,https://172.17.0.2:2379 --listen-peer-urls=https://172.17.0.2:2380 --name=kind-control-plane --peer-cert-file=/etc/kubernetes/pki/etcd/peer.crt --peer-client-cert-auth=true --peer-key-file=/etc/kubernetes/pki/etcd/peer.key --peer-trusted-ca-file=/etc/kubernetes/pki/etcd/ca.crt --snapshot-count=10000 --trusted-ca-file=/etc/kubernetes/pki/etcd/ca.crt
root         605  1.1  0.3 217560 99872 ?        Ssl  00:37   5:23 kube-controller-manager --allocate-node-cidrs=true --authentication-kubeconfig=/etc/kubernetes/controller-manager.conf --authorization-kubeconfig=/etc/kubernetes/controller-manager.conf --bind-address=127.0.0.1 --client-ca-file=/etc/kubernetes/pki/ca.crt --cluster-cidr=10.244.0.0/16 --cluster-signing-cert-file=/etc/kubernetes/pki/ca.crt --cluster-signing-key-file=/etc/kubernetes/pki/ca.key --controllers=*,bootstrapsigner,tokencleaner --enable-hostpath-provisioner=true --kubeconfig=/etc/kubernetes/controller-manager.conf --leader-elect=true --node-cidr-mask-size=24 --requestheader-client-ca-file=/etc/kubernetes/pki/front-proxy-ca.crt --root-ca-file=/etc/kubernetes/pki/ca.crt --service-account-private-key-file=/etc/kubernetes/pki/sa.key --use-service-account-credentials=true
root         704  2.1  0.8 404064 272184 ?       Ssl  00:37  10:09 kube-apiserver --advertise-address=172.17.0.2 --allow-privileged=true --authorization-mode=Node,RBAC --client-ca-file=/etc/kubernetes/pki/ca.crt --enable-admission-plugins=NodeRestriction --enable-bootstrap-token-auth=true --etcd-cafile=/etc/kubernetes/pki/etcd/ca.crt --etcd-certfile=/etc/kubernetes/pki/apiserver-etcd-client.crt --etcd-keyfile=/etc/kubernetes/pki/apiserver-etcd-client.key --etcd-servers=https://127.0.0.1:2379 --insecure-port=0 --kubelet-client-certificate=/etc/kubernetes/pki/apiserver-kubelet-client.crt --kubelet-client-key=/etc/kubernetes/pki/apiserver-kubelet-client.key --kubelet-preferred-address-types=InternalIP,ExternalIP,Hostname --proxy-client-cert-file=/etc/kubernetes/pki/front-proxy-client.crt --proxy-client-key-file=/etc/kubernetes/pki/front-proxy-client.key --requestheader-allowed-names=front-proxy-client --requestheader-client-ca-file=/etc/kubernetes/pki/front-proxy-ca.crt --requestheader-extra-headers-prefix=X-Remote-Extra- --requestheader-group-headers=X-Remote-Group --requestheader-username-headers=X-Remote-User --secure-port=6443 --service-account-key-file=/etc/kubernetes/pki/sa.pub --service-cluster-ip-range=10.96.0.0/12 --tls-cert-file=/etc/kubernetes/pki/apiserver.crt --tls-private-key-file=/etc/kubernetes/pki/apiserver.key
root        1110  0.0  0.1 139736 33236 ?        Ssl  00:38   0:12 /usr/local/bin/kube-proxy --config=/var/lib/kube-proxy/config.conf --hostname-override=kind-control-plane
root      258439  0.1  0.0 135856 30172 ?        Ssl  08:26   0:00 /dashboard --insecure-bind-address=0.0.0.0 --bind-address=0.0.0.0 --auto-generate-certificates --namespace=kubernetes-dashboard
root      262692  0.0  0.0   3400   924 pts/1    S+   08:34   0:00 grep --color=auto kube
```

## 参考

* [kind.sigs.k8s.io](https://kind.sigs.k8s.io)
* [github.com/kubernetes-sigs/kind](https://github.com/kubernetes-sigs/kind)