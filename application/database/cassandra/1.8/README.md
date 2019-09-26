# Cassandra

## 部署

```bash
# 创建命名空间
$ kubectl apply -f namespace.yaml

# 假设已经提前创建好了 ”rbd“ StorageClass
$ kubectl apply -f ceph-secret-kube.yaml

# 使用 StatefulSet 方式部署 Cassandra
$ kubectl apply -f cassandra.yaml
```

验证：

```bash
$ kubectl -n cassandra get pod,pvc
NAME             READY     STATUS    RESTARTS   AGE
po/cassandra-0   1/1       Running   0          6m
po/cassandra-1   1/1       Running   0          5m
po/cassandra-2   1/1       Running   0          4m
po/cassandra-3   1/1       Running   0          3m

NAME                     TYPE        CLUSTER-IP   EXTERNAL-IP   PORT(S)    AGE
svc/cassandra-headless   ClusterIP   None         <none>        9042/TCP   6m

NAME                             STATUS    VOLUME                                     CAPACITY   ACCESS MODES   STORAGECLASS   AGE
pvc/cassandra-data-cassandra-0   Bound     pvc-92785db7-4126-11e8-adc9-d4bed9b697fe   200Gi      RWO            rbd            6m
pvc/cassandra-data-cassandra-1   Bound     pvc-b8f06ada-4126-11e8-adc9-d4bed9b697fe   200Gi      RWO            rbd            5m
pvc/cassandra-data-cassandra-2   Bound     pvc-e39ab883-4126-11e8-adc9-d4bed9b697fe   200Gi      RWO            rbd            4m
pvc/cassandra-data-cassandra-3   Bound     pvc-1b191c2e-4127-11e8-adc9-d4bed9b697fe   200Gi      RWO            rbd            3m
```

检查 Cassandra 集群状态：

```bash
$ kubectl -n cassandra exec -it cassandra-0 -- /usr/local/apache-cassandra-3.11.2/bin/nodetool status
Datacenter: DC1-AIS
===================
Status=Up/Down
|/ State=Normal/Leaving/Joining/Moving
--  Address       Load       Tokens       Owns (effective)  Host ID                               Rack
UN  172.1.74.181  104.54 KiB 32           48.4%             1940fde6-a857-46c4-b5c5-e0ce21fbeba0  RACK1-AIS
UN  172.1.199.6   65.83 KiB  32           63.9%             c5c53089-207b-479f-97ea-c218928cd4ec  RACK1-AIS
UN  172.1.81.54   65.84 KiB  32           44.8%             f7c1a366-dcf1-4561-a09d-1590d548a177  RACK1-AIS
UN  172.1.170.61  108.88 KiB 32           42.9%             874143f3-a54b-4723-8779-d06649b2d8cf  RACK1-AIS
```

## 外部访问

```bash
# 测试所有 Pod 是否都可以正常访问
$ for i in `seq 0 3`; do ping -c 3 cassandra-${i}.cassandra-headless.cassandra.svc.cluster.local; done

# 随机访问一个 Pod
$ cqlsh cassandra-headless.cassandra.svc.cluster.local 9042
cqlsh> help
```

## 参考

* [Deploying Cassandra with Stateful Sets](https://kubernetes.io/docs/tutorials/stateful-application/cassandra/)
