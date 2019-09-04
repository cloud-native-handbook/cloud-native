# Jenkins X


## 安装

```bash
$ ops/jenksin/install-jx.sh
```


## 部署 Jenkins 到 Kubernetes

```bash
$ jx install
```

相关说明：

  * 需要先本地安装好 kubectl 和 helm CLI，并配置好 kubeconfig 和 helm 环境（Tiller 我使用的是 `cluster-admin` ClusterRole）
  * 需要设置默认的 StorageClass，它会自动创建 PVC
  * 所有资源对象都部署到了一个新的命名空间 `jx`
  * 除了 heapster 镜像来自 gcr.k8s.io 外，其他都会可以从 dockerhub 拉取到



## 命令补全

```bash
$ jx completion bash > ~/.jx/bash
$ source ~/.jx/bash 
```