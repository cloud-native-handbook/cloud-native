# Kubernetes Namespace

Namespace 常用来隔离不同的用户，比如 Kubernetes 自带的服务一般运行在 `kube-system` namespace 中。当你的项目和人员众多的时候可以考虑根据项目属性，例如生产、测试、开发划分不同的 namespace。

集群中默认会有 `default` 和 `kube-system` 这两个 namespace，但并不是所有的资源对象都会对应 namespace，`node` 和 `persistentVolume` 就不属于任何 namespace。

PersistentVolume、StorageClass、ClusterRoleBinding、ClusterRole、CertificateSigningRequest 是没有命名空间的。

PersistentVolumeClaim、Secret、Service、StatefulSet、ServiceAccount、Ingress、Role、RoleBinding 是有命名空间的。


## Namespace 操作

`kubect` 可以通过 `--namespace` 或者 `-n` 选项指定 namespace。如果不指定，默认为 `default`。查看操作下，也可以通过设置 `--all-namespace=true` 来查看所有 namespace 下的资源。

* 查询

Namespace 包含两种状态 `Active` 和 `Terminating`。在 namespace 删除过程中，namespace 状态被设置成 `Terminating`。

```bash
$ # kubectl get ns
$ kubectl get namespaces
NAME          STATUS    AGE
default       Active    6d
kube-system   Active    6d
```

* 创建

```bash
$ # 1. 通过命令创建
$ kubectl create namespace my-namespace
$
$ # 2. 从 stdin 输入中创建
$ cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Namespace
metadata:
  name: my-namespace
EOF
```

创建 Namespace 会自动在该命名空间创建一个名为 `default` 的 ServiceAccount 以及一个附加的 Secret。该 Secret 默认包含三个文件：`ca.crt`、`namespace` 以及 `token`，它们会被自动挂载到该命名空间的所有 Pod 中，路径为 `/var/run/secrets/kubernetes.io/serviceaccount`。

```bash
$ kubectl get sa,secret -n my-namespace
NAME         SECRETS   AGE
sa/default   1         2h

NAME                          TYPE                                  DATA      AGE
secrets/default-token-9jtf9   kubernetes.io/service-account-token   3         2h
```

* 删除

```bash
$ kubectl delete namespaces my-namespace
```

注意：

  * 删除一个 namespace 会自动删除所有属于该 namespace 的资源；
  * default 和 kube-system 命名空间不可删除；
  * PersistentVolumes 是不属于任何 namespace 的，但 PersistentVolumeClaim 是属于某个特定 namespace 的；
  * Events 是否属于 namespace 取决于产生 events 的对象。

<!--

## Todo

1. 哪些资源对象有 Namespace，哪些资源对象没有 Namespace

-->
