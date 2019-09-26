# Kubernetes 资源对象

Kubernetes 中的资源对象可以看作是对集群状态的声明和期望，确保创建的资源对象始终运行在期望的状态。

* [pod(s)](./k8s-pod.md) (aka 'po')
* [node(s)](./k8s-node.md) (aka 'no')
* [service(s)](./k8s-service.md) (aka 'svc')

## 资源

| 资源         | 资源 |
| ------------ | ---- |
| Autoscaling  | jobs |
| buildconfigs |      |

* buildconfigs (aka 'bc')
* builds
* clusters (valid only for federation apiservers)
* componentstatuses (aka 'cs')
* configmaps (aka 'cm')
* cronjobs
* daemonsets (aka 'ds')
* deployments (aka 'deploy')
* deploymentconfigs (aka 'dc')
* endpoints (aka 'ep')
* events (aka 'ev')
* horizontalpodautoscalers (aka 'hpa')
* imagestreamimages (aka 'isimage')
* imagestreams (aka 'is')
* imagestreamtags (aka 'istag')
* ingresses (aka 'ing')
* groups
* jobs
* limitranges (aka 'limits')
* namespaces (aka 'ns')
* networkpolicies
* nodes (aka 'no')
* persistentvolumeclaims (aka 'pvc')
* persistentvolumes (aka 'pv')
* pods (aka 'po')
* podsecuritypolicies (aka 'psp')
* podtemplates
* policies
* projects
* replicasets (aka 'rs')
* replicationcontrollers (aka 'rc')
* resourcequotas (aka 'quota')
* rolebindings
* routes
* secrets
* serviceaccounts (aka 'sa')
* services (aka 'svc')
* statefulsets
* users
* storageclasses
* thirdpartyresources

## 其他概念

CronJob
SecurityContext
Horizontal Pod Autoscaling

## 资源清单（resource manifest）

* YAML
* JSON
* CMD

YAML vs JSON

YAML：简短（占用行数少）、可注释

## Todo

* 对每个资源对象进行详细描述
* 显示每个资源对象在相应 K8S 版本中对应的 apiVersion

## 参考

* [理解 kubernetes 对象](https://www.huweihuang.com/article/kubernetes/understanding-kubernetes-objects/)
