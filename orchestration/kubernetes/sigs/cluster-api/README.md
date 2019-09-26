# Kubernetes Cluster api

<!--
Kubernetes 定义了一套通用 API 来创建容器，不管使用何种部署机制或者在哪个云服务提供商上都可通用。Kubernetes 还定义了一套 API 用于处理一些基础设施，比如 Load Balancers、Ingress 规则或者 persistence volume。但是，这些 API 都无法用来创建 Kubernetes 集群节点。因此，用户需要使用不同的工具或创建独特的 API 来处理集群生命周期事件，比如集群创建或删除、master 和 worker 节点升级。这些都将导致在云服务提供商之间的不一致。Kubernetes 社区联合起来创建了集群 API 项目来解决这个问题，为集群的创建、配置和管理带来了一组声明式的、Kubernetes 风格的 API。3月29日，集群 API 0.10的第一个 alpha 版本发布了。在本次会议上，VMware 中国研发中心工程师于扬将会介绍集群 API 规范中的主要组件，并展示集群 API 自动创建节点的演示。
-->

## Provider

* [AWS](https://github.com/kubernetes-sigs/cluster-api-provider-aws)
* [Azure](https://github.com/kubernetes-sigs/cluster-api-provider-azure)
* [Vsphere](https://github.com/kubernetes-sigs/cluster-api-provider-vsphere)
* [GCP](https://github.com/kubernetes-sigs/cluster-api-provider-gcp)
* [IBM Cloud](https://github.com/kubernetes-sigs/cluster-api-provider-ibmcloud)
* [Digitalocean](https://github.com/kubernetes-sigs/cluster-api-provider-digitalocean)
* [Openstack](https://github.com/kubernetes-sigs/cluster-api-provider-openstack)

## 参考

* [cluster-api.sigs.k8s.io](https://cluster-api.sigs.k8s.io/)
