# Label 与 Annotation

## Annotation

### Critical Add-On Pod

有些插件对于集群而言是至关重要的，比如 Heapster、DNS。如果他们被删除可能会导致集群停止工作。

> https://kubernetes.io/docs/tasks/administer-cluster/guaranteed-scheduling-critical-addon-pods/
> https://github.com/NVIDIA/k8s-device-plugin/pull/24/commits/36bdb47c21b84bdf5d3c11629e10a3520a46167c

* 插件必须运行在 `kube-system` 命名空间
* 设置 `scheduler.alpha.kubernetes.io/critical-pod` annotation 为空字符串
* 设置 `PodSpec.tolerations` 字段为 `[{"key": "CriticalAddonsOnly", "operator": "Exists"}]`

```yaml
metadata:
  # Mark this pod as a critical add-on
  annotations:
    scheduler.alpha.kubernetes.io/critical-pod: ""
spec:
  tolerations:
  # Allow this pod to be rescheduled while the node is in "critical add-ons only" mode.
  - key: CriticalAddonsOnly
    operator: Exists
```
