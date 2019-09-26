# PodDisruptionBudget（PDB）

`PodDisruptionBudget` 用于限制应用程序同时中断的数量，这对于高可用应用来说是至关重要的。以 ZooKeeper 为例，假设最初部署了三个应用，由于 ZooKeeper 应用的数量至少要一半存活才能正常对外提供服务，如果因为某种原因（比如因维护节点而执行了 `kubectl drain` 命令，而该节点恰好运行了两个 Zookeeper）删除了两个 ZooKeeper 将导致 Zookeeper 服务中断，不能对外提供服务。

```yaml
apiVersion: policy/v1beta1
kind: PodDisruptionBudget
metadata:
  name: zk-pdb
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: zookeeper
```

```yaml
apiVersion: policy/v1beta1
kind: PodDisruptionBudget
metadata:
  name: zk-pdb
spec:
  maxUnavailable: 1
  selector:
    matchLabels:
      app: zookeeper
```

## 参考

* [Specifying a Disruption Budget for your Application](https://kubernetes.io/docs/tasks/run-application/configure-pdb/)
