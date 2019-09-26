# CustomResourceDefinition（CRD）

尝试自己一个一个资源对象，比如 UserAccounts、ApiGroups、ApiServers 和 RBAC 等等

## CRD

* UserAccounts

用于管理 user 和 group，最好还能和 AD/LDAP 集成并且和 k8s RBAC 关联。

* ApiGroups

用于查询当前各个资源对象支持的 apiVersion，以及所属的 apiGroup。

* RBACs

组合 role 和 rolebinding，比如希望某些用户可以同时访问两个命名空间（如 xiaoming 和 kubeapps）。

（参考 openshift 的 Rule、Policy、PolicyBinding）

* NamespaceTree

创建一个 `NamespaceTree` 资源对象将 `Namespace` 按树形结构进行展示。
