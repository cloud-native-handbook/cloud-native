# Spark on YARN

## 部署

```bash
$ kubectl apply -f namespace.yaml
```

## 提交作业

无论是客户端模式还是集群模式，Spark on YARN 默认读取的都是 HDFS 上的数据。

### 配置客户端环境

在提交 Spark 作业之前，必须配置 Hadoop 环境，这些配置用于写数据到 HDFS 和连接 YARN ResourceManager。配置方法有两种：一种是采用配置文件；一种是为 SparkConf 设置 `spark.hadoop.*` 形式的属性参数，其中 `*` 部分是 Hadoop 的配置属性，如 `fs.defaultFS`。推荐使用第二种方式，配置简单且不需要事先下载 Hadoop。

* 方式一

配置文件：

```xml
<!-- /opt/hadoop/etc/hadoop/core-site.xml -->
<configuration>
  <property>
    <name>fs.defaultFS</name>
    <value>hdfs://namenode.hdfs.svc.cluster.local:9000/</value>
    <description>NameNode URI</description>
  </property>
</configuration>
```

```xml
<!-- /opt/hadoop/etc/hadoop/yarn-site.xml -->
<configuration>
  <property>
    <name>yarn.resourcemanager.hostname</name>
    <value>hadoop-hadoop-yarn-rm.hadoop.svc.cluster.local</value>
  </property>
</configuration>
```

提交形式：

```bash
$ YARN_CONF_DIR="/opt/hadoop/etc/hadoop" bin/spark-submit \
  --master yarn \
  ...
```

* 方式二

将 Hadoop 配置集成到 SparkConf 配置中：

```bash
# Spark on YARN 要求必须设置 YARN_CONF_DIR 或 HADOOP_CONF_DIR 环境变量，这里直接设置为空
$ YARN_CONF_DIR="" bin/spark-submit \
  --conf spark.hadoop.fs.defaultFS=hdfs://namenode.hdfs.svc.cluster.local:9000 \
  --conf spark.hadoop.yarn.resourcemanager.hostname=hadoop-hadoop-yarn-rm.hadoop.svc.cluster.local \
  --master yarn \
  ...
```

除了在命令行设置 Hadoop 属性参数外，还可以在代码中设置或者在 `$SPARK_HOME/conf/spark-defalut.conf` 文件中进行设置。

### 客户端模式

```bash
$ YARN_CONF_DIR="" bin/spark-submit \
  --conf spark.hadoop.fs.defaultFS=hdfs://namenode.hdfs.svc.cluster.local:9000 \
  --conf spark.hadoop.yarn.resourcemanager.hostname=hadoop-hadoop-yarn-rm.hadoop.svc.cluster.local \
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

### 集群模式

```bash
$ YARN_CONF_DIR="" bin/spark-submit \
  --conf spark.hadoop.fs.defaultFS=hdfs://namenode.hdfs.svc.cluster.local:9000 \
  --conf spark.hadoop.yarn.resourcemanager.hostname=hadoop-hadoop-yarn-rm.hadoop.svc.cluster.local \
  --conf spark.eventLog.enabled=true \
  --conf spark.eventLog.dir=hdfs://namenode.hdfs.svc.cluster.local:9000/spark/history \
  --master yarn \
  --deploy-mode cluster \
  --driver-memory 1g \
  --executor-memory 1g \
  --executor-cores 1 \
  --queue default \
  --class org.apache.spark.examples.SparkPi \
  examples/jars/spark-examples*.jar \
  100
```

## 注意事项

无论是个客户端模式还是集群模式，Spark On YARN 默认读取的文件路径都是：`hdfs://<NAMENODE_HOST>:<NAMENODE_PORT>/user/<CURRENT_USERNAME>/`。

```bash
$ YARN_CONF_DIR="" bin/spark-submit \
  --conf spark.hadoop.fs.defaultFS=hdfs://namenode.hdfs.svc.cluster.local:9000 \
  --conf spark.hadoop.yarn.resourcemanager.hostname=hadoop-hadoop-yarn-rm.hadoop.svc.cluster.local \
  bin/spark-shell --master yarn --deploy-mode client

scala> val data = sc.textFile("README.md")

scala> data.count
org.apache.hadoop.mapred.InvalidInputException: Input path does not exist: hdfs://namenode.hdfs.svc.cluster.local:9000/user/root/README.md
```

## 参考

* [Spark Configuration - Custom Hadoop/Hive Configuration](https://spark.apache.org/docs/latest/configuration.html#custom-hadoophive-configuration)
