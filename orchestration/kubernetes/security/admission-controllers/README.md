# 准入控制器（Admission Controllers）

## 开启、关闭和查询

* 开启

```sh
$ kube-apiserver --enable-admission-plugins=NamespaceLifecycle,LimitRanger ...
```

* 关闭

```sh
$ kube-apiserver --disable-admission-plugins=PodNodeSelector,AlwaysDeny ...
```

* 查询默认开启的准入插件

```sh
# 不同版本的 k8s 所启用的准入插件可能不同
$ kube-apiserver -h | grep enable-admission-plugins
```

## 准入控制器

### AlwaysPullImages

强制每个新 Pod 的镜像拉取策略（_imagePullPolicy_）为 `Always`，即在启动容器之前始终拉取镜像，意味着每次都需要相应的凭证。这在多租户集群中非常有用，它可以确保用户的私有镜像只能有拥有凭证的用户才能使用。如果没有该准入控制器，一旦镜像被拉取到节点上，任何用户都可以通过知道镜像的名称来使用它，而不需要对镜像镜像任何授权检查。

### DefaultStorageClass
