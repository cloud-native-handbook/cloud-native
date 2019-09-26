# kubectl

## 安装

### 二进制安装

* Linux

```sh
$ curl -LO https://storage.googleapis.com/kubernetes-release/release/$(curl -s https://storage.googleapis.com/kubernetes-release/release/stable.txt)/bin/linux/amd64/kubectl
$ chmod +x ./kubectl
$ sudo mv ./kubectl /usr/local/bin/kubectl

# 验证
$ kubectl version
```

* macOS

```sh
$ curl -LO https://storage.googleapis.com/kubernetes-release/release/$(curl -s https://storage.googleapis.com/kubernetes-release/release/stable.txt)/bin/darwin/amd64/kubectl
$ chmod +x ./kubectl
$ sudo mv ./kubectl /usr/local/bin/kubectl

# 验证
$ kubectl version
```

# 安装 kubectl

## Linux

## macOS

* 二进制

```bash
$ KUBECTL_VERSION=$(curl -s https://storage.googleapis.com/kubernetes-release/release/stable.txt)
$ sudo curl -L https://storage.googleapis.com/kubernetes-release/release/$(KUBECTL_VERSION)/bin/darwin/amd64/kubectl -O /usr/local/bin/kubectl
$ kubectl version
```

* Homebrew

```bash
$ brew install kubernetes-cli
$ kubectl version
```

## Windows

## kubectl proxy

当我们根据 Kubernetes API 开发应用程序时，除了直接使用用户凭证访问 Kubernetes API Server 外，我们还可以基于当前已配置好的 kubectl 环境，使用 `kubectl proxy` 在本机和 Kubernetes API Server 之间创建一个代理或应用级网关，方便我们开发和调试应用程序。不仅如此，使用 `kubectl proxy` 还可以托管本机的静态资源到指定的 HTTP 代理路径。

```sh
# --api-prefix：为代理的 api 指定前缀（即设置代理子路径）
$ kubectl proxy --address='0.0.0.0' --port=8000 --api-prefix=/

# 验证
$ curl localhost:8000/
...
```

```sh
# 托管本机静态资源
$ echo 'Hello,world' > hello.txt
$ kubectl proxy --address='0.0.0.0' --port=8000 --api-prefix=/ --www=./ --www-prefix=/static/

# 验证
$ curl localhost:8000/static/hello.txt
Hello,world
```

## kubectl port-forward

转发一个或多个端口到 Pod，支持通过 Pod、Deployment、Service

```sh
$ kubectl -n kubernetes-dashboard port-forward service/kubernetes-dashboard 8443:443
```

## kubectl apply 与 kubectl create

| 命令 | 支持 manifest 创建资源？| 支持命令行创建资源？ | 更新运行中的资源？ |
| ---- | --- | --- | --- |
| kubectl apply | Yes | No | Yes |
| kubectl create | Yes | Yes | No |

## 参考

* [kubectl CLI](https://kubernetes.io/docs/reference/kubectl)
