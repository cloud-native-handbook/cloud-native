# Pod 调度策略

## 策略

* `nodeSelector`

## 调度到指定的 Node 上

可以通过 nodeSelector、nodeAffinity、podAffinity 以及 Taints 和 tolerations 等来将 Pod 调度到需要的 Node 上。

也可以通过设置 nodeName 参数，将 Pod 调度到制定 node 节点上。

比如，使用 nodeSelector，首先给 Node 加上标签：

```bash
$ kubectl label nodes <your-node-name> disktype=ssd
```

接着，指定该 Pod 只想运行在带有 disktype=ssd 标签的 Node 上：

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: nginx
  labels:
    env: test
spec:
  containers:
  - name: nginx
    image: nginx
    imagePullPolicy: IfNotPresent
  nodeSelector:
    disktype: ssd
```

nodeAffinity、podAffinity 以及 Taints 和 tolerations 等的使用方法请参考 [调度器](./components/k8s-kube-shceduler.md) 章节。

> https://kubernetes.io/docs/concepts/configuration/assign-pod-node/#node-affinity-beta-feature

## 参考

* [Assigning Pods to Nodes](https://kubernetes.io/docs/concepts/configuration/assign-pod-node/)
* [Taints and Tolerations](https://kubernetes.io/docs/concepts/configuration/taint-and-toleration/)
* [Advanced Scheduling in Kubernetes](https://kubernetes.io/blog/2017/03/advanced-scheduling-in-kubernetes/)
