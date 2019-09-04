## Kubeadm 镜像

不同版本的  `kubeadm`，部署集群时所需要的镜像版本也不尽相同。

## 1.6.X

* **核心组件**

| 镜像名                                      | Role        | 版本       |
| ---------------------------------------- | ----------- | -------- |
| gcr.io/google_containers/kube-controller-manager-amd64 | master      | v1.6.`x` |
| gcr.io/google_containers/kube-apiserver-amd64 | master      | v1.6.`x` |
| gcr.io/google_containers/kube-scheduler-amd64 | master      | v1.6.`x` |
| gcr.io/google_containers/etcd-amd64      | master      | 3.0.17   |
| gcr.io/google_containers/pause-amd64     | master node | 3.0      |
| gcr.io/google_containers/kube-proxy-amd64 | master node | v1.6.`x` |

* **插件：kube-dns**

| 镜像名                                      | 版本     |
| ---------------------------------------- | ------ |
| gcr.io/google_containers/k8s-dns-sidecar-amd64 | 1.14.1 |
| gcr.io/google_containers/k8s-dns-dnsmasq-nanny-amd64 | 1.14.1 |
| gcr.io/google_containers/k8s-dns-kube-dns-amd64 | 1.14.1 |

* **插件：prometheus**

| 镜像名                | 版本     |
| ------------------ | ------ |
| prom/prometheus    | v1.3.1 |
| prom/node-exporter | 0.12.0 |

* **插件：weave**

| 镜像名                   | 版本    |
| --------------------- | ----- |
| weaveworks/weave-npc  | 2.0.4 |
| weaveworks/weave-kube | 2.0.4 |

* **插件：kubernetes-dashboard**

| 镜像名                        | 版本              |
| -------------------------- | --------------- |
| kubernetes-dashboard-amd64 | v1.6.0 ~ v1.6.3 |

* **插件：heapster**

| 镜像名                                      | 版本（v1.4）                      |
| ---------------------------------------- | ----------------------------- |
| gcr.io/google_containers/heapster-amd64  | `v1.4.0` ~ v1.4.2             |
| gcr.io/google_containers/heapster-grafana-amd64 | v4.0.2 `v4.2.0` v4.4.1 v4.4.3 |
| gcr.io/google_containers/heapster-influxdb-amd64 | v1.1.1                        |

## 1.7.X

