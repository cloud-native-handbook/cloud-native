# Minikube（Ubuntu Desktop）

副标题：利用 Minikube 打造一个完美的 Kubernetes 开发环境 | Ubuntu Desktop 篇

## 要求

* Minikube v0.25.0 --> Kubernetes v1.9.0

## 安装

```bash
$ git clone https://github.com/jinsyin/ops

# minikube & kubectl
$ ops/kubernetes/install-minikube.sh v0.25.0

# 验证
$ minikube version
$ kubectl version
```

## 部署（基于 Linux）

查看支持的 Kubernetes 版本：

```bash
minikube get-k8s-version
```

* 运行组件到虚拟机（默认: virtualbox）

```bash
# 将下载 Minikube ISO
$ minikube start --vm-driver=virtualbox --kubernetes-version=v1.9.0

# 如果下载失败，手动指定 ISO 路径
$ minikube start --vm-driver=virtualbox --kubernetes-version=v1.9.0 --iso-url=xxx
```

* 运行组件到宿主机（我采用的这种方式）

```bash
# 将下载 localkube （--extra-config=kubelet.CgroupDriver=cgroupfs）
# 必须以 root 用户运行，因为会下载 localkube 到 /usr/local/bin/localkube
$ sudo minikube start --vm-driver=none --kubernetes-version=v1.9.0

# 如果下载失败，手动下载
$ sudo wget -O /usr/local/bin/localkube https://github.com/kubernetes/minikube/releases/download/v0.25.0/localkube

#
$ sudo chown yin:yin -R $HOME/.minikube
```

* 验证服务

```bash
# 检查状态
$ minikube status
minikube: Running
cluster: Running
kubectl: Correctly Configured: pointing to minikube-vm at 192.168.1.102

# 排查日志
$ minikube logs
$ minikube logs -f

# 验证 kube-apiserver（localkube） 是否可以正常访问
$ kubectl version

# etcd: 2379 2380
# kubelet: 4194 10248 10250 10255
# apiserver: 8443
# scheduler: 10251
# controller-manager: 10252
$ netstat -tpln | grep localkube
tcp   0  0  127.0.0.1:10248  0.0.0.0:*  LISTEN  15202/localkube
tcp   0  0  127.0.0.1:2379   0.0.0.0:*  LISTEN  15202/localkube
tcp   0  0  127.0.0.1:2380   0.0.0.0:*  LISTEN  15202/localkube
tcp6  0  0  :::8443          :::*       LISTEN  15202/localkube
tcp6  0  0  :::4194          :::*       LISTEN  15202/localkube
tcp6  0  0  :::10250         :::*       LISTEN  15202/localkube
tcp6  0  0  :::10251         :::*       LISTEN  15202/localkube
tcp6  0  0  :::10252         :::*       LISTEN  15202/localkube
tcp6  0  0  :::10255         :::*       LISTEN  15202/localkube

# 系统会首先自动部署一个 hello-minikube deployment 和一个 kube-addon-manager deployment
$ kubectl get pod --all-namespaces
NAMESPACE     NAME                              READY     STATUS              RESTARTS   AGE
default       hello-minikube-779cc85c98-q65zr   0/1       ContainerCreating   0          8d
kube-system   kube-addon-manager-yin            0/1       ContainerCreating   0          8d
```

* 拉取镜像

```bash
# 查看日志获取 pause-amd64 镜像 Tag，并拉取镜像
$ docker pull mirrorgooglecontainers/pause-amd64:3.0
$ docker tag mirrorgooglecontainers/pause-amd64:3.0 gcr.io/google_containers/pause-amd64:3.0

# 查看 kube-addon-manager 镜像 Tag，并拉取镜像
$ kubectl -n kube-system get pod/kube-addon-manager-yin -o yaml | grep 'image:'
$ docker pull mirrorgooglecontainers/kube-addon-manager:v6.5
$ docker tag mirrorgooglecontainers/kube-addon-manager:v6.5 gcr.io/google-containers/kube-addon-manager:v6.5
```

kube-addon-manager 运行起来以后，又会自动部署 `kube-dns`、`kubernetes-dashboard` 和 `storage-provisioner` 插件。

```bash
$ kubectl get pod --all-namespaces
NAMESPACE     NAME                                    READY     STATUS              RESTARTS   AGE
default       hello-minikube-779cc85c98-q65zr         1/1       Running             0          8d
kube-system   kube-addon-manager-yin                  1/1       Running             0          8d
kube-system   kube-dns-54cccfbdf8-rnnn9               0/3       ContainerCreating   0          1m
kube-system   kubernetes-dashboard-77d8b98585-c8b4r   0/1       ContainerCreating   0          1m
kube-system   storage-provisioner                     0/1       ImagePullBackOff    0          1m

# 获取镜像 tag
$ kubectl -n kube-system get pod/kube-dns-54cccfbdf8-rnnn9 -o yaml | grep 'image:'
$ kubectl -n kube-system get pod/kubernetes-dashboard-77d8b98585-c8b4r -o yaml | grep 'image:'
$ kubectl -n kube-system get pod/storage-provisioner -o yaml | grep 'image:'

# 拉取 kube-dns 所需镜像
$ docker pull mirrorgooglecontainers/k8s-dns-kube-dns-amd64:1.14.5
$ docker pull mirrorgooglecontainers/k8s-dns-dnsmasq-nanny-amd64:1.14.5
$ docker pull mirrorgooglecontainers/k8s-dns-sidecar-amd64:1.14.5
$ docker tag mirrorgooglecontainers/k8s-dns-kube-dns-amd64:1.14.5 k8s.gcr.io/k8s-dns-kube-dns-amd64:1.14.5
$ docker tag mirrorgooglecontainers/k8s-dns-dnsmasq-nanny-amd64:1.14.5 k8s.gcr.io/k8s-dns-dnsmasq-nanny-amd64:1.14.5
$ docker tag mirrorgooglecontainers/k8s-dns-sidecar-amd64:1.14.5 k8s.gcr.io/k8s-dns-sidecar-amd64:1.14.5

# 拉取 kubernetes-dashboard 所需镜像
$ docker pull mirrorgooglecontainers/kubernetes-dashboard-amd64:v1.8.1
$ docker tag mirrorgooglecontainers/kubernetes-dashboard-amd64:v1.8.1 k8s.gcr.io/kubernetes-dashboard-amd64:v1.8.1

# 拉取 storage-provisioner 所需镜像
$ docker pull dockerce/storage-provisioner:v1.8.1
$ docker tag dockerce/storage-provisioner:v1.8.1 gcr.io/k8s-minikube/storage-provisioner:v1.8.1
```

最后在验证一下各个服务是否都已经运行正常：

```bash
$ kubectl get pod --all-namespaces
NAMESPACE     NAME                                    READY     STATUS    RESTARTS   AGE
default       hello-minikube-779cc85c98-q65zr         1/1       Running   0          8d
kube-system   kube-addon-manager-yin                  1/1       Running   0          8d
kube-system   kube-dns-54cccfbdf8-6qbd6               3/3       Running   0          2m
kube-system   kubernetes-dashboard-77d8b98585-c8b4r   1/1       Running   0          1h
kube-system   storage-provisioner                     1/1       Running   0          1h

# 如果某些服务依然没有启动成功，可尝试删除 Pod
$ kubectl -n kube-system delete pod kube-dns-54cccfbdf8-rnnn9
```

```bash
$ kubectl get svc --all-namespaces
NAMESPACE     NAME                   TYPE        CLUSTER-IP       EXTERNAL-IP   PORT(S)         AGE
default       kubernetes             ClusterIP   10.96.0.1        <none>        443/TCP         8d
kube-system   kube-dns               ClusterIP   10.96.0.10       <none>        53/UDP,53/TCP   1h
kube-system   kubernetes-dashboard   NodePort    10.111.250.206   <none>        80:30000/TCP    1h

# 如果希望通过域名访问 Service，进行如下设置

# CentOS
$ sed -i "s|^|search svc.cluster.local cluster.local\nnameserver 10.96.0.10\n|g" /etc/resolv.conf

# Ubuntu
$ sed -i "s|^|search svc.cluster.local cluster.local\nnameserver 10.96.0.10\n|g" /etc/resolvconf/resolv.conf.d/head
$ resolvconf -u
$ apt-get remove -y libnss-mdns

# 测试是否可以正常解析
$ nslookup kubernetes-dashboard.kube-system.svc.cluster.local

# 浏览器访问
$ curl http://kubernetes-dashboard.kube-system.svc.cluster.local
```

## 集群交互

* Context

运行 `minikube start` 命令启动集群后，会自动创建一个 `minikube` 上下文，用于和本地的 Minikube 集群通信。

```bash
# 切换上下文
$ kubectl config use-context minikube
```

* Example

```bash
# Deployment
$ kubectl run hello-nginx --image=nginx:alpine --port=80

# Service
$ kubectl expose deployment/hello-nginx --type=NodePort

# 浏览器访问
$ curl http://hello-nginx.default.svc.cluster.local
```

* 自动补全

```bash
$ echo "source <(kubectl completion bash)" >> ~/.bashrc
$ source ~/.bashrc
```

* 相关目录

```bash
$ ls ~/.kube
$ ls ~/.minikube
$ ls /var/lib/localkube
```

## 清除

```bash
minikube delete
```

```bash
rm -rf ~/.minikube/
rm /usr/local/bin/{localkube,minikube}
```
