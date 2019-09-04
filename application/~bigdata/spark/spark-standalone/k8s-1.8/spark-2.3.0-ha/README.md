如何访问域名？

  添加 DNS：192.168.10.103
  测试一下访问 git.cloud.local


spark standalone HA 环境：

  * UI 为以下其中一个：
    1. http://master-0.master-hs.spark-standalone.svc.cluster.local:8080/
    2. http://master-1.master-hs.spark-standalone.svc.cluster.local:8080/
    3. http://master-2.master-hs.spark-standalone.svc.cluster.local:8080/
  * client mode:
    1. spark://master-0.master-hs.spark-standalone.svc.cluster.local:7077
    2. spark://master-1.master-hs.spark-standalone.svc.cluster.local:7077
    3. spark://master-2.master-hs.spark-standalone.svc.cluster.local:7077
  * cluster mode:
    1. spark://master-0.master-hs.spark-standalone.svc.cluster.local:6066
    2. spark://master-1.master-hs.spark-standalone.svc.cluster.local:6066
    3. spark://master-2.master-hs.spark-standalone.svc.cluster.local:6066

spark history server:
  
  * http://history-server.spark-standalone.svc.cluster.local:18080/
  * 存储地址： hdfs://namenode.hdfs.svc.cluster.local:9000/spark/history

HDFS:

  * ui: http://namenode.hdfs.svc.cluster.local:50070
  * server: hdfs://namenode.hdfs.svc.cluster.local:9000

cassandra:
  
  * cassandra-headless.cassandra.svc.cluster.local 9042