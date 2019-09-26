# YARN

YARN 的主要功能：

  * 资源管理
  * job 调度/监控

* YARN 可以管理３个系统资源：内存、CPU 和磁盘。

## 部署

```bash
# 命名空间
$ kubectl apply -f namespace.yaml

# YARN ResourceManager（1 个）
$ kubectl apply -f resoucemanager.yaml

# YARN NodeManager（1 个）
$ kubectl apply -f nodemanager.yaml
```

## 访问

```bash
$ google-chrome resourcemanager.yarn.svc.cluster.local:8088
```

## 测试

```bash
$ YARN_CONF_DIR="" bin/spark-submit \
  --conf spark.hadoop.fs.defaultFS=hdfs://namenode.hdfs.svc.cluster.local:9000 \
  --conf spark.hadoop.yarn.resourcemanager.hostname=resourcemanager.yarn.svc.cluster.local \
  --conf spark.eventLog.enabled=true \
  --conf spark.eventLog.dir=hdfs://namenode.hdfs.svc.cluster.local:9000/spark/history \
  --master yarn \
  --deploy-mode client \
  --driver-memory 1g \
  --executor-memory 1g \
  --executor-cores 1 \
  --queue default \
  --class org.apache.spark.examples.SparkPi \
  examples/jars/spark-examples*.jar \
  100
```

## 参考

* [Init Containers](https://kubernetes.io/docs/concepts/workloads/pods/init-containers/)
* [YARN job history not coming](https://stackoverflow.com/questions/33039100/yarn-job-history-not-coming)
* [How does warden calculate and allocate resources to YARN](https://mapr.com/blog/best-practices-yarn-resource-management/#1-how-does-warden-calculate-and-allocate-resources-to-yarn-)
