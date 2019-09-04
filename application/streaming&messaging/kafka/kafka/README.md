# Kafka

## 部署

```bash
$ # 创建 namespace 并为该命名空间创建 secret
$ kubectl apply -f kafka-cluster.namespace.yaml
$ kubectl apply -f rbd-secret-admin.secret.kafka-cluster.yaml

$ kubectl apply -f kafka.svc+pdb+statefulset.kafka-cluster.yaml
```

## 测试

```bash
$ # 创建 topic，目的是为了验证是否所有的 brokers 都可用，所有把 replication-factor 设置为最大（即 kafka 集群大小）
$ kubectl exec -ti kafka-0 -n kafka-cluster -- bash
> kafka-topics.sh --create \
--topic test \
--zookeeper zk-headless.zk-cluster.svc.cluster.local:2181/kafka \
--partitions 3 \
--replication-factor 3
>
> # 消费消息
> kafka-console-consumer.sh --topic test --bootstrap-server localhost:9092
```

```bash
$ # 在 kafka-1 中生成消息 （另一个终端）
$ kubectl exec -ti kafka-1 -n kafka-cluster -- bash
> kafka-console-producer.sh --topic test --broker-list localhost:9092
hello
goodbye
```


## 水平扩容

```bash
$ # 扩容
$ kubectl scale statefulset kafka --replicas=4 -n kafka-cluster

$ # 在 zookeeper 中查看 kafka-3 中是否添加成功
$ kubectl exec -it zk-0 -n kafka-cluster -- zkCli.sh get /kafka/brokers/ids/3
```


## 参考

* [kubernetes 中 kafka 和 zookeeper 有状态集群服务部署实践](https://www.qcloud.com/community/article/198250)
* [Kubernetes Kafka K8SKafka](https://github.com/kubernetes/contrib/tree/master/statefulsets/kafka)