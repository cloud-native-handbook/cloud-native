# 部署

需要使用定制的 [SeedProvider](https://github.com/kubernetes/examples/tree/master/cassandra/java) 来使 Cassandra 集群发现新的节点。

```bash
# 创建命名空间
$ kubectl apply -f cassandra-cluster.namespace.yaml

# 创建 statefulset
$ kubectl apply -f rbd-secret-admin.secret.cassandra-cluster.yaml
$ kubectl apply -f cassandra.service.cassandra-cluster.yaml
$ kubectl apply -f cassandra.statefulset.cassandra-cluster.yaml
```


## 删除

```bash
$ grace=$(kubectl get po cassandra-0 -o=jsonpath='{.spec.terminationGracePeriodSeconds}') \
  && kubectl delete statefulset,po -l app=cassandra \
  && echo "Sleeping $grace" \
  && sleep $grace \
  && kubectl delete pvc -l app=cassandra
```


## 测试

```bash
kubectl get pvc,pod,statefulset -n cassandra-cluster
NAME                 STATUS    VOLUME                                     CAPACITY   ACCESSMODES   STORAGECLASS   AGE
pvc/db-cassandra-0   Bound     pvc-b14225c0-ac9e-11e7-838b-408d5cfaed4a   1Gi        RWO           rbd            8m
pvc/db-cassandra-1   Bound     pvc-d7987fba-ac9e-11e7-838b-408d5cfaed4a   1Gi        RWO           rbd            7m

NAME             READY     STATUS    RESTARTS   AGE
po/cassandra-0   1/1       Running   0          8m
po/cassandra-1   1/1       Running   0          7m

NAME                     DESIRED   CURRENT   AGE
statefulsets/cassandra   2         2         8m
```

```bash
$ kubectl exec cassandra-0 -n cassandra-cluster -- nodetool status
Datacenter: dc1
===============
Status=Up/Down
|/ State=Normal/Leaving/Joining/Moving
--  Address       Load       Tokens       Owns (effective)  Host ID                               Rack
UN  10.244.4.103  65.65 KiB  32           65.3%             7444811c-4586-437f-9504-0a5475f33ddb  rack1
UN  10.244.1.87   101.02 KiB  32           65.9%             f3bd59ed-dd85-46ff-b53a-258f2d20017f  rack1
```


## 参考资料

* [Deploying Cassandra with Stateful Sets](https://kubernetes.io/docs/tutorials/stateful-application/cassandra/)
* [Configuring firewall port access](https://docs.datastax.com/en/cassandra/3.0/cassandra/configuration/secureFireWall.html)
* [gcr.io/google-samples/cassandra:v12](https://github.com/kubernetes/examples/blob/master/cassandra/image/Dockerfile)