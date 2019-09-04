# MySQL Cluster

部署的是单个 master、多个 slave 的集群架构。


## 部署

```bash
$ kubectl apply -f mysql-cluster.namespace.yaml
$ kubectl apply -f rbd-secret-admin.secret.mysql-cluster.yaml

$ kubectl apply -f mysql-config.cm.mysql-cluster.yaml

$ kubectl apply -f mysql-services.service.mysql-cluster.yaml

$ # mysql-0 作为 master
$ kubectl apply -f mysql.pdb+statefulset.mysql-cluster.yaml
```

## 测试

查看所有服务是否启动完成：

```bash
$ kubectl get svc,statefulset,pod,pvc -n mysql-cluster
NAME             CLUSTER-IP     EXTERNAL-IP   PORT(S)    AGE
svc/mysql        None           <none>        3306/TCP   3m
svc/mysql-read   10.96.192.80   <none>        3306/TCP   3m

NAME                 DESIRED   CURRENT   AGE
statefulsets/mysql   3         3         2m

NAME         READY     STATUS    RESTARTS   AGE
po/mysql-0   2/2       Running   0          2m
po/mysql-1   2/2       Running   0          1m
po/mysql-2   2/2       Running   0          1m

NAME               STATUS    VOLUME                                     CAPACITY   ACCESSMODES   STORAGECLASS   AGE
pvc/data-mysql-0   Bound     pvc-f086ec6b-af2b-11e7-838b-408d5cfaed4a   10Gi       RWO           rbd            2m
pvc/data-mysql-1   Bound     pvc-1030206a-af2c-11e7-838b-408d5cfaed4a   10Gi       RWO           rbd            2m
pvc/data-mysql-2   Bound     pvc-2d71a480-af2c-11e7-838b-408d5cfaed4a   10Gi       RWO           rbd            2m
```

向 master 写入数据：

```bash
$ kubectl run mysql-client --image=mysql:5.7 -it --rm --restart=Never --\
  mysql -h mysql-0.mysql.mysql-cluster.svc.cluster.local <<EOF
CREATE DATABASE test;
CREATE TABLE test.messages (message VARCHAR(250));
INSERT INTO test.messages VALUES ('hello');
EOF
```

查询写入的数据：

```bash
$ kubectl run mysql-client --image=mysql:5.7 -it --rm --restart=Never --\
  mysql -h mysql-read.mysql-cluster.svc.cluster.local -e "SELECT * FROM test.messages"
+---------+
| message |
+---------+
| hello   |
+---------+
```

检查 `mysql-read` Service 是否会负载到了所有 mysql Pod：

```bash
$ kubectl run mysql-client-loop --image=mysql:5.7 -it --rm --restart=Never --\
  bash -ic "while sleep 1; do mysql -h mysql-read.mysql-cluster.svc -e 'SELECT @@server_id,NOW()'; done"
+-------------+---------------------+
| @@server_id | NOW()               |
+-------------+---------------------+
|         102 | 2017-10-12 09:18:15 |
+-------------+---------------------+
+-------------+---------------------+
| @@server_id | NOW()               |
+-------------+---------------------+
|         101 | 2017-10-12 09:18:48 |
+-------------+---------------------+
+-------------+---------------------+
| @@server_id | NOW()               |
+-------------+---------------------+
|         100 | 2017-10-12 17:14:02 |
+-------------+---------------------+
```

模拟 Pod 下线：

```bash
$ kubectl exec mysql-2 -c mysql -n mysql-cluster -- mv /usr/bin/mysql /usr/bin/mysql.off

$ # 与此同时，mysql-read Service 不会负载到该 pod 上来
$ kubectl get pod mysql-2 -n mysql-cluster
NAME      READY     STATUS    RESTARTS   AGE
mysql-2   1/2       Running   0          3m

$ kubectl exec mysql-2 -c mysql -- mv /usr/bin/mysql.off /usr/bin/mysql

$ kubectl delete pod mysql-2
```


## 水平扩容

```bash
$ # 轮询 SELECT @@server_id 会发现新增了 103 和 104
$ kubectl scale statefulset mysql -n mysql-cluster --replicas=5

$ # 验证新的 slave 是否存在之前添加的数据
$ kubectl run mysql-client --image=mysql:5.7 -i -t --rm --restart=Never --\
  mysql -h mysql-3.mysql.mysql-cluster -e "SELECT * FROM test.messages"
| message |
+---------+
| hello   |
+---------+
```


## 删除

```bash
$ kubectl delete statefulset mysql
```


## 参考

* [Run a Replicated Stateful Application](https://kubernetes.io/docs/tasks/run-application/run-replicated-stateful-application/)