# Kafka on Kubernetes

## 部署

```bash
$ kubectl create namespace kafka

$ kubectl -n kafka apply -f ceph-secret-kube.yaml

$ kubectl -n kafka apply -f zookeeper.yaml

$ kubectl -n kafka apply -f kafka.yaml
```

验证：

```bash
$ kubectl -n kafka get pod
```

## 参考

* [Kubernetes Kafka K8SKafka](https://github.com/kubernetes/contrib/tree/master/statefulsets/kafka)
