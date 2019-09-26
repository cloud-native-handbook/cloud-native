# Kubelet 遇到磁盘压力问题

## 问题

启动 kubelet 将 Node 加入集群后，由于使用了 DaemonSet 来部署 Calico，所以会自动在该节点上创建 Pod，但遇到了如下问题：

```bash
$ journalctl -f -u kubelet
1月 12 19:54:17 kube-node-51 kubelet[18036]: I0112 19:54:17.620132   18036 kubelet.go:1853] SyncLoop (DELETE, "api"): "calico-node-fs4r6_kube-system(510c94d0-f78f-11e7-bd1e-d4bed9ee30df)"
1月 12 19:54:17 kube-node-51 kubelet[18036]: I0112 19:54:17.624296   18036 kubelet.go:1847] SyncLoop (REMOVE, "api"): "calico-node-fs4r6_kube-system(510c94d0-f78f-11e7-bd1e-d4bed9ee30df)"
1月 12 19:54:17 kube-node-51 kubelet[18036]: I0112 19:54:17.628224   18036 kubelet.go:2030] Failed to delete pod "calico-node-fs4r6_kube-system(510c94d0-f78f-11e7-bd1e-d4bed9ee30df)", err: pod not found
1月 12 19:54:17 kube-node-51 kubelet[18036]: I0112 19:54:17.632838   18036 kubelet.go:1837] SyncLoop (ADD, "api"): "calico-node-c86hm_kube-system(5167c4f7-f78f-11e7-bd1e-d4bed9ee30df)"
1月 12 19:54:17 kube-node-51 kubelet[18036]: W0112 19:54:17.632935   18036 eviction_manager.go:142] Failed to admit pod calico-node-c86hm_kube-system(5167c4f7-f78f-11e7-bd1e-d4bed9ee30df) - node has conditions: [DiskPressure]
```

## 排错

尝试用 `kubectl describe pod` 和 `kubectl logs -f pod` 进行排错都不行，因为 Pod 会在 1 ~ 2s 的时间内频繁重启，导致无法通过 Pod 名来检查状态。通过查看 kubelet 日志发现了问题：磁盘空间不足。

```bash
$ kubectl -n kube-system describe ds/calico-node
Events:
  Type     Reason            Age                     From                  Message
  ----     ------            ----                    ----                  -------
  Normal   SuccessfulCreate  53m (x277188 over 15d)  daemon-set            (combined from similar events): Created pod: calico-node-9cjr8
  Warning  FailedDaemonPod   4m (x281441 over 15d)   daemonset-controller  (combined from similar events): Found failed daemon pod kube-system/calico-node-qpfqj on node kube-node-51, will try to kill it
  Normal   SuccessfulDelete  4m (x281452 over 15d)   daemon-set            (combined from similar events): Deleted pod: calico-node-bplmc
```

```bash
# 磁盘空间使用率高达 90%
$ df -h
Filesystem      Size  Used Avail Use% Mounted on
/dev/sda1        59G   50G  6.1G  90% /
devtmpfs        1.8G     0  1.8G   0% /dev
tmpfs           1.9G     0  1.9G   0% /dev/shm
tmpfs           1.9G   56M  1.8G   3% /run
tmpfs           1.9G     0  1.9G   0% /sys/fs/cgroup
tmpfs           371M     0  371M   0% /run/user/0
```

## 解决办法

* 清除一些没用的大文件或大目录

```bash
$ # 查找所有大于 100MB 的文件
$ find / -type f -size +100M

$ # 查看最大的前十个子目录（完全逆排序，统一单位为 MB）
$ du -hm / --max-depth=2 | sort -nr | head -n 10
```

* 改变 docker 的存储路径

由于 docker 镜像或容器占据了大量存储空间，所以可以外挂新的盘，并将原来的数据转移到新的盘，再重新设置 docker 的存储路径。

```bash
$ dockerd --graph=/mnt/sdc/docker ...
```

* 调整 kubelet 参数

```bash
memory.available<10%
memory.available<1Gi
```




## 参考

* [Kubernetes 节点资源耗尽状态的处理](http://tonybai.com/2017/10/16/out-of-node-resource-handling-in-kubernetes-cluster/)
* [Kubelet 对资源紧缺状况的应对](https://www.kubernetes.org.cn/1732.html)
