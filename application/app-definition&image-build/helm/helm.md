# Kubernetes Helm

Helm 是由 Deis 发起的 Kubernetes 的包管理器，用于简化 Kubernetes 应用的部署和管理，类似于 `Yum` 和 `APT`。

## 概念

* Chart: Helm 包，包含应用程序的定义、依赖等，类似于 APT 的 `dpkg` 和 Yum 的 `rpm` 文件。
* Release: Chart 实例，每安装一次 Chart 就会生成一个新的 release。
* Repository: 发布和存储 Chart 的仓库。

## 组件

* Helm: Helm 客户端组件。
* Tiller: Helm 服务端组件；用于管理 Kubernetes 应用程序的生命周期。
* Repository: Chart 仓库，Helm 客户端通过 HTTP 协议来获取仓库中 Chart 的索引文件和压缩包。

## 安装

* 安装 Helm 客户端

```bash
$ git clone github.com/jinsyin/ops
$ ops/kubernetes/install-helm.sh
```

* 安装部署 Tiller 服务端

缺省参数的 `helm init` 安装 Tiller 时，会使用 kubectl 默认的 context 连接 kubernetes 集群（见： `--kube-context` 参数），然后拉取 `gcr.io/kubernetes-helm/tiller` 镜像，使用 `default` ServiceAccount 部署 Tiller 到 `kube-system` 命名空间（见： `--tiller-namespace` 参数，但客户端不支持设置默认命名空间），并添加 "https://kubernetes-charts.storage.googleapis.com" 作为默认的 `stable` 仓库。

使用 `helm install` 安装 release 时，helm 客户端会请求 Tiller 服务创建相应的资源对象，因此还需要为 Tiller 授权（通常授权最大权限： `cluster-admin` ClusterRole）；另外，Tiller 还会将 release 信息存储在 release 所在命名空间的 ConfigMap 中。

```bash
# RBAC
$ kubectl -n kube-system create serviceaccount helm-tiller
$ kubectl create clusterrolebinding helm-tiller --clusterrole=cluster-admin --serviceaccount=kube-system:helm-tiller

# 部署 Helm Tiller（使用阿里云仓库和镜像）
$ helm init --upgrade \
  --tiller-namespace=kube-system --service-account=helm-tiller \
  --stable-repo-url https://kubernetes.oss-cn-hangzhou.aliyuncs.com/charts \
  --tiller-image=registry.cn-hangzhou.aliyuncs.com/google_containers/tiller:v2.8.0

# 验证 Tiller 服务
$ kubectl -n kube-system get deploy,pod -l app=helm

# 验证客户端是否可以连接 Tiller 服务端（默认连接的是 kube-system 命名空间的 Tiller）
$ helm version
Client: &version.Version{SemVer:"v2.8.0", GitCommit:"14af25f1de6832228539259b821949d20069a222", GitTreeState:"clean"}
Server: &version.Version{SemVer:"v2.8.0", GitCommit:"14af25f1de6832228539259b821949d20069a222", GitTreeState:"clean"}
```

## 常用命令

* Repository

```bash
# 仓库列表
$ helm repo list

# 添加 repo
$ helm repo add monocular https://kubernetes-helm.github.io/monocular
$ helm repo add incubator https://kubernetes-charts-incubator.storage.googleapis.com/

# 更新 charts 列表
$ helm repo update # 类似 apt-get update

# 启动本地仓库
$ helm create mychart && helm package mychart/ && helm serve

# 创建或更新仓库的 index.yaml
$ helm package mychart/ && helm repo index .
```

* Chart

```bash
# 查询仓库中所有的 Helm Charts
$ helm search

# 根据关键词查询 Helm Charts
$ helm search mysql

# Chart.yaml
$ helm inspect chart stable/mysql

# values.yaml
$ helm inspect values stable/mysql

# 打包为 tgz
$ helm fetch stable/mysql   # 远程下载
$ helm package mychart # 打包本地 chart

# 创建新的 chart
$ helm create mychart

# 验证 chart
$ cd mychart && helm lint

# 查看依赖
$ cd mychart && helm dep list

# 更新依赖（requirements.yaml 中的内容）
$ cd mychart && helm dep update

# 重构依赖
$ cd mychart && helm dep rebuild
```

* Release

```bash
# Release 列表
$ helm list
$ helm ls --all

# 安装 release（如果不指定 --name，将会以两个随机的单词开头））
$ helm install <chart-name>
$ helm install stable/mysql --name=helm-mysql  # 使用在线的 chart（默认安装在 default 命名空间）
$ helm create mychart && helm install mychart/ # 使用离线的 chart
$ helm install mychart-0.1.0.tgz               # 使用离线的 chart

# 自定义 values，并安装 release
$ echo "mysqlRootPassword: passwd" > config.yaml
$ helm install -f config.yaml stable/mysql

# 安装 release 前查看模板和 values 渲染后的 yaml（并不会安装 release）
$ helm install --dry-run --debug stable/mysql

# 删除 release
$ helm delete <release-name>
$ helm delete helm-mysql
$ helm delete --purge helm-mysql

# 滚动升级
$ helm upgrade -f myvalues.yaml new-redis stable/redis

# 回滚
$ helm rollback new-redis 1
```

* Tiller

```bash
# 安装部署 Tiller
$ helm init

# 删除卸载 Tiller
$ helm reset # 或 kubectl -n helm delete deploy/tiller-deploy
$ kubectl delete clusterrolebinding/helm-tiller
$ kubectl -n kube-system delete serviceaccount helm-tiller
```

## Helm 仓库

* 官方仓库

  * https://github.com/kubernetes/charts

* 第三方仓库

  * https://github.com/deis/charts
  * https://github.com/bitnami/charts
  * https://github.com/att-comdev/openstack-helm
  * https://github.com/sapcc/openstack-helm
  * https://github.com/mgoodness/kube-prometheus-charts
  * https://github.com/helm/charts
  * https://github.com/jackzampolin/tick-charts

* [gs://kubernetes-charts Google Storage bucket](https://console.cloud.google.com/storage/browser/kubernetes-charts)
* [gs://kubernetes-charts-incubator Google Storage Bucket](https://console.cloud.google.com/storage/browser/kubernetes-charts-incubator)

## UI

* [Monocular](./monocular.md)
* [Kubeapps](./kubeapps.md)

## Helm 插件

1. [helm-tiller](https://github.com/adamreese/helm-tiller) - Additional commands to work with Tiller
2. [Technosophos's Helm Plugins](https://github.com/technosophos/helm-plugins) - Plugins for GitHub, Keybase, and GPG
3. [helm-template](https://github.com/technosophos/helm-template) - Debug/render templates client-side
4. [Helm Value Store](https://github.com/skuid/helm-value-store) - Plugin for working with Helm deployment values
5. [Drone.io Helm Plugin](http://plugins.drone.io/ipedrazas/drone-helm/) - Run Helm inside of the Drone CI/CD system

## 测试用例

## crd

* [CustomResourceDefinition for Helm](https://github.com/bitnami-labs/helm-crd)
* https://github.com/rancher/helm-controller

## 源

* [kubernetes-charts.storage.googleapis.com](http://kubernetes-charts.storage.googleapis.com/)
* [kubernetes-charts-incubator.storage.googleapis.com](http://kubernetes-charts-incubator.storage.googleapis.com/)

## 参考

* [Kubernetes Helm](https://github.com/kubernetes/helm)
* [Helm Charts](https://github.com/kubernetes/charts)
* [利用 Helm 简化 Kubernetes 应用部署](https://yq.aliyun.com/articles/159601)
* [kubernetes helm 试用](http://www.jianshu.com/p/1953b86649df)
* [构建私有 Chart 仓库](https://github.com/rootsongjc/kubernetes-handbook/blob/master/practice/create-private-charts-repo.md)
* [Chart 模版配置规范定义](https://github.com/caicloud/charts)

* [CustomResourceDefinition for Helm](https://github.com/bitnami-labs/helm-crd)
* [helm-apiserver](https://github.com/bitnami-labs/helm-apiserver)
* [helm-controller](https://github.com/rancher/helm-controller)
