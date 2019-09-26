# Spark Standalone

Spark 2.3.0

## 部署

由于 Docker 在操作系统内核级别共享资源，所以 Docker 容器获取到的 CPU 和内存资源实际上是操作系统的。为了避免 Spark Master 错误地获取 Spark Worker 的计算资源，从而导致任务调度不均且会导致资源使用过载，必须准确地获取 Spakr Worker 的资源，所以我设置了 `SPARK_WORKER_CORES` 和 `SPARK_WORKER_MEMORY` 两个环境变量来设置 Spark Worker 的计算资源，且这两个来自 `PodSpec.containers[].resources.requests`。

```bash
# 命名空间
$ kubectl apply -f spark.namespace.yaml

# Spark Master
$ kubectl apply -f spark-master.yaml
$ kubectl apply -f spark-master.service.yaml

# Spark Worker
$ kubectl apply -f spark-worker.yaml

# Spark History Server （可选）
$ kubectl apply -f spark-history-server.yaml
```

验证：

```bash
$ kubectl -n spark get pod -o wide
NAME                            READY     STATUS    RESTARTS   AGE       IP             NODE
spark-master-5f84c9696b-vjkrx   1/1       Running   0          1d        172.1.74.167   kube-node-100
spark-worker-8475665dc-m9ppg    1/1       Running   0          1d        172.1.74.151   kube-node-100
spark-worker-8475665dc-skk2v    1/1       Running   0          1d        172.1.170.21   kube-node-120
```

## 运行测试

* 集群内

使用 Job 在 Kubernetes 集群中运行测试程序：

```bash
$ kubectl apply -f sparkpi.job.yaml
```

* 集群外

集群外运行测试程序（前提是；另外）：

```bash
$ spark-submit \
 --conf spark.driver.host=192.168.8.220 \
 --conf spark.submit.deployMode=client \
 --conf spark.driver.cores=2 \
 --conf spark.driver.memory=8g \
 --class org.apache.spark.examples.SparkPi \
 --master spark://spark-master.spark.svc.cluster.local:7077 \
 examples/jars/spark-examples_2.11-2.3.0.jar 10000
```

相关说明：

  1. 需要配置 DNS，确保 Driver 节点可以访问到 `spark-master.spark.svc.cluster.local`；
  2. 必须将 `spark.driver.host` 配置成 Driver 节点的 IP 地址，并确保 Executor 和 Driver 之间可以双向通信；
  3. 应用程序的 Spark 版本必须和服务端的 Spark 版本一致。

外部访问：

```bash
# webui
$ google-chrome spark-master.spark.svc.cluster.local:8080
```

## 提交作业

* client 模式

```bash
$ /root/tmp/spark-2.1.2-bin-hadoop2.7/bin/spark-submit \
  --conf spark.driver.host=192.168.10.102 \
  --conf spark.eventLog.enabled=true \
  --conf spark.eventLog.dir=hdfs://namenode.hdfs.svc.cluster.local:9000/spark/history \
  --conf spark.cassandra.connection.host=cassandra-2.cassandra-headless.cassandra.svc.cluster.local \
  --conf spark.cassandra.connection.port=9042 \
  --conf spark.cassandra.output.throughput_mb_per_sec=20 \
  --conf spark.cassandra.output.concurrent.writes=10 \
  --conf spark.cassandra.connection.keep_alive_ms=12000 \
  --conf spark.cassandra.output.batch.grouping.key=None \
  --master spark://master.spark.svc.cluster.local:7077 \
  --deploy-mode client \
  --class Bulkload \
  --executor-memory 4G  \
  --total-executor-cores 40 \
  --driver-memory 32G \
  /root/tmp/hw.jar hdfs://namenode.hdfs.svc.cluster.local:9000/201602_compress_200m/part-00000
```

* cluster 模式

集群模式实际上是从 Spark 集群中选择一个 Worker 节点上运行 Driver 应用（并不独占该 Worker），所以至少需要一个 Worker 节点满足 Driver 所需的 cpu 和内存，另外必须确保 Worker 集群可以访问到应用代码。另外，cluster 模式建议使用 REST URL 来提交任务，即 `spark://x.x.x.x:6066`（7077 依然可以）。

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
  --master spark://master.spark.svc.cluster.local:6066 \
  --class Bulkload \
  --executor-memory 4G  \
  --total-executor-cores 40 \
  --driver-memory 4G \
  --driver-cores 1 \
  hdfs://namenode.hdfs.svc.cluster.local:9000/spark/applications/hw.jar \
  hdfs://namenode.hdfs.svc.cluster.local:9000/201602_compress_200m/part-00000
```

## 注意事项

* Caused by: java.io.IOException: Failed to connect to spark-master-7968984d94-4ps2v:36099

在 2.3.0 版本中，Spark Master 下发任务到 Worker 节点的过程中使用了自己的主机名，导致 Worker 节点在执行任务时无法访问到 Driver，如日志中的 “spark://CoarseGrainedScheduler@spark-master-7968984d94-4ps2v:36099”。

```bash
$ kubectl logs -f spark-worker-868f6989d9-q28s8
INFO  ExecutorRunner:54 - Launch command: "/usr/lib/jvm/java-8-openjdk-amd64/bin/java" "-cp" "/usr/local/spark/conf/:/usr/local/spark/jars/*" "-Xmx1024M" "-Dspark.driver.port=36099" "org.apache.spark.executor.CoarseGrainedExecutorBackend" "--driver-url" "spark://CoarseGrainedScheduler@spark-master-7968984d94-4ps2v:36099" "--executor-id" "202" "--hostname" "172.1.199.31" "--cores" "2" "--app-id" "app-20180413094928-0005" "--worker-url" "spark://Worker@172.1.199.31:7078"
```

```log
Spark Executor Command: "/usr/lib/jvm/java-8-openjdk-amd64/bin/java" "-cp" "/usr/local/spark/conf/:/usr/local/spark/jars/*" "-Xmx4096M" "-Dspark.driver.port=45960" "org.apache.spark.executor.CoarseGrainedExecutorBackend" "--driver-url" "spark://CoarseGrainedScheduler@sparkpi-example-tnzx6:45960" "--executor-id" "1" "--hostname" "172.1.170.4" "--cores" "1" "--app-id" "app-20180413111828-0002" "--worker-url" "spark://Worker@172.1.170.4:7078"
========================================

Exception in thread "main" java.lang.reflect.UndeclaredThrowableException
	at org.apache.hadoop.security.UserGroupInformation.doAs(UserGroupInformation.java:1713)
	at org.apache.spark.deploy.SparkHadoopUtil.runAsSparkUser(SparkHadoopUtil.scala:64)
	at org.apache.spark.executor.CoarseGrainedExecutorBackend$.run(CoarseGrainedExecutorBackend.scala:188)
	at org.apache.spark.executor.CoarseGrainedExecutorBackend$.main(CoarseGrainedExecutorBackend.scala:293)
	at org.apache.spark.executor.CoarseGrainedExecutorBackend.main(CoarseGrainedExecutorBackend.scala)
Caused by: org.apache.spark.SparkException: Exception thrown in awaitResult:
	at org.apache.spark.util.ThreadUtils$.awaitResult(ThreadUtils.scala:205)
	at org.apache.spark.rpc.RpcTimeout.awaitResult(RpcTimeout.scala:75)
	at org.apache.spark.rpc.RpcEnv.setupEndpointRefByURI(RpcEnv.scala:101)
	at org.apache.spark.executor.CoarseGrainedExecutorBackend$$anonfun$run$1.apply$mcV$sp(CoarseGrainedExecutorBackend.scala:201)
	at org.apache.spark.deploy.SparkHadoopUtil$$anon$2.run(SparkHadoopUtil.scala:65)
	at org.apache.spark.deploy.SparkHadoopUtil$$anon$2.run(SparkHadoopUtil.scala:64)
	at java.security.AccessController.doPrivileged(Native Method)
	at javax.security.auth.Subject.doAs(Subject.java:422)
	at org.apache.hadoop.security.UserGroupInformation.doAs(UserGroupInformation.java:1698)
	... 4 more
Caused by: java.io.IOException: Failed to connect to sparkpi-example-tnzx6:45960
	at org.apache.spark.network.client.TransportClientFactory.createClient(TransportClientFactory.java:245)
	at org.apache.spark.network.client.TransportClientFactory.createClient(TransportClientFactory.java:187)
	at org.apache.spark.rpc.netty.NettyRpcEnv.createClient(NettyRpcEnv.scala:198)
	at org.apache.spark.rpc.netty.Outbox$$anon$1.call(Outbox.scala:194)
	at org.apache.spark.rpc.netty.Outbox$$anon$1.call(Outbox.scala:190)
	at java.util.concurrent.FutureTask.run(FutureTask.java:266)
	at java.util.concurrent.ThreadPoolExecutor.runWorker(ThreadPoolExecutor.java:1149)
	at java.util.concurrent.ThreadPoolExecutor$Worker.run(ThreadPoolExecutor.java:624)
	at java.lang.Thread.run(Thread.java:748)
```

Spark Standalone 模式下，貌似在 2.2.0 之前，Executor 连接 Driver 使用的是 Driver 节点的 IP + Port (如 192.168.8.220:46732)，但在之后使用的是 Driver 节点的 hostname + port，这导致 Executor 所在节点没有办法访问到 Driver，最终任务无法执行。换句话说，Spark Standalone 2.2.0 及之后的版本只能在本地提交任务，如果要远程提交任务必须确保 Executor 所在节点能解析到 Driver 节点的主机名，但这对于容器而言几乎是没有办法实现的，因为：

  1. Driver 节点的 hostname 无法提前知道
  2. 就算知道 Driver 节点的 hostname

* 连接远程集群时，不能直接在 IDEA 中执行 `filter()` 等操作

https://stackoverflow.com/questions/33222045/classnotfoundexception-anonfun-when-deploy-scala-code-to-spark

* Exception in thread "main" java.lang.NumberFormatException: For input string: "tcp://172.254.107.107:8080"

我在滚动更新 Spark Master 和 Worker 时（尤其是 Service 先于 Deployment 时），经常遇到如下问题（首次启动并不会）：

```bash
$ kubectl -n spark logs -f spark-master-7fd4dddd64-2skfg
Using Spark's default log4j profile: org/apache/spark/log4j-defaults.properties
18/04/17 03:10:16 INFO Master: Started daemon with process name: 1@spark-master-7fd4dddd64-2skfg
18/04/17 03:10:16 INFO SignalUtils: Registered signal handler for TERM
18/04/17 03:10:16 INFO SignalUtils: Registered signal handler for HUP
18/04/17 03:10:16 INFO SignalUtils: Registered signal handler for INT
Exception in thread "main" java.lang.NumberFormatException: For input string: "tcp://172.254.107.107:8080"
  at java.lang.NumberFormatException.forInputString(NumberFormatException.java:65)
  at java.lang.Integer.parseInt(Integer.java:580)
  at java.lang.Integer.parseInt(Integer.java:615)
  at scala.collection.immutable.StringLike$class.toInt(StringLike.scala:272)
  at scala.collection.immutable.StringOps.toInt(StringOps.scala:29)
  at org.apache.spark.deploy.master.MasterArguments.<init>(MasterArguments.scala:45)
  at org.apache.spark.deploy.master.Master$.main(Master.scala:1029)
  at org.apache.spark.deploy.master.Master.main(Master.scala)
```

原因是已经创建好的名为 `spark-master` 的 Service 会向后创建的 Pod 注入一个环境变量 `SPARK_MASTER_PORT`，其值为 `tcp://172.254.107.107:8080`，这个环境变量与 Spark 内置的环境变量相互冲突，最好的解决办法是修改 Service 的名称，尽量不要以 `spark-` 开头。

总结：Spark 相关的 Service 命名时尽量不要以 `spark-` 开头。

*

如果 Spark Master 非高可用时，不要更新 Spark Master 对应的 Service，更新后将导致 Spark Worker 无法连接到 Spark Worker，所以 Spark 的 Deployment 和 Service 最好分成两个 2 个 yaml，这样滚动升级 Spark Master 的 Deployment 并不会导致 Spark Worker 无法连接到 Spark Worker（会有短暂掉线时间）。

## HA

> https://community.hortonworks.com/questions/152056/active-master-not-accepting-new-applications-if-on.html
