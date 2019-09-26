# EFK

EFK 包括：

  * Elasticsarch: Elasticsarch: 一个分布式搜索引擎，用于存储日志，以及建立日志索引；
  * Fluentd: 负责读取 kubelet、container runtime（容器运行时） 以及容器生成的日志，并将日志信息发送到 Elasticsearch；
  * Kibana: 负责图形化展示存储在 Elasticsearch 中的日志。

注意：

  * Elasticsearch 要求 kernel 的状态变量 `vm.max_map_count` 最少 `262144`，下面是通过 initContainers 来设置的；
  * 为了部署 Fluentd，需要为节点设置标签，或者删除 fluentd-es-ds.yaml 的 nodeSelector 以便部署 fluentd 到所有节点。



## 部署

* [Kubernetes 1.8](./1.8/README.md)
* [Kubernetes 1.10](./1.10/README.md)
