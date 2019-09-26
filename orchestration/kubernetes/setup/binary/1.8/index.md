# 部署 Kubernetes 1.8 高可用集群 -- 二进制方案

本文档介绍使用 `二进制` 方式部署 Kubernetes `1.8` 集群的详细步骤。


## 详细步骤

* [准备工作](./requirement.md)
* [部署 etcd 集群](deploy-etcd-cluster.md)
* [签发 k8s 证书](kubernetes-crtificates.md)
* [配置 kubeconfig](kubeconfig.md)
* [部署 master](master.md)
* [高可用 master](ha-master.md)

* [配置 kubectl](./kubectl-kubeconfig.md)
* [部署 Master 节点](./master.md)
* [认证和授权](./auth.md)
* [多租户隔离](./multi-tenant-isolation.md)


## 参考

* [Kubernetes 1.8.x 全手动安装教程](https://www.kubernetes.org.cn/3096.html)

* [Kubernetes 高级实践：Master 高可用方案设计和踩过的那些坑](https://yq.aliyun.com/articles/79615?t=t1)
* [Kubernetes Master High Availability 高级实践](https://segmentfault.com/a/1190000005832319)
* [升级到 Kubernetes 1.8 的配置细节差异以及 k8s 几个不常见的坑](http://blog.csdn.net/cleverfoxloving/article/details/78424293)
* [kubernetes 1.8 高可用安装](http://foxhound.blog.51cto.com/1167932/1977769)
* [Building High-Availability Clusters](https://kubernetes.io/docs/admin/high-availability/)
* [Automated HA master deployment](https://github.com/kubernetes/community/blob/master/contributors/design-proposals/cluster-lifecycle/ha_master.md#kubernetes-service)

> https://severalnines.com/blog/wordpress-application-clustering-using-kubernetes-haproxy-and-keepalived
> https://segmentfault.com/a/1190000005832319
