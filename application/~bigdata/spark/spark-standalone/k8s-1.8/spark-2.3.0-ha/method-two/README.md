# Spark Standalone 高可用

为了保证多个 Spark Master 的 hostname（或 DNS）不改变，以便 Spark Worker 或 Driver 可以发现 Spark Master，我们将采用 `StatefulSet` 来部署无状态的 Spark Master 服务。

## 不足

虽然 Worker/Driver 使用的是 DNS 与 Master 通信，但它只在第一次请求时解析，且解析成功后就不再解析。而 Master Pod 重启后其 IP 地址会改变，这就可能导致：如果 3 个 Master 都挂了或者都重启过，那 Worker/Driver 依然无法与 Master 通信。

两种 idea：

  1. 固定 Master IP，貌似只能通过 Service 来固定，即为每个 Master Pod 创建一个单独的 Service（Type=ClusterIP）。
  2. 想办法让 Worker/Driver 动态解析 Master DNS，而不是让 Worker/Driver 重启。

使用第一个 idea：

但我没有办法为根据 Master Pod 的名称来 selector，于是我想到了为 Master Pod 增加 label：https://github.com/kubernetes/kubernetes/issues/44103#issuecomment-328927845 。我这里其实没有必要将其写到 initContainers 中，而是直接用脚本来解决，但是用脚本的话 Pod 重启就没有啦。

```bash
namespace="spark-standalone"
masters=`kubectl -n $namespace get pod -l app=spark,component=master | awk '{if(NR>1)print $1}'`

# 为每个 Master Pod 增加新 label：name=${master's name}
for master in ${masters[@]}; do
  kubectl -n $namespace label pod $master name=$master
done

# 尝试了很多种命令行操作办法，无法暴露所有 Master Pod 的端口
for i in {0..2}; do
  # kubectl -n $namespace delete service clusterip master-$i --tcp=6066:6066 --tcp=7077 --tcp=8080;
  # kubectl -n $namespace expose pod master-$i --name master-$i --port=6066 --port=7077 --port=8080
  # kubectl -n $namespace expose pod master-$i --name master-$i --port=6066 --port=7077 --port=8080
done
```

```bash
namespace="spark-standalone"
masterCounts=`kubectl -n spark-standalone get statefulset/master | awk '{if(NR>1)print $2}'`

for (( i=0; i < $masterCounts; ++i )) do
cat <<EOF | kubectl apply -f -
kind: Service
apiVersion: v1
metadata:
  name: master-${i}
  namespace: spark-standalone
spec:
  selector:
    name: master-${i}
  ports:
  - name: webui
    port: 8080
    targetPort: 8080
  - name: shuffle-server
    port: 7077
    targetPort: 7077
  - name: rest-server
    port: 6066
    targetPort: 6066
EOF
done
```

```bash
namespace="spark-standalone"
masterCounts=`kubectl -n spark-standalone get statefulset/master | awk '{if(NR>1)print $2}'`

for (( i=0; i < $masterCounts; ++i )) do
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Service
metadata:
  name: master-${i}
  namespace: spark-standalone
spec:
  type: ExternalName
  externalName: master-${i}.master-hs.spark-standalone.svc.cluster.local
EOF
done
```

## 部署

* Zookeeper

```bash
# 命名空间
$ kubectl apply -f namespace.yaml

$ kubectl apply -f ceph-secret-kube.yaml

# Zookeeper
$ kubectl apply -f zookeeper.yaml -n spark-standalone
```

检查 Zookeeper：

```bash
$ kubectl -n spark-standalone get pod -l app=zk -o wide
NAME      READY     STATUS    RESTARTS   AGE       IP             NODE
zk-0      1/1       Running   0          18m       172.1.74.181   kube-node-100
zk-1      1/1       Running   0          18m       172.1.81.60    kube-node-121
zk-2      1/1       Running   0          18m       172.1.199.14   kube-node-103
```

```bash
# 检查节点健康情况
$ for i in {0..2}; do kubectl -n spark-standalone exec -it zk-$i -- sh -c "echo stat | nc 127.0.0.1 2181"; done
Zookeeper version: 3.4.10-39d3a4f269333c922ed3db283be479f9deacaa0f, built on 03/23/2017 10:13 GMT
Clients:
 /127.0.0.1:41424[0](queued=0,recved=1,sent=0)

Latency min/avg/max: 0/2/14
Received: 277
Sent: 276
Connections: 1
Outstanding: 0
Zxid: 0x100000002
Mode: follower
Node count: 4
Zookeeper version: 3.4.10-39d3a4f269333c922ed3db283be479f9deacaa0f, built on 03/23/2017 10:13 GMT
Clients:
 /127.0.0.1:40800[0](queued=0,recved=1,sent=0)

Latency min/avg/max: 0/0/0
Received: 273
Sent: 272
Connections: 1
Outstanding: 0
Zxid: 0x100000002
Mode: follower
Node count: 4
Zookeeper version: 3.4.10-39d3a4f269333c922ed3db283be479f9deacaa0f, built on 03/23/2017 10:13 GMT
Clients:
 /127.0.0.1:42362[0](queued=0,recved=1,sent=0)

Latency min/avg/max: 0/0/0
Received: 272
Sent: 271
Connections: 1
Outstanding: 0
Zxid: 0x100000002
Mode: leader
Node count: 4
```

* Spark

```bash
# Spark Master （3 个）
$ kubectl apply -f spark-master.yaml

# Spark Worker (2 个)
$ kubectl apply -f spark-worker.yaml

# Spark History Server
$ kubectl apply -f spark-history-server.yaml
```

检查

```bash
$ kubectl -n spark-standalone get pod -l app=spark -o wide
```

## 提交应用

```bash
$ bin/spark-submit \
  --conf spark.cores.max=1 \
  --deploy-mode cluster \
  --master spark://m1:7077,m2:7077,m3:7077 \
  --class WordCount \
  xxx.jar test.txt
```

* client mode

```bash
$ /root/tmp/spark-2.1.2-bin-hadoop2.7/bin/spark-submit \
  --conf spark.driver.host=192.168.10.102 \
  --conf spark.eventLog.enabled=true \
  --conf spark.eventLog.dir=hdfs://namenode.hdfs.svc.cluster.local:9000/spark/history \
  --conf spark.cassandra.connection.host=cassandra-3.cassandra-headless.cassandra.svc.cluster.local \
  --conf spark.cassandra.connection.port=9042 \
  --conf spark.cassandra.output.throughput_mb_per_sec=20 \
  --conf spark.cassandra.output.concurrent.writes=10 \
  --conf spark.cassandra.connection.keep_alive_ms=12000 \
  --conf spark.cassandra.output.batch.grouping.key=None \
  --master spark://master-0.master-hs.spark-standalone.svc.cluster.local:7077,master-1.master-hs.spark-standalone.svc.cluster.local:7077,master-2.master-hs.spark-standalone.svc.cluster.local:7077 \
  --deploy-mode client \
  --class Bulkload \
  --executor-memory 4G  \
  --total-executor-cores 40 \
  --driver-memory 32G \
  /root/tmp/hw.jar hdfs://namenode.hdfs.svc.cluster.local:9000/201603_compress_200m/part-00000
```

* cluster mode

```bash
$ /root/tmp/spark-2.1.2-bin-hadoop2.7/bin/spark-submit \
  --deploy-mode cluster \
  --conf spark.driver.host=192.168.10.102 \
  --conf spark.eventLog.enabled=true \
  --conf spark.eventLog.dir=hdfs://namenode.hdfs.svc.cluster.local:9000/spark/history \
  --conf spark.cassandra.connection.host=cassandra-2.cassandra-headless.cassandra.svc.cluster.local \
  --conf spark.cassandra.connection.port=9042 \
  --conf spark.cassandra.output.throughput_mb_per_sec=20 \
  --conf spark.cassandra.output.concurrent.writes=10 \
  --conf spark.cassandra.connection.keep_alive_ms=12000 \
  --conf spark.cassandra.output.batch.grouping.key=None \
  --master spark://master-0.master-hs.spark-standalone.svc.cluster.local:6066,master-1.master-hs.spark-standalone.svc.cluster.local:6066,master-2.master-hs.spark-standalone.svc.cluster.local:6066 \
  --class Bulkload \
  --executor-memory 4G  \
  --total-executor-cores 40 \
  --driver-memory 4G \
  --driver-cores 1 \
  hdfs://namenode.hdfs.svc.cluster.local:9000/spark/applications/hw.jar \
  hdfs://namenode.hdfs.svc.cluster.local:9000/201602_compress_200m/part-00000

Running Spark using the REST application submission protocol.
Using Spark's default log4j profile: org/apache/spark/log4j-defaults.properties
18/04/18 17:25:50 INFO RestSubmissionClient: Submitting a request to launch an application in spark://master-0.master-hs.spark-standalone.svc.cluster.local:6066,master-1.master-hs.spark-standalone.svc.cluster.local:6066,master-2.master-hs.spark-standalone.svc.cluster.local:6066.
18/04/18 17:25:51 INFO RestSubmissionClient: Submission successfully created as driver-20180418092551-0001. Polling submission state...
18/04/18 17:25:51 INFO RestSubmissionClient: Submitting a request for the status of submission driver-20180418092551-0001 in spark://master-0.master-hs.spark-standalone.svc.cluster.local:6066,master-1.master-hs.spark-standalone.svc.cluster.local:6066,master-2.master-hs.spark-standalone.svc.cluster.local:6066.
18/04/18 17:25:51 INFO RestSubmissionClient: State of driver driver-20180418092551-0001 is now RUNNING.
18/04/18 17:25:51 INFO RestSubmissionClient: Driver is running on worker worker-20180418092141-172.1.74.204-7078 at 172.1.74.204:7078.
18/04/18 17:25:51 INFO RestSubmissionClient: Server responded with CreateSubmissionResponse:
{
  "action" : "CreateSubmissionResponse",
  "message" : "Driver successfully submitted as driver-20180418092551-0001",
  "serverSparkVersion" : "2.1.2",
  "submissionId" : "driver-20180418092551-0001",
  "success" : true
}
```

## 参考

* [Spark Standalone High Availability](https://spark.apache.org/docs/latest/spark-standalone.html#high-availability)
* [Spark Configuration #Deploy](https://spark.apache.org/docs/latest/configuration.html#deploy)
* [Active master not accepting new applications if one of the masters added to zookeeper is down](https://community.hortonworks.com/questions/152056/active-master-not-accepting-new-applications-if-on.html)
