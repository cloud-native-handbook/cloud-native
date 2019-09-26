# Kubernetes 存储卷

容器中的数据存在以下问题：

* 当容器奔溃时，kubelet 以最初的状态重启它，但是数据会丢失
* Pod 中的容器之间需要共享数据

Kubernetes `Volume` 抽象解决了以上这些问题。

## Docker Volume 与 Kubernetes Volume

Docker Volume 是主机磁盘上的一个目录，或者另一个容器的目录。

Docker Volume 存在以下问题：

* 无法管理 Docker Volume 的生命周期
* Volume driver 功能有限（比如只支持一个 volume driver）

Kubernetes Volume：

* 有明确的生命周期，Volume 的生命周期可以长于 **Pod 中的容器**，容器重启依然保留数据
* Pod 消失时，Volume 跟着消失
* 支持多个类型的 Volume，并且可以同时使用任意数量的 volume

Pod 如何使用 volume：

* 指定为 Pod 提供的 volume (即 `.spec.volumes` 字段)
* 将提供的 volume 挂载到容器（即 `.spec.containers[].volumeMounts`）

从本质上讲，卷只是一个目录，可能包含一些数据，Pod中的容器可以访问它。

## 卷的类型

Kubernetes 支持以下类型的卷：

| -                                         | -                     | -              |
| ----------------------------------------- | --------------------- | -------------- |
| [awsElasticBlockStore](aws-ebs/README.md) | flexVolume            | projected      |
| azureDisk                                 | flocker               | portworxVolume |
| azureFile                                 | gcePersistentDisk     | quobyte        |
| cephfs                                    | gitRepo (已弃用)      | rbd            |
| cinder                                    | glusterfs             | scaleIO        |
| configMap                                 | hostPath              | secret         |
| csi                                       | iscsi                 | storageos      |
| downwardAPI                               | local                 | vsphereVolume  |
| emptyDir                                  | nfs                   |                |
| fc (fibre channel)                        | persistentVolumeClaim |                |

值得注意的是，Kubernetes 内置（in-tree）的 Volume 已不再添加新的功能，而是推荐使用 CSI Driver 来连接外部（out-tree）卷（不过目前大部分还 CSI 还处于 `alpha` 状态）。

## 参考

* [Volumes](https://kubernetes.io/docs/concepts/storage/volumes/)
* [Persistent Volume Provisioning](https://github.com/kubernetes/examples/tree/master/staging/persistent-volume-provisioning)
* [kubernetes volume examples](https://github.com/kubernetes/examples/tree/master/staging/volumes)
