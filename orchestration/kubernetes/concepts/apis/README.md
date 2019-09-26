# Kubernetes API

## API Group

* core
  * Container: v1
    * v1
* apps
  * DaemonSet
    * v1
* batch
* policy
* autoscaling
* networking.k8s.io
* storage.k8s.io
  * CSIDriver
  * CSINode
* settings.k8s.io
* certificates.k8s.io
* scheduling.k8s.io
* apiextensions.k8s.io
* apiregistration.k8s.io
* admissionregistration.k8s.io
* auditregistration.k8s.io
* rbac.authorization.k8s.io
  * ClusterRole
    * v1alpha1
    * v1beta1
    * v1
* node.k8s.io
* authentication.k8s.io
* authorization.k8s.io

<!--

## Todo

* 由于 API 及 API 版本过多，应首先考虑 v1 版本的 API
* 组织结构：
  * 官方： apigroup/apiversion:resource
  * 我
-->

## API 组

| API group | 描述 |
| --------- | ---- |
| `core`    |      |

## 参考

* [Kubernetes API Reference](https://kubernetes.io/docs/reference/)
  * [1.15](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.15/)
