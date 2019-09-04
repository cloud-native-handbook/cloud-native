# Spark Standalone

## 部署

```bash
# 创建命名空间 spark
$ kubectl create -f spark.namespace.yaml

$ # spark master
$ kubectl create -f spark-master.deployment.spark.yaml

$ # 创建服务 spark-master
$ kubectl create -f spark-master.service.spark.yaml

$ # spark worker （通过 spark-master.spark.svc 来发现 master，这里的 spark-master 是 Service 名，不是 Pod 名）
$ kubectl create -f spark-worker.deployment.spark.yaml

$ # spark-history （利用 initContainer 来为 spark history server 创建日志目录）
$ kubectl create -f spark-history.deployment.spark.yaml

$ # 创建 spark history 服务
$ kubectl create -f spark-history.service.spark.yaml

$ # 创建 ingress
$ kubectl create -f spark.ingress.yaml
```


## 提交任务

集群内（Pod 内部）：

* Java

```bash
$ bin/spark-submit \
  --conf spark.eventLog.enabled=true \
  --conf spark.eventLog.compress=true \
  --conf spark.eventLog.dir=hdfs://namenode.hadoop.svc:9000/spark/history \
  --master spark://spark-master.spark.svc:7077 \
  --class org.apache.spark.examples.SparkPi \
  --supervise \
  --executor-memory=3G \
  --total-executor-cores=2 \
  examples/jars/spark-examples_2.11-2.0.2.jar 1000
```

开启 `spark.eventLog.enabled` 和 `spark.eventLog.dir` 两个选项后，将 spark-submit 产生的历史记录存储到 HDFS 中，供 spark hisotry server 使用。 `spark.eventLog.compress` 可选，表示是否压缩存储，默认使用的是 lz4，可以改为 snappy。

集群外：

* Java

```bash
$ bin/spark-submit --conf spark.eventLog.enabled=true \
--conf spark.eventLog.compress=true \
--conf spark.eventLog.dir=hdfs://192.168.10.101:30090/spark/history \
--master spark://192.168.10.102:30077 \
--class org.apache.spark.examples.SparkPi \
--supervise \
--executor-memory=3G \
--total-executor-cores=2 \
--num-executors=10 \
examples/jars/spark-examples_2.11-2.0.2.jar 1000
```

* Python

```bash
$ bin/spark-submit --conf spark.eventLog.enabled=true \
--conf spark.eventLog.compress=true \
--conf spark.eventLog.dir=hdfs://192.168.10.101:30090/spark/history \
--conf spark.executorEnv.PYTHONHASHSEED=0 \
--master spark://192.168.10.102:30077 \
--supervise \
--executor-memory=3G \
--total-executor-cores=2 \
--num-executors=10 \
examples/src/main/python/pi.py 1000
```

使用 Job:

```bash
$ kubectl create -f spark-pi-example.job.yaml
```


## 参考文章

* [Spark History Server 配置使用](http://blog.csdn.net/javastart/article/details/43735343)
* [Spark example](https://github.com/kubernetes/examples/tree/master/staging/spark)