# HDFS

## 部署

```bash
# 命名空间
$ kubectl apply -f hdfs.namenode.yaml

# 创建 Ceph 所需的 Secret
$ kubectl apply -f ceph-secret-kube.yaml

# HDFS Namenode
$ kubectl apply -f namenode.yaml

# HDFS Datanode
$ kubectl apply -f datanode.yaml
```

## 验证

```bash
$ kubectl -n hdfs get statefulset,pod,svc,ep,pvc
NAME                    DESIRED   CURRENT   AGE
statefulsets/datanode   4         4         28m
statefulsets/namenode   1         1         2m

NAME            READY     STATUS    RESTARTS   AGE
po/datanode-0   1/1       Running   0          28m
po/datanode-1   1/1       Running   0          21m
po/datanode-2   1/1       Running   0          21m
po/datanode-3   1/1       Running   0          1m
po/namenode-0   1/1       Running   0          2m

NAME           TYPE        CLUSTER-IP   EXTERNAL-IP   PORT(S)                         AGE
svc/datanode   ClusterIP   None         <none>        50075/TCP,50010/TCP,50020/TCP   28m
svc/namenode   ClusterIP   None         <none>        9000/TCP,50070/TCP              2m

NAME          ENDPOINTS                                                             AGE
ep/datanode   172.1.170.7:50010,172.1.199.15:50010,172.1.74.162:50010 + 9 more...   28m
ep/namenode   172.1.74.157:50070,172.1.74.157:9000                                  2m

NAME                          STATUS    VOLUME                                     CAPACITY   ACCESS MODES   STORAGECLASS   AGE
pvc/hdfs-dn-data-datanode-0   Bound     pvc-63aefae3-3ebc-11e8-adc9-d4bed9b697fe   200Gi      RWO            rbd            28m
pvc/hdfs-dn-data-datanode-1   Bound     pvc-c76d253c-3ebc-11e8-adc9-d4bed9b697fe   200Gi      RWO            rbd            25m
pvc/hdfs-dn-data-datanode-2   Bound     pvc-6f2cc2dd-3ebd-11e8-adc9-d4bed9b697fe   200Gi      RWO            rbd            21m
pvc/hdfs-dn-data-datanode-3   Bound     pvc-3aec1cd7-3ec0-11e8-adc9-d4bed9b697fe   200Gi      RWO            rbd            1m
pvc/hdfs-nn-data-namenode-0   Bound     pvc-6030b35d-3ebc-11e8-adc9-d4bed9b697fe   10Gi       RWO            rbd            28m
```

```bash
# 检查节点情况
$ kubectl -n hdfs exec -it namenode-0 -- hdfs dfsadmin -Dfs.defaultFS=hdfs://namenode:9000 -report
```

## 外部访问 Namenode

```bash
# 浏览器访问 Web
$ google-chrome http://namenode.hdfs.svc.cluster.local:50070 # 访问的是 Headless Service

# 命令行上传文件
$ echo "1x2y3z" > /tmp/test.md
$ hdfs dfs -put /tmp/test.md hdfs://namenode.hdfs.svc.cluster.local:9000/
$ hdfs dfs -ls hdfs://namenode.hdfs.svc.cluster.local:9000/
Found 1 items
-rw-r--r--   3 root supergroup          7 2018-04-12 18:26 hdfs://namenode.hdfs.svc.cluster.local:9000/test.md
```

【注】我并没有创建一个带 `clusterIP` 的 Namenode Service，而是直接使用了 Headless Service 来对外提供服务，这有个好处是流量不用经过 kube-proxy，而是直达 Pod （默认是 DNS 轮询方式），由于少了 iptables 这一次层，性能提升了不少。如果 Service 使用的是 ipvs，可以考虑使用带 cluster ip 的 Service。
