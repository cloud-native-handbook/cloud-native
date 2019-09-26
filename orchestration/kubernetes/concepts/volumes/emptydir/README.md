# EmptyDir

* 当节点删除 Pod 时，`emptyDir` 将永久删除其中的数据。
* 容器奔溃不会导致 Pod 被删除，所有 Volume 中的数据是安全的。
* `emptyDir` 卷支持存储在节点的任何存储介质上，包括磁盘、SSD 或网络存储
* 可以将 `emptyDir.medium` 字段设置 `"Memory"` 为告诉 Kubernetes 为您挂载一个 tmpfs（RAM 支持的文件系统） —— tmpfs 非常快，但节点重启时会被清除，并且写入的文件会被计入容器的内存限制。

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: test-pd
spec:
  containers:
  - image: k8s.gcr.io/test-webserver
    name: test-container
    volumeMounts:
    - mountPath: /cache
      name: cache-volume
  volumes:
  - name: cache-volume
    emptyDir: {}
```
