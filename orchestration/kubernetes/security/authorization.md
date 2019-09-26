# 授权

## RBAC Authorization

## Node Authorization

Node 授权是一种特殊的授权模式，专门授权由 kubelet 提交的 API 请求，这是 Kubernetes 1.8 新增的授权模式。

为了获得 Node authorizer 的授权，kubelet 必须使用一个证书凭证，该凭证标识它们属于 `system:node` Group，用户名格式为 `system:node:<nodeName>`。也就是说 Node 授权模式既不对 `system:node` Group 外的 kubelet 进行授权，也不对用户名格式不是 `system:node:...` 的用户进行授权，两个条件必须同时满足才行。

要启用 Node authorizer，需要在启动 apiserver 的时候指定 `--authorization-mode=Node` 参数。

为了限制 kubelet 能写入的 API 对象，需要在启动 apiserver 的时候指定 `--admission-control=...,NodeRestriction,...` 参数，以此开启 `NodeRestriction` 准入插件。


## RBAC vs Node

在 1.6 中，使用 RBAC 授权模式时 `system:node` ClusterRole 自动绑定到 `system:nodes` Group。

在 1.7 中，由于 Node authorizer 实现了相同的目的，因此不再支持 `system:nodes` Group 与 `system:node` ClusterRole 自动绑定，从而有利于对 secret 和 configmap 访问的附加限制。如果 RBAC 和 Node 授权模式同时被启用，`system:nodes` Group 不会自动绑定到 `system:node` ClusterRole。

在 1.8 中，`system:node` ClusterRoleBinding 不会被自动创建。

使用 RBAC 时，`system:node` ClusterRole 将被继续保留，为了兼容把其他用户或组绑定到该 ClusterRole 的部署方法。


## 参考

* [Using Node Authorization](https://kubernetes.io/docs/admin/authorization/node/)
