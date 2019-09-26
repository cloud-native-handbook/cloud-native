# StatefulSet

Starting in Kubernetes version 1.5, PetSet has been renamed to StatefulSet.

## Headless Service

* 为 StatefulSet 绑定的 Headless Service 必须设置至少一个服务端口（spec.ports (Service)，即便它看起来并不需要；其实这是个 bug，会在 1.8 被修复）

* 在 StatefulSet 中指定的 spec.serviceName (StatefulSet) 到底有什么用？

Headless Service 的作用是控制网络域（network domain）。

实际上会为其 Pod 设置一个 subdomain： "{metadata:annototions:pod.beta.kubernetes.io/subdomain: <spec.serviceName>}" (Pod)。如果是手动设置可以用 spec.subdomain (Pod) 来指定。在为 Pod 设置好 subdomain 并且创建好同名的 Headless Service 之后，可以通过 `<pod-name>.<subdomin>.<namespace>.svc.cluster.local` 访问到 Pod。


```bash
$ # 创建 StatefulSet 之后自动为 Pod 指定了一个 subdomain
$ kubectl get pod namenode-0 -o yaml -n hadoop | grep subdomain
  pod.beta.kubernetes.io/subdomain: namenode

$ # 同一个命名空间(其他命名空间也行)的 datanode-0 可以解析到 namenode-0
$ kubectl exec -it datanode-0 -n hadoop -- nslookup namenode-0.namenode.hadoop
Name:      namenode-0.namenode.hadoop
Address 1: 10.244.1.56 namenode-0.namenode.hadoop.svc.cluster.local
```

## 注意

* 删除或缩放 StatefulSet 不会导致与其相关联的 PVC 和 PV 被删除，这样可以确保数据安全。

## 疑问

* 是否可以使用 ClusterIP、NodePort Service 代替 Headless Serivce？

使用 Headless Service 的目的是可以通过域名 `<pod-name>.<headless-service-name>.<namespace>.svc.cluster.local` 来发现某个具体的 Pod（其实是通过 serviceName 来为 Pod 设置了一个 `subdomain`），而使用 ClusterIP、NodePort 只能通过 Service IP 或者域名 `<service-name>.<namespace>.svc.cluster.local` 来发现 Service 从而间接地发现 Pod，但无法准确地将流量导向某个具体的 Pod。

所以，如果不需要对某个具体的 Pod 做服务发现，也可以为 StatefulSet 设置 ClusterIP、NodePort 类型的 Service。

* 不创建 Headless Service 行不行

没有 Headless Service 的话 StatefulSet 依然可以正常创建，但是无法通过 `<pod-name>.<headless-service-name>.<namespace>.svc.cluster.local` 和 `<headless-service-name>.<namespace>.svc.cluster.local` 来访问 Pod。


## 参考

> http://blog.csdn.net/afandaafandaafanda/article/details/53574117
> https://kubernetes.io/docs/concepts/workloads/controllers/petset/
