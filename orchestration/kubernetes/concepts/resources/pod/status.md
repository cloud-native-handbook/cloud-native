# Pod 状态分析

`Pod.`

| Phase   | 描述 |
| ------- | ---- |
| Pending |      |

* Unknown
* NodeLost
* Pending
* Failed
* Running
* Succeeded

如果节点挂了（节点进入 `NotReady` 状态），使用 DaemonSet 方式部署的 Pod 可能会出现 `NodeLost` 状态。可以使用下面的命令强制移除，删除后又会自动创建新的 Pod 并进入 `Pending`。

```bash
$ kubectl delete pod <pod-name> --grace-period=0 --force
```

* [Force Delete StatefulSet Pods](https://kubernetes.io/docs/tasks/run-application/force-delete-stateful-set-pod/)
* [kubernetes 之 pod状态分析](http://blog.csdn.net/u013812710/article/details/72886491)
https://pracucci.com/graceful-shutdown-of-kubernetes-pods.html
* [Graceful shutdown of pods with Kubernetes](https://pracucci.com/graceful-shutdown-of-kubernetes-pods.html)


