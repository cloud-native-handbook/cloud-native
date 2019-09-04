# 部署

```bash
$ # 在 ceph 中预先创建存储池
$ ceph osd pool create kube 8 8
```

```bash
$ # 创建 StorageClass 以及所需的位于 kube-system 中的 Secret
$ # Secret 为什么要在 kube-system：是因为 kube-system 中的资源可以被其他命名空间共享
$ kubectl create -f rbd.storageclass.admin.yaml

$ # 创建一个命名空间： ns1
$ kubectl create -f ns1.namespace.yaml

$ # 在 ns1 中创建一个与前面的 kube-system 中的 Secret 同名的 Secret
$ kubectl create -f rbd.secret.admin.ns1.yaml

$ # 在 ns1 中创建 pvc （检查一下是否可以创建成功）
$ kubectl create -f rbd-pvc.pvc.ns1.yaml

$ # 在 ns1 中创建 pod （检查一下是否可以挂载成功）
$ kubectl create -f rbd-pod.pod.ns1.yaml
```

## 参考

* [Ceph 在 Kubernetes 中的一些应用](http://www.jianshu.com/p/b5fb31424c09)
* [在 Kubernetes 中使用 Sateful Set 部署 Redis](https://www.kubernetes.org.cn/2516.html)



http://blog.csdn.net/wenwst/article/details/54022129


创建 PVC 报错，因为集群是采用 kubeadm 来部署的，而 `gcr.io/google_containers/kube-controller-manager-amd64` 镜像中并没有 ceph-common 包，因此在 kube-controller-manager 中无法调用 rbd 接口来创建 PV。解决办法如下：

如果是 kubeadm 1.5.x：

```bash
$ kubectl exec -it kube-controller-manager-ceph-node-1 -n kube-system -- sh
/ # apt-get update && apt-get install ceph-common
```

如果是 kubeadm 1.6.x（基础镜像是 busybox，没包管理器）：

使用 [hyperkube](https://github.com/kubernetes/kubernetes/tree/master/cluster/images/hyperkube) 来代替 kube-controller-manager，甚至所有 kubeadm 相关的镜像，因为 hyperkube 不仅集成了所有 kubeadm 相关的[工具](https://github.com/kubernetes/kubernetes/blob/master/cluster/images/hyperkube/Dockerfile)，还集成了 ceph-common。

具体镜像有两个：
  * [gcr.io/google-containers/hyperkube-amd64](https://gcr.io/google-containers/hyperkube-amd64) - 该镜像不包含 ceph-common，但提供了 apt 包管理器
  * [quay.io/coreos/hyperkube](https://quay.io/coreos/hyperkube) - 包含 ceph-common 包，但实测出现很多问题
