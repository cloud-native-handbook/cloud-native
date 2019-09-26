# 错误二

## cni0 无法创建

采用基于 kubernetes + flannel 的网络方案时， `cni0` 虚拟网卡有时候无法创建，仅仅只有一个 `flannel.1`。

```bash
$ # 驱逐该节点上的所有 Pod
$ kubectl drain <target-node> --ignore-daemonsets

$ kubectl delete <target-node>
```

## 目标节点

```bash
$ kubeadm reset

$ systemctl stop kubelet

$ rm -rf /var/lib/cni/
$ rm -rf /var/lib/kubelet/*
$ rm -rf /etc/cni/

$ ifconfig cni0 down
$ ifconfig flannel.1 down

$ yum remove -y kubectl-1.6.2 kubelet-1.6.2 kubeadm-1.6.2 kubernetes-cni-0.5.1
$ yum install -y kubectl-1.6.2 kubelet-1.6.2 kubeadm-1.6.2 kubernetes-cni-0.5.1

$ kubeadm join --token=a1ed36.7bba409461c70635 10.0.13.3:6443
```
