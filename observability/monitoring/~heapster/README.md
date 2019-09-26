# Kubernetes Heapster

Heapster 是 kubernetes 集群监控工具。在1.2的时候，kubernetes 的监控需要在 node 节点上运行 cAdvisor 作为 agent 收集本机和容器的资源数据，包括cpu、内存、网络、文件系统等。在新版的 kubernetes 中，cAdvisor 被集成到 kubelet 中。通过 netstat 可以查看到kubelet新开了一个4194的端口，这就是cAdvisor监听的端口，现在我们然后可以通过http://<node-ip>:4194的方式访问到cAdvisor。

Heapster支持多种后端存储，包括influxDB，Elasticsearch，Kafka等，在这篇文档里，我们使用influxDB作为后端存储来展示heapster的相关配置。需要说明的是，heapster依赖kubernetes dns配置。具体相关配置请参考另一篇博文《kubernetes 1.5配置dns》。

```bash
# 集成到 kubelet 中的 cadvisor
$ netstat -tpln | grep kubelet | grep 4194
$
$ curl http://<node-ip>:4194
```

## Metrics

Heapster 会将以下 Metric 导出到其后端存储中：

| Metric Name | Description |
|------------|-------------|
| cpu/limit | CPU hard limit in millicores. |
| cpu/node_capacity | 每个 Node 的 CPU 容量/总量 |
| cpu/node_allocatable | 每个 Node 可分配的 CPU，即 每个 Node 为 Kubernetes 集群提供的 CPU 资源。见<https://github.com/kubernetes/community/blob/master/contributors/design-proposals/node/node-allocatable.md> |
| cpu/node_reservation | Share of cpu that is reserved on the node allocatable. 可分配的 Node 上保留的 CPU 份额。 默认使用每个 Node 的所有 CPU 资源，但可以使用 kubelet 的 `--kube-reserved` 和/或 `--system-reserved` 参数进行修改 |
| cpu/node_utilization | CPU utilization as a share of node allocatable. |
| cpu/request | CPU request (the guaranteed amount of resources) in millicores. |
| cpu/usage | Cumulative CPU usage on all cores. |
| cpu/usage_rate | CPU usage on all cores in millicores. |
| cpu/load | CPU load in milliloads, i.e., runnable threads * 1000 |
| ephemeral_storage/limit | Local ephemeral storage hard limit in bytes. |
| ephemeral_storage/request | Local ephemeral storage request (the guaranteed amount of resources) in bytes. |
| ephemeral_storage/usage | Total local ephemeral storage usage. |
| ephemeral_storage/node_capacity | Local ephemeral storage capacity of a node. |
| ephemeral_storage/node_allocatable | Local ephemeral storage allocatable of a node. |
| ephemeral_storage/node_reservation | Share of local ephemeral storage that is reserved on the node allocatable. |
| ephemeral_storage/node_utilization | Local ephemeral utilization as a share of ephemeral storage allocatable. |
| filesystem/usage | Total number of bytes consumed on a filesystem. |
| filesystem/limit | The total size of filesystem in bytes. |
| filesystem/available | The number of available bytes remaining in a the filesystem |
| filesystem/inodes | The number of available inodes in a the filesystem |
| filesystem/inodes_free | The number of free inodes remaining in a the filesystem |
| disk/io_read_bytes | Number of bytes read from a disk partition |
| disk/io_write_bytes | Number of bytes written to a disk partition |
| disk/io_read_bytes_rate | Number of bytes read from a disk partition per second |
| disk/io_write_bytes_rate | Number of bytes written to a disk partition per second |
| memory/limit | Memory hard limit in bytes. |
| memory/major_page_faults | Number of major page faults. |
| memory/major_page_faults_rate | Number of major page faults per second. |
| memory/node_capacity | Memory capacity of a node. |
| memory/node_allocatable | Memory allocatable of a node. |
| memory/node_reservation | Share of memory that is reserved on the node allocatable. |
| memory/node_utilization | Memory utilization as a share of memory allocatable. |
| memory/page_faults | Number of page faults. |
| memory/page_faults_rate | Number of page faults per second. |
| memory/request | Memory request (the guaranteed amount of resources) in bytes. |
| memory/usage | Total memory usage. |
| memory/cache | Cache memory usage. |
| memory/rss | RSS memory usage. |
| memory/working_set | Total working set usage. Working set is the memory being used and not easily dropped by the kernel. |
| accelerator/memory_total | Memory capacity of an accelerator. |
| accelerator/memory_used | Memory used of an accelerator. |
| accelerator/duty_cycle | Duty cycle of an accelerator. |
| network/rx | Cumulative number of bytes received over the network. |
| network/rx_errors | Cumulative number of errors while receiving over the network. |
| network/rx_errors_rate | Number of errors while receiving over the network per second. |
| network/rx_rate | Number of bytes received over the network per second. |
| network/tx | Cumulative number of bytes sent over the network |
| network/tx_errors | Cumulative number of errors while sending over the network |
| network/tx_errors_rate | Number of errors while sending over the network |
| network/tx_rate | Number of bytes sent over the network per second. |
| uptime  | Number of milliseconds since the container was started. |

* [Metrics](https://github.com/kubernetes/heapster/blob/master/docs/storage-schema.md#metrics)


## 参考

* [Tools for Monitoring Compute, Storage, and Network Resources](https://kubernetes.io/docs/tasks/debug-application-cluster/resource-usage-monitoring/)
