# ZooKeeper

## 镜像

对于 Kubernetes 1.6 和 1.7 版本，官方文档使用的是 `gcr.io/google_samples/k8szk` 镜像来部署的；对于 Kubernetes 1.8 版本，官方文档使用的是 `gcr.io/google_containers/kubernetes-zookeeper` 镜像；不同的镜像使用的部署方式也不同。


## 部署

```bash
$ # 创建 namespace 并为该命名空间创建 secret
$ kubectl apply -f zk-cluster.namespace.yaml
$ kubectl apply -f rbd-secret-admin.secret.zk-cluster.yaml

$ kubectl apply -f zk.svc+cm+pdb+statefulset.zk-cluster.yaml
```


## 测试

```bash
kubectl get pvc,svc,statefulset,pod -n zk-cluster
NAME                 STATUS    VOLUME                                     CAPACITY   ACCESSMODES   STORAGECLASS   AGE
pvc/zookeeper-zk-0   Bound     pvc-5761e47e-ae43-11e7-838b-408d5cfaed4a   10Gi       RWO           rbd            1h
pvc/zookeeper-zk-1   Bound     pvc-b4dc573f-ae43-11e7-838b-408d5cfaed4a   10Gi       RWO           rbd            1h
pvc/zookeeper-zk-2   Bound     pvc-c16c6781-ae43-11e7-838b-408d5cfaed4a   10Gi       RWO           rbd            1h

NAME              CLUSTER-IP      EXTERNAL-IP   PORT(S)             AGE
svc/zk-client     10.96.100.200   <none>        2181/TCP            4m
svc/zk-headless   None            <none>        2888/TCP,3888/TCP   4m

NAME                     DESIRED   CURRENT   AGE
statefulsets/zk          4         4         4m

NAME             READY     STATUS    RESTARTS   AGE
po/zk-0          1/1       Running   0          4m
po/zk-1          1/1       Running   0          3m
po/zk-2          1/1       Running   0          3m
```

```bash
$ for i in 0 1 2; do kubectl exec zk-$i -n zk-cluster -- hostname; done
zk-0
zk-1
zk-2

$ for i in 0 1 2; do kubectl exec zk-$i -n zk-cluster -- hostname; done
zk-0.zk-headless.zk-cluster.svc.cluster.local
zk-1.zk-headless.zk-cluster.svc.cluster.local
zk-2.zk-headless.zk-cluster.svc.cluster.local

$ for i in 0 1 2; do echo "myid zk-$i";kubectl exec zk-$i -n zk-cluster -- cat /var/lib/zookeeper/data/myid; done
myid zk-0
1
myid zk-1
2
myid zk-2
3

$ kubectl exec zk-0 -n zk-cluster -- cat /opt/zookeeper/conf/zoo.cfg
clientPort=2181
dataDir=/var/lib/zookeeper/data
dataLogDir=/var/lib/zookeeper/log
tickTime=2000
initLimit=10
syncLimit=2000
maxClientCnxns=60
minSessionTimeout= 4000
maxSessionTimeout= 40000
autopurge.snapRetainCount=3
autopurge.purgeInteval=1
server.1=zk-0.zk-headless.zk-cluster.svc.cluster.local:2888:3888
server.2=zk-1.zk-headless.zk-cluster.svc.cluster.local:2888:3888
server.3=zk-2.zk-headless.zk-cluster.svc.cluster.local:2888:3888

$ kubectl exec zk-0 -n zk-cluster -- zkMetrics.sh
zk_version  3.4.9-1757313, built on 08/23/2016 06:50 GMT
zk_avg_latency  0
zk_max_latency  0
zk_min_latency  0
zk_packets_received 17
zk_packets_sent 16
zk_num_alive_connections  1
zk_outstanding_requests 0
zk_server_state follower
zk_znode_count  4
zk_watch_count  0
zk_ephemerals_count 0
zk_approximate_data_size  27
zk_open_file_descriptor_count 39
zk_max_file_descriptor_count  65536
```


## 扩容

如果使用的是 `gcr.io/google_samples/k8szk` 镜像，扩容前需要先修改 `zk-config` ConfigMap 中的 `ensemble` 值，在扩容。

```bash
$ # ensemble: "zk-0;zk-1;zk-2;zk-3"
$ kubectl edit cm zk-config -n zk-cluster

$ # 再扩容
$ kubectl scale statefulset zk --replicas=4 -n zk-cluster

$ # 在 zk-0 中添加数据并在 zk-3 中查询
$ kubectl exec -it zk-0 -n zk-cluster -- zkCli.sh create /hello world
$ kubectl exec -it zk-3 -n zk-cluster -- zkCli.sh get /hello
```


## 参考

* [Running ZooKeeper, A CP Distributed System](https://kubernetes.io/docs/tutorials/stateful-application/zookeeper/)
* [Kubernetes ZooKeeper K8SZK](https://github.com/kubernetes/contrib/tree/master/statefulsets/zookeeper)
* [kubernetes 中 kafka 和 zookeeper 有状态集群服务部署实践](https://www.qcloud.com/community/article/198250)
