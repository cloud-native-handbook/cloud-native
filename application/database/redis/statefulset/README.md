# Redis 高可用集群

* sentinel

当其中 redis master 发生故障时，sentinel 会从剩余 redis slave 中选举出新的 master。


## 部署

```bash
$ kubectl create -f database.namespace.yaml

$ kubectl create -f rbd-secret-admin.secret.database.yaml

$ # 创建配置
$ kubectl create configmap redis-config --from-file=redis-master.conf --from-file=redis-slave.conf -n database
```


## 参考

* [Reliable, Scalable Redis on Kubernetes](https://github.com/kubernetes/examples/tree/master/staging/storage/redis)
* [Deploying PHP Guestbook application with Redis](https://kubernetes.io/docs/tutorials/stateless-application/guestbook/)