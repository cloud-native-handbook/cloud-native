# Redis 高可用集群

* sentinel

当其中 redis master 发生故障时，sentinel 会从剩余 redis slave 中选举出新的 master。


## 部署

```bash
$ kubectl create -f database.namespace.yaml

$ # 创建配置
$ kubectl create configmap redis-config --from-file=conf/redis-master.conf --from-file=conf/redis-slave.conf -n database
```


## 参考

* [Reliable, Scalable Redis on Kubernetes](https://github.com/kubernetes/examples/tree/master/staging/storage/redis)
* [Deploying PHP Guestbook application with Redis](https://kubernetes.io/docs/tutorials/stateless-application/guestbook/)
* [在 Kubernetes 中使用 Sateful Set 部署 Redis](https://www.kubernetes.org.cn/2516.html)
* [在 Kubernetes 的 3 个 node 上部署 redis cluster](https://www.kubernetes.org.cn/2413.html)
